'use strict';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir();
const { app } = require('../server');
const { getPlatformDb, getDomainDb } = require('../config/database');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

let adminToken;
let prestadorToken;
let domainId;
let finalidadeId;

test.before(async () => {
  await initTestDb();

  const sys = await request(app)
    .post('/api/auth/login')
    .send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200);

  const enabled = await request(app)
    .post('/api/domains/enable')
    .set('Authorization', `Bearer ${sys.body.token}`)
    .send({
      name: 'Delta Finalidades',
      adminName: 'Dana',
      adminEmail: 'dana@delta.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201);
  domainId = enabled.body.domain.id;

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'dana@delta.test', password: 'Secret1!', domainId });
  assert.strictEqual(login.status, 200);
  adminToken = login.body.token;

  const prestador = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Pedro', email: 'pedro@delta.test', password: 'Secret1!', role: 'prestador' });
  assert.strictEqual(prestador.status, 201);
  const pLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'pedro@delta.test', password: 'Secret1!', domainId });
  prestadorToken = pLogin.body.token;
});

test('FR-005 finalidade CRUD', async () => {
  // admin creates dictionary entries
  const created = await request(app)
    .post('/api/finalidades')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Limpeza' });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  finalidadeId = created.body.finalidade.id;

  const second = await request(app)
    .post('/api/finalidades')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Manutencao' });
  assert.strictEqual(second.status, 201);

  // duplicate refused; empty name refused
  const dup = await request(app)
    .post('/api/finalidades')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Limpeza' });
  assert.strictEqual(dup.status, 409);
  const empty = await request(app)
    .post('/api/finalidades')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: '  ' });
  assert.strictEqual(empty.status, 400);

  // listFinalidade (gestor can read the dictionary for the contract form)
  const list = await request(app)
    .get('/api/finalidades')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.strictEqual(list.status, 200);
  const names = list.body.finalidades.map((f) => f.name);
  assert.ok(names.includes('Limpeza'));
  assert.ok(names.includes('Manutencao'));

  // editar (rename)
  const renamed = await request(app)
    .put(`/api/finalidades/${finalidadeId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Limpeza Pesada' });
  assert.strictEqual(renamed.status, 200);
  assert.strictEqual(renamed.body.finalidade.name, 'Limpeza Pesada');

  // a contract referencing the finalidade exists (direct insert; contract
  // routes arrive in T011)
  const db = getDomainDb(domainId);
  db.run(
    "INSERT INTO contracts(name, object, finalidade_id, start_date, forecast_date) VALUES ('C-1', 'obj', ?, '2026-01-01', '2026-12-31')",
    [finalidadeId]
  );

  // retirar (retire) removes it from the default dictionary…
  const retired = await request(app)
    .delete(`/api/finalidades/${finalidadeId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert.strictEqual(retired.status, 200);

  const after = await request(app)
    .get('/api/finalidades')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.ok(!after.body.finalidades.some((f) => f.id === finalidadeId), 'retired hidden from list');

  // …but does not alter existing contracts (spec edge case)
  const contract = db.get('SELECT finalidade_id FROM contracts WHERE name = ?', ['C-1']);
  assert.strictEqual(contract.finalidade_id, finalidadeId, 'contract reference untouched');

  // retired entries remain visible to admin with showRetired
  const adminView = await request(app)
    .get('/api/finalidades?showRetired=1')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.ok(adminView.body.finalidades.some((f) => f.id === finalidadeId));

  // role matrix: prestador cannot manage the dictionary
  const forbidden = await request(app)
    .post('/api/finalidades')
    .set('Authorization', `Bearer ${prestadorToken}`)
    .send({ name: 'Invasao' });
  assert.strictEqual(forbidden.status, 403);

  // platform row sanity: dictionary lives in the domain db only
  const platform = getPlatformDb();
  assert.strictEqual(
    platform.get('SELECT COUNT(*) AS c FROM domains WHERE id = ?', [domainId]).c,
    1
  );
});
