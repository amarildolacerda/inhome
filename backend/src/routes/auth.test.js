'use strict';

const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir();
const { app } = require('../server');
const { getDomainDb } = require('../config/database');
const User = require('../models/User');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

let sysToken;

function login(body) {
  return request(app).post('/api/v2/auth/login').send(body);
}

async function enable(name, adminEmail) {
  const res = await request(app)
    .post('/api/v2/domains/enable')
    .set('Authorization', `Bearer ${sysToken}`)
    .send({ name, adminName: `Admin ${name}`, adminEmail, adminPassword: 'Secret1!' });
  assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  return res.body.domain;
}

test.before(async () => {
  await initTestDb();
  const sys = await login({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200, JSON.stringify(sys.body));
  sysToken = sys.body.token;
});

test('platform admin session unchanged (no domainId)', async () => {
  const res = await login({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(res.body.domainId, null);
  assert.strictEqual(res.body.user.role, 'system_admin');
  assert.strictEqual(res.body.user.email, SYS_EMAIL);
  assert.ok(res.body.token);

  // platform stays email-only: a bare handle is not a username there
  const byHandle = await login({ email: 'admin', password: SYS_PASSWORD });
  assert.strictEqual(byHandle.status, 401);
  assert.strictEqual(byHandle.body.error, 'Invalid credentials');
});

test('domain user auto-identifies without domainId', async () => {
  const domain = await enable('Auto Perfil', 'auto@perfil.test');
  const res = await login({ email: 'auto@perfil.test', password: 'Secret1!' });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(res.body.domainId, domain.id);
  assert.strictEqual(res.body.user.role, 'admin');
  assert.strictEqual(res.body.user.email, 'auto@perfil.test');
  assert.strictEqual(res.body.user.password_hash, undefined);
  assert.ok(res.body.token);

  // the auto-identified session resolves like any explicit domain session
  const me = await request(app)
    .get('/api/v2/auth/me')
    .set('Authorization', `Bearer ${res.body.token}`);
  assert.strictEqual(me.status, 200, JSON.stringify(me.body));
  assert.strictEqual(me.body.user.email, 'auto@perfil.test');
});

test('wrong credentials stay 401 Invalid credentials', async () => {
  const domain = await enable('Senha Errada', 'wrong@senha.test');

  const badPassword = await login({ email: 'wrong@senha.test', password: 'nope!' });
  assert.strictEqual(badPassword.status, 401);
  assert.strictEqual(badPassword.body.error, 'Invalid credentials');

  const unknown = await login({ email: 'nobody@senha.test', password: 'nope!' });
  assert.strictEqual(unknown.status, 401);
  assert.strictEqual(unknown.body.error, 'Invalid credentials');

  const badPlatform = await login({ email: SYS_EMAIL, password: 'nope!' });
  assert.strictEqual(badPlatform.status, 401);
  assert.strictEqual(badPlatform.body.error, 'Invalid credentials');

  // explicit domainId branch keeps the same 401 body
  const explicit = await login({
    email: 'wrong@senha.test',
    password: 'nope!',
    domainId: domain.id,
  });
  assert.strictEqual(explicit.status, 401);
  assert.strictEqual(explicit.body.error, 'Invalid credentials');
});

// spec §Edge Cases & Boundaries: domínio inexistente responde como
// credenciais erradas (401/403 sem revelar qual falhou) — nunca 404.
test('unknown domainId answers 401 Invalid credentials', async () => {
  const res = await login({
    email: 'ghost@nowhere.test',
    password: 'Secret1!',
    domainId: 999999,
  });
  assert.strictEqual(res.status, 401, JSON.stringify(res.body));
  assert.strictEqual(res.body.error, 'Invalid credentials');

  // mesma resposta para o chamador que erra a senha no mesmo domínio —
  // não há como distinguir "sem domínio" de "senha errada"
  const domain = await enable('Erro Senha Dif', 'dif@senha.test');
  const wrongPassword = await login({
    email: 'dif@senha.test',
    password: 'nope!',
    domainId: domain.id,
  });
  assert.strictEqual(wrongPassword.status, 401);
  assert.strictEqual(wrongPassword.body.error, 'Invalid credentials');
});

test('suspended domain does not auto-resolve', async () => {
  const domain = await enable('Suspenso Auto', 'sus@auto.test');
  const sus = await request(app)
    .post(`/api/v2/domains/${domain.id}/suspend`)
    .set('Authorization', `Bearer ${sysToken}`);
  assert.strictEqual(sus.status, 200, JSON.stringify(sus.body));

  // excluded from the active-domain search entirely → plain 401
  const res = await login({ email: 'sus@auto.test', password: 'Secret1!' });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error, 'Invalid credentials');

  // explicit domainId keeps the HINT-002 403 path (unchanged)
  const explicit = await login({
    email: 'sus@auto.test',
    password: 'Secret1!',
    domainId: domain.id,
  });
  assert.strictEqual(explicit.status, 403);
  assert.match(explicit.body.error, /suspended/i);
});

test('same credentials in two active domains → 409', async () => {
  await enable('Ambig Um', 'amb@duplicado.test');
  await enable('Ambig Dois', 'amb@duplicado.test');

  const res = await login({ email: 'amb@duplicado.test', password: 'Secret1!' });
  assert.strictEqual(res.status, 409, JSON.stringify(res.body));
  assert.strictEqual(res.body.error, 'Email registered in more than one domain');
});

test('inactive domain user does not authenticate', async () => {
  const domain = await enable('Inativo Perfil', 'admin@inativo.test');
  const created = User.create(getDomainDb(domain.id), {
    name: 'Fantasma',
    email: 'ghost@inativo.test',
    password: 'Secret1!',
    role: 'gestor',
  });
  User.update(getDomainDb(domain.id), created.id, { active: 0 });

  const res = await login({ email: 'ghost@inativo.test', password: 'Secret1!' });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error, 'Invalid credentials');
});

test('login accepts email or username (domain sessions)', async () => {
  const domain = await enable('Nome De Usuario', 'rita@usuario.test');

  // domain admin (auto-identified, no domainId) creates a user with username
  const adminLogin = await login({ email: 'rita@usuario.test', password: 'Secret1!' });
  assert.strictEqual(adminLogin.status, 200, JSON.stringify(adminLogin.body));
  const created = await request(app)
    .post('/api/v2/users')
    .set('Authorization', `Bearer ${adminLogin.body.token}`)
    .send({
      name: 'Caio',
      email: 'caio@usuario.test',
      password: 'Secret1!',
      role: 'prestador',
      username: 'CaioUser',
    });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  assert.strictEqual(created.body.user.username, 'caiouser');

  // login by username, mixed case, no domainId → same shape as email login
  const byName = await login({ email: 'CAIOUSER', password: 'Secret1!' });
  assert.strictEqual(byName.status, 200, JSON.stringify(byName.body));
  assert.strictEqual(byName.body.domainId, domain.id);
  assert.strictEqual(byName.body.user.email, 'caio@usuario.test');
  assert.strictEqual(byName.body.user.username, 'caiouser');
  assert.strictEqual(byName.body.user.role, 'prestador');
  assert.ok(byName.body.token);

  // login by email still resolves for the same user
  const byEmail = await login({ email: 'caio@usuario.test', password: 'Secret1!' });
  assert.strictEqual(byEmail.status, 200, JSON.stringify(byEmail.body));
  assert.strictEqual(byEmail.body.domainId, domain.id);

  // explicit domainId also accepts the username identifier
  const explicit = await login({
    email: 'caiouser',
    password: 'Secret1!',
    domainId: domain.id,
  });
  assert.strictEqual(explicit.status, 200, JSON.stringify(explicit.body));
  assert.strictEqual(explicit.body.domainId, domain.id);

  // wrong password via username → plain 401
  const bad = await login({ email: 'caiouser', password: 'nope!' });
  assert.strictEqual(bad.status, 401);
  assert.strictEqual(bad.body.error, 'Invalid credentials');
});

// E001 (spec 00002) — RED stub; T005 turns it GREEN.
test('FR-002 JWT 24h e login', async () => {
  const domain = await enable('JWT Vinte Quatro', 'jwt@24.test');
  const adminLogin = await login({ email: 'jwt@24.test', password: 'Secret1!' });
  assert.strictEqual(adminLogin.status, 200, JSON.stringify(adminLogin.body));

  // admin creates a gestor with a username — role must resolve automatically
  const created = await request(app)
    .post('/api/v2/users')
    .set('Authorization', `Bearer ${adminLogin.body.token}`)
    .send({
      name: 'Gestor JWT',
      email: 'gestor@jwt.test',
      password: 'Secret1!',
      role: 'gestor',
      username: 'gestor.jwt',
    });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));

  const assertJwt24h = (token, expectedRole, expectedDomainId) => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    assert.strictEqual(decoded.role, expectedRole, 'role claim');
    assert.strictEqual(decoded.domainId, expectedDomainId, 'domainId claim');
    assert.strictEqual(decoded.exp - decoded.iat, 24 * 60 * 60, 'JWT valid for 24h');
  };

  // login by e-mail → admin role, domainId of the owning domain
  const byEmail = await login({ email: 'jwt@24.test', password: 'Secret1!' });
  assert.strictEqual(byEmail.status, 200, JSON.stringify(byEmail.body));
  assert.strictEqual(byEmail.body.domainId, domain.id);
  assertJwt24h(byEmail.body.token, 'admin', domain.id);

  // login by username → same shape, role resolved automatically
  const byUsername = await login({ email: 'gestor.jwt', password: 'Secret1!' });
  assert.strictEqual(byUsername.status, 200, JSON.stringify(byUsername.body));
  assert.strictEqual(byUsername.body.user.role, 'gestor');
  assert.strictEqual(byUsername.body.domainId, domain.id);
  assertJwt24h(byUsername.body.token, 'gestor', domain.id);

  // platform session keeps domainId null + system_admin role
  const platform = await login({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(platform.status, 200);
  assertJwt24h(platform.body.token, 'system_admin', null);

  // the issued token opens the session
  const me = await request(app)
    .get('/api/v2/auth/me')
    .set('Authorization', `Bearer ${byUsername.body.token}`);
  assert.strictEqual(me.status, 200, JSON.stringify(me.body));
  assert.strictEqual(me.body.user.role, 'gestor');
});
