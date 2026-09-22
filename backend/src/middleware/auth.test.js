'use strict';

const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir();
const {
  signJwt,
  requireRole,
  requireSystemAdmin,
  scopeDomain,
  authenticateToken,
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
    .post('/api/auth/login')
    .send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200, JSON.stringify(sys.body));

  const makeDomain = async (name, slug, email) => {
    const enabled = await request(app)
      .post('/api/domains/enable')
      .set('Authorization', `Bearer ${sys.body.token}`)
      .send({ name, adminName: `Admin ${slug}`, adminEmail: email, adminPassword: 'Secret1!' });
    assert.strictEqual(enabled.status, 201, JSON.stringify(enabled.body));
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'Secret1!', domainId: enabled.body.domain.id });
    assert.strictEqual(login.status, 200, JSON.stringify(login.body));
    return { id: enabled.body.domain.id, token: login.body.token };
  };

  const alpha = await makeDomain('Alpha Cross', 'alpha-cross', 'admin@alpha-cross.test');
  const beta = await makeDomain('Beta Cross', 'beta-cross', 'admin@beta-cross.test');
  assert.notStrictEqual(alpha.id, beta.id);

  // domain A creates a contract
  const created = await request(app)
    .post('/api/contracts')
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
    .get('/api/contracts')
    .set('Authorization', `Bearer ${alpha.token}`);
  assert.strictEqual(listA.status, 200);
  assert.ok(listA.body.contracts.some((c) => c.id === alphaContractId));

  // domain B list never contains A's rows (separate physical DB)
  const listB = await request(app)
    .get('/api/contracts')
    .set('Authorization', `Bearer ${beta.token}`);
  assert.strictEqual(listB.status, 200);
  assert.ok(
    !listB.body.contracts.some((c) => c.name === 'Contrato Sensivel Alpha'),
    'B does not see A data'
  );

  // API of B addressing A's resource id → 404 (not B's data)
  const crossRead = await request(app)
    .get(`/api/contracts/${alphaContractId}`)
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
