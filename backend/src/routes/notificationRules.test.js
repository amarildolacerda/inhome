'use strict';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir('sddp-notification-rules-routes-');
const { app } = require('../server');
const { getPlatformDb, getDomainDb } = require('../config/database');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

function as(token) {
  return { Authorization: `Bearer ${token}` };
}

async function login(email, password, domainId) {
  const res = await request(app).post('/api/v2/auth/login').send({ email, password, domainId });
  assert.strictEqual(res.status, 200, `${email}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

let domainId;
let adminToken;
let gestorToken;
let prestadorToken;

test.before(async () => {
  await initTestDb();
  const sys = await request(app).post('/api/v2/auth/login').send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200);
  const created = await request(app)
    .post('/api/v2/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Régua Rotas',
      adminName: 'Admin',
      adminEmail: 'admin.regua@routes.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  domainId = created.body.domain.id;
  adminToken = await login('admin.regua@routes.test', 'Secret1!', domainId);

  await request(app)
    .post('/api/v2/users')
    .set(as(adminToken))
    .send({ name: 'Gestor', email: 'gestor.regua@routes.test', password: 'Secret1!', role: 'gestor', username: 'gestorregua' });
  await request(app)
    .post('/api/v2/users')
    .set(as(adminToken))
    .send({ name: 'Prestador', email: 'prestador.regua@routes.test', password: 'Secret1!', role: 'prestador', username: 'prestadorregua' });
  gestorToken = await login('gestor.regua@routes.test', 'Secret1!', domainId);
  prestadorToken = await login('prestador.regua@routes.test', 'Secret1!', domainId);

  getPlatformDb().run('UPDATE domains SET alert_windows = ? WHERE id = ?', [JSON.stringify([30, 15, 7]), domainId]);
  getDomainDb(domainId);
});

test('FR-105/FR-106: PUT cria régua com etapas derivadas e GET devolve', async () => {
  const put = await request(app)
    .put('/api/v2/alerts/rules/vigencia')
    .set(as(adminToken))
    .send({ maxReminders: 3, intervalDays: 7, active: true });
  assert.strictEqual(put.status, 200, JSON.stringify(put.body));
  assert.deepStrictEqual(
    put.body.rule.steps.map((entry) => entry.windowDays),
    [7, 15, 30]
  );
  const list = await request(app).get('/api/v2/alerts/rules').set(as(gestorToken));
  assert.strictEqual(list.status, 200);
  assert.strictEqual(list.body.rules.length, 1);
  assert.strictEqual(list.body.rules[0].eventType, 'vigencia');
});

test('FR-107: payload inválido responde 400 sem gravar nada', async () => {
  const bad = await request(app)
    .put('/api/v2/alerts/rules/vigencia')
    .set(as(adminToken))
    .send({ maxReminders: 9, intervalDays: 7 });
  assert.strictEqual(bad.status, 400);
  assert.ok(bad.body.error);
  const list = await request(app).get('/api/v2/alerts/rules').set(as(adminToken));
  assert.strictEqual(list.body.rules[0].maxReminders, 3, 'config anterior intacta');
});

test('FR-113/FR-115: PATCH desativa e registra autor sem apagar eventos', async () => {
  const db = getDomainDb(domainId);
  db.run(
    `INSERT INTO alert_events(contract_id, window_days, event_type, rule_id, step, email_status)
     VALUES (9999, 7, 'vigencia', NULL, 1, 'skipped')`
  );
  const before = db.all('SELECT * FROM alert_events WHERE contract_id = 9999');
  const patch = await request(app)
    .patch('/api/v2/alerts/rules/vigencia')
    .set(as(gestorToken))
    .send({ active: false });
  assert.strictEqual(patch.status, 200, JSON.stringify(patch.body));
  assert.strictEqual(patch.body.rule.active, false);
  assert.strictEqual(patch.body.rule.updatedBy, 'Gestor');
  assert.deepStrictEqual(db.all('SELECT * FROM alert_events WHERE contract_id = 9999'), before);
  await request(app)
    .patch('/api/v2/alerts/rules/vigencia')
    .set(as(adminToken))
    .send({ active: true });
});

test('FR-105/FR-112: prestador é recusado em leitura e escrita', async () => {
  const read = await request(app).get('/api/v2/alerts/rules').set(as(prestadorToken));
  assert.strictEqual(read.status, 403);
  const write = await request(app)
    .put('/api/v2/alerts/rules/vigencia')
    .set(as(prestadorToken))
    .send({ maxReminders: 2, intervalDays: 7 });
  assert.strictEqual(write.status, 403);
  const panel = await request(app).get('/api/v2/alerts/panel').set(as(prestadorToken));
  assert.strictEqual(panel.status, 403);
});

test('FR-112: painel expõe rules e reminders para admin', async () => {
  const panel = await request(app).get('/api/v2/alerts/panel').set(as(adminToken));
  assert.strictEqual(panel.status, 200, JSON.stringify(panel.body).slice(0, 300));
  assert.ok(Array.isArray(panel.body.rules));
  assert.ok(Array.isArray(panel.body.reminders));
  assert.ok(panel.body.rules.some((rule) => rule.eventType === 'vigencia'));
});
