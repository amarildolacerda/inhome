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
    .send({ name: 'Gil', email: 'gil@gamma.test', password: 'Secret1!', role: 'gestor', username: 'gil' });
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
    .send({ name: 'Paula', email: 'paula@gamma.test', password: 'Secret1!', role: 'prestador', username: 'paula' });
  assert.strictEqual(prestador.status, 201, JSON.stringify(prestador.body));
  assert.strictEqual(prestador.body.user.role, 'prestador');

  // validation: bad role, weak password, missing fields, duplicate email
  const badRole = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'X', email: 'x@gamma.test', password: 'Secret1!', role: 'superuser', username: 'x' });
  assert.strictEqual(badRole.status, 400);

  const weak = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Y', email: 'y@gamma.test', password: 'abc', role: 'gestor', username: 'y' });
  assert.strictEqual(weak.status, 400);

  const missing = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ email: 'z@gamma.test', password: 'Secret1!', role: 'gestor', username: 'z' });
  assert.strictEqual(missing.status, 400);

  const dup = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Gil 2', email: 'gil@gamma.test', password: 'Secret1!', role: 'gestor', username: 'gil2' });
  assert.strictEqual(dup.status, 409);
  assert.strictEqual(dup.body.error, 'Email already registered');

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
    .send({ name: 'Nope', email: 'nope@gamma.test', password: 'Secret1!', role: 'gestor', username: 'nope' });
  assert.strictEqual(gestorWrite.status, 403);
});

test('FR-004 username required and unique', async () => {
  const asAdmin = { Authorization: `Bearer ${adminToken}` };

  // required on create
  const noUsername = await request(app)
    .post('/api/users')
    .set(asAdmin)
    .send({ name: 'Sem Username', email: 'sem@gamma.test', password: 'Secret1!', role: 'gestor' });
  assert.strictEqual(noUsername.status, 400);
  assert.strictEqual(noUsername.body.error, 'username is required');

  // created trimmed + lowercased, echoed back
  const created = await request(app)
    .post('/api/users')
    .set(asAdmin)
    .send({
      name: 'Novo Usuario',
      email: 'novo@gamma.test',
      password: 'Secret1!',
      role: 'prestador',
      username: '  NovoUsuario  ',
    });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  assert.strictEqual(created.body.user.username, 'novousuario');

  // duplicate username (case-insensitive, different email) → 409
  const dup = await request(app)
    .post('/api/users')
    .set(asAdmin)
    .send({ name: 'Clone', email: 'clone@gamma.test', password: 'Secret1!', role: 'gestor', username: 'GIL' });
  assert.strictEqual(dup.status, 409);
  assert.strictEqual(dup.body.error, 'Username already registered');

  // update: a user's own username is not a clash (self-exclusion)
  const self = await request(app)
    .put(`/api/users/${created.body.user.id}`)
    .set(asAdmin)
    .send({ username: 'NOVOUSUARIO' });
  assert.strictEqual(self.status, 200, JSON.stringify(self.body));
  assert.strictEqual(self.body.user.username, 'novousuario');

  // update: taking another user's username → 409
  const clash = await request(app)
    .put(`/api/users/${created.body.user.id}`)
    .set(asAdmin)
    .send({ username: 'Gil' });
  assert.strictEqual(clash.status, 409);
  assert.strictEqual(clash.body.error, 'Username already registered');

  // roster carries username, never the hash
  const list = await request(app).get('/api/users').set(asAdmin);
  assert.strictEqual(list.status, 200);
  const novo = list.body.users.find((u) => u.email === 'novo@gamma.test');
  assert.ok(novo, 'created user listed');
  assert.strictEqual(novo.username, 'novousuario');
  assert.strictEqual(novo.password_hash, undefined);
});
