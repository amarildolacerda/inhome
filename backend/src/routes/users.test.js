'use strict';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir();
const { app } = require('../server');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

let adminToken;
let gestorToken;

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
      name: 'Gamma Usuarios',
      adminName: 'Gabi',
      adminEmail: 'gabi@gamma.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201);
  const domainId = enabled.body.domain.id;

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'gabi@gamma.test', password: 'Secret1!', domainId });
  assert.strictEqual(login.status, 200);
  adminToken = login.body.token;

  // a gestor is created by the admin for role-matrix checks
  const gestor = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Gil', email: 'gil@gamma.test', password: 'Secret1!', role: 'gestor' });
  assert.strictEqual(gestor.status, 201);
  const gestorLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'gil@gamma.test', password: 'Secret1!', domainId });
  assert.strictEqual(gestorLogin.status, 200);
  gestorToken = gestorLogin.body.token;
});

test('FR-004 user CRUD', async () => {
  // admin creates users with the three domain roles
  const prestador = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Paula', email: 'paula@gamma.test', password: 'Secret1!', role: 'prestador' });
  assert.strictEqual(prestador.status, 201, JSON.stringify(prestador.body));
  assert.strictEqual(prestador.body.user.role, 'prestador');

  // validation: bad role, weak password, missing fields, duplicate email
  const badRole = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'X', email: 'x@gamma.test', password: 'Secret1!', role: 'superuser' });
  assert.strictEqual(badRole.status, 400);

  const weak = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Y', email: 'y@gamma.test', password: 'abc', role: 'gestor' });
  assert.strictEqual(weak.status, 400);

  const missing = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ email: 'z@gamma.test', password: 'Secret1!', role: 'gestor' });
  assert.strictEqual(missing.status, 400);

  const dup = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Gil 2', email: 'gil@gamma.test', password: 'Secret1!', role: 'gestor' });
  assert.strictEqual(dup.status, 409);

  // listUser returns roster without password hashes
  const list = await request(app)
    .get('/api/users')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.strictEqual(list.status, 200);
  const emails = list.body.users.map((u) => u.email);
  assert.ok(emails.includes('paula@gamma.test'));
  assert.ok(emails.includes('gil@gamma.test'));
  for (const user of list.body.users) {
    assert.strictEqual(user.password_hash, undefined, 'hash never serialized');
  }

  // update
  const updated = await request(app)
    .put(`/api/users/${prestador.body.user.id}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Paula Prado', role: 'gestor' });
  assert.strictEqual(updated.status, 200);
  assert.strictEqual(updated.body.user.name, 'Paula Prado');
  assert.strictEqual(updated.body.user.role, 'gestor');

  // delete
  const deleted = await request(app)
    .delete(`/api/users/${prestador.body.user.id}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert.strictEqual(deleted.status, 200);
  const after = await request(app)
    .get('/api/users')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.ok(!after.body.users.some((u) => u.email === 'paula@gamma.test'));

  // deleted user can no longer authenticate
  const ghost = await request(app)
    .post('/api/auth/login')
    .send({ email: 'paula@gamma.test', password: 'Secret1!' });
  // domainId omitted → platform login path → also 401 (unknown platform user)
  assert.strictEqual(ghost.status, 401);

  // role matrix: gestor cannot manage users (admin only)
  const gestorWrite = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${gestorToken}`)
    .send({ name: 'Nope', email: 'nope@gamma.test', password: 'Secret1!', role: 'gestor' });
  assert.strictEqual(gestorWrite.status, 403);
});
