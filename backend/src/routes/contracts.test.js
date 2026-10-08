'use strict';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir();
const { app } = require('../server');
const { getDomainDb } = require('../config/database');

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
      finalidade_id: finalidadeId,
      start_date: futureDate(-10),
      forecast_date: futureDate(90),
    });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const contract = created.body.contract;
  assert.ok(contract.id > 0);
  assert.strictEqual(contract.finalidade_name, 'Obra');
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
      finalidade_id: 999999,
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
     VALUES (?, 'Abrir portao', 'A Fazer', 'medium', ?)`,
    [contract.id, prestadorId]
  );
  const blocked = await request(app)
    .delete(`/api/contracts/${contract.id}/prestadores/${prestadorId}`)
    .set(as(gestorToken));
  assert.strictEqual(blocked.status, 400);
  assert.match(blocked.body.error, /abertas/i);

  // closing the task releases the unlink
  db.run("UPDATE tasks SET status = 'Concluída' WHERE contract_id = ? AND assignee_id = ?", [
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
  assert.strictEqual(stored.status, 'vigente');

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
        i % 2 ? 'vigente' : 'encerrado',
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
    finalidade_id: finalidadeId,
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
