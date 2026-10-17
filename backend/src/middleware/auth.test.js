'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

const dataDir = setupDataDir();
const {
  signJwt,
  requireRole,
  requireSystemAdmin,
  scopeDomain,
  authenticateToken,
  assertDomainActive,
} = require('./auth');
const { app } = require('../server');
const { getDomainDb } = require('../config/database');

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

function run(middleware, req) {
  const res = mockRes();
  let nexted = false;
  middleware(req, res, () => {
    nexted = true;
  });
  return { res, nexted };
}

function reqFor(user, extra = {}) {
  return { headers: {}, params: {}, query: {}, body: {}, user, ...extra };
}

test.before(async () => {
  await initTestDb();
});

test('FR-003 sysadmin gate', async () => {
  // requireSystemAdmin admits only system_admin
  let result = run(requireSystemAdmin, reqFor({ role: 'system_admin', domainId: null }));
  assert.ok(result.nexted, 'system_admin passes requireSystemAdmin');
  result = run(requireSystemAdmin, reqFor({ role: 'admin', domainId: 1 }));
  assert.strictEqual(result.res.statusCode, 403);

  // system_admin has no access to business data (deny by default)
  result = run(requireRole('admin', 'gestor', 'prestador'), reqFor({ role: 'system_admin', domainId: null }));
  assert.strictEqual(result.res.statusCode, 403);
  assert.ok(!result.nexted, 'system_admin blocked from business roles');

  // domain admin passes the same business guard
  const { getPlatformDb } = require('../config/database');
  getPlatformDb().run('INSERT INTO domains(name, slug) VALUES (?, ?)', ['Gate', 'gate']);
  const domain = getPlatformDb().get('SELECT id FROM domains WHERE slug = ?', ['gate']);
  const token = signJwt({ id: 1, email: 'a@gate.test', role: 'admin', domainId: domain.id });
  result = run(authenticateToken, {
    headers: { authorization: `Bearer ${token}` },
    params: {},
    query: {},
    body: {},
  });
  assert.ok(result.nexted, 'active-domain session passes authenticateToken');
  result = run(requireRole('admin', 'gestor', 'prestador'), reqFor({ role: 'admin', domainId: domain.id }));
  assert.ok(result.nexted, 'admin passes business role guard');
});

test('FR-022 role matrix', () => {
  // signJwt round-trips role + domainId claims
  const token = signJwt({ id: 7, email: 'g@x.test', role: 'gestor', domainId: 3 });
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  assert.strictEqual(decoded.role, 'gestor');
  assert.strictEqual(decoded.domainId, 3);

  const cases = [
    ['admin', ['admin', 'gestor', 'prestador'], true],
    ['gestor', ['admin', 'gestor', 'prestador'], true],
    ['prestador', ['admin', 'gestor', 'prestador'], true],
    ['admin', ['admin'], true],
    ['gestor', ['admin'], false],
    ['prestador', ['admin'], false],
    ['gestor', ['admin', 'gestor'], true],
    ['prestador', ['admin', 'gestor'], false],
    ['prestador', ['gestor'], false],
    ['system_admin', ['admin'], false],
  ];
  for (const [role, roles, allowed] of cases) {
    const result = run(requireRole(...roles), reqFor({ role, domainId: 1 }));
    assert.strictEqual(result.nexted, allowed, `${role} vs requireRole(${roles})`);
    if (!allowed) assert.strictEqual(result.res.statusCode, 403);
  }

  // missing session → 401
  const res = mockRes();
  requireRole('admin')({ headers: {} }, res, () => {});
  assert.strictEqual(res.statusCode, 401);
});

test('FR-014 cross-domain', () => {
  const guard = scopeDomain();

  // same domain passes
  let result = run(guard, reqFor({ role: 'gestor', domainId: 1 }, { params: { domainId: '1' } }));
  assert.ok(result.nexted, 'same domain allowed');

  // domain A token targeting domain B → 403, no query executed
  result = run(guard, reqFor({ role: 'gestor', domainId: 1 }, { params: { domainId: '2' } }));
  assert.strictEqual(result.res.statusCode, 403);
  assert.ok(!result.nexted, 'cross-domain param refused');

  // system_admin (domainId null) cannot address a domain resource
  result = run(guard, reqFor({ role: 'system_admin', domainId: null }, { params: { domainId: '1' } }));
  assert.strictEqual(result.res.statusCode, 403);

  // cross-domain via body also refused
  result = run(guard, reqFor({ role: 'gestor', domainId: 1 }, { body: { domainId: 2 } }));
  assert.strictEqual(result.res.statusCode, 403);

  // no domain param → implicit tenant scoping, continue
  result = run(guard, reqFor({ role: 'gestor', domainId: 1 }));
  assert.ok(result.nexted, 'no param means implicit domain scope');
});

// SC-008: two domains — API of A never reads B (403/404, zero crossover).
test('SC-008 two domains zero cross', async () => {
  const sys = await request(app)
    .post('/api/v2/auth/login')
    .send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200, JSON.stringify(sys.body));

  const makeDomain = async (name, slug, email) => {
    const enabled = await request(app)
      .post('/api/v2/domains/enable')
      .set('Authorization', `Bearer ${sys.body.token}`)
      .send({ name, adminName: `Admin ${slug}`, adminEmail: email, adminPassword: 'Secret1!' });
    assert.strictEqual(enabled.status, 201, JSON.stringify(enabled.body));
    const login = await request(app)
      .post('/api/v2/auth/login')
      .send({ email, password: 'Secret1!', domainId: enabled.body.domain.id });
    assert.strictEqual(login.status, 200, JSON.stringify(login.body));
    return { id: enabled.body.domain.id, token: login.body.token };
  };

  const alpha = await makeDomain('Alpha Cross', 'alpha-cross', 'admin@alpha-cross.test');
  const beta = await makeDomain('Beta Cross', 'beta-cross', 'admin@beta-cross.test');
  assert.notStrictEqual(alpha.id, beta.id);

  // domain A creates a contract
  const created = await request(app)
    .post('/api/v2/contracts')
    .set('Authorization', `Bearer ${alpha.token}`)
    .send({
      name: 'Contrato Sensivel Alpha',
      start_date: '2026-01-01',
      forecast_date: '2026-12-31',
    });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const alphaContractId = created.body.contract.id;

  // domain A sees it
  const listA = await request(app)
    .get('/api/v2/contracts')
    .set('Authorization', `Bearer ${alpha.token}`);
  assert.strictEqual(listA.status, 200);
  assert.ok(listA.body.contracts.some((c) => c.id === alphaContractId));

  // domain B list never contains A's rows (separate physical DB)
  const listB = await request(app)
    .get('/api/v2/contracts')
    .set('Authorization', `Bearer ${beta.token}`);
  assert.strictEqual(listB.status, 200);
  assert.ok(
    !listB.body.contracts.some((c) => c.name === 'Contrato Sensivel Alpha'),
    'B does not see A data'
  );

  // API of B addressing A's resource id → 404 (not B's data)
  const crossRead = await request(app)
    .get(`/api/v2/contracts/${alphaContractId}`)
    .set('Authorization', `Bearer ${beta.token}`);
  assert.strictEqual(crossRead.status, 404);

  // cross-domain via query param → 403 from scopeDomain (FR-014)
  const guard = scopeDomain();
  const param = `domainId=${alpha.id}`;
  const res = mockRes();
  guard(
    reqFor({ role: 'gestor', domainId: beta.id }, { query: { domainId: alpha.id } }),
    res,
    () => {}
  );
  assert.strictEqual(res.statusCode, 403, `query ${param} refused for other domain`);

  // platform db has both domains, domain files stay separate
  const alphaDb = getDomainDb(alpha.id);
  const betaDb = getDomainDb(beta.id);
  assert.strictEqual(
    betaDb.get('SELECT COUNT(*) AS c FROM contracts WHERE name = ?', ['Contrato Sensivel Alpha']).c,
    0
  );
  assert.strictEqual(
    alphaDb.get('SELECT COUNT(*) AS c FROM contracts WHERE name = ?', ['Contrato Sensivel Alpha']).c,
    1
  );
});

// E001 (spec 00002) — RED stub; T006 turns it GREEN.
test('FR-003 suspensão bloqueia sessão', async () => {
  const sys = await request(app)
    .post('/api/v2/auth/login')
    .send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200, JSON.stringify(sys.body));

  const enabled = await request(app)
    .post('/api/v2/domains/enable')
    .set('Authorization', `Bearer ${sys.body.token}`)
    .send({
      name: 'Suspenso Ciclo',
      adminName: 'Admin SC',
      adminEmail: 'sc@ciclo.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201, JSON.stringify(enabled.body));
  const domainId = enabled.body.domain.id;

  const adminLogin = await request(app)
    .post('/api/v2/auth/login')
    .send({ email: 'sc@ciclo.test', password: 'Secret1!', domainId });
  assert.strictEqual(adminLogin.status, 200, JSON.stringify(adminLogin.body));
  const liveToken = adminLogin.body.token;

  // business data exists before suspension
  const created = await request(app)
    .post('/api/v2/contracts')
    .set('Authorization', `Bearer ${liveToken}`)
    .send({ name: 'Contrato Antes Suspensao', start_date: '2026-01-01', forecast_date: '2026-12-31' });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));

  // suspend flips status only
  const sus = await request(app)
    .post(`/api/v2/domains/${domainId}/suspend`)
    .set('Authorization', `Bearer ${sys.body.token}`);
  assert.strictEqual(sus.status, 200, JSON.stringify(sus.body));
  assert.strictEqual(sus.body.domain.status, 'suspended');

  // login blocked with 403
  const deniedLogin = await request(app)
    .post('/api/v2/auth/login')
    .send({ email: 'sc@ciclo.test', password: 'Secret1!', domainId });
  assert.strictEqual(deniedLogin.status, 403, JSON.stringify(deniedLogin.body));
  assert.match(deniedLogin.body.error, /suspended/i);

  // session opened before the suspension is refused without reading data
  const me = await request(app)
    .get('/api/v2/auth/me')
    .set('Authorization', `Bearer ${liveToken}`);
  assert.strictEqual(me.status, 403, JSON.stringify(me.body));
  const blocked = await request(app)
    .get('/api/v2/contracts')
    .set('Authorization', `Bearer ${liveToken}`);
  assert.strictEqual(blocked.status, 403, JSON.stringify(blocked.body));
  assert.strictEqual(blocked.body.contracts, undefined, 'no business payload on a suspended domain');

  // assertDomainActive itself refuses and is what authenticateToken runs
  assert.throws(
    () => assertDomainActive(domainId),
    (error) => error.code === 'DOMAIN_SUSPENDED',
    'assertDomainActive refuses a suspended domain'
  );

  // nothing was deleted: file, platform row and domain rows survive
  assert.ok(
    fs.existsSync(path.join(dataDir, 'domains', `${domainId}.db`)),
    'domain file preserved'
  );
  const { getPlatformDb } = require('../config/database');
  assert.strictEqual(
    getPlatformDb().get('SELECT COUNT(*) AS c FROM domains WHERE id = ?', [domainId]).c,
    1,
    'domain row preserved'
  );
  const domainDb = getDomainDb(domainId);
  assert.strictEqual(
    domainDb.get('SELECT COUNT(*) AS c FROM contracts WHERE name = ?', ['Contrato Antes Suspensao']).c,
    1,
    'domain rows preserved'
  );
  assert.strictEqual(domainDb.get('SELECT COUNT(*) AS c FROM users').c, 1, 'users preserved');

  // reactivation restores access with the data intact
  const rea = await request(app)
    .post(`/api/v2/domains/${domainId}/reactivate`)
    .set('Authorization', `Bearer ${sys.body.token}`);
  assert.strictEqual(rea.status, 200, JSON.stringify(rea.body));
  assert.strictEqual(rea.body.domain.status, 'active');
  assert.ok(assertDomainActive(domainId), 'assertDomainActive passes again');

  const back = await request(app)
    .post('/api/v2/auth/login')
    .send({ email: 'sc@ciclo.test', password: 'Secret1!', domainId });
  assert.strictEqual(back.status, 200, JSON.stringify(back.body));

  const after = await request(app)
    .get('/api/v2/contracts')
    .set('Authorization', `Bearer ${back.body.token}`);
  assert.strictEqual(after.status, 200, JSON.stringify(after.body));
  assert.ok(
    after.body.contracts.some((c) => c.name === 'Contrato Antes Suspensao'),
    'data intact after suspend/reactivate'
  );
});

// E001 (spec 00002) — RED stubs; T011 and T013 turn them GREEN.
test('FR-005 401/403 deny by default', async () => {
  const call = (method, url, token, body) => {
    const req = request(app)[method](url);
    if (token) req.set('Authorization', `Bearer ${token}`);
    if (body) req.send(body);
    return req;
  };

  const sys = await call('post', '/api/v2/auth/login', null, { email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200, JSON.stringify(sys.body));
  const enabled = await call('post', '/api/v2/domains/enable', sys.body.token, {
    name: 'Deny By Default',
    adminName: 'Dana',
    adminEmail: 'dana@deny.test',
    adminPassword: 'Secret1!',
  });
  assert.strictEqual(enabled.status, 201, JSON.stringify(enabled.body));
  const domainId = enabled.body.domain.id;

  const admin = await call('post', '/api/v2/auth/login', null, {
    email: 'dana@deny.test',
    password: 'Secret1!',
    domainId,
  });
  assert.strictEqual(admin.status, 200, JSON.stringify(admin.body));
  const adminToken = admin.body.token;

  const prestador = await call('post', '/api/v2/users', adminToken, {
    name: 'Pri',
    email: 'pri@deny.test',
    password: 'Secret1!',
    role: 'prestador',
    username: 'pri',
  });
  assert.strictEqual(prestador.status, 201, JSON.stringify(prestador.body));
  const prestadorLogin = await call('post', '/api/v2/auth/login', null, {
    email: 'pri@deny.test',
    password: 'Secret1!',
    domainId,
  });
  assert.strictEqual(prestadorLogin.status, 200, JSON.stringify(prestadorLogin.body));
  const prestadorToken = prestadorLogin.body.token;

  const business = [
    ['get', '/api/v2/contracts'],
    ['post', '/api/v2/contracts'],
    ['get', '/api/v2/users'],
    ['post', '/api/v2/users'],
    ['get', '/api/v2/tasks'],
    ['post', '/api/v2/purposes'],
    ['get', '/api/v2/dashboard/stats'],
    ['post', '/api/v2/domains/enable'],
  ];

  // 401 without a token — refused before any read
  for (const [method, url] of business) {
    const res = await call(method, url, null, method === 'post' ? { name: 'No Token' } : undefined);
    assert.strictEqual(res.status, 401, `${method} ${url} sem token: ${res.status}`);
    assert.strictEqual(res.body.contracts, undefined, `${url} sem payload de contratos`);
    assert.strictEqual(res.body.users, undefined, `${url} sem payload de usuários`);
    assert.strictEqual(res.body.tasks, undefined, `${url} sem payload de tarefas`);
  }

  // malformed or wrong-key token → 403
  const malformed = await call('get', '/api/v2/contracts', 'not-a-jwt');
  assert.strictEqual(malformed.status, 403, `malformed token: ${malformed.status}`);
  const wrongKeyToken = jwt.sign(
    { id: 1, email: 'x@deny.test', role: 'admin', domainId },
    'not-the-server-secret',
    { expiresIn: '24h' }
  );
  const wrongKey = await call('get', '/api/v2/contracts', wrongKeyToken);
  assert.strictEqual(wrongKey.status, 403, `wrong key token: ${wrongKey.status}`);

  // wrong role → 403 on routes that do not list it
  const refused = [
    ['post', '/api/v2/contracts', { name: 'Prestador Leak', start_date: '2026-01-01', forecast_date: '2026-12-31' }],
    ['post', '/api/v2/users', { name: 'Leak', email: 'leak@deny.test', password: 'Secret1!', role: 'gestor', username: 'leak' }],
    ['post', '/api/v2/purposes', { name: 'Leak Finalidade' }],
    ['delete', '/api/v2/contracts/1', null],
    ['post', '/api/v2/domains/enable', { name: 'Leak Domain', adminName: 'L', adminEmail: 'l@deny.test', adminPassword: 'Secret1!' }],
  ];
  for (const [method, url, body] of refused) {
    const res = await call(method, url, prestadorToken, body);
    assert.strictEqual(res.status, 403, `${method} ${url} para prestador: ${res.status}`);
    assert.strictEqual(res.body.users, undefined, `${url} sem payload para papel errado`);
  }

  // positive control: admin passes the same guard
  const adminCreate = await call('post', '/api/v2/contracts', adminToken, {
    name: 'Admin Pode',
    start_date: '2026-01-01',
    forecast_date: '2026-12-31',
  });
  assert.strictEqual(adminCreate.status, 201, JSON.stringify(adminCreate.body));

  // deny by default at the middleware level
  const emptyList = run(requireRole(), reqFor({ role: 'admin', domainId }));
  assert.strictEqual(emptyList.res.statusCode, 403, 'empty allow-list denies everyone');
  assert.ok(!emptyList.nexted, 'empty allow-list never reaches next()');
  const noSession = run(requireRole('admin'), reqFor(undefined));
  assert.strictEqual(noSession.res.statusCode, 401);
  const wrongRole = run(requireRole('admin', 'gestor'), reqFor({ role: 'prestador', domainId }));
  assert.strictEqual(wrongRole.res.statusCode, 403);
  const sysBlocked = run(
    requireRole('admin', 'gestor', 'prestador'),
    reqFor({ role: 'system_admin', domainId: null })
  );
  assert.strictEqual(sysBlocked.res.statusCode, 403);

  // authenticateToken distinguishes 401 (no token) from 403 (bad token)
  const bare = run(authenticateToken, { headers: {}, params: {}, query: {}, body: {} });
  assert.strictEqual(bare.res.statusCode, 401);
  const bad = run(authenticateToken, {
    headers: { authorization: 'Bearer junk' },
    params: {},
    query: {},
    body: {},
  });
  assert.strictEqual(bad.res.statusCode, 403);
});
test('FR-007 escopo de domínio', async () => {
  const call = (method, url, token, body) => {
    const req = request(app)[method](url);
    if (token) req.set('Authorization', `Bearer ${token}`);
    if (body) req.send(body);
    return req;
  };
  const mk = async (name, email) => {
    const sys = await call('post', '/api/v2/auth/login', null, { email: SYS_EMAIL, password: SYS_PASSWORD });
    assert.strictEqual(sys.status, 200, JSON.stringify(sys.body));
    const en = await call('post', '/api/v2/domains/enable', sys.body.token, {
      name,
      adminName: `A ${name}`,
      adminEmail: email,
      adminPassword: 'Secret1!',
    });
    assert.strictEqual(en.status, 201, JSON.stringify(en.body));
    const li = await call('post', '/api/v2/auth/login', null, {
      email,
      password: 'Secret1!',
      domainId: en.body.domain.id,
    });
    assert.strictEqual(li.status, 200, JSON.stringify(li.body));
    return { id: en.body.domain.id, token: li.body.token };
  };

  const alpha = await mk('Escopo Alfa', 'alfa@escopo.test');
  const beta = await mk('Escopo Beta', 'beta@escopo.test');
  assert.notStrictEqual(alpha.id, beta.id);

  const created = await call('post', '/api/v2/contracts', alpha.token, {
    name: 'Contrato Segredo Alfa',
    start_date: '2026-01-01',
    forecast_date: '2026-12-31',
  });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const alphaContractId = created.body.contract.id;

  // tenant comes from the token: each domain reads only its own database file
  assert.strictEqual(
    getDomainDb(alpha.id).get('SELECT COUNT(*) AS c FROM contracts WHERE name = ?', ['Contrato Segredo Alfa']).c,
    1
  );
  assert.strictEqual(
    getDomainDb(beta.id).get('SELECT COUNT(*) AS c FROM contracts WHERE name = ?', ['Contrato Segredo Alfa']).c,
    0
  );

  // domain B addressing domain A's resource → 404, no content leak
  const cross = await call('get', `/api/v2/contracts/${alphaContractId}`, beta.token);
  assert.strictEqual(cross.status, 404, JSON.stringify(cross.body));
  assert.strictEqual(cross.body.contract, undefined);
  assert.ok(!JSON.stringify(cross.body).includes('Segredo'), 'no domain A content in the answer');

  // divergent domainId param → refused before the handler runs any query
  const guard = scopeDomain();
  const viaParams = run(guard, reqFor({ role: 'gestor', domainId: beta.id }, { params: { domainId: alpha.id } }));
  assert.strictEqual(viaParams.res.statusCode, 403);
  assert.ok(!viaParams.nexted, 'refused before the query');
  const viaQuery = run(guard, reqFor({ role: 'gestor', domainId: beta.id }, { query: { domainId: alpha.id } }));
  assert.strictEqual(viaQuery.res.statusCode, 403);
  const viaBody = run(guard, reqFor({ role: 'gestor', domainId: beta.id }, { body: { domainId: alpha.id } }));
  assert.strictEqual(viaBody.res.statusCode, 403);

  // matching param and absent param continue normally
  const same = run(guard, reqFor({ role: 'gestor', domainId: beta.id }, { params: { domainId: beta.id } }));
  assert.ok(same.nexted, 'same domain allowed');
  const none = run(guard, reqFor({ role: 'gestor', domainId: beta.id }));
  assert.ok(none.nexted, 'no param means token tenant');

  // platform session cannot address a domain resource through the guard
  const platform = run(guard, reqFor({ role: 'system_admin', domainId: null }, { params: { domainId: alpha.id } }));
  assert.strictEqual(platform.res.statusCode, 403);

  // getDomainDb refuses an invalid id instead of falling back to another tenant
  assert.throws(() => getDomainDb('not-a-number'), /invalid domainId/);

  // B's list stays empty of A's rows (read path also scoped)
  const listB = await call('get', '/api/v2/contracts', beta.token);
  assert.strictEqual(listB.status, 200, JSON.stringify(listB.body));
  assert.ok(
    !listB.body.contracts.some((c) => c.name === 'Contrato Segredo Alfa'),
    'B never sees A rows'
  );
});
