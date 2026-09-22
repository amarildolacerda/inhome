'use strict';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');
const { validate } = require('./validate');

setupDataDir();
const { app } = require('../server');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function runMiddleware(middleware, body) {
  const res = mockRes();
  let nexted = false;
  middleware({ body }, res, () => {
    nexted = true;
  });
  return { res, nexted };
}

let adminToken;
let gestorToken;
let domainId;

function as(token) {
  return { Authorization: `Bearer ${token}` };
}

async function login(email, password, domId) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password, domainId: domId });
  assert.strictEqual(res.status, 200, `${email}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

test.before(async () => {
  await initTestDb();

  const sys = await request(app).post('/api/auth/login').send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  const enabled = await request(app)
    .post('/api/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Teta Validacao',
      adminName: 'Vera',
      adminEmail: 'vera@teta.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201);
  domainId = enabled.body.domain.id;
  adminToken = await login('vera@teta.test', 'Secret1!', domainId);

  const gestor = await request(app)
    .post('/api/users')
    .set(as(adminToken))
    .send({ name: 'Guto', email: 'guto@teta.test', password: 'Secret1!', role: 'gestor' });
  assert.strictEqual(gestor.status, 201);
  gestorToken = await login('guto@teta.test', 'Secret1!', domainId);
});

test('FR-021 validation', async () => {
  assert.strictEqual(typeof validate, 'function', 'validate exported');

  // ---- unit: schema gate ----
  const schema = {
    name: { required: true, type: 'string', min: 3 },
    count: { type: 'integer', min: 1 },
    when: { type: 'date' },
    mode: { enum: ['a', 'b'] },
    optional_note: { type: 'string' },
  };

  // missing required → 400 with field detail
  let out = runMiddleware(validate(schema), {});
  assert.strictEqual(out.res.statusCode, 400);
  assert.strictEqual(out.res.body.error, 'Validation failed');
  assert.ok(out.res.body.details.includes('name is required'));

  // wrong type → 400
  out = runMiddleware(validate(schema), { name: 'valido', count: 'not-a-number' });
  assert.strictEqual(out.res.statusCode, 400);
  assert.ok(out.res.body.details.some((d) => d.includes('count')));

  // enum violation → 400
  out = runMiddleware(validate(schema), { name: 'valido', mode: 'z' });
  assert.strictEqual(out.res.statusCode, 400);

  // min-length → 400
  out = runMiddleware(validate(schema), { name: 'ab' });
  assert.strictEqual(out.res.statusCode, 400);

  // malformed date → 400
  out = runMiddleware(validate(schema), { name: 'valido', when: 'ontem' });
  assert.strictEqual(out.res.statusCode, 400);
  assert.ok(out.res.body.details.some((d) => d.includes('when')));

  // valid + optional absent → next()
  out = runMiddleware(validate(schema), { name: 'valido', count: 2, when: '2026-01-31', mode: 'a' });
  assert.strictEqual(out.nexted, true, 'valid payload passes');
  assert.strictEqual(out.res.body, null);

  // empty optional string is treated as absent, not an error
  out = runMiddleware(validate(schema), { name: 'valido', optional_note: '' });
  assert.strictEqual(out.nexted, true);

  // ---- integration: contract creation payload ----
  const badContract = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: '' });
  assert.strictEqual(badContract.status, 400, JSON.stringify(badContract.body));
  assert.strictEqual(badContract.body.error, 'Validation failed');
  assert.ok(badContract.body.details.some((d) => d.includes('start_date')));

  const badDate = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'Obra', start_date: '31/01/2026', forecast_date: 'nunca' });
  assert.strictEqual(badDate.status, 400);

  const badType = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'Obra', start_date: '2026-01-01', forecast_date: '2026-12-31', finalidade_id: 'abc' });
  assert.strictEqual(badType.status, 400);

  // ---- integration: task creation payload ----
  const contract = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'Obra Validada', start_date: '2026-01-01', forecast_date: '2026-12-31' });
  assert.strictEqual(contract.status, 201, JSON.stringify(contract.body));

  const missingTitle = await request(app)
    .post(`/api/contracts/${contract.body.contract.id}/tasks`)
    .set(as(gestorToken))
    .send({});
  assert.strictEqual(missingTitle.status, 400, JSON.stringify(missingTitle.body));
  assert.ok(missingTitle.body.details.some((d) => d.includes('title')));

  const badPriority = await request(app)
    .post(`/api/contracts/${contract.body.contract.id}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'X', priority: 'mega' });
  assert.strictEqual(badPriority.status, 400);
  assert.ok(badPriority.body.details.some((d) => d.includes('priority')));

  const badDue = await request(app)
    .post(`/api/contracts/${contract.body.contract.id}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'X', due_date: 'sexta' });
  assert.strictEqual(badDue.status, 400);

  // valid task payload still reaches the handler (201)
  const okTask = await request(app)
    .post(`/api/contracts/${contract.body.contract.id}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Tarefa valida', priority: 'high', due_date: '2026-06-30' });
  assert.strictEqual(okTask.status, 201, JSON.stringify(okTask.body));
  assert.strictEqual(okTask.body.task.title, 'Tarefa valida');
});
