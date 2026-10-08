'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

const dataDir = setupDataDir();
const { app } = require('../server');
const { getPlatformDb, getDomainDb } = require('../config/database');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

let sysToken;

async function loginSys() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(res.status, 200, `sysadmin login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token;
}

async function enable(name, adminEmail) {
  return request(app)
    .post('/api/domains/enable')
    .set('Authorization', `Bearer ${sysToken}`)
    .send({ name, adminName: 'Admin ' + name, adminEmail, adminPassword: 'Secret1!' });
}

test.before(async () => {
  await initTestDb();
  sysToken = await loginSys();
});

test('FR-001 enable', async () => {
  const res = await enable('Alpha Gestao', 'ada@alpha.test');
  assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  const domain = res.body.domain;
  assert.ok(domain.id > 0);
  assert.strictEqual(domain.status, 'active');
  assert.strictEqual(domain.admin.email, 'ada@alpha.test');
  assert.strictEqual(domain.admin.role, 'admin');

  // physical domain database created (FR-001 / FR-024 layout)
  assert.ok(
    fs.existsSync(path.join(dataDir, 'domains', `${domain.id}.db`)),
    'data/domains/<id>.db created on enable'
  );

  // first admin logs in (SC-001)
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ada@alpha.test', password: 'Secret1!', domainId: domain.id });
  assert.strictEqual(login.status, 200, JSON.stringify(login.body));
  assert.strictEqual(login.body.user.role, 'admin');
  assert.strictEqual(login.body.domainId, domain.id);
  assert.ok(login.body.token);

  // /me resolves the domain session
  const me = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${login.body.token}`);
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.body.user.email, 'ada@alpha.test');

  // duplicate slug refused
  const dup = await enable('Alpha Gestao', 'other@alpha.test');
  assert.strictEqual(dup.status, 409);

  // domain admin cannot enable domains (FR-003: cycle is system_admin only)
  const forbidden = await request(app)
    .post('/api/domains/enable')
    .set('Authorization', `Bearer ${login.body.token}`)
    .send({ name: 'Rogue', adminName: 'R', adminEmail: 'r@rogue.test', adminPassword: 'Secret1!' });
  assert.strictEqual(forbidden.status, 403);

  // unauthenticated refused
  const anon = await request(app)
    .post('/api/domains/enable')
    .send({ name: 'Anon', adminName: 'A', adminEmail: 'a@anon.test', adminPassword: 'Secret1!' });
  assert.strictEqual(anon.status, 401);

  domain.alphaId = domain.id;
  await enable('Beta Gestao', 'bob@beta.test');
});

test('FR-002 suspend/reactivate', async () => {
  // locate Beta domain (suspended under test)
  const list = await request(app)
    .get('/api/domains')
    .set('Authorization', `Bearer ${sysToken}`);
  assert.strictEqual(list.status, 200);
  const beta = list.body.domains.find((d) => d.slug === 'beta-gestao');
  assert.ok(beta, 'beta domain exists');

  // admin session while active
  const activeLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'bob@beta.test', password: 'Secret1!', domainId: beta.id });
  assert.strictEqual(activeLogin.status, 200);
  const liveToken = activeLogin.body.token;

  // suspend
  const sus = await request(app)
    .post(`/api/domains/${beta.id}/suspend`)
    .set('Authorization', `Bearer ${sysToken}`);
  assert.strictEqual(sus.status, 200);
  assert.strictEqual(sus.body.domain.status, 'suspended');

  // suspended domain refuses login (FR-002 / SC-002)
  const denied = await request(app)
    .post('/api/auth/login')
    .send({ email: 'bob@beta.test', password: 'Secret1!', domainId: beta.id });
  assert.strictEqual(denied.status, 403);
  assert.match(denied.body.error, /suspended/i);

  // existing session revalidation denied (edge case: pós-suspensão)
  const stale = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${liveToken}`);
  assert.strictEqual(stale.status, 403);

  // suspension never deletes data (FR-002)
  const file = path.join(dataDir, 'domains', `${beta.id}.db`);
  assert.ok(fs.existsSync(file), 'domain db preserved while suspended');
  const platform = getPlatformDb();
  assert.strictEqual(
    platform.get('SELECT COUNT(*) AS c FROM domains WHERE id = ?', [beta.id]).c,
    1,
    'domain row preserved'
  );

  // reactivate restores access (SC-002)
  const rea = await request(app)
    .post(`/api/domains/${beta.id}/reactivate`)
    .set('Authorization', `Bearer ${sysToken}`);
  assert.strictEqual(rea.status, 200);
  assert.strictEqual(rea.body.domain.status, 'active');

  const ok = await request(app)
    .post('/api/auth/login')
    .send({ email: 'bob@beta.test', password: 'Secret1!', domainId: beta.id });
  assert.strictEqual(ok.status, 200);

  // domain admin cannot suspend (FR-003)
  const forbidden = await request(app)
    .post(`/api/domains/${beta.id}/suspend`)
    .set('Authorization', `Bearer ${ok.body.token}`);
  assert.strictEqual(forbidden.status, 403);

  // first admin row still present after suspend/reactivate cycle
  const db = getDomainDb(beta.id);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM users').c, 1);
});

// E001 (spec 00002) — RED stubs; T004 and T007 turn them GREEN.
test('FR-001 habilitação atômica', async () => {
  // happy path: platform row + data/domains/<id>.db in a single operation
  const ok = await enable('Atomic Primavera', 'atomic@primavera.test');
  assert.strictEqual(ok.status, 201, JSON.stringify(ok.body));
  const domainId = ok.body.domain.id;
  assert.ok(domainId > 0);
  assert.strictEqual(ok.body.domain.status, 'active');
  assert.ok(
    fs.existsSync(path.join(dataDir, 'domains', `${domainId}.db`)),
    'domain db file created in the same operation'
  );

  // write failure → 500, and the platform record is never reused (spec edge case)
  const domainsPath = path.join(dataDir, 'domains');
  const realWrite = fs.writeFileSync;
  fs.writeFileSync = (file, ...args) => {
    if (String(file).startsWith(domainsPath)) throw new Error('simulated write failure');
    return realWrite(file, ...args);
  };
  let failed;
  try {
    failed = await enable('Atomic Falha', 'atomic@falha.test');
  } finally {
    fs.writeFileSync = realWrite;
  }
  assert.strictEqual(failed.status, 500, JSON.stringify(failed.body));
  assert.ok(failed.body.error, '500 body carries {error}');

  const platform = getPlatformDb();
  const orphan = platform.get('SELECT id, slug FROM domains WHERE slug = ?', ['atomic-falha']);
  assert.ok(orphan, 'failed record stays in domains');
  assert.ok(
    !fs.existsSync(path.join(dataDir, 'domains', `${orphan.id}.db`)),
    'no domain file attached to the failed record'
  );

  // the orphan record is not reused: same name cannot complete the cycle
  const retry = await enable('Atomic Falha', 'atomic@retry.test');
  assert.strictEqual(retry.status, 409, JSON.stringify(retry.body));
  assert.ok(
    !fs.existsSync(path.join(dataDir, 'domains', `${orphan.id}.db`)),
    'orphan record still without a domain file'
  );
});
test('FR-004 ciclo só system_admin', async () => {
  const cycleRoutes = [
    ['get', '/api/domains', null],
    ['post', '/api/domains/enable', { name: 'Rogue Cycle', adminName: 'R', adminEmail: 'r@rogue.test', adminPassword: 'Secret1!' }],
    ['post', '/api/domains/:id/suspend', null],
    ['post', '/api/domains/:id/reactivate', null],
  ];
  const hit = (method, url, id) => url.replace(':id', id);

  // system_admin drives the whole cycle
  const enabled = await enable('Ciclo Fechado', 'ciclo@fechado.test');
  assert.strictEqual(enabled.status, 201, JSON.stringify(enabled.body));
  const id = enabled.body.domain.id;
  for (const [method, url] of cycleRoutes) {
    const res = await request(app)[method](hit(method, url, id))
      .set('Authorization', `Bearer ${sysToken}`)
      .send({ name: 'Ciclo Fechado', adminName: 'C', adminEmail: 'c@ciclo.test', adminPassword: 'Secret1!' });
    assert.strictEqual(res.status, method === 'get' ? 200 : (url.includes('enable') ? 409 : 200), `${method} ${url} as system_admin: ${res.status}`);
  }
  assert.strictEqual(
    (await request(app).get('/api/domains').set('Authorization', `Bearer ${sysToken}`)).body.domains
      .find((d) => d.id === id).status,
    'active'
  );

  // domain admin session is refused on every cycle route
  const admin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ciclo@fechado.test', password: 'Secret1!', domainId: id });
  assert.strictEqual(admin.status, 200, JSON.stringify(admin.body));
  for (const [method, url, body] of cycleRoutes) {
    const res = await request(app)[method](hit(method, url, id))
      .set('Authorization', `Bearer ${admin.body.token}`)
      .send(body || {});
    assert.strictEqual(res.status, 403, `${method} ${url} refused for domain admin: ${res.status}`);
  }

  // no token → 401 before any read
  for (const [method, url, body] of cycleRoutes) {
    const res = await request(app)[method](hit(method, url, id)).send(body || {});
    assert.strictEqual(res.status, 401, `${method} ${url} refused without token: ${res.status}`);
  }

  // system_admin stays out of business data (deny by default)
  const business = [
    ['get', '/api/contracts', null],
    ['post', '/api/contracts', { name: 'Sysadmin Leak', start_date: '2026-01-01', forecast_date: '2026-12-31' }],
    ['get', '/api/users', null],
    ['get', '/api/tasks', null],
    ['get', '/api/finalidades', null],
  ];
  for (const [method, url, body] of business) {
    const req = request(app)[method](url).set('Authorization', `Bearer ${sysToken}`);
    const res = body ? await req.send(body) : await req;
    assert.strictEqual(res.status, 403, `system_admin blocked on ${url}: ${res.status}`);
    assert.strictEqual(res.body.users, undefined, `no user payload from ${url}`);
    assert.strictEqual(res.body.contracts, undefined, `no contract payload from ${url}`);
    assert.strictEqual(res.body.tasks, undefined, `no task payload from ${url}`);
    assert.strictEqual(res.body.finalidades, undefined, `no finalidade payload from ${url}`);
  }
});
