'use strict';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir('sddp-provider-performance-routes-');
const { app } = require('../server');
const { getDomainDb } = require('../config/database');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';
const REFERENCE_DATE = '2026-11-20';

function as(token) {
  return { Authorization: `Bearer ${token}` };
}

async function login(email, domainId) {
  const res = await request(app)
    .post('/api/v2/auth/login')
    .send({ email, password: 'Secret1!', domainId });
  assert.strictEqual(res.status, 200, `${email}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

async function enableDomain(sysToken, name, email) {
  const res = await request(app)
    .post('/api/v2/domains/enable')
    .set(as(sysToken))
    .send({ name, adminName: `Admin ${name}`, adminEmail: email, adminPassword: 'Secret1!' });
  assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  return res.body.domain.id;
}

async function createUser(adminToken, { name, email, username, role }) {
  const res = await request(app)
    .post('/api/v2/users')
    .set(as(adminToken))
    .send({ name, email, password: 'Secret1!', role, username });
  assert.strictEqual(res.status, 201, JSON.stringify(res.body));
}

function seedPerformance(db, providerId, scoreTitle, completedAt) {
  db.run(
    "INSERT INTO contracts(name, start_date, forecast_date) VALUES (?, '2026-01-01', '2026-12-31')",
    [scoreTitle]
  );
  const contractId = db.get('SELECT id FROM contracts WHERE name = ?', [scoreTitle]).id;
  db.run('INSERT INTO contract_providers(contract_id, user_id) VALUES (?, ?)', [contractId, providerId]);
  db.run(
    `INSERT INTO tasks(contract_id, title, assignee_id, due_date, completed_at, created_at)
     VALUES (?, ?, ?, '2026-11-15', ?, '2026-10-25T09:00:00.000Z')`,
    [contractId, scoreTitle, providerId, completedAt]
  );
}

let domainA;
let domainB;
let adminA;
let gestorA;
let prestadorA;
let adminB;
let providerAId;
let providerBId;

test.before(async () => {
  await initTestDb();
  const sys = await request(app)
    .post('/api/v2/auth/login')
    .send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200);

  domainA = await enableDomain(sys.body.token, 'Desempenho A', 'admin.perf.a@test.local');
  domainB = await enableDomain(sys.body.token, 'Desempenho B', 'admin.perf.b@test.local');
  adminA = await login('admin.perf.a@test.local', domainA);
  adminB = await login('admin.perf.b@test.local', domainB);

  await createUser(adminA, {
    name: 'Gestor A', email: 'gestor.perf.a@test.local', username: 'gestorperfa', role: 'gestor',
  });
  await createUser(adminA, {
    name: 'Ana Comum', email: 'ana.perf.a@test.local', username: 'anaperfa', role: 'prestador',
  });
  await createUser(adminA, {
    name: 'Prestador A', email: 'prestador.perf.a@test.local', username: 'prestadorperfa', role: 'prestador',
  });
  await createUser(adminB, {
    name: 'Ana Comum', email: 'ana.perf.b@test.local', username: 'anaperfb', role: 'prestador',
  });
  gestorA = await login('gestor.perf.a@test.local', domainA);
  prestadorA = await login('prestador.perf.a@test.local', domainA);

  const dbA = getDomainDb(domainA);
  const dbB = getDomainDb(domainB);
  providerAId = dbA.get("SELECT id FROM users WHERE email = 'ana.perf.a@test.local'").id;
  providerBId = dbB.get("SELECT id FROM users WHERE email = 'ana.perf.b@test.local'").id;
  seedPerformance(dbA, providerAId, 'Contrato A', '2026-11-14T12:00:00.000Z');
  seedPerformance(dbB, providerBId, 'Contrato B', '2026-11-17T12:00:00.000Z');
});

function getPerformance(token, query = `?referenceDate=${REFERENCE_DATE}&days=30`) {
  return request(app).get(`/api/v2/providers/performance${query}`).set(as(token));
}

test('FR-004 role guard', async () => {
  const denied = await getPerformance(prestadorA);
  assert.strictEqual(denied.status, 403);
  assert.strictEqual(denied.body.error, 'Forbidden');
  assert.strictEqual(denied.body.items, undefined);

  const anonymous = await request(app).get('/api/v2/providers/performance');
  assert.strictEqual(anonymous.status, 401);

  const gestor = await getPerformance(gestorA);
  assert.strictEqual(gestor.status, 200, JSON.stringify(gestor.body));
  const admin = await getPerformance(adminA);
  assert.strictEqual(admin.status, 200, JSON.stringify(admin.body));
});

test('FR-009 domain scope', async () => {
  const payloadA = (await getPerformance(adminA)).body;
  const payloadB = (await getPerformance(adminB)).body;

  assert.strictEqual(payloadA.total, 1);
  assert.strictEqual(payloadA.items[0].providerId, providerAId);
  assert.strictEqual(payloadB.total, 1);
  assert.strictEqual(payloadB.items[0].providerId, providerBId);
  assert.notStrictEqual(providerAId, providerBId);
  assert.strictEqual(payloadA.items[0].name, 'Ana Comum');
  assert.strictEqual(payloadB.items[0].name, 'Ana Comum');
  assert.strictEqual(payloadA.items[0].score, 100);

  const crossDomain = await getPerformance(adminA, `?domainId=${domainB}`);
  assert.strictEqual(crossDomain.status, 403);
});

test('FR-010 provider filter', async () => {
  const filtered = (await getPerformance(adminA, `?referenceDate=${REFERENCE_DATE}&providerId=${providerAId}`)).body;
  assert.strictEqual(filtered.total, 1);
  assert.strictEqual(filtered.items[0].providerId, providerAId);
});

test('FR-012 page and query validation', async () => {
  const payload = (await getPerformance(adminA)).body;
  assert.strictEqual(payload.pageSize, 100);
  assert.strictEqual(payload.page, 1);

  const badPage = await getPerformance(adminA, '?page=0');
  assert.strictEqual(badPage.status, 400);
  assert.strictEqual(badPage.body.code, 'PERFORMANCE_PAGE_INVALID');
});
