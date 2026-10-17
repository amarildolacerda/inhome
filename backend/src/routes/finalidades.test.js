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
    .post('/api/v2/auth/login')
    .send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200);

  const enabled = await request(app)
    .post('/api/v2/domains/enable')
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
    .post('/api/v2/auth/login')
    .send({ email: 'dana@delta.test', password: 'Secret1!', domainId });
  assert.strictEqual(login.status, 200);
  adminToken = login.body.token;

  const prestador = await request(app)
    .post('/api/v2/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Pedro', email: 'pedro@delta.test', password: 'Secret1!', role: 'prestador', username: 'pedro' });
  assert.strictEqual(prestador.status, 201);
  const pLogin = await request(app)
    .post('/api/v2/auth/login')
    .send({ email: 'pedro@delta.test', password: 'Secret1!', domainId });
  prestadorToken = pLogin.body.token;
});

test('FR-005 finalidade CRUD', async () => {
  // admin creates dictionary entries
  const created = await request(app)
    .post('/api/v2/purposes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Limpeza' });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  finalidadeId = created.body.finalidade.id;

  const second = await request(app)
    .post('/api/v2/purposes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Manutencao' });
  assert.strictEqual(second.status, 201);

  // duplicate refused; empty name refused
  const dup = await request(app)
    .post('/api/v2/purposes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Limpeza' });
  assert.strictEqual(dup.status, 409);
  const empty = await request(app)
    .post('/api/v2/purposes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: '  ' });
  assert.strictEqual(empty.status, 400);

  // listFinalidade (gestor can read the dictionary for the contract form)
  const list = await request(app)
    .get('/api/v2/purposes')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.strictEqual(list.status, 200);
  const names = list.body.finalidades.map((f) => f.name);
  assert.ok(names.includes('Limpeza'));
  assert.ok(names.includes('Manutencao'));

  // editar (rename)
  const renamed = await request(app)
    .put(`/api/v2/purposes/${finalidadeId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Limpeza Pesada' });
  assert.strictEqual(renamed.status, 200);
  assert.strictEqual(renamed.body.finalidade.name, 'Limpeza Pesada');

  // a contract referencing the finalidade exists (direct insert; contract
  // routes arrive in T011)
  const db = getDomainDb(domainId);
  db.run(
    "INSERT INTO contracts(name, object, purpose_id, start_date, forecast_date) VALUES ('C-1', 'obj', ?, '2026-01-01', '2026-12-31')",
    [finalidadeId]
  );

  // retirar (retire) removes it from the default dictionary…
  const retired = await request(app)
    .delete(`/api/v2/purposes/${finalidadeId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert.strictEqual(retired.status, 200);

  const after = await request(app)
    .get('/api/v2/purposes')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.ok(!after.body.finalidades.some((f) => f.id === finalidadeId), 'retired hidden from list');

  // …but does not alter existing contracts (spec edge case)
  const contract = db.get('SELECT purpose_id FROM contracts WHERE name = ?', ['C-1']);
  assert.strictEqual(contract.purpose_id, finalidadeId, 'contract reference untouched');

  // retired entries remain visible to admin with showRetired
  const adminView = await request(app)
    .get('/api/v2/purposes?showRetired=1')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.ok(adminView.body.finalidades.some((f) => f.id === finalidadeId));

  // role matrix: prestador cannot manage the dictionary
  const forbidden = await request(app)
    .post('/api/v2/purposes')
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

// v1 removido (2026-10-17): /api/v2/purposes é a única montagem deste router;
// o shape de resposta continua com as chaves PT (finalidade / finalidades), e o
// 409 carrega o code estável aditivo.
test('v1 removido: purposes sob /api/v2', async () => {
  const created = await request(app)
    .post('/api/v2/purposes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Fase 5 Proposito' });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const v2Id = created.body.finalidade.id;
  assert.ok(v2Id > 0, 'resposta v2 segue com a chave finalidade');

  const listV2 = await request(app)
    .get('/api/v2/purposes')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.strictEqual(listV2.status, 200, JSON.stringify(listV2.body));
  assert.ok(Array.isArray(listV2.body.finalidades), 'chave finalidades inalterada no v2');
  assert.ok(listV2.body.finalidades.some((f) => f.id === v2Id));

  // o mount v1 (/api/finalidades) não existe mais — 404 sem ler dados
  const listV1 = await request(app)
    .get('/api/finalidades')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.strictEqual(listV1.status, 404, 'mount v1 de finalidades removido');
  const createV1 = await request(app)
    .post('/api/finalidades')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'V1 Nao Deve Criar' });
  assert.strictEqual(createV1.status, 404, 'POST v1 de finalidades removido');

  // duplicata recusada com code estável
  const dup = await request(app)
    .post('/api/v2/purposes')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Fase 5 Proposito' });
  assert.strictEqual(dup.status, 409);
  assert.strictEqual(dup.body.error, 'Purpose already exists');
  assert.strictEqual(dup.body.code, 'PURPOSE_ALREADY_EXISTS');

  // id inexistente → 404 com code estável
  const missing = await request(app)
    .put('/api/v2/purposes/999999')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Ghost' });
  assert.strictEqual(missing.status, 404);
  assert.strictEqual(missing.body.error, 'Purpose not found');
  assert.strictEqual(missing.body.code, 'PURPOSE_NOT_FOUND');
});
