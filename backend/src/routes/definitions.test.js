'use strict';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir();
const { app } = require('../server');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

const DEFINITIONS = {
  finalidade: 'Executar a reforma da fachada',
  limitacoes: 'Sem acesso à calçada após as 18h',
  alvo: 'Fachada do prédio A',
  escopo: 'Reboco, pintura e vedação',
  premissas: 'Material fornecido pela contratante',
  entregaveis: 'Relatório fotográfico final',
};

let domainId;
let adminToken;
let gestorToken;
let prestadorToken;
let contractId;
let otherAdminToken;
let otherContractId;

function as(token) {
  return { Authorization: `Bearer ${token}` };
}

function futureDate(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
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

  const sys = await request(app)
    .post('/api/auth/login')
    .send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200);

  const enabled = await request(app)
    .post('/api/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Epsilon Definições',
      adminName: 'Elisa',
      adminEmail: 'elisa@epsilon.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201);
  domainId = enabled.body.domain.id;
  adminToken = await login('elisa@epsilon.test', 'Secret1!', domainId);

  for (const [name, email, role] of [
    ['Gustavo', 'gustavo@epsilon.test', 'gestor'],
    ['Pedro', 'pedro@epsilon.test', 'prestador'],
  ]) {
    const res = await request(app)
      .post('/api/users')
      .set(as(adminToken))
      .send({ name, email, password: 'Secret1!', role, username: email.split('@')[0] });
    assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  }
  gestorToken = await login('gustavo@epsilon.test', 'Secret1!', domainId);
  prestadorToken = await login('pedro@epsilon.test', 'Secret1!', domainId);

  const contract = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'Obra Definições', start_date: futureDate(-5), forecast_date: futureDate(60) });
  assert.strictEqual(contract.status, 201, JSON.stringify(contract.body));
  contractId = contract.body.contract.id;

  // second physical domain (FR-019): own db, own contract, own definitions
  const enabledOther = await request(app)
    .post('/api/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Outro Domínio Def',
      adminName: 'Otto',
      adminEmail: 'otto@outro.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabledOther.status, 201);
  const otherDomainId = enabledOther.body.domain.id;
  otherAdminToken = await login('otto@outro.test', 'Secret1!', otherDomainId);
  const otherContract = await request(app)
    .post('/api/contracts')
    .set(as(otherAdminToken))
    .send({ name: 'Contrato Outro', start_date: futureDate(-1), forecast_date: futureDate(30) });
  assert.strictEqual(otherContract.status, 201);
  otherContractId = otherContract.body.contract.id;
});

test('FR-001 persiste definições', async () => {
  // nothing saved yet
  const none = await request(app).get(`/api/contracts/${contractId}/definitions`).set(as(gestorToken));
  assert.strictEqual(none.status, 404, JSON.stringify(none.body));

  // first save creates version 1 (admin também edita definições)
  const saved = await request(app)
    .put(`/api/contracts/${contractId}/definitions`)
    .set(as(adminToken))
    .send(DEFINITIONS);
  assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));
  assert.strictEqual(saved.body.definitions.versao, 1);
  assert.strictEqual(saved.body.definitions.finalidade, DEFINITIONS.finalidade);
  assert.strictEqual(saved.body.definitions.contract_id, contractId);
  assert.ok(Number.isInteger(saved.body.definitions.autor_id), 'autor_id gravado');

  // read-back returns the active version
  const read = await request(app).get(`/api/contracts/${contractId}/definitions`).set(as(gestorToken));
  assert.strictEqual(read.status, 200);
  assert.deepStrictEqual(
    { ...read.body.definitions, autor_id: null, created_at: null },
    { ...saved.body.definitions, autor_id: null, created_at: null }
  );

  // second save appends version 2; version 1 is never rewritten (FR-002)
  const saved2 = await request(app)
    .put(`/api/contracts/${contractId}/definitions`)
    .set(as(gestorToken))
    .send({ ...DEFINITIONS, escopo: 'Escopo ampliado' });
  assert.strictEqual(saved2.status, 200, JSON.stringify(saved2.body));
  assert.strictEqual(saved2.body.definitions.versao, 2);
  assert.strictEqual(saved2.body.definitions.escopo, 'Escopo ampliado');

  // history: newest first, author and date present (FR-017 para definições)
  const history = await request(app)
    .get(`/api/contracts/${contractId}/definitions/history`)
    .set(as(gestorToken));
  assert.strictEqual(history.status, 200, JSON.stringify(history.body));
  assert.strictEqual(history.body.history.length, 2);
  assert.strictEqual(history.body.history[0].versao, 2);
  assert.strictEqual(history.body.history[1].versao, 1);
  assert.strictEqual(history.body.history[1].snapshot.finalidade, DEFINITIONS.finalidade);
  assert.match(history.body.history[1].user_name || '', /Elisa|Gustavo/);
  assert.ok(history.body.history[0].created_at, 'data da versão');

  // blank definition → 400 with `missing` (never persisted)
  const blank = await request(app)
    .put(`/api/contracts/${contractId}/definitions`)
    .set(as(gestorToken))
    .send({ ...DEFINITIONS, entregaveis: '   ' });
  assert.strictEqual(blank.status, 400);
  assert.ok(Array.isArray(blank.body.missing) && blank.body.missing.includes('entregaveis'));

  // absent field → same `missing` answer
  const absent = await request(app)
    .put(`/api/contracts/${contractId}/definitions`)
    .set(as(gestorToken))
    .send({ ...DEFINITIONS, premissas: undefined });
  assert.strictEqual(absent.status, 400);
  assert.ok(absent.body.missing.includes('premissas'));

  // payload validation → 400 Validation failed + details (middleware)
  const wrongType = await request(app)
    .put(`/api/contracts/${contractId}/definitions`)
    .set(as(gestorToken))
    .send({ ...DEFINITIONS, alvo: 42 });
  assert.strictEqual(wrongType.status, 400);
  assert.strictEqual(wrongType.body.error, 'Validation failed');
  assert.ok(wrongType.body.details.some((d) => /alvo/.test(d)));

  const tooLong = await request(app)
    .put(`/api/contracts/${contractId}/definitions`)
    .set(as(gestorToken))
    .send({ ...DEFINITIONS, finalidade: 'x'.repeat(5001) });
  assert.strictEqual(tooLong.status, 400);
  assert.strictEqual(tooLong.body.error, 'Validation failed');

  // failures never persisted a version
  const after = await request(app)
    .get(`/api/contracts/${contractId}/definitions/history`)
    .set(as(gestorToken));
  assert.strictEqual(after.body.history.length, 2, '400 não grava versão');

  // prestador não alcança definições (FR-002/FR-019)
  const pGet = await request(app).get(`/api/contracts/${contractId}/definitions`).set(as(prestadorToken));
  assert.strictEqual(pGet.status, 403);
  const pPut = await request(app)
    .put(`/api/contracts/${contractId}/definitions`)
    .set(as(prestadorToken))
    .send(DEFINITIONS);
  assert.strictEqual(pPut.status, 403);
  const pHistory = await request(app)
    .get(`/api/contracts/${contractId}/definitions/history`)
    .set(as(prestadorToken));
  assert.strictEqual(pHistory.status, 403);

  // unknown contract → 404
  const ghost = await request(app).get('/api/contracts/999999/definitions').set(as(gestorToken));
  assert.strictEqual(ghost.status, 404);
});

test('FR-019 isolamento', async () => {
  // same id space in both domain databases (independent AUTOINCREMENT)
  assert.strictEqual(contractId, otherContractId, 'ids colidem de propósito');

  // save definitions only in the other domain
  const saved = await request(app)
    .put(`/api/contracts/${otherContractId}/definitions`)
    .set(as(otherAdminToken))
    .send({ ...DEFINITIONS, finalidade: 'Finalidade do outro domínio' });
  assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));

  // domain A's token never sees domain B's rows (own db, own contract)
  const mine = await request(app)
    .get(`/api/contracts/${contractId}/definitions`)
    .set(as(gestorToken));
  assert.strictEqual(mine.status, 200);
  assert.notStrictEqual(mine.body.definitions.finalidade, 'Finalidade do outro domínio');

  // a contract that exists only in domain A is 404 for domain B (same id)
  const onlyInA = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'Só no A', start_date: futureDate(-1), forecast_date: futureDate(10) });
  assert.strictEqual(onlyInA.status, 201);
  const foreignId = onlyInA.body.contract.id;
  const byB = await request(app)
    .get(`/api/contracts/${foreignId}/definitions`)
    .set(as(otherAdminToken));
  assert.strictEqual(byB.status, 404, 'domínio B não alcança contrato do domínio A');
});
