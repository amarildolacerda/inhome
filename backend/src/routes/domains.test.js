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
