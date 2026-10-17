'use strict';

const test = require('node:test');
const assert = require('node:assert');
const net = require('node:net');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir('alerts-test-');
const { app } = require('../server');
const { getPlatformDb, getDomainDb } = require('../config/database');
const { code } = require('../config/enums');
const { runExpirySweep, readWindows, DEFAULT_WINDOWS } = require('../services/alerts');
const { setEmitter } = require('../services/events');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

function futureDate(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

function as(token) {
  return { Authorization: `Bearer ${token}` };
}

async function login(email, password, domId) {
  const res = await request(app).post('/api/v2/auth/login').send({ email, password, domainId: domId });
  assert.strictEqual(res.status, 200, `${email} login failed: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

async function enableDomain(sysToken, name, adminEmail) {
  const res = await request(app)
    .post('/api/v2/domains/enable')
    .set(as(sysToken))
    .send({ name, adminName: 'Admin', adminEmail, adminPassword: 'Secret1!' });
  assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  return res.body.domain.id;
}

async function createContract(token, finalidadeId, name, forecastDays) {
  const res = await request(app)
    .post('/api/v2/contracts')
    .set(as(token))
    .send({
      name,
      object: `${name} objeto`,
      purpose_id: finalidadeId,
      start_date: futureDate(-10),
      forecast_date: futureDate(forecastDays),
    });
  assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  return res.body.contract;
}

let domainA;
let domainB;
let adminToken;
let gestorToken;
let finalidadeId;
let contractA1;
let contractA2;
let contractA3;
let contractA4;

test.before(async () => {
  await initTestDb();

  const sys = await request(app).post('/api/v2/auth/login').send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200);

  domainA = await enableDomain(sys.body.token, 'Alertas Alfa', 'admin.alfa@alerts.test');
  domainB = await enableDomain(sys.body.token, 'Alertas Beta', 'admin.beta@alerts.test');

  adminToken = await login('admin.alfa@alerts.test', 'Secret1!', domainA);
  await request(app)
    .post('/api/v2/users')
    .set(as(adminToken))
    .send({ name: 'Gestora', email: 'gestora@alerts.test', password: 'Secret1!', role: 'gestor', username: 'gestora' });
  gestorToken = await login('gestora@alerts.test', 'Secret1!', domainA);

  const finalidade = await request(app)
    .post('/api/v2/purposes')
    .set(as(adminToken))
    .send({ name: 'Obra' });
  assert.strictEqual(finalidade.status, 201);
  finalidadeId = finalidade.body.finalidade.id;

  contractA1 = await createContract(gestorToken, finalidadeId, 'Contrato A1', 20);

  // Contract in domain B (will be suspended) — must never be alerted.
  const adminB = await login('admin.beta@alerts.test', 'Secret1!', domainB);
  const finalidadeB = await request(app)
    .post('/api/v2/purposes')
    .set(as(adminB))
    .send({ name: 'Obra' });
  await createContract(adminB, finalidadeB.body.finalidade.id, 'Contrato B1', 20);
  getPlatformDb().run("UPDATE domains SET status = 'suspended' WHERE id = ?", [domainB]);
});

test('FR-001: alert_events existe em domínio aberto após a migração preguiçosa', () => {
  const db = getDomainDb(domainA);
  const table = db.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'alert_events'");
  assert.ok(table, 'alert_events should be created lazily on domain open');
  const columns = db.all('PRAGMA table_info(alert_events)').map((c) => c.name);
  assert.deepStrictEqual(columns, ['id', 'contract_id', 'window_days', 'email_status', 'created_at']);
});

test('FR-005: alert_windows é coluna aditiva na plataforma; NULL cai no default', () => {
  const platform = getPlatformDb();
  const row = platform.get('SELECT alert_windows FROM domains WHERE id = ?', [domainA]);
  assert.ok('alert_windows' in row, 'platform domains table gains alert_windows lazily');
  assert.strictEqual(row.alert_windows, null);
  assert.deepStrictEqual(readWindows(null), [...DEFAULT_WINDOWS]);
  assert.deepStrictEqual(readWindows('[90,60,30,15]'), [90, 60, 30, 15]);
  assert.deepStrictEqual(readWindows('[15,15]'), [15]);
  assert.deepStrictEqual(readWindows('garbage'), [...DEFAULT_WINDOWS]);
  assert.deepStrictEqual(readWindows('[]'), [...DEFAULT_WINDOWS]);
});

test('FR-002/FR-003/FR-004: varredura emite a janela 30 na sala, grava dedup antes e não duplica', async () => {
  const events = [];
  const originalEmitter = (event, domId, payload) => events.push({ event, domId, payload });
  setEmitter(originalEmitter);
  try {
    const first = await runExpirySweep();
    assert.strictEqual(first.swept, 1, 'exactly one tightest-window alert in domain A');
    assert.strictEqual(first.emitted, 1);

    const emitted = events.filter((e) => e.event === 'contract_alert');
    assert.strictEqual(emitted.length, 1);
    assert.strictEqual(emitted[0].domId, domainA);
    assert.strictEqual(emitted[0].payload.windowDays, 30, 'SC-001: +20 days maps to the 30-day window only');
    assert.strictEqual(emitted[0].payload.contractId, contractA1.id);

    const dbA = getDomainDb(domainA);
    const rowsA = dbA.all('SELECT * FROM alert_events WHERE contract_id = ?', [contractA1.id]);
    assert.strictEqual(rowsA.length, 1, 'one row per contract x window');
    assert.strictEqual(rowsA[0].window_days, 30);
    assert.strictEqual(rowsA[0].email_status, 'skipped', 'no SMTP_* in tests -> skipped');

    const rowsB = getDomainDb(domainB).all('SELECT * FROM alert_events');
    assert.strictEqual(rowsB.length, 0, 'SC-005: suspended domain is skipped');

    const second = await runExpirySweep();
    assert.strictEqual(second.swept, 0, 'FR-003: repeat pass does not re-alert');
    assert.strictEqual(dbA.all('SELECT * FROM alert_events WHERE contract_id = ?', [contractA1.id]).length, 1);
  } finally {
    setEmitter(null);
  }
});

test('FR-005: janelas alteradas do domínio mudam o que a varredura observa', async () => {
  getPlatformDb().run('UPDATE domains SET alert_windows = ? WHERE id = ?', ['[15]', domainA]);
  contractA2 = await createContract(gestorToken, finalidadeId, 'Contrato A2', 10);
  const result = await runExpirySweep({ emailTimeoutMs: 100 });
  assert.strictEqual(result.swept, 1);
  const dbA = getDomainDb(domainA);
  const rowsA2 = dbA.all('SELECT window_days FROM alert_events WHERE contract_id = ?', [contractA2.id]);
  assert.deepStrictEqual(rowsA2.map((r) => r.window_days), [15], 'custom [15] window observed');
});

test('FR-006: notifyFn sent grava email_status sent', async () => {
  contractA3 = await createContract(gestorToken, finalidadeId, 'Contrato A3', 5);
  const result = await runExpirySweep({ notifyFn: async () => ({ sent: true }), emailTimeoutMs: 100 });
  assert.strictEqual(result.emailed, 1);
  const row = getDomainDb(domainA).get(
    "SELECT email_status FROM alert_events WHERE contract_id = ? AND window_days = 15",
    [contractA3.id]
  );
  assert.strictEqual(row.email_status, 'sent');
});

test('FR-006: notifyFn sem resposta em 5 s grava failed e a varredura continua', async () => {
  contractA4 = await createContract(gestorToken, finalidadeId, 'Contrato A4', 3);
  const result = await runExpirySweep({
    notifyFn: () => new Promise(() => {}),
    emailTimeoutMs: 50,
  });
  assert.strictEqual(result.failed, 1);
  const row = getDomainDb(domainA).get(
    "SELECT email_status FROM alert_events WHERE contract_id = ? AND window_days = 15",
    [contractA4.id]
  );
  assert.strictEqual(row.email_status, 'failed');
});

test('FR-006: POST /api/v2/alerts/sweep exige admin e respeita o escopo do domínio', async () => {
  const ok = await request(app).post('/api/v2/alerts/sweep').set(as(adminToken)).send({});
  assert.strictEqual(ok.status, 200);
  assert.deepStrictEqual(Object.keys(ok.body).sort(), ['emailed', 'emitted', 'failed', 'swept']);

  const forbidden = await request(app).post('/api/v2/alerts/sweep').set(as(gestorToken)).send({});
  assert.strictEqual(forbidden.status, 403);

  const crossDomain = await request(app)
    .post('/api/v2/alerts/sweep')
    .set(as(adminToken))
    .send({ domainId: domainB });
  assert.strictEqual(crossDomain.status, 403, 'scopeDomain refuses foreign domainId');

  const unauth = await request(app).post('/api/v2/alerts/sweep').send({});
  assert.strictEqual(unauth.status, 401);
});

// ---- E005 (00011): painel de próximos vencimentos — acceptance tests ----
// Domínio próprio (domainC), criado sob demanda: o estado dos E004 acima
// (domainA com alert_windows '[15]') nunca é tocado. panelDate() formata a
// meia-noite LOCAL em +N dias para daysUntil() devolver dias exatos —
// imune a fuso nas bordas inclusivas (janela >= dias).

function panelDate(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

let domainC;
let adminCToken;
let gestorCToken;
let prestadorCToken;
let fimC;
const P = {};

async function createPanelContract(token, name, forecastDays) {
  const res = await request(app)
    .post('/api/v2/contracts')
    .set(as(token))
    .send({
      name,
      object: `${name} objeto`,
      purpose_id: fimC,
      start_date: panelDate(-10),
      forecast_date: panelDate(forecastDays),
    });
  assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  return res.body.contract;
}

async function ensurePanelDomain() {
  if (domainC) return;
  const sysToken = await login(SYS_EMAIL, SYS_PASSWORD);
  domainC = await enableDomain(sysToken, 'Vencimentos Gama', 'admin.gama@alerts.test');
  adminCToken = await login('admin.gama@alerts.test', 'Secret1!', domainC);

  await request(app)
    .post('/api/v2/users')
    .set(as(adminCToken))
    .send({ name: 'Gestor Gama', email: 'gestor.gama@alerts.test', password: 'Secret1!', role: 'gestor', username: 'gestor.gama' });
  gestorCToken = await login('gestor.gama@alerts.test', 'Secret1!', domainC);

  await request(app)
    .post('/api/v2/users')
    .set(as(adminCToken))
    .send({ name: 'Prestador Gama', email: 'prestador.gama@alerts.test', password: 'Secret1!', role: 'prestador', username: 'prestador.gama' });
  prestadorCToken = await login('prestador.gama@alerts.test', 'Secret1!', domainC);

  const fim = await request(app).post('/api/v2/purposes').set(as(adminCToken)).send({ name: 'Painel' });
  assert.strictEqual(fim.status, 201);
  fimC = fim.body.finalidade.id;

  P.vencido = await createPanelContract(gestorCToken, 'Já vencido', -3);
  P.p10 = await createPanelContract(gestorCToken, 'Vence em 10 dias', 10);
  P.p25 = await createPanelContract(gestorCToken, 'Vence em 25 dias', 25);
  P.p45 = await createPanelContract(gestorCToken, 'Vence em 45 dias', 45);
  P.p60a = await createPanelContract(gestorCToken, 'Vence em 60 dias A', 60);
  P.p60b = await createPanelContract(gestorCToken, 'Vence em 60 dias B', 60);
  P.p120 = await createPanelContract(gestorCToken, 'Vence em 120 dias', 120);
  // Encerrado com previsão longe de qualquer janela: provoca a exclusão do
  // painel sem interferir na contagem da varredura de FR-007.
  P.encerrado = await createPanelContract(gestorCToken, 'Encerrado fora do painel', 200);

  const dbC = getDomainDb(domainC);
  dbC.run('UPDATE contracts SET status = ? WHERE id = ?', [
    code('contracts.status', 'encerrado'),
    P.encerrado.id,
  ]);
  // Incompletos: fixture legada (POST exige data válida) — o painel trata
  // qualquer linha sem previsão como incompleto e a mantém visível (SC-005).
  dbC.run(
    `INSERT INTO contracts(name, object, purpose_id, start_date, forecast_date)
     VALUES (?, NULL, ?, ?, '')`,
    ['Sem previsão um', fimC, panelDate(-30)]
  );
  dbC.run(
    `INSERT INTO contracts(name, object, purpose_id, start_date, forecast_date)
     VALUES (?, NULL, ?, ?, '')`,
    ['Sem previsão dois', fimC, panelDate(-30)]
  );
  P.inc1 = dbC.get("SELECT id FROM contracts WHERE name = 'Sem previsão um'");
  P.inc2 = dbC.get("SELECT id FROM contracts WHERE name = 'Sem previsão dois'");

  // alert_events como se a varredura E004 já tivesse passado antes do painel:
  dbC.run("INSERT INTO alert_events(contract_id, window_days, email_status) VALUES (?, 15, 'sent')", [P.p10.id]);
  dbC.run("INSERT INTO alert_events(contract_id, window_days, email_status) VALUES (?, 30, 'skipped')", [P.p45.id]);
  dbC.run("INSERT INTO alert_events(contract_id, window_days, email_status) VALUES (?, 60, 'skipped')", [P.p60a.id]);
}

test('E005 FR-001: painel agrupa por janela, ordena por previsão e expõe incompletos', async () => {
  await ensurePanelDomain();
  const res = await request(app).get('/api/v2/alerts/panel').set(as(gestorCToken));
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  const body = res.body;

  assert.deepStrictEqual(body.windows, [90, 60, 30, 15], 'janelas efetivas do domínio vêm no payload');
  assert.strictEqual(body.total, 9, 'vigentes: 7 datados + 2 incompletos; encerrado fora');
  assert.strictEqual(body.incomplete, 2, 'contagem da lista incompleta (SC-005)');
  assert.strictEqual(body.limit, 50);
  assert.strictEqual(body.offset, 0);
  assert.strictEqual(body.items.length, 9);

  // Incompletos primeiro e fora dos blocos: sem window/days_left/alertado.
  const firstTwo = body.items.slice(0, 2);
  assert.deepStrictEqual(firstTwo.map((i) => i.id), [P.inc1.id, P.inc2.id], 'incompletos no topo (FR-004)');
  for (const item of firstTwo) {
    assert.strictEqual(item.forecast_date, null);
    assert.strictEqual(item.window, undefined, 'incompleto não cai em bloco nenhum');
    assert.strictEqual(item.alertado, undefined);
  }

  // Datados em ordem de previsão com o mais urgente no topo.
  const dated = body.items.slice(2);
  assert.deepStrictEqual(
    dated.map((i) => i.id),
    [P.vencido.id, P.p10.id, P.p25.id, P.p45.id, P.p60a.id, P.p60b.id, P.p120.id],
    'forecast asc com desempate por id'
  );
  const byId = Object.fromEntries(dated.map((i) => [i.id, i]));
  assert.strictEqual(byId[P.vencido.id].window, 15, 'vencido (-3 dias) fica no bloco 15');
  assert.strictEqual(byId[P.vencido.id].days_left, -3);
  assert.strictEqual(byId[P.p10.id].window, 15);
  assert.strictEqual(byId[P.p10.id].days_left, 10);
  assert.strictEqual(byId[P.p25.id].window, 30);
  assert.strictEqual(byId[P.p45.id].window, 60);
  // Borda inclusiva: exatamente 60 dias -> janela 60 (janela >= dias), não 90.
  assert.strictEqual(byId[P.p60a.id].window, 60);
  assert.strictEqual(byId[P.p60b.id].window, 60);
  assert.strictEqual(byId[P.p120.id].window, null, 'SC-001: >90 dias vai para fora das janelas');
  assert.strictEqual(byId[P.p120.id].days_left, 120);
  assert.ok(!body.items.some((i) => i.id === P.encerrado.id), 'encerrado não aparece');
});

test('E005 FR-002: alertado vem de alert_events da janela atribuída', async () => {
  await ensurePanelDomain();
  const fetchPanel = async () => {
    const res = await request(app).get('/api/v2/alerts/panel').set(as(gestorCToken));
    assert.strictEqual(res.status, 200);
    return Object.fromEntries(res.body.items.map((i) => [i.id, i]));
  };

  let items = await fetchPanel();
  assert.strictEqual(items[P.p10.id].alertado, true, 'linha na 15 == janela atribuída => alertado');
  assert.strictEqual(items[P.p60a.id].alertado, true, 'borda inclusiva: dias == janela == 60');
  assert.strictEqual(items[P.p45.id].alertado, false, 'evento existe, mas na 30; atribuída é 60 => não conta');
  assert.strictEqual(items[P.p25.id].alertado, false, 'sem linha em alert_events');
  assert.strictEqual(items[P.p60b.id].alertado, false);
  assert.strictEqual(items[P.vencido.id].alertado, false);
  assert.strictEqual(items[P.p120.id].alertado, false, 'fora das janelas nunca alerta');

  // O estado deriva da tabela a cada leitura (sem cache entre requisições).
  const dbC = getDomainDb(domainC);
  dbC.run('DELETE FROM alert_events WHERE contract_id = ? AND window_days = 60', [P.p60a.id]);
  items = await fetchPanel();
  assert.strictEqual(items[P.p60a.id].alertado, false, 'sem linha => false na releitura');

  dbC.run("INSERT INTO alert_events(contract_id, window_days, email_status) VALUES (?, 60, 'skipped')", [P.p60a.id]);
  items = await fetchPanel();
  assert.strictEqual(items[P.p60a.id].alertado, true, 'linha restaurada => true');
});

test('E005 FR-003: prestador e domínio divergente recebem 403 sem leitura do painel', async () => {
  await ensurePanelDomain();

  const panelP = await request(app).get('/api/v2/alerts/panel').set(as(prestadorCToken));
  assert.strictEqual(panelP.status, 403, 'prestador não lê o painel');
  assert.strictEqual(panelP.body.items, undefined, 'nenhum item vazado no 403');
  assert.strictEqual(panelP.body.windows, undefined);

  const winP = await request(app).get('/api/v2/alerts/windows').set(as(prestadorCToken));
  assert.strictEqual(winP.status, 403, 'prestador não lê as janelas');
  assert.strictEqual(winP.body.windows, undefined, 'nenhuma janela vazada no 403');

  const putP = await request(app).put('/api/v2/alerts/windows').set(as(prestadorCToken)).send({ windows: [45] });
  assert.strictEqual(putP.status, 403, 'prestador não grava as janelas');

  // Domínio divergente: token de domainC mirando domainA => 403 nos 3 verbos.
  const cross = await request(app).get('/api/v2/alerts/panel').set(as(adminCToken)).query({ domainId: domainA });
  assert.strictEqual(cross.status, 403, 'scopeDomain recusa domainId alheio na leitura');
  assert.strictEqual(cross.body.items, undefined);
  const crossWrite = await request(app)
    .put('/api/v2/alerts/windows')
    .set(as(adminCToken))
    .send({ windows: [45], domainId: domainA });
  assert.strictEqual(crossWrite.status, 403, 'scopeDomain recusa domainId alheio na escrita');

  // A tentativa divergente não escreveu em domínio nenhum (403 antes do UPDATE).
  const platform = getPlatformDb();
  assert.strictEqual(
    platform.get('SELECT alert_windows FROM domains WHERE id = ?', [domainA]).alert_windows,
    '[15]',
    'domínio alheio permanece intocado'
  );
  assert.strictEqual(
    platform.get('SELECT alert_windows FROM domains WHERE id = ?', [domainC]).alert_windows,
    null,
    'próprio domínio também não foi escrito pela tentativa recusada'
  );

  // system_admin fica fora da matriz admin|gestor (FR-003).
  const sysToken = await login(SYS_EMAIL, SYS_PASSWORD);
  const sysRead = await request(app).get('/api/v2/alerts/panel').set(as(sysToken));
  assert.strictEqual(sysRead.status, 403);

  const noAuth = await request(app).get('/api/v2/alerts/panel');
  assert.strictEqual(noAuth.status, 401, 'sem token => 401');
});

test('E005 FR-004: paginação limit/offset estável com desempate por id', async () => {
  await ensurePanelDomain();
  const page = async (limit, offset) => {
    const res = await request(app).get('/api/v2/alerts/panel').query({ limit, offset }).set(as(gestorCToken));
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    return res.body;
  };

  const p0 = await page(3, 0);
  assert.strictEqual(p0.limit, 3);
  assert.strictEqual(p0.offset, 0);
  assert.strictEqual(p0.total, 9, 'total é do domínio, não da página');
  assert.strictEqual(p0.incomplete, 2);
  assert.deepStrictEqual(
    p0.items.map((i) => i.id),
    [P.inc1.id, P.inc2.id, P.vencido.id],
    'incompletos primeiro na primeira página'
  );
  const p1 = await page(3, 3);
  assert.deepStrictEqual(p1.items.map((i) => i.id), [P.p10.id, P.p25.id, P.p45.id]);
  const p2 = await page(3, 6);
  assert.deepStrictEqual(p2.items.map((i) => i.id), [P.p60a.id, P.p60b.id, P.p120.id]);

  // Desempate por id estabiliza a fronteira de páginas (forecast empatado).
  const edge = await page(7, 0);
  assert.strictEqual(edge.items[6].id, P.p60a.id, 'última vaga: A antes de B');
  const edgeNext = await page(7, 7);
  assert.strictEqual(edgeNext.items[0].id, P.p60b.id, 'próxima página começa em B: sem sobreposição');

  const full = await page(200, 0);
  assert.deepStrictEqual(
    [...p0.items, ...p1.items, ...p2.items].map((i) => i.id),
    full.items.map((i) => i.id),
    'união das páginas == leitura única: sem lacunas nem repetições'
  );
  assert.strictEqual(full.limit, 200, 'limit clampado em 200 (contrato GET /api/v2/contracts)');
  assert.strictEqual((await page(0, 0)).limit, 50, 'limit 0 cai no default 50');
  assert.strictEqual((await page(999, -5)).offset, 0, 'offset negativo clampado em 0');

  const past = await page(3, 99);
  assert.deepStrictEqual(past.items, [], 'página além do fim vem vazia');
  assert.strictEqual(past.total, 9, 'totais do domínio preservados fora do hot path');
  assert.strictEqual(past.incomplete, 2);
});

test('E005 FR-005: GET /api/v2/alerts/windows devolve default sem setup e valor custom após gravação', async () => {
  await ensurePanelDomain();
  const platform = getPlatformDb();
  const stored = () => platform.get('SELECT alert_windows FROM domains WHERE id = ?', [domainC]).alert_windows;
  assert.strictEqual(stored(), null, 'domínio novo não precisa de setup');

  const def = await request(app).get('/api/v2/alerts/windows').set(as(adminCToken));
  assert.strictEqual(def.status, 200);
  assert.deepStrictEqual(def.body.windows, [90, 60, 30, 15]);
  const asGestor = await request(app).get('/api/v2/alerts/windows').set(as(gestorCToken));
  assert.deepStrictEqual(asGestor.body.windows, [90, 60, 30, 15], 'gestor também lê');

  const write = await request(app).put('/api/v2/alerts/windows').set(as(adminCToken)).send({ windows: [45, 30] });
  assert.strictEqual(write.status, 200);
  const custom = await request(app).get('/api/v2/alerts/windows').set(as(adminCToken));
  assert.deepStrictEqual(custom.body.windows, [45, 30], 'custom reflete na releitura');
  assert.strictEqual(stored(), '[45,30]');

  const reset = await request(app).put('/api/v2/alerts/windows').set(as(adminCToken)).send({ windows: null });
  assert.strictEqual(reset.status, 200);
  assert.deepStrictEqual(reset.body.windows, [90, 60, 30, 15]);
  assert.strictEqual(stored(), null, 'null restaura a coluna para o default');
});

test('E005 FR-006: PUT /api/v2/alerts/windows valida estrito (400 sem efeito), grava e restaura', async () => {
  await ensurePanelDomain();
  const platform = getPlatformDb();
  const stored = () => platform.get('SELECT alert_windows FROM domains WHERE id = ?', [domainC]).alert_windows;

  const valid = await request(app)
    .put('/api/v2/alerts/windows')
    .set(as(adminCToken))
    .send({ windows: [15, 45, 45] });
  assert.strictEqual(valid.status, 200);
  assert.deepStrictEqual(valid.body.windows, [45, 15], 'canonical: dedup + ordem desc');
  assert.strictEqual(stored(), '[45,15]');

  const invalidPayloads = [
    { label: 'vazio', windows: [] },
    { label: 'zero', windows: [0, 15] },
    { label: 'negativo', windows: [-30] },
    { label: 'fracionário', windows: [15.5] },
    { label: 'texto', windows: ['abc'] },
    { label: 'booleano', windows: [true] },
    { label: 'não-array', windows: 'x' },
    { label: 'número', windows: 15 },
    { label: 'objeto', windows: { a: 1 } },
    { label: 'campo ausente', omit: true },
  ];
  for (const payload of invalidPayloads) {
    const res = await request(app)
      .put('/api/v2/alerts/windows')
      .set(as(adminCToken))
      .send(payload.omit ? {} : { windows: payload.windows });
    assert.strictEqual(res.status, 400, `${payload.label} deveria responder 400`);
    assert.ok(res.body.error, `${payload.label} explica o erro`);
    assert.strictEqual(stored(), '[45,15]', `${payload.label}: escrita inválida não tem efeito`);
  }

  const reset = await request(app).put('/api/v2/alerts/windows').set(as(adminCToken)).send({ windows: null });
  assert.strictEqual(reset.status, 200);
  assert.deepStrictEqual(reset.body.windows, [90, 60, 30, 15]);
  assert.strictEqual(stored(), null);

  // Gestor configura o próprio domínio (matriz admin|gestor da FR-005/006).
  const gestorWrite = await request(app).put('/api/v2/alerts/windows').set(as(gestorCToken)).send({ windows: [30] });
  assert.strictEqual(gestorWrite.status, 200);
  assert.deepStrictEqual(gestorWrite.body.windows, [30]);
  assert.strictEqual(stored(), '[30]');
});

test('E005 FR-007: config nova reflete no painel e na varredura seguinte, sem regravar alert_events', async () => {
  await ensurePanelDomain();
  const platform = getPlatformDb();
  const dbC = getDomainDb(domainC);

  const put = await request(app).put('/api/v2/alerts/windows').set(as(adminCToken)).send({ windows: [45] });
  assert.strictEqual(put.status, 200);
  assert.deepStrictEqual(put.body.windows, [45]);
  assert.strictEqual(
    platform.get('SELECT alert_windows FROM domains WHERE id = ?', [domainC]).alert_windows,
    '[45]'
  );

  // Releitura no mesmo processo: o agrupamento muda na hora (sem reinício).
  const beforeSweep = await request(app).get('/api/v2/alerts/panel').set(as(gestorCToken));
  assert.strictEqual(beforeSweep.status, 200);
  assert.deepStrictEqual(beforeSweep.body.windows, [45]);
  const items = Object.fromEntries(beforeSweep.body.items.map((i) => [i.id, i]));
  assert.strictEqual(items[P.p45.id].window, 45, '45 dias agora cai na janela 45');
  assert.strictEqual(items[P.p10.id].window, 45);
  assert.strictEqual(items[P.p25.id].window, 45);
  assert.strictEqual(items[P.p60b.id].window, null, 'saiu da 60 e ficou fora das janelas');
  assert.strictEqual(items[P.p120.id].window, null);

  const eventsBefore = dbC.all('SELECT * FROM alert_events ORDER BY id');
  assert.strictEqual(eventsBefore.length, 3, 'semente 15/30/60 gravada antes da troca');

  const result = await runExpirySweep({
    domainId: domainC,
    notifyFn: async () => ({ sent: false, skipped: true }),
    emailTimeoutMs: 100,
  });
  assert.strictEqual(result.swept, 3, 'vencido/fora/200d pulados; 10/25/45 dias agora na 45');
  assert.strictEqual(result.failed, 0);

  // Histórico não regravado: linhas antigas intactas, só as novas somam.
  const eventsAfter = dbC.all('SELECT * FROM alert_events ORDER BY id');
  assert.deepStrictEqual(
    eventsAfter.slice(0, eventsBefore.length),
    eventsBefore,
    'FR-007: alert_events anteriores permanecem byte a byte'
  );
  const newWindows = eventsAfter.slice(eventsBefore.length).map((e) => `${e.contract_id}:${e.window_days}`).sort();
  const expectedNew = [`${P.p10.id}:45`, `${P.p25.id}:45`, `${P.p45.id}:45`].sort();
  assert.deepStrictEqual(newWindows, expectedNew, 'varredura seguinte observa a nova janela');

  // Painel pós-varredura: alertado agora deriva da janela 45 gravada.
  const after = await request(app).get('/api/v2/alerts/panel').set(as(gestorCToken));
  const afterItems = Object.fromEntries(after.body.items.map((i) => [i.id, i]));
  assert.strictEqual(afterItems[P.p10.id].alertado, true, 'varredura gravou a 45 que o painel atribui');
  assert.strictEqual(afterItems[P.p45.id].alertado, true);
  assert.strictEqual(afterItems[P.p60a.id].alertado, false, 'sem varredura na 60 desde a troca');
});

// ---- E010 (00012): avisos por e-mail — e2e com SMTP real ----
// fakeSmtp(): servidor SMTP de captura no padrão de services/email.test.js
// (220/250 EHLO/MAIL/RCPT, 354 em DATA, 221 em QUIT), porta efêmera em
// 127.0.0.1. Os testes E010 apontam SMTP_HOST/SMTP_PORT para cá e removem no
// teardown (plan HINT-002: env nunca vaza para o modo inerte dos demais).
function fakeSmtp() {
  const messages = [];
  const server = net.createServer((sock) => {
    let buf = '';
    let inData = false;
    sock.write('220 localhost ESMTP\r\n');
    sock.on('data', (chunk) => {
      buf += chunk;
      if (inData) {
        const end = buf.indexOf('\r\n.\r\n');
        if (end !== -1) {
          messages.push(buf.slice(0, end));
          buf = buf.slice(end + 5);
          inData = false;
          sock.write('250 2.0.0 queued\r\n');
        }
        return;
      }
      let i;
      while ((i = buf.indexOf('\r\n')) !== -1) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (line.startsWith('EHLO')) sock.write('250-localhost\r\n250 SIZE 10000000\r\n');
        else if (line.startsWith('MAIL')) sock.write('250 2.1.0 Ok\r\n');
        else if (line.startsWith('RCPT')) sock.write('250 2.1.5 Ok\r\n');
        else if (line.startsWith('DATA')) {
          inData = true;
          sock.write('354 End data with <CR><LF>.<CR><LF>\r\n');
        } else if (line.startsWith('QUIT')) {
          sock.write('221 2.0.0 Bye\r\n');
          sock.end();
        }
      }
    });
    sock.on('error', () => {});
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, messages, port: server.address().port });
    });
  });
}

module.exports = { fakeSmtp };

// ---- E010 (00012) FR-002: varredura e2e com notify padrão real ----
// Domínio próprio (domainD), um único contrato dentro da janela 30 (futuro
// +20d): primeira varredura envia UMA mensagem ao creator_email e grava
// 'sent'; a segunda é deduplicada pela UNIQUE (SC-002, zero reenvio).
let domainD;
let adminDToken;
let gestorDToken;
let sweepContract;
let failContract;

async function ensureSweepDomain() {
  if (!domainD) {
    const sysToken = await login(SYS_EMAIL, SYS_PASSWORD);
    domainD = await enableDomain(sysToken, 'Varredura Épsilon', 'admin.eps@alerts.test');
    adminDToken = await login('admin.eps@alerts.test', 'Secret1!', domainD);

    await request(app)
      .post('/api/v2/users')
      .set(as(adminDToken))
      .send({ name: 'Gestor Varredura', email: 'gestor.sweep@alerts.test', password: 'Secret1!', role: 'gestor', username: 'gestor.sweep' });
    gestorDToken = await login('gestor.sweep@alerts.test', 'Secret1!', domainD);
  }
  if (!sweepContract) {
    const fim = await request(app).post('/api/v2/purposes').set(as(adminDToken)).send({ name: 'Varredura' });
    assert.strictEqual(fim.status, 201);

    const created = await request(app)
      .post('/api/v2/contracts')
      .set(as(gestorDToken))
      .send({
        name: 'Contrato na janela 30',
        object: 'E010 varredura objeto',
        purpose_id: fim.body.finalidade.id,
        start_date: futureDate(-10),
        forecast_date: futureDate(20),
      });
    assert.strictEqual(created.status, 201, JSON.stringify(created.body));
    sweepContract = created.body.contract;
    Object.assign(sweepContract, { finalidadeId: fim.body.finalidade.id });
  }
}

test('E010 FR-002: varredura com notify padrão envia uma vez a creator_email e deduplica (SC-002)', async () => {
  await ensureSweepDomain();
  const smtp = await fakeSmtp();
  process.env.SMTP_HOST = '127.0.0.1';
  process.env.SMTP_PORT = String(smtp.port);
  try {
    const first = await request(app).post('/api/v2/alerts/sweep').set(as(adminDToken)).send({});
    assert.strictEqual(first.status, 200, JSON.stringify(first.body));
    assert.deepStrictEqual(first.body, { swept: 1, emitted: 1, emailed: 1, failed: 0 },
      'um contrato na janela, um e-mail enviado');

    assert.strictEqual(smtp.messages.length, 1, 'exatamente uma mensagem capturada');
    assert.ok(smtp.messages[0].includes('gestor.sweep@alerts.test'),
      'destino do vencimento = creator_email (criador do contrato)');
    assert.ok(smtp.messages[0].includes('Subject: =?UTF-8?B?'), 'assunto do evento em RFC2047 (acentuado)');
    assert.ok(smtp.messages[0].includes('Contrato: Contrato na janela 30'), 'corpo cita o contrato');
    assert.ok(smtp.messages[0].includes('Janela: 30 dias'), 'corpo cita a janela atribuida');

    const row = getDomainDb(domainD).get(
      'SELECT email_status FROM alert_events WHERE contract_id = ?',
      [sweepContract.id]
    );
    assert.strictEqual(row.email_status, 'sent', 'FR-002: linha gravada como sent');

    const countAfterFirst = smtp.messages.length;
    const second = await request(app).post('/api/v2/alerts/sweep').set(as(adminDToken)).send({});
    assert.strictEqual(second.status, 200, JSON.stringify(second.body));
    assert.deepStrictEqual(second.body, { swept: 0, emitted: 0, emailed: 0, failed: 0 },
      'SC-002: UNIQUE dedup — segunda varredura nao emite nem reenvia');
    assert.strictEqual(smtp.messages.length, countAfterFirst, 'SC-002: zero reenvio');
  } finally {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    smtp.server.close();
  }
});

// ---- E010 (00012) FR-003: o painel expõe email_status da janela atribuída ----
// Normaliza as janelas para o default (o FR-007 deixou [45]) e usa o mesmo
// fixture domainC: sent na 15 (p10), skipped na 60 (p60a), failed gravado na
// 30 (p25) e null em toda janela sem linha — o trio de estados de SC-003,
// sempre no par da janela que o agrupamento atribuiu (STF-002).
test('E010 FR-003: painel expõe email_status da janela atribuída sem tocar as demais seções', async () => {
  await ensurePanelDomain();
  const platform = getPlatformDb();
  const dbC = getDomainDb(domainC);

  const reset = await request(app).put('/api/v2/alerts/windows').set(as(adminCToken)).send({ windows: null });
  assert.strictEqual(reset.status, 200);
  assert.deepStrictEqual(reset.body.windows, [90, 60, 30, 15], 'default restaurado para a leitura');
  dbC.run("INSERT OR IGNORE INTO alert_events(contract_id, window_days, email_status) VALUES (?, 30, 'failed')", [P.p25.id]);

  const res = await request(app).get('/api/v2/alerts/panel').set(as(gestorCToken));
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  const body = res.body;

  // Demais seções intactas (payload E005 preservado).
  assert.deepStrictEqual(body.windows, [90, 60, 30, 15]);
  assert.strictEqual(body.total, 9);
  assert.strictEqual(body.incomplete, 2);
  assert.strictEqual(body.limit, 50);
  assert.strictEqual(body.offset, 0);
  assert.strictEqual(body.items.length, 9);

  const byId = Object.fromEntries(body.items.map((i) => [i.id, i]));
  assert.strictEqual(byId[P.p10.id].window, 15);
  assert.strictEqual(byId[P.p10.id].alertado, true, 'alertado continua derivando da mesma linha');
  assert.strictEqual(byId[P.p10.id].email_status, 'sent', 'SC-003: estado sent da janela 15');

  assert.strictEqual(byId[P.p60a.id].window, 60);
  assert.strictEqual(byId[P.p60a.id].email_status, 'skipped', 'SC-003: estado skipped da janela 60');

  assert.strictEqual(byId[P.p25.id].window, 30);
  assert.strictEqual(byId[P.p25.id].email_status, 'failed', 'SC-003: estado failed da janela 30');
  assert.strictEqual(byId[P.p25.id].alertado, true, 'linha em qualquer status conta como alertado');

  // STF-002: linha em OUTRA janela não vaza para a atribuída.
  assert.strictEqual(byId[P.p45.id].window, 60);
  assert.strictEqual(byId[P.p45.id].email_status, null, 'eventos nas 30/45; atribuída é 60 => null');
  assert.strictEqual(byId[P.p45.id].alertado, false);

  // Sem linha alguma ou fora das janelas => null.
  assert.strictEqual(byId[P.vencido.id].email_status, null, 'vencido sem linha na 15');
  assert.strictEqual(byId[P.p60b.id].email_status, null);
  assert.strictEqual(byId[P.p120.id].window, null);
  assert.strictEqual(byId[P.p120.id].email_status, null, 'fora das janelas nunca tem status');

  // Incompletos ficam fora dos blocos: campo não existe (igual a window/alertado).
  for (const item of body.items.slice(0, 2)) {
    assert.strictEqual(item.alertado, undefined);
    assert.strictEqual(item.email_status, undefined, 'incompleto não ganha email_status');
    assert.ok(!('email_status' in item), 'sem a chave no payload do incompleto');
  }

  // Chaves originais do item datado permanecem em toda linha.
  for (const item of body.items.slice(2)) {
    for (const key of ['id', 'name', 'forecast_date', 'days_left', 'window', 'alertado', 'email_status']) {
      assert.ok(key in item, `item ${item.id} mantém a chave ${key}`);
    }
  }

  // Admin lê o mesmo payload (guards admin/gestor são E005; aqui só o consumo).
  const adminRes = await request(app).get('/api/v2/alerts/panel').set(as(adminCToken));
  assert.strictEqual(adminRes.status, 200);
  const adminById = Object.fromEntries(adminRes.body.items.map((i) => [i.id, i]));
  assert.strictEqual(adminById[P.p10.id].email_status, 'sent');
});

// E010 T009 (FR-005/SC-003): host morto — porta reservada e fechada (conexão
// recusada na hora). A varredura completa com coerência de contagens, grava
// 'failed' e o painel expõe exatamente o par da janela atribuída.
async function closedPort() {
  const probe = net.createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

test('E010 FR-005: host morto grava failed, painel expõe failed e a varredura completa', async () => {
  await ensureSweepDomain();
  const deadPort = await closedPort();
  process.env.SMTP_HOST = '127.0.0.1';
  process.env.SMTP_PORT = String(deadPort);
  try {
    // Segundo contrato, ainda sem alert_events (25 dias => janela 30).
    const created = await request(app)
      .post('/api/v2/contracts')
      .set(as(gestorDToken))
      .send({
        name: 'Contrato host morto',
        object: 'E010 host morto objeto',
        purpose_id: sweepContract.finalidadeId,
        start_date: futureDate(-10),
        forecast_date: futureDate(25),
      });
    assert.strictEqual(created.status, 201, JSON.stringify(created.body));
    failContract = created.body.contract;

    const result = await request(app).post('/api/v2/alerts/sweep').set(as(adminDToken)).send({});
    assert.strictEqual(result.status, 200, JSON.stringify(result.body));
    // swept ≥ emailed + failed (SC-003): dedup do contrato 1 fora, host morto
    // conta como failed e a varredura não aborta.
    assert.ok(result.body.swept >= result.body.emailed + result.body.failed,
      `swept ${result.body.swept} >= emailed ${result.body.emailed} + failed ${result.body.failed}`);
    assert.strictEqual(result.body.emitted, result.body.swept, 'cada linha nova vira um evento');
    assert.strictEqual(result.body.failed, 1, 'somente o contrato sem dedup tenta enviar');
    assert.strictEqual(result.body.emailed, 0, 'host morto nunca entrega');

    const row = getDomainDb(domainD).get(
      'SELECT email_status FROM alert_events WHERE contract_id = ?',
      [failContract.id]
    );
    assert.strictEqual(row.email_status, 'failed', 'SC-003: estado failed persistido');

    // O contrato 1 segue deduplicado — nada além do host morto foi tentado.
    const rows1 = getDomainDb(domainD).all('SELECT * FROM alert_events WHERE contract_id = ?', [sweepContract.id]);
    assert.strictEqual(rows1.length, 1);
    assert.strictEqual(rows1[0].email_status, 'sent', 'linha sent original intacta');

    // Painel do domínio: email_status failed na janela 30 do contrato novo.
    const panel = await request(app).get('/api/v2/alerts/panel').set(as(adminDToken));
    assert.strictEqual(panel.status, 200, JSON.stringify(panel.body));
    const items = Object.fromEntries(panel.body.items.map((i) => [i.id, i]));
    assert.strictEqual(items[failContract.id].window, 30);
    assert.strictEqual(items[failContract.id].email_status, 'failed', 'painel expoe o failed');
    assert.strictEqual(items[failContract.id].alertado, true);
    assert.strictEqual(items[sweepContract.id].email_status, 'sent', 'painel mantem o sent');
  } finally {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
  }
});
