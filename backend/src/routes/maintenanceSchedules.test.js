'use strict';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir('sddp-maintenance-routes-');
const { app } = require('../server');
const { getDomainDb } = require('../config/database');
const { signJwt } = require('../middleware/auth');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

function localDate(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function as(token) {
  return { Authorization: `Bearer ${token}` };
}

async function login(email, password, domainId) {
  const res = await request(app).post('/api/v2/auth/login').send({ email, password, domainId });
  assert.strictEqual(res.status, 200, `${email}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

let domainId;
let otherDomainId;
let gestorToken;
let adminToken;
let prestadorToken;
let visitanteToken;
let otherDomainToken;
let contractId;
let db;

test.before(async () => {
  await initTestDb();
  const sys = await request(app)
    .post('/api/v2/auth/login')
    .send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  const enabled = await request(app)
    .post('/api/v2/domains/enable')
    .set(as(sys.body.token))
    .send({ name: 'Manutenção Rotas', adminName: 'Ana', adminEmail: 'ana@mrotas.test', adminPassword: 'Secret1!' });
  assert.strictEqual(enabled.status, 201, JSON.stringify(enabled.body));
  domainId = enabled.body.domain.id;
  adminToken = await login('ana@mrotas.test', 'Secret1!', domainId);

  for (const [name, email, role] of [
    ['Guto', 'guto@mrotas.test', 'gestor'],
    ['Mila', 'mila@mrotas.test', 'prestador'],
  ]) {
    const created = await request(app)
      .post('/api/v2/users')
      .set(as(adminToken))
      .send({ name, email, password: 'Secret1!', role, username: email.split('@')[0] });
    assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  }
  gestorToken = await login('guto@mrotas.test', 'Secret1!', domainId);
  prestadorToken = await login('mila@mrotas.test', 'Secret1!', domainId);
  db = getDomainDb(domainId);
  const prestadorId = db.get("SELECT id FROM users WHERE email = 'mila@mrotas.test'").id;
  visitanteToken = signJwt({ id: prestadorId, email: 'vis@mrotas.test', role: 'visitante', domainId });

  const contract = await request(app)
    .post('/api/v2/contracts')
    .set(as(gestorToken))
    .send({ name: 'Contrato manutenção', start_date: localDate(-10), forecast_date: localDate(365) });
  assert.strictEqual(contract.status, 201, JSON.stringify(contract.body));
  contractId = contract.body.contract.id;

  const second = await request(app)
    .post('/api/v2/domains/enable')
    .set(as(sys.body.token))
    .send({ name: 'Outro Domínio', adminName: 'Bia', adminEmail: 'bia@mrotas.test', adminPassword: 'Secret1!' });
  assert.strictEqual(second.status, 201, JSON.stringify(second.body));
  otherDomainId = second.body.domain.id;
  otherDomainToken = await login('bia@mrotas.test', 'Secret1!', otherDomainId);
});

function payload(overrides = {}) {
  return {
    title: overrides.title === undefined ? 'Inspeção trimestral' : overrides.title,
    intervalDays: overrides.intervalDays === undefined ? 90 : overrides.intervalDays,
    startDate: overrides.startDate || localDate(-10),
    leadDays: overrides.leadDays === undefined ? 15 : overrides.leadDays,
  };
}

async function create(overrides = {}, token = gestorToken) {
  return request(app)
    .post(`/api/v2/contracts/${contractId}/maintenance-schedules`)
    .set(as(token))
    .send(payload(overrides));
}

test('FR-092: admin e gestor criam e consultam regras e ocorrências', async () => {
  const created = await create();
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  assert.strictEqual(created.body.rule.title, 'Inspeção trimestral');
  assert.strictEqual(created.body.rule.active, true);
  const listed = await request(app)
    .get(`/api/v2/contracts/${contractId}/maintenance-schedules`)
    .set(as(gestorToken));
  assert.strictEqual(listed.status, 200, JSON.stringify(listed.body));
  assert.ok(listed.body.rules.some((rule) => rule.id === created.body.rule.id));
  assert.ok(Array.isArray(listed.body.occurrences));
  const edit = await request(app)
    .patch(`/api/v2/contracts/${contractId}/maintenance-schedules/${created.body.rule.id}`)
    .set(as(adminToken))
    .send({ intervalDays: 30 });
  assert.strictEqual(edit.status, 200, JSON.stringify(edit.body));
  assert.strictEqual(edit.body.rule.intervalDays, 30);
});

test('FR-093: payload inválido responde 400 sem gravar regra', async () => {
  const before = db.get('SELECT COUNT(*) AS c FROM maintenance_rules').c;
  for (const overrides of [
    { intervalDays: 0 },
    { intervalDays: 366 },
    { title: '' },
    { startDate: '31/12/2026' },
    { leadDays: 91 },
  ]) {
    const res = await create(overrides);
    assert.strictEqual(res.status, 400, `${JSON.stringify(overrides)}: ${JSON.stringify(res.body)}`);
  }
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM maintenance_rules').c, before);
});

test('FR-103: sem token, papel errado e domínio alheio não gravam', async () => {
  const unauth = await request(app)
    .post(`/api/v2/contracts/${contractId}/maintenance-schedules`)
    .send(payload());
  assert.strictEqual(unauth.status, 401);
  for (const token of [prestadorToken, visitanteToken]) {
    const res = await create({}, token);
    assert.strictEqual(res.status, 403, `${JSON.stringify(res.body)}`);
  }
  // Isolamento E001: ?domainId alheio é recusado por scopeDomain antes de qualquer consulta.
  const crossDomain = await request(app)
    .post(`/api/v2/contracts/${contractId}/maintenance-schedules?domainId=${domainId}`)
    .set(as(otherDomainToken))
    .send(payload());
  assert.strictEqual(crossDomain.status, 403, JSON.stringify(crossDomain.body));
  // FR-092: consulta também é privativa de admin/gestor.
  const read = await request(app)
    .get(`/api/v2/contracts/${contractId}/maintenance-schedules`)
    .set(as(prestadorToken));
  assert.strictEqual(read.status, 403, JSON.stringify(read.body));
});

test('FR-104: acionamento manual usa o mesmo serviço e é idempotente', async () => {
  await create({ startDate: localDate(-20), intervalDays: 30, leadDays: 15 });
  const first = await request(app)
    .post('/api/v2/maintenance/sweep')
    .set(as(gestorToken))
    .send({});
  assert.strictEqual(first.status, 200, JSON.stringify(first.body));
  assert.ok(Number.isInteger(first.body.created));
  assert.ok(Number.isInteger(first.body.ignored));
  const second = await request(app)
    .post('/api/v2/maintenance/sweep')
    .set(as(gestorToken))
    .send({});
  assert.strictEqual(second.status, 200, JSON.stringify(second.body));
  assert.strictEqual(second.body.created, 0, JSON.stringify(second.body));
  assert.ok(second.body.ignored >= 1);
  const denied = await request(app).post('/api/v2/maintenance/sweep').set(as(prestadorToken)).send({});
  assert.strictEqual(denied.status, 403);
});
