'use strict';

process.env.UPLOAD_DIR = require('path').join(
  require('os').tmpdir(),
  `sddp-uploads-audits-${process.pid}`
);

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir();
const { app } = require('../server');
const { getDomainDb } = require('../config/database');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

const STATES = ['atendido plenamente', 'atendido com resalva', 'deficiente (a corrigir)'];

const s = {};

function as(token) {
  return { Authorization: `Bearer ${token}` };
}

async function login(email, password, domId) {
  const res = await request(app)
    .post('/api/v2/auth/login')
    .send({ email, password, domainId: domId });
  assert.strictEqual(res.status, 200, `${email}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

function futureDate(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

test.before(async () => {
  await initTestDb();

  const sys = await request(app).post('/api/v2/auth/login').send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200);
  s.sysToken = sys.body.token;

  // domínio Alpha — dados sob teste
  const alpha = await request(app)
    .post('/api/v2/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Alpha Auditoria',
      adminName: 'Alfa',
      adminEmail: 'alfa@alpha.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(alpha.status, 201, JSON.stringify(alpha.body));
  s.domainA = alpha.body.domain.id;
  s.adminToken = await login('alfa@alpha.test', 'Secret1!', s.domainA);

  for (const [name, email, role] of [
    ['Gestor A', 'gestor@alpha.test', 'gestor'],
    ['Mov A', 'mov@alpha.test', 'prestador'],
    ['Auditor A', 'auditor@alpha.test', 'auditor'],
  ]) {
    const res = await request(app)
      .post('/api/v2/users')
      .set(as(s.adminToken))
      .send({ name, email, password: 'Secret1!', role, username: email.split('@')[0] });
    assert.strictEqual(res.status, 201, `${email}: ${JSON.stringify(res.body)}`);
  }
  s.gestorToken = await login('gestor@alpha.test', 'Secret1!', s.domainA);
  s.movToken = await login('mov@alpha.test', 'Secret1!', s.domainA);
  s.auditorToken = await login('auditor@alpha.test', 'Secret1!', s.domainA);

  // domínio Beta — isolamento (o segundo domínio nunca pode vazar p/ Alpha)
  const beta = await request(app)
    .post('/api/v2/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Beta Auditoria',
      adminName: 'Beta',
      adminEmail: 'beta@beta.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(beta.status, 201, JSON.stringify(beta.body));
  s.domainB = beta.body.domain.id;
  s.adminBToken = await login('beta@beta.test', 'Secret1!', s.domainB);
  const movB = await request(app)
    .post('/api/v2/users')
    .set(as(s.adminBToken))
    .send({ name: 'Mov B', email: 'mov@beta.test', password: 'Secret1!', role: 'prestador', username: 'movb' });
  assert.strictEqual(movB.status, 201);
  s.movBToken = await login('mov@beta.test', 'Secret1!', s.domainB);

  const dbA = getDomainDb(s.domainA);
  const dbB = getDomainDb(s.domainB);
  s.dbA = dbA;
  s.dbB = dbB;

  // Alpha: contrato + 4 tarefas (ids fixos 1..4 — ver FR-004, colisão entre domínios)
  const contract = await request(app)
    .post('/api/v2/contracts')
    .set(as(s.gestorToken))
    .send({ name: 'Obra Alpha', start_date: futureDate(-5), forecast_date: futureDate(60) });
  assert.strictEqual(contract.status, 201, JSON.stringify(contract.body));
  s.contractAId = contract.body.contract.id;

  const movAId = dbA.get("SELECT id FROM users WHERE email = 'mov@alpha.test'").id;
  const linkA = await request(app)
    .post(`/api/v2/contracts/${s.contractAId}/providers`)
    .set(as(s.gestorToken))
    .send({ user_id: movAId });
  assert.strictEqual(linkA.status, 201, JSON.stringify(linkA.body));
  const titles = ['Filler', 'Revisao Alpha', 'Concluida Alpha', 'AFazer Alpha'];
  const created = [];
  for (const title of titles) {
    const res = await request(app)
      .post(`/api/v2/contracts/${s.contractAId}/tasks`)
      .set(as(s.gestorToken))
      .send({ title, assignee_id: movAId });
    assert.strictEqual(res.status, 201, `${title}: ${JSON.stringify(res.body)}`);
    created.push(res.body.task.id);
  }
  s.fillerId = created[0];
  s.revisaoId = created[1];
  s.concluidaId = created[2];
  s.fazerId = created[3];
  assert.deepStrictEqual(created, [1, 2, 3, 4], 'ids determinísticos p/ o teste de colisão');

  // move até Revisão / Concluída como prestador vinculado (FR-010)
  const move = async (id, status) => {
    const res = await request(app)
      .patch(`/api/v2/tasks/${id}/status`)
      .set(as(s.movToken))
      .send({ status });
    assert.strictEqual(res.status, 200, `${id} → ${status}: ${JSON.stringify(res.body)}`);
  };
  await move(s.revisaoId, 'Em Progresso');
  await move(s.revisaoId, 'Revisão');
  await move(s.concluidaId, 'Em Progresso');
  await move(s.concluidaId, 'Revisão');
  const done = await request(app)
    .post(`/api/v2/tasks/${s.concluidaId}/complete`)
    .set(as(s.movToken))
    .send({ text: 'Executada e pronta p/ auditoria' });
  assert.strictEqual(done.status, 200, JSON.stringify(done.body));

  // anexo real no banco (a visão agrega anexos — FR-001)
  dbA.run(
    `INSERT INTO attachments(task_id, kind, path, original_name, uploaded_by)
     VALUES (?, 'file', 'relatorio.pdf', 'relatorio.pdf', ?)`,
    [s.revisaoId, movAId]
  );

  // Beta: 1 tarefa executada com id 1 (nunca endereçável a partir de Alpha)
  const contractB = await request(app)
    .post('/api/v2/contracts')
    .set(as(s.adminBToken))
    .send({ name: 'Obra Beta', start_date: futureDate(-5), forecast_date: futureDate(60) });
  assert.strictEqual(contractB.status, 201, JSON.stringify(contractB.body));
  const movBId = dbB.get("SELECT id FROM users WHERE email = 'mov@beta.test'").id;
  const linkB = await request(app)
    .post(`/api/v2/contracts/${contractB.body.contract.id}/providers`)
    .set(as(s.adminBToken))
    .send({ user_id: movBId });
  assert.strictEqual(linkB.status, 201, JSON.stringify(linkB.body));
  const betaTask = await request(app)
    .post(`/api/v2/contracts/${contractB.body.contract.id}/tasks`)
    .set(as(s.adminBToken))
    .send({ title: 'Executada Beta', assignee_id: movBId });
  assert.strictEqual(betaTask.status, 201, JSON.stringify(betaTask.body));
  s.betaTaskId = betaTask.body.task.id;
  for (const status of ['Em Progresso', 'Revisão']) {
    const res = await request(app)
      .patch(`/api/v2/tasks/${s.betaTaskId}/status`)
      .set(as(s.movBToken))
      .send({ status });
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  }
});

test('FR-001 executed-only domain list', async () => {
  const res = await request(app).get('/api/v2/audits/tasks').set(as(s.auditorToken));
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  const tasks = res.body.tasks;
  assert.ok(Array.isArray(tasks), 'tasks é lista');
  const executed = new Set(['Revisão', 'Concluída']);
  for (const task of tasks) {
    assert.ok(executed.has(task.status), `estado fora da visão de executadas: ${task.status}`);
    assert.ok(Object.hasOwn(task, 'classification'), 'item carrega classification (null ou objeto)');
  }
  const ids = tasks.map((task) => task.id).sort((a, b) => a - b);
  assert.deepStrictEqual(ids, [s.revisaoId, s.concluidaId], 'só as executadas do próprio domínio');

  // detalhe agrega histórico e anexos (FR-001)
  const detail = await request(app)
    .get(`/api/v2/audits/tasks/${s.revisaoId}`)
    .set(as(s.auditorToken));
  assert.strictEqual(detail.status, 200, JSON.stringify(detail.body));
  assert.ok(Array.isArray(detail.body.history), 'history é lista');
  assert.ok(detail.body.history.length >= 1, 'histórico da tarefa presente');
  assert.ok(Array.isArray(detail.body.attachments), 'attachments é lista');
  assert.strictEqual(detail.body.attachments.length, 1, 'anexo da tarefa presente');
  assert.strictEqual(detail.body.attachments[0].original_name, 'relatorio.pdf');
  assert.strictEqual(detail.body.id, s.revisaoId);
});

test('FR-002 classification validation', async () => {
  const countFor = (id) =>
    s.dbA.get('SELECT COUNT(*) AS c FROM task_classifications WHERE task_id = ?', [id]).c;

  const badState = await request(app)
    .put(`/api/v2/audits/tasks/${s.revisaoId}/classification`)
    .set(as(s.auditorToken))
    .send({ state: 'estado-inexistente', note: 'ok' });
  assert.strictEqual(badState.status, 400, JSON.stringify(badState.body));

  const longNote = await request(app)
    .put(`/api/v2/audits/tasks/${s.revisaoId}/classification`)
    .set(as(s.auditorToken))
    .send({ state: 'atendido plenamente', note: 'x'.repeat(501) });
  assert.strictEqual(longNote.status, 400, JSON.stringify(longNote.body));
  assert.strictEqual(countFor(s.revisaoId), 0, '400 não escreve');

  const ok = await request(app)
    .put(`/api/v2/audits/tasks/${s.revisaoId}/classification`)
    .set(as(s.auditorToken))
    .send({ state: STATES[1], note: 'entregue com ressalva de prazo' });
  assert.strictEqual(ok.status, 200, JSON.stringify(ok.body));
  const saved = ok.body;
  assert.ok(saved, '200 devolve a classificação corrente');
  assert.strictEqual(saved.state, STATES[1]);
  assert.strictEqual(saved.note, 'entregue com ressalva de prazo');
  assert.ok(saved.classified_by, 'autor gravado');
  assert.ok(saved.classified_at, 'data gravada');
  assert.strictEqual(countFor(s.revisaoId), 1);
});

test('FR-004 classify only executed tasks', async () => {
  const countA = (id) =>
    s.dbA.get('SELECT COUNT(*) AS c FROM task_classifications WHERE task_id = ?', [id]).c;

  // tarefa em A Fazer → 400, sem escrita
  const notExecuted = await request(app)
    .put(`/api/v2/audits/tasks/${s.fazerId}/classification`)
    .set(as(s.auditorToken))
    .send({ state: STATES[0] });
  assert.strictEqual(notExecuted.status, 400, JSON.stringify(notExecuted.body));
  assert.strictEqual(countA(s.fazerId), 0, 'não executada nunca é classificada');

  // token do domínio Beta não escreve em Alpha: id 2 não existe em Beta
  const before = countA(s.revisaoId);
  const cross = await request(app)
    .put(`/api/v2/audits/tasks/${s.revisaoId}/classification`)
    .set(as(s.adminBToken))
    .send({ state: STATES[2] });
  assert.strictEqual(cross.status, 404, JSON.stringify(cross.body));
  assert.strictEqual(countA(s.revisaoId), before, 'domínio alheio intocado');

  // classificar a Concluída é imediato, sem aprovação
  const ok = await request(app)
    .put(`/api/v2/audits/tasks/${s.concluidaId}/classification`)
    .set(as(s.auditorToken))
    .send({ state: STATES[2], note: 'retrabalho necessário' });
  assert.strictEqual(ok.status, 200, JSON.stringify(ok.body));
  assert.strictEqual(countA(s.concluidaId), 1);

  // reaberta sai da visão; o registro permanece (FR-004)
  const reopen = await request(app)
    .post(`/api/v2/tasks/${s.concluidaId}/reopen`)
    .set(as(s.gestorToken))
    .send({ motivo: 'correção pós auditoria' });
  assert.strictEqual(reopen.status, 200, JSON.stringify(reopen.body));

  const list = await request(app).get('/api/v2/audits/tasks').set(as(s.auditorToken));
  assert.strictEqual(list.status, 200, JSON.stringify(list.body));
  const ids = list.body.tasks.map((task) => task.id);
  assert.ok(!ids.includes(s.concluidaId), 'reaberta sai da visão de executadas');
  assert.strictEqual(countA(s.concluidaId), 1, 'classificação da reaberta permanece');
});

// E011 (FR-006) — acceptance stub per plan.md ## Acceptance Test Stubs:
// 403 para prestador/system_admin e domínio cruzado, antes de qualquer consulta.
test('FR-006 role and domain guards', async () => {
  const { signJwt } = require('../middleware/auth');

  // prestador: leitura e classificação invisíveis
  for (const [method, url] of [
    ['get', '/api/v2/audits/tasks'],
    ['get', `/api/v2/audits/tasks/${s.revisaoId}`],
    ['put', `/api/v2/audits/tasks/${s.revisaoId}/classification`],
  ]) {
    const res = await request(app)
      [method](url)
      .set(as(s.movToken))
      .send({ state: 'atendido plenamente' });
    assert.strictEqual(res.status, 403, `${method.toUpperCase()} ${url}: ${JSON.stringify(res.body)}`);
  }

  // system_admin (papel de plataforma) fora do enum de papéis do domínio
  const bySystem = await request(app).get('/api/v2/audits/tasks').set(as(s.sysToken));
  assert.strictEqual(bySystem.status, 403, JSON.stringify(bySystem.body));

  // sessão sem papel algum → 403 (deny-by-default)
  const noRole = signJwt({ id: 1, domainId: s.domainA });
  const byNoRole = await request(app).get('/api/v2/audits/tasks').set(as(noRole));
  assert.strictEqual(byNoRole.status, 403, JSON.stringify(byNoRole.body));

  // isolamento de domínio de E001 antes de qualquer consulta: ?domainId
  // divergente recusa com 403 (scopeDomain)
  const cross = await request(app)
    .get(`/api/v2/audits/tasks?domainId=${s.domainB}`)
    .set(as(s.auditorToken));
  assert.strictEqual(cross.status, 403, JSON.stringify(cross.body));
});
