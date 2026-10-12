'use strict';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir();
const { app } = require('../server');
const { getDomainDb } = require('../config/database');
const { code } = require('../config/enums');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

let domainId;
let adminToken;
let gestorToken;
let prestadorToken;
let otherPrestadorToken;
let finalidadeId;
let prestadorId;

async function login(email, password, domId) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password, domainId: domId });
  assert.strictEqual(res.status, 200, `${email} login failed: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

function as(token) {
  return { Authorization: `Bearer ${token}` };
}

test.before(async () => {
  await initTestDb();

  const sys = await request(app).post('/api/auth/login').send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200);

  const enabled = await request(app)
    .post('/api/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Epsilon Contratos',
      adminName: 'Eva',
      adminEmail: 'eva@epsilon.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201);
  domainId = enabled.body.domain.id;

  adminToken = await login('eva@epsilon.test', 'Secret1!', domainId);

  await request(app)
    .post('/api/users')
    .set(as(adminToken))
    .send({ name: 'Gilda', email: 'gilda@epsilon.test', password: 'Secret1!', role: 'gestor', username: 'gilda' });
  await request(app)
    .post('/api/users')
    .set(as(adminToken))
    .send({ name: 'Paulo', email: 'paulo@epsilon.test', password: 'Secret1!', role: 'prestador', username: 'paulo' });
  await request(app)
    .post('/api/users')
    .set(as(adminToken))
    .send({ name: ' Paula', email: 'paula@epsilon.test', password: 'Secret1!', role: 'prestador', username: 'paula' });

  gestorToken = await login('gilda@epsilon.test', 'Secret1!', domainId);
  prestadorToken = await login('paulo@epsilon.test', 'Secret1!', domainId);
  otherPrestadorToken = await login('paula@epsilon.test', 'Secret1!', domainId);

  const finalidade = await request(app)
    .post('/api/finalidades')
    .set(as(adminToken))
    .send({ name: 'Obra' });
  assert.strictEqual(finalidade.status, 201);
  finalidadeId = finalidade.body.finalidade.id;

  prestadorId = getDomainDb(domainId).get(
    "SELECT id FROM users WHERE email = 'paulo@epsilon.test'"
  ).id;
});

function futureDate(days) {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

function pastDate(days) {
  return futureDate(-days);
}

test('FR-006 create', async () => {
  // gestor creates a contract with finalidade + dates
  const created = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({
      name: 'Reforma Almoxarifado',
      object: 'Reforma geral do almoxarifado central',
      purpose_id: finalidadeId,
      start_date: futureDate(-10),
      forecast_date: futureDate(90),
    });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const contract = created.body.contract;
  assert.ok(contract.id > 0);
  assert.strictEqual(contract.purpose_name, 'Obra');
  assert.strictEqual(contract.status, 'vigente');
  assert.strictEqual(contract.task_count, 0);

  // GET returns the same contract
  const fetched = await request(app)
    .get(`/api/contracts/${contract.id}`)
    .set(as(gestorToken));
  assert.strictEqual(fetched.status, 200);
  assert.strictEqual(fetched.body.contract.name, 'Reforma Almoxarifado');

  // validation failures
  const noName = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ start_date: futureDate(0), forecast_date: futureDate(10) });
  assert.strictEqual(noName.status, 400);

  const badDates = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'X', start_date: 'not-a-date', forecast_date: futureDate(10) });
  assert.strictEqual(badDates.status, 400);

  const badFinalidade = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({
      name: 'Y',
      purpose_id: 999999,
      start_date: futureDate(0),
      forecast_date: futureDate(10),
    });
  assert.strictEqual(badFinalidade.status, 400);

  // role matrix: prestador cannot create (FR-022)
  const forbidden = await request(app)
    .post('/api/contracts')
    .set(as(prestadorToken))
    .send({ name: 'Z', start_date: futureDate(0), forecast_date: futureDate(10) });
  assert.strictEqual(forbidden.status, 403);
});

test('FR-007 unlink block', async () => {
  const db = getDomainDb(domainId);
  const list = await request(app).get('/api/contracts').set(as(gestorToken));
  const contract = list.body.contracts.find((c) => c.name === 'Reforma Almoxarifado');
  assert.ok(contract, 'contract from FR-006 exists');

  // link a prestador
  const linked = await request(app)
    .post(`/api/contracts/${contract.id}/prestadores`)
    .set(as(gestorToken))
    .send({ user_id: prestadorId });
  assert.strictEqual(linked.status, 201, JSON.stringify(linked.body));
  assert.strictEqual(linked.body.contract.prestadores.length, 1);

  // duplicate link refused
  const dup = await request(app)
    .post(`/api/contracts/${contract.id}/prestadores`)
    .set(as(gestorToken))
    .send({ user_id: prestadorId });
  assert.strictEqual(dup.status, 409);

  // non-prestador target refused
  const gestorId = db.get("SELECT id FROM users WHERE email = 'gilda@epsilon.test'").id;
  const wrongRole = await request(app)
    .post(`/api/contracts/${contract.id}/prestadores`)
    .set(as(gestorToken))
    .send({ user_id: gestorId });
  assert.strictEqual(wrongRole.status, 400);

  // open task blocks unlink (edge case: tarefas abertas travam desvinculação)
  db.run(
    `INSERT INTO tasks(contract_id, title, status, priority, assignee_id)
     VALUES (?, 'Abrir portao', ?, 'medium', ?)`,
    [contract.id, code('tasks.status', 'A Fazer'), prestadorId]
  );
  const blocked = await request(app)
    .delete(`/api/contracts/${contract.id}/prestadores/${prestadorId}`)
    .set(as(gestorToken));
  assert.strictEqual(blocked.status, 400);
  assert.match(blocked.body.error, /open tasks/i);
  assert.strictEqual(blocked.body.code, 'OPEN_TASKS_BLOCK_UNLINK');

  // closing the task releases the unlink
  db.run('UPDATE tasks SET status = ? WHERE contract_id = ? AND assignee_id = ?', [
    code('tasks.status', 'Concluída'),
    contract.id,
    prestadorId,
  ]);
  const unlinked = await request(app)
    .delete(`/api/contracts/${contract.id}/prestadores/${prestadorId}`)
    .set(as(gestorToken));
  assert.strictEqual(unlinked.status, 200);
  assert.strictEqual(unlinked.body.contract.prestadores.length, 0);

  // relink for later tests
  await request(app)
    .post(`/api/contracts/${contract.id}/prestadores`)
    .set(as(gestorToken))
    .send({ user_id: prestadorId });
});

test('FR-008 overdue/extend', async () => {
  // a contract whose forecast already passed reads as atrasado (signal only)
  const overdue = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({
      name: 'Vencido LTDA',
      start_date: pastDate(120),
      forecast_date: pastDate(1),
    });
  assert.strictEqual(overdue.status, 201);
  const overdueId = overdue.body.contract.id;
  assert.strictEqual(overdue.body.contract.status, 'atrasado');

  // stored status remains vigente — vencido so signaliza
  const stored = getDomainDb(domainId).get('SELECT status FROM contracts WHERE id = ?', [overdueId]);
  assert.strictEqual(stored.status, code('contracts.status', 'vigente'));

  // gestor prorroga → vigente again (SC-003)
  const extended = await request(app)
    .post(`/api/contracts/${overdueId}/prorrogar`)
    .set(as(gestorToken))
    .send({ forecast_date: futureDate(60) });
  assert.strictEqual(extended.status, 200);
  assert.strictEqual(extended.body.contract.status, 'vigente');

  // invalid prorrogação date refused
  const bad = await request(app)
    .post(`/api/contracts/${overdueId}/prorrogar`)
    .set(as(gestorToken))
    .send({ forecast_date: 'nope' });
  assert.strictEqual(bad.status, 400);

  // encerramento → final status
  const closed = await request(app)
    .post(`/api/contracts/${overdueId}/encerrar`)
    .set(as(gestorToken))
    .send({});
  assert.strictEqual(closed.status, 200);
  assert.strictEqual(closed.body.contract.status, 'encerrado');

  // already encerrado cannot be re-closed or extended
  const again = await request(app)
    .post(`/api/contracts/${overdueId}/encerrar`)
    .set(as(gestorToken))
    .send({});
  assert.strictEqual(again.status, 400);
  const extendClosed = await request(app)
    .post(`/api/contracts/${overdueId}/prorrogar`)
    .set(as(gestorToken))
    .send({ forecast_date: futureDate(30) });
  assert.strictEqual(extendClosed.status, 400);
});

test('FR-009 admin delete', async () => {
  const db = getDomainDb(domainId);
  const list = await request(app).get('/api/contracts').set(as(adminToken));
  const contract = list.body.contracts.find((c) => c.name === 'Reforma Almoxarifado');
  assert.ok(contract);

  // gestor cannot delete (admin only)
  const gestorDelete = await request(app)
    .delete(`/api/contracts/${contract.id}`)
    .set(as(gestorToken));
  assert.strictEqual(gestorDelete.status, 403);

  // admin deletes; tasks and links go with it
  const adminDelete = await request(app)
    .delete(`/api/contracts/${contract.id}`)
    .set(as(adminToken));
  assert.strictEqual(adminDelete.status, 200);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM contracts WHERE id = ?', [contract.id]).c, 0);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM tasks WHERE contract_id = ?', [contract.id]).c, 0);
  assert.strictEqual(
    db.get('SELECT COUNT(*) AS c FROM contract_providers WHERE contract_id = ?', [contract.id]).c,
    0
  );

  // missing contract → 404
  const missing = await request(app)
    .delete(`/api/contracts/${contract.id}`)
    .set(as(adminToken));
  assert.strictEqual(missing.status, 404);
});

// Acceptance stub per plan.md ## Acceptance Test Stubs (GREEN at T026).
// Declared last: the 1000-row seed must not displace earlier list lookups.
test('FR-026 1000 rows', async () => {
  const { ensureIndexes } = require('../config/database');
  const db = getDomainDb(domainId);
  assert.strictEqual(typeof ensureIndexes, 'function', 'ensureIndexes exported');
  ensureIndexes(db); // HINT-005: indexes present before the perf query
  ensureIndexes(db); // idempotent

  // seed 1000 contracts with a single persist (runBatch)
  const items = [];
  for (let i = 0; i < 1000; i++) {
    items.push({
      sql: `INSERT INTO contracts(name, object, start_date, forecast_date, status)
            VALUES (?, ?, ?, ?, ?)`,
      params: [
        `Perf Lote ${i}`,
        'objeto perf',
        '2026-01-01',
        '2026-12-31',
        i % 2 ? code('contracts.status', 'vigente') : code('contracts.status', 'encerrado'),
      ],
    });
  }
  db.runBatch(items);

  // paged listContracts under load (SC-009: <2s localhost)
  const started = Date.now();
  const res = await request(app)
    .get('/api/contracts?status=vigente&limit=50')
    .set(as(gestorToken));
  const elapsed = Date.now() - started;
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(res.body.limit, 50);
  assert.strictEqual(res.body.contracts.length, 50, 'page size respected');
  assert.ok(res.body.total >= 500, `total counts filtered rows (${res.body.total})`);
  assert.ok(elapsed < 2000, `listContracts took ${elapsed}ms (limit 2000ms)`);

  // offset paging: second page does not overlap the first
  const page2 = await request(app)
    .get('/api/contracts?status=vigente&limit=50&offset=50')
    .set(as(gestorToken));
  assert.strictEqual(page2.status, 200);
  const firstIds = new Set(res.body.contracts.map((c) => c.id));
  assert.strictEqual(page2.body.contracts.length, 50);
  assert.ok(
    page2.body.contracts.every((c) => !firstIds.has(c.id)),
    'pages do not overlap'
  );

  // filtered search over the same volume (SC-009 filtros <2s)
  const t2 = Date.now();
  const search = await request(app)
    .get('/api/search/contracts?status=vigente&q=Perf%20Lote')
    .set(as(gestorToken));
  const searchElapsed = Date.now() - t2;
  assert.strictEqual(search.status, 200, JSON.stringify(search.body));
  assert.strictEqual(search.body.total, 500, '500 vigente rows match "Perf Lote"');
  assert.ok(searchElapsed < 2000, `search took ${searchElapsed}ms (limit 2000ms)`);
});

// E001 (spec 00002) — RED stub; T012 turns it GREEN.
test('FR-006 matriz dos quatro papéis', async () => {
  const sys = await request(app).post('/api/auth/login').send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200, JSON.stringify(sys.body));
  const sysToken = sys.body.token;

  const contractBody = (name) => ({
    name,
    purpose_id: finalidadeId,
    start_date: futureDate(1),
    forecast_date: futureDate(30),
  });
  const post = (url, token, body) =>
    request(app).post(url).set(as(token)).send(body || {});

  // criar contratos: admin ✅ gestor ✅ prestador ❌ system_admin ❌
  const byAdmin = await post('/api/contracts', adminToken, contractBody('Matriz Admin'));
  assert.strictEqual(byAdmin.status, 201, JSON.stringify(byAdmin.body));
  const contractId = byAdmin.body.contract.id;
  const byGestor = await post('/api/contracts', gestorToken, contractBody('Matriz Gestor'));
  assert.strictEqual(byGestor.status, 201, JSON.stringify(byGestor.body));
  const byPrestador = await post('/api/contracts', prestadorToken, contractBody('Matriz Prestador'));
  assert.strictEqual(byPrestador.status, 403, JSON.stringify(byPrestador.body));
  const bySys = await post('/api/contracts', sysToken, contractBody('Matriz Sysadmin'));
  assert.strictEqual(bySys.status, 403, JSON.stringify(bySys.body));
  assert.strictEqual(bySys.body.contract, undefined, 'no contract payload for system_admin');

  // listagem de contratos: os três papéis do domínio leem, system_admin não
  for (const [token, label] of [[adminToken, 'admin'], [gestorToken, 'gestor'], [prestadorToken, 'prestador']]) {
    const list = await request(app).get('/api/contracts').set(as(token));
    assert.strictEqual(list.status, 200, `${label} list contracts: ${list.status}`);
  }
  const sysList = await request(app).get('/api/contracts').set(as(sysToken));
  assert.strictEqual(sysList.status, 403, `system_admin list contracts: ${sysList.status}`);
  assert.strictEqual(sysList.body.contracts, undefined, 'no contract payload for system_admin');

  // relatório PDF: admin ✅ gestor ✅ prestador ❌ system_admin ❌
  const pdfAdmin = await request(app).get(`/api/contracts/${contractId}/report.pdf`).set(as(adminToken));
  assert.strictEqual(pdfAdmin.status, 200, `admin pdf: ${pdfAdmin.status}`);
  const pdfGestor = await request(app).get(`/api/contracts/${contractId}/report.pdf`).set(as(gestorToken));
  assert.strictEqual(pdfGestor.status, 200, `gestor pdf: ${pdfGestor.status}`);
  const pdfPrestador = await request(app).get(`/api/contracts/${contractId}/report.pdf`).set(as(prestadorToken));
  assert.strictEqual(pdfPrestador.status, 403, `prestador pdf: ${pdfPrestador.status}`);
  const pdfSys = await request(app).get(`/api/contracts/${contractId}/report.pdf`).set(as(sysToken));
  assert.strictEqual(pdfSys.status, 403, `system_admin pdf: ${pdfSys.status}`);

  // prorrogar: admin ✅ gestor ✅ prestador ❌ system_admin ❌
  const extGestor = await post(`/api/contracts/${contractId}/prorrogar`, gestorToken, {
    forecast_date: futureDate(60),
  });
  assert.strictEqual(extGestor.status, 200, JSON.stringify(extGestor.body));
  const extPrestador = await post(`/api/contracts/${contractId}/prorrogar`, prestadorToken, {
    forecast_date: futureDate(60),
  });
  assert.strictEqual(extPrestador.status, 403, `prestador prorrogar: ${extPrestador.status}`);
  const extSys = await post(`/api/contracts/${contractId}/prorrogar`, sysToken, {
    forecast_date: futureDate(60),
  });
  assert.strictEqual(extSys.status, 403, `system_admin prorrogar: ${extSys.status}`);

  // excluir contrato: admin ✅ gestor ❌ system_admin ❌
  const delGestor = await request(app).delete(`/api/contracts/${contractId}`).set(as(gestorToken));
  assert.strictEqual(delGestor.status, 403, `gestor delete: ${delGestor.status}`);
  const delPrestador = await request(app).delete(`/api/contracts/${contractId}`).set(as(prestadorToken));
  assert.strictEqual(delPrestador.status, 403, `prestador delete: ${delPrestador.status}`);
  const delSys = await request(app).delete(`/api/contracts/${contractId}`).set(as(sysToken));
  assert.strictEqual(delSys.status, 403, `system_admin delete: ${delSys.status}`);

  // usuários e finalidades: só admin cria; gestor/prestador/system_admin 403
  const userBody = (email, username) => ({
    name: 'Matriz User',
    email,
    password: 'Secret1!',
    role: 'prestador',
    username,
  });
  const userAdmin = await post('/api/users', adminToken, userBody('madmin@matriz.test', 'madmin'));
  assert.strictEqual(userAdmin.status, 201, JSON.stringify(userAdmin.body));
  const userGestor = await post('/api/users', gestorToken, userBody('mgestor@matriz.test', 'mgestor'));
  assert.strictEqual(userGestor.status, 403, `gestor create user: ${userGestor.status}`);
  const userPrestador = await post('/api/users', prestadorToken, userBody('mprest@matriz.test', 'mprest'));
  assert.strictEqual(userPrestador.status, 403, `prestador create user: ${userPrestador.status}`);
  const userSys = await post('/api/users', sysToken, userBody('msys@matriz.test', 'msys'));
  assert.strictEqual(userSys.status, 403, `system_admin create user: ${userSys.status}`);
  assert.strictEqual(userSys.body.user, undefined, 'no user payload for system_admin');

  const finAdmin = await post('/api/finalidades', adminToken, { name: 'Matriz Finalidade Admin' });
  assert.strictEqual(finAdmin.status, 201, JSON.stringify(finAdmin.body));
  const finGestor = await post('/api/finalidades', gestorToken, { name: 'Matriz Finalidade Gestor' });
  assert.strictEqual(finGestor.status, 403, `gestor create finalidade: ${finGestor.status}`);
  const finPrestador = await post('/api/finalidades', prestadorToken, { name: 'Matriz Finalidade Prestador' });
  assert.strictEqual(finPrestador.status, 403, `prestador create finalidade: ${finPrestador.status}`);
  const finSys = await post('/api/finalidades', sysToken, { name: 'Matriz Finalidade Sys' });
  assert.strictEqual(finSys.status, 403, `system_admin create finalidade: ${finSys.status}`);

  // system_admin também fica fora da rota de tarefas (ciclo é a única superfície)
  const tasksSys = await request(app).get('/api/tasks').set(as(sysToken));
  assert.strictEqual(tasksSys.status, 403, `system_admin list tasks: ${tasksSys.status}`);
  assert.strictEqual(tasksSys.body.tasks, undefined, 'no task payload for system_admin');
});

// Acceptance stubs — plan.md §Acceptance Test Stubs (RED until US1 tasks).
test('FR-001 cria contrato validado', async () => {
  // admin cria com finalidade ativa
  const created = await request(app)
    .post('/api/contracts')
    .set(as(adminToken))
    .send({
      name: 'FR-001 Vistoria',
      object: 'Vistoria de obra',
      purpose_id: finalidadeId,
      start_date: futureDate(0),
      forecast_date: futureDate(45),
    });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  assert.strictEqual(created.body.contract.status, 'vigente');
  assert.strictEqual(created.body.contract.purpose_name, 'Obra');

  // finalidade é opcional (FR-001: "quando informada")
  const semFinalidade = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'FR-001 Sem finalidade', start_date: futureDate(0), forecast_date: futureDate(30) });
  assert.strictEqual(semFinalidade.status, 201, JSON.stringify(semFinalidade.body));
  assert.strictEqual(semFinalidade.body.contract.purpose_id, null);

  // nome ausente → 400
  const semNome = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ start_date: futureDate(0), forecast_date: futureDate(30) });
  assert.strictEqual(semNome.status, 400);

  // data fora do padrão → 400
  const dataInvalida = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'FR-001 Datas', start_date: '31/02/2026', forecast_date: futureDate(30) });
  assert.strictEqual(dataInvalida.status, 400);

  // finalidade inexistente → 400
  const finalidadeInexistente = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({
      name: 'FR-001 Finalidade',
      purpose_id: 999999,
      start_date: futureDate(0),
      forecast_date: futureDate(30),
    });
  assert.strictEqual(finalidadeInexistente.status, 400);

  // finalidade aposentada → 400 (finalidade dedicada para não afetar os demais testes)
  const nova = await request(app)
    .post('/api/finalidades')
    .set(as(adminToken))
    .send({ name: 'FR-001 Aposentada' });
  assert.strictEqual(nova.status, 201, JSON.stringify(nova.body));
  const retirada = await request(app)
    .delete(`/api/finalidades/${nova.body.finalidade.id}`)
    .set(as(adminToken));
  assert.strictEqual(retirada.status, 200);
  const usaAposentada = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({
      name: 'FR-001 Usa Aposentada',
      purpose_id: nova.body.finalidade.id,
      start_date: futureDate(0),
      forecast_date: futureDate(30),
    });
  assert.strictEqual(usaAposentada.status, 400);
});
test('FR-002 vincula e desvincula prestadores', async () => {
  const created = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'FR-002 Vinculo', start_date: futureDate(0), forecast_date: futureDate(60) });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const id = created.body.contract.id;
  const db = getDomainDb(domainId);
  const paulaId = db.get("SELECT id FROM users WHERE email = 'paula@epsilon.test'").id;

  const link1 = await request(app)
    .post(`/api/contracts/${id}/prestadores`)
    .set(as(adminToken))
    .send({ user_id: prestadorId });
  assert.strictEqual(link1.status, 201, JSON.stringify(link1.body));
  const link2 = await request(app)
    .post(`/api/contracts/${id}/prestadores`)
    .set(as(gestorToken))
    .send({ user_id: paulaId });
  assert.strictEqual(link2.status, 201, JSON.stringify(link2.body));
  assert.strictEqual(link2.body.contract.prestadores.length, 2);

  // vínculo duplicado → 409
  const dup = await request(app)
    .post(`/api/contracts/${id}/prestadores`)
    .set(as(gestorToken))
    .send({ user_id: prestadorId });
  assert.strictEqual(dup.status, 409);

  const unlink = await request(app)
    .delete(`/api/contracts/${id}/prestadores/${paulaId}`)
    .set(as(gestorToken));
  assert.strictEqual(unlink.status, 200, JSON.stringify(unlink.body));
  assert.strictEqual(unlink.body.contract.prestadores.length, 1);
  assert.strictEqual(unlink.body.contract.prestadores[0].id, prestadorId);

  // contrato nasce sem prestadores — aceito (FR-002)
  const semVinculo = await request(app)
    .post('/api/contracts')
    .set(as(adminToken))
    .send({ name: 'FR-002 Sem vinculo', start_date: futureDate(0), forecast_date: futureDate(90) });
  assert.strictEqual(semVinculo.status, 201, JSON.stringify(semVinculo.body));
  assert.strictEqual(semVinculo.body.contract.prestadores.length, 0);
});

test('FR-003 prorroga contrato vigente', async () => {
  const created = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'FR-003 Prorrogacao', start_date: pastDate(30), forecast_date: futureDate(10) });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const id = created.body.contract.id;

  const extend = await request(app)
    .post(`/api/contracts/${id}/prorrogar`)
    .set(as(gestorToken))
    .send({ forecast_date: futureDate(120) });
  assert.strictEqual(extend.status, 200, JSON.stringify(extend.body));
  assert.strictEqual(extend.body.contract.forecast_date, futureDate(120));
  assert.strictEqual(extend.body.contract.status, 'vigente');

  // contrato encerrado não prorroga → 400
  const close = await request(app).post(`/api/contracts/${id}/encerrar`).set(as(gestorToken));
  assert.strictEqual(close.status, 200, JSON.stringify(close.body));
  const reextend = await request(app)
    .post(`/api/contracts/${id}/prorrogar`)
    .set(as(gestorToken))
    .send({ forecast_date: futureDate(200) });
  assert.strictEqual(reextend.status, 400);

  // data inválida → 400 sem alterar
  const created2 = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'FR-003 Datas', start_date: futureDate(0), forecast_date: futureDate(20) });
  assert.strictEqual(created2.status, 201);
  const bad = await request(app)
    .post(`/api/contracts/${created2.body.contract.id}/prorrogar`)
    .set(as(gestorToken))
    .send({ forecast_date: 'not-a-date' });
  assert.strictEqual(bad.status, 400);
});

test('FR-004 encerra e restringe exclusão', async () => {
  const created = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'FR-004 Encerramento', start_date: futureDate(0), forecast_date: futureDate(60) });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const id = created.body.contract.id;
  const db = getDomainDb(domainId);

  // gestor encerra; registro e histórico preservados
  const close = await request(app).post(`/api/contracts/${id}/encerrar`).set(as(gestorToken));
  assert.strictEqual(close.status, 200, JSON.stringify(close.body));
  assert.strictEqual(close.body.contract.status, 'encerrado');
  assert.strictEqual(
    db.get('SELECT COUNT(*) AS c FROM contracts WHERE id = ?', [id]).c,
    1,
    'encerramento preserva o registro'
  );

  // encerramento repetido → 400
  const again = await request(app).post(`/api/contracts/${id}/encerrar`).set(as(gestorToken));
  assert.strictEqual(again.status, 400);

  // exclusão é só de admin
  const gestorDelete = await request(app).delete(`/api/contracts/${id}`).set(as(gestorToken));
  assert.strictEqual(gestorDelete.status, 403);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM contracts WHERE id = ?', [id]).c, 1);

  const adminDelete = await request(app).delete(`/api/contracts/${id}`).set(as(adminToken));
  assert.strictEqual(adminDelete.status, 200, JSON.stringify(adminDelete.body));
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM contracts WHERE id = ?', [id]).c, 0);
});
test('FR-007 previsão passada é aceita', async () => {
  // gravação com previsão vencida não é bloqueada e nasce atrasada na leitura
  const created = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({
      name: 'FR-007 Vencida',
      start_date: pastDate(60),
      forecast_date: pastDate(1),
    });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  assert.strictEqual(created.body.contract.status, 'atrasado');
  assert.strictEqual(created.body.contract.db_status, 'vigente', 'banco permanece vigente');

  // no dia da previsão a contagem começa só no dia seguinte (Q3)
  const hoje = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'FR-007 Hoje', start_date: pastDate(5), forecast_date: futureDate(0) });
  assert.strictEqual(hoje.status, 201, JSON.stringify(hoje.body));
  assert.strictEqual(hoje.body.contract.status, 'vigente');
});

test('FR-008 prorrogação devolve vigente', async () => {
  const created = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({
      name: 'FR-008 Recuperacao',
      start_date: pastDate(90),
      forecast_date: pastDate(10),
    });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const id = created.body.contract.id;
  assert.strictEqual(created.body.contract.status, 'atrasado');

  // prorrogar para o futuro devolve vigente sem escrita manual
  const extend = await request(app)
    .post(`/api/contracts/${id}/prorrogar`)
    .set(as(gestorToken))
    .send({ forecast_date: futureDate(40) });
  assert.strictEqual(extend.status, 200, JSON.stringify(extend.body));
  assert.strictEqual(extend.body.contract.status, 'vigente');
  assert.strictEqual(extend.body.contract.db_status, 'vigente');

  // o banco só recebeu forecast_date — status gravado nunca foi atrasado
  const db = getDomainDb(domainId);
  const row = db.get('SELECT status, forecast_date FROM contracts WHERE id = ?', [id]);
  assert.strictEqual(row.status, code('contracts.status', 'vigente'));
  assert.ok(row.forecast_date >= new Date().toISOString().slice(0, 10), 'previsão futura gravada');
});

test('FR-010 401/403 antes de qualquer linha', async () => {
  const db = getDomainDb(domainId);

  // sem token → 401 e nenhum payload de contrato
  const semToken = await request(app).get('/api/contracts');
  assert.strictEqual(semToken.status, 401);
  assert.strictEqual(semToken.body.contracts, undefined);

  // token inválido → 403 sem payload
  const invalido = await request(app)
    .get('/api/contracts')
    .set({ Authorization: 'Bearer token-invalido' });
  assert.strictEqual(invalido.status, 403);
  assert.strictEqual(invalido.body.contracts, undefined);

  // papel não habilitado escrevendo → 403 sem efeito no banco
  const before = db.get('SELECT COUNT(*) AS c FROM contracts').c;
  const escritaNegada = await request(app)
    .post('/api/contracts')
    .set(as(prestadorToken))
    .send({ name: 'FR-010 Prestador', start_date: futureDate(0), forecast_date: futureDate(10) });
  assert.strictEqual(escritaNegada.status, 403);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM contracts').c, before);
  const prorrogaNegada = await request(app)
    .post('/api/contracts/999999/prorrogar')
    .set(as(prestadorToken))
    .send({ forecast_date: futureDate(90) });
  assert.strictEqual(prorrogaNegada.status, 403, 'papel errado nem alcança o handler');

  // domínio suspenso → 403 em qualquer rota de contrato
  const sys = await request(app)
    .post('/api/auth/login')
    .send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200);
  const omega = await request(app)
    .post('/api/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Omega Suspenso',
      adminName: 'Oscar',
      adminEmail: 'oscar@omega.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(omega.status, 201, JSON.stringify(omega.body));
  const omegaId = omega.body.domain.id;
  const omegaAdmin = await login('oscar@omega.test', 'Secret1!', omegaId);
  const susp = await request(app)
    .post(`/api/domains/${omegaId}/suspend`)
    .set(as(sys.body.token));
  assert.strictEqual(susp.status, 200, JSON.stringify(susp.body));
  const suspenso = await request(app).get('/api/contracts').set(as(omegaAdmin));
  assert.strictEqual(suspenso.status, 403);
  assert.strictEqual(suspenso.body.contracts, undefined);
});
test('FR-011 domainId estrangeiro 403', async () => {
  // segundo domínio para obter um domainId estrangeiro
  const sys = await request(app)
    .post('/api/auth/login')
    .send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200);
  const iota = await request(app)
    .post('/api/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Iota Estrangeiro',
      adminName: 'Ivo',
      adminEmail: 'ivo@iota.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(iota.status, 201, JSON.stringify(iota.body));
  const foreign = iota.body.domain.id;
  assert.notStrictEqual(Number(foreign), Number(domainId));

  // query domainId estrangeiro → 403 antes de qualquer consulta, nada listado
  const query = await request(app)
    .get(`/api/contracts?domainId=${foreign}`)
    .set(as(gestorToken));
  assert.strictEqual(query.status, 403, JSON.stringify(query.body));
  assert.strictEqual(query.body.contracts, undefined);

  // domainId do próprio domínio não é troca — segue permitido
  const own = await request(app)
    .get(`/api/contracts?domainId=${domainId}`)
    .set(as(gestorToken));
  assert.strictEqual(own.status, 200, JSON.stringify(own.body));

  // domainId estrangeiro no body de criação → 403 e nada gravado
  const db = getDomainDb(domainId);
  const before = db.get('SELECT COUNT(*) AS c FROM contracts').c;
  const body = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({
      name: 'FR-011 Body',
      domainId: foreign,
      start_date: futureDate(0),
      forecast_date: futureDate(10),
    });
  assert.strictEqual(body.status, 403, JSON.stringify(body.body));
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM contracts').c, before);

  // token de outro domínio enxerga só o próprio domínio (nunca o nosso)
  const iotaAdmin = await login('ivo@iota.test', 'Secret1!', foreign);
  const estrangeiro = await request(app).get('/api/contracts').set(as(iotaAdmin));
  assert.strictEqual(estrangeiro.status, 200, JSON.stringify(estrangeiro.body));
  assert.strictEqual(estrangeiro.body.total, 0, 'iota não lista contratos de epsilon');
});
test('FR-012 consulta restrita ao domínio e ao vínculo', async () => {
  const db = getDomainDb(domainId);

  // prestador: lista só os contratos vinculados a ele
  const vinculos = db
    .all('SELECT contract_id FROM contract_providers WHERE user_id = ?', [prestadorId])
    .map((r) => r.contract_id);
  assert.ok(vinculos.length > 0, 'prestador tem ao menos um vínculo');
  const lista = await request(app).get('/api/contracts?limit=200').set(as(prestadorToken));
  assert.strictEqual(lista.status, 200, JSON.stringify(lista.body));
  assert.strictEqual(lista.body.total, vinculos.length, 'total = vínculos do prestador');
  for (const contract of lista.body.contracts) {
    assert.ok(vinculos.includes(contract.id), `contrato ${contract.id} vinculado ao prestador`);
  }

  // contrato não vinculado → 404 (esconde existência)
  const fora = db.get(
    `SELECT id FROM contracts
     WHERE id NOT IN (SELECT contract_id FROM contract_providers WHERE user_id = ?)
     LIMIT 1`,
    [prestadorId]
  );
  assert.ok(fora, 'existe contrato não vinculado');
  const negado = await request(app).get(`/api/contracts/${fora.id}`).set(as(prestadorToken));
  assert.strictEqual(negado.status, 404);

  // gestor: domínio inteiro — total bate com o banco do domínio
  const gestorLista = await request(app).get('/api/contracts?limit=1').set(as(gestorToken));
  assert.strictEqual(gestorLista.status, 200);
  const totalDb = db.get('SELECT COUNT(*) AS c FROM contracts').c;
  assert.strictEqual(gestorLista.body.total, totalDb, 'gestor enxerga o domínio inteiro');
});
test('FR-013 filtro particiona os status', async () => {
  const db = getDomainDb(domainId);
  const hoje = new Date().toISOString().slice(0, 10);

  // um contrato controlado por fatia
  const vigente = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'FR-013 Vigente', start_date: futureDate(-5), forecast_date: futureDate(30) });
  assert.strictEqual(vigente.status, 201, JSON.stringify(vigente.body));
  const atrasado = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'FR-013 Atrasado', start_date: pastDate(40), forecast_date: pastDate(3) });
  assert.strictEqual(atrasado.status, 201, JSON.stringify(atrasado.body));
  assert.strictEqual(atrasado.body.contract.status, 'atrasado');
  const encerrado = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'FR-013 Encerrado', start_date: futureDate(-10), forecast_date: futureDate(20) });
  assert.strictEqual(encerrado.status, 201, JSON.stringify(encerrado.body));
  const fechado = await request(app)
    .post(`/api/contracts/${encerrado.body.contract.id}/encerrar`)
    .set(as(gestorToken));
  assert.strictEqual(fechado.status, 200);

  // totais por fatia batem com a partição no banco (sem sobreposição)
  const expVigente = db.get(
    `SELECT COUNT(*) AS c FROM contracts WHERE status = ${code('contracts.status', 'vigente')} AND forecast_date >= date('now')`
  ).c;
  const expAtrasado = db.get(
    `SELECT COUNT(*) AS c FROM contracts WHERE status = ${code('contracts.status', 'vigente')} AND forecast_date < date('now')`
  ).c;
  const expEncerrado = db.get(
    `SELECT COUNT(*) AS c FROM contracts WHERE status = ${code('contracts.status', 'encerrado')}`
  ).c;
  const expTotal = db.get('SELECT COUNT(*) AS c FROM contracts').c;
  assert.strictEqual(expVigente + expAtrasado + expEncerrado, expTotal, 'partição cobre tudo');

  const qVig = await request(app).get('/api/contracts?status=vigente&limit=200').set(as(gestorToken));
  assert.strictEqual(qVig.status, 200, JSON.stringify(qVig.body));
  assert.strictEqual(qVig.body.total, expVigente, 'vigente = previsão de hoje em diante');
  for (const c of qVig.body.contracts) {
    assert.ok(c.forecast_date >= hoje, `vigente ${c.id} com previsão ${c.forecast_date}`);
    assert.strictEqual(c.db_status, 'vigente');
  }

  const qAtr = await request(app).get('/api/contracts?status=atrasado&limit=200').set(as(gestorToken));
  assert.strictEqual(qAtr.status, 200, JSON.stringify(qAtr.body));
  assert.strictEqual(qAtr.body.total, expAtrasado, 'atrasado = previsão estritamente anterior');
  assert.ok(qAtr.body.total >= 1, 'fatia atrasada não vazia');
  for (const c of qAtr.body.contracts) {
    assert.ok(c.forecast_date < hoje, `atrasado ${c.id} com previsão ${c.forecast_date}`);
    assert.strictEqual(c.db_status, 'vigente', 'banco nunca guarda atrasado');
    assert.strictEqual(c.status, 'atrasado');
  }

  const qEnc = await request(app).get('/api/contracts?status=encerrado&limit=200').set(as(gestorToken));
  assert.strictEqual(qEnc.status, 200, JSON.stringify(qEnc.body));
  assert.strictEqual(qEnc.body.total, expEncerrado);
  for (const c of qEnc.body.contracts) {
    assert.strictEqual(c.db_status, 'encerrado');
    assert.strictEqual(c.status, 'encerrado');
  }

  // soma das fatias = total sem filtro
  const qAll = await request(app).get('/api/contracts?limit=1').set(as(gestorToken));
  assert.strictEqual(qAll.body.total, expTotal);
  assert.strictEqual(qVig.body.total + qAtr.body.total + qEnc.body.total, qAll.body.total);

  // valor fora da partição → 400
  const ruim = await request(app).get('/api/contracts?status=qualquer').set(as(gestorToken));
  assert.strictEqual(ruim.status, 400);
});
test('FR-014 100% dos vigentes com previsão', async () => {
  const hoje = new Date().toISOString().slice(0, 10);
  const limit = 200;
  let offset = 0;
  let checked = 0;
  let vigentes = 0;

  // varre a listagem inteira (paginada) — previsão e status derivado em todo vigente
  for (;;) {
    const page = await request(app)
      .get(`/api/contracts?limit=${limit}&offset=${offset}`)
      .set(as(gestorToken));
    assert.strictEqual(page.status, 200, JSON.stringify(page.body));
    for (const c of page.body.contracts) {
      if (c.db_status === 'vigente') {
        vigentes += 1;
        assert.ok(c.forecast_date, `vigente ${c.id} sem previsão`);
        assert.match(c.forecast_date, /^\d{4}-\d{2}-\d{2}$/);
        const esperado = c.forecast_date < hoje ? 'atrasado' : 'vigente';
        assert.strictEqual(c.status, esperado, `derivado de ${c.id}: ${c.status} vs ${esperado}`);
      } else {
        assert.strictEqual(c.db_status, 'encerrado');
        assert.strictEqual(c.status, 'encerrado', `encerrado ${c.id} deriva encerrado`);
      }
      checked += 1;
    }
    offset += limit;
    if (offset >= page.body.total) break;
  }

  assert.ok(vigentes > 500, `vigentes varridos: ${vigentes}`);
  assert.ok(checked >= 1000, `total varrido: ${checked}`);
});
test('FR-015 p95 abaixo de 2s com 5000', async () => {
  const { ensureIndexes } = require('../config/database');
  const db = getDomainDb(domainId);
  ensureIndexes(db); // HINT-005: índices antes das consultas medidas

  // seed de 5.000 contratos em lote (AD-004)
  const items = [];
  for (let i = 0; i < 5000; i++) {
    items.push({
      sql: `INSERT INTO contracts(name, object, start_date, forecast_date, status)
            VALUES (?, ?, ?, ?, ?)`,
      params: [
        `Volume5000 ${i}`,
        'objeto volume',
        '2026-01-01',
        i % 3 ? '2026-12-31' : '2026-09-01',
        i % 4 ? code('contracts.status', 'vigente') : code('contracts.status', 'encerrado'),
      ],
    });
  }
  db.runBatch(items);

  // p95 sobre repetições do caminho de listagem com filtro particionado
  const samples = [];
  for (let i = 0; i < 20; i++) {
    const started = Date.now();
    const res = await request(app)
      .get('/api/contracts?status=atrasado&limit=50')
      .set(as(gestorToken));
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    samples.push(Date.now() - started);
  }
  samples.sort((a, b) => a - b);
  const p95 = samples[Math.ceil(0.95 * samples.length) - 1];
  assert.ok(p95 < 2000, `p95 ${p95}ms < 2000ms (amostras: ${samples.join(',')})`);

  // a fatia atrasada enche o volume e segue coerente com a partição
  const res = await request(app).get('/api/contracts?status=atrasado&limit=1').set(as(gestorToken));
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.total > 1000, `fatia atrasada com volume: ${res.body.total}`);
  const vigentes = await request(app).get('/api/contracts?status=vigente&limit=1').set(as(gestorToken));
  const encerrados = await request(app).get('/api/contracts?status=encerrado&limit=1').set(as(gestorToken));
  const total = await request(app).get('/api/contracts?limit=1').set(as(gestorToken));
  assert.strictEqual(
    res.body.total + vigentes.body.total + encerrados.body.total,
    total.body.total,
    'partição segue íntegra com 5.000 contratos'
  );
});

// fase 5: /api/v2 espelha a v1 com os mesmos handlers; aliases de rota em
// inglês (extend/close/providers) respondem com os mesmos códigos das rotas
// PT, e o payload de erro ganha o code estável aditivo.
test('fase 5: v2 mounts e aliases de rota', async () => {
  const created = await request(app)
    .post('/api/v2/contracts')
    .set(as(adminToken))
    .send({
      name: 'Fase 5 Alias',
      purpose_id: finalidadeId,
      start_date: futureDate(0),
      forecast_date: futureDate(10),
    });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const id = created.body.contract.id;

  // v2 enxerga o mesmo dado da v1
  const v2Get = await request(app).get(`/api/v2/contracts/${id}`).set(as(gestorToken));
  assert.strictEqual(v2Get.status, 200, JSON.stringify(v2Get.body));
  assert.strictEqual(v2Get.body.contract.name, 'Fase 5 Alias');

  // alias extend: mesmo código do /prorrogar v1
  const extendV2 = await request(app)
    .post(`/api/v2/contracts/${id}/extend`)
    .set(as(gestorToken))
    .send({ forecast_date: futureDate(120) });
  assert.strictEqual(extendV2.status, 200, JSON.stringify(extendV2.body));
  assert.strictEqual(extendV2.body.contract.forecast_date, futureDate(120));

  // alias close + trava de reencerramento com code estável
  const closeV2 = await request(app).post(`/api/v2/contracts/${id}/close`).set(as(gestorToken));
  assert.strictEqual(closeV2.status, 200, JSON.stringify(closeV2.body));
  const closeAgain = await request(app).post(`/api/v2/contracts/${id}/close`).set(as(gestorToken));
  assert.strictEqual(closeAgain.status, 400);
  assert.strictEqual(closeAgain.body.error, 'Contract already encerrado');
  assert.strictEqual(closeAgain.body.code, 'CONTRACT_ALREADY_CLOSED');
  const extendClosed = await request(app)
    .post(`/api/v2/contracts/${id}/extend`)
    .set(as(gestorToken))
    .send({ forecast_date: futureDate(200) });
  assert.strictEqual(extendClosed.status, 400);
  assert.strictEqual(extendClosed.body.code, 'CONTRACT_CLOSED');

  // alias providers: mesmos códigos do /prestadores v1
  const linkV2 = await request(app)
    .post(`/api/v2/contracts/${id}/providers`)
    .set(as(adminToken))
    .send({ user_id: prestadorId });
  assert.strictEqual(linkV2.status, 201, JSON.stringify(linkV2.body));
  const linkAgain = await request(app)
    .post(`/api/v2/contracts/${id}/providers`)
    .set(as(adminToken))
    .send({ user_id: prestadorId });
  assert.strictEqual(linkAgain.status, 409);
  const unlinkV2 = await request(app)
    .delete(`/api/v2/contracts/${id}/providers/${prestadorId}`)
    .set(as(adminToken));
  assert.strictEqual(unlinkV2.status, 200, JSON.stringify(unlinkV2.body));

  // v1 segue idêntica no mesmo contrato
  const v1Get = await request(app).get(`/api/contracts/${id}`).set(as(gestorToken));
  assert.strictEqual(v1Get.status, 200);
  assert.strictEqual(v1Get.body.contract.status, 'encerrado');

  // code estável também no POST v2 (campo error permanece)
  const missingPurpose = await request(app)
    .post('/api/v2/contracts')
    .set(as(gestorToken))
    .send({
      name: 'Fase 5 Proposito Fantasma',
      purpose_id: 999999,
      start_date: futureDate(0),
      forecast_date: futureDate(10),
    });
  assert.strictEqual(missingPurpose.status, 400);
  assert.strictEqual(missingPurpose.body.error, 'purpose_id does not exist');
  assert.strictEqual(missingPurpose.body.code, 'PURPOSE_NOT_FOUND');
});
