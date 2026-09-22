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
    .send({ name: 'Gilda', email: 'gilda@epsilon.test', password: 'Secret1!', role: 'gestor' });
  await request(app)
    .post('/api/users')
    .set(as(adminToken))
    .send({ name: 'Paulo', email: 'paulo@epsilon.test', password: 'Secret1!', role: 'prestador' });
  await request(app)
    .post('/api/users')
    .set(as(adminToken))
    .send({ name: ' Paula', email: 'paula@epsilon.test', password: 'Secret1!', role: 'prestador' });

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
    db.get('SELECT COUNT(*) AS c FROM contract_prestadores WHERE contract_id = ?', [contract.id]).c,
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
