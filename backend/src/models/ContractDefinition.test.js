'use strict';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir();
const { app } = require('../server');
const { getDomainDb } = require('../config/database');
const ContractDefinition = require('../models/ContractDefinition');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

let domainId;
let db;
let adminToken;
let gestorToken;
let prestadorToken;
let contractId;

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
      name: 'Kappa Model',
      adminName: 'Katia',
      adminEmail: 'katia@kappa.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201);
  domainId = enabled.body.domain.id;
  db = getDomainDb(domainId);
  adminToken = await login('katia@kappa.test', 'Secret1!', domainId);

  for (const [name, email, role] of [
    ['Gil', 'gil@kappa.test', 'gestor'],
    ['Pia', 'pia@kappa.test', 'prestador'],
  ]) {
    const res = await request(app)
      .post('/api/users')
      .set(as(adminToken))
      .send({ name, email, password: 'Secret1!', role, username: email.split('@')[0] });
    assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  }
  gestorToken = await login('gil@kappa.test', 'Secret1!', domainId);
  prestadorToken = await login('pia@kappa.test', 'Secret1!', domainId);

  const contract = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'Obra Model', start_date: futureDate(-2), forecast_date: futureDate(20) });
  assert.strictEqual(contract.status, 201, JSON.stringify(contract.body));
  contractId = contract.body.contract.id;
});

test('FR-002 versiona e restringe', async () => {
  const v1Fields = {
    finalidade: 'Finalidade v1',
    limitacoes: 'Limitações v1',
    alvo: 'Alvo v1',
    escopo: 'Escopo v1',
    premissas: 'Premissas v1',
    entregaveis: 'Entregáveis v1',
  };

  // model: first version starts at 1 and carries the author
  const adminId = db.get("SELECT id FROM users WHERE email = 'katia@kappa.test'").id;
  const v1 = ContractDefinition.versionDefinitions(db, contractId, v1Fields, adminId);
  assert.strictEqual(v1.versao, 1);
  assert.strictEqual(v1.autor_id, adminId);

  // every edit appends; v1 is never updated (append-only history)
  const v2Fields = { ...v1Fields, finalidade: 'Finalidade v2' };
  const v2 = ContractDefinition.versionDefinitions(db, contractId, v2Fields, adminId);
  assert.strictEqual(v2.versao, 2);
  assert.strictEqual(v2.finalidade, 'Finalidade v2');
  const persistedV1 = db.get(
    'SELECT finalidade FROM contract_definitions WHERE contract_id = ? AND version = 1',
    [contractId]
  );
  assert.strictEqual(persistedV1.finalidade, 'Finalidade v1', 'v1 intacta');

  // contract without definitions → latest is null
  assert.strictEqual(ContractDefinition.latest(db, contractId + 999), null);

  // version numbers are per contract: a second contract restarts at 1
  const other = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'Outra Model', start_date: futureDate(-1), forecast_date: futureDate(9) });
  assert.strictEqual(other.status, 201);
  const v1Other = ContractDefinition.versionDefinitions(db, other.body.contract.id, v1Fields, adminId);
  assert.strictEqual(v1Other.versao, 1);

  // listVersions: newest first, author name + snapshot per entry (FR-017)
  const versions = ContractDefinition.listVersions(db, contractId);
  assert.strictEqual(versions.length, 2);
  assert.deepStrictEqual(
    versions.map((entry) => entry.versao),
    [2, 1]
  );
  assert.match(versions[0].user_name, /Katia/);
  assert.ok(Number.isInteger(versions[0].autor_id));
  assert.ok(versions[0].created_at, 'data por versão');
  assert.strictEqual(versions[1].snapshot.finalidade, 'Finalidade v1');

  // missingFields: blank or non-string counts as missing
  assert.deepStrictEqual(
    ContractDefinition.missingFields({ ...v1Fields, alvo: '  ' }),
    ['alvo']
  );
  assert.deepStrictEqual(ContractDefinition.missingFields({ ...v1Fields, escopo: 7 }), ['escopo']);
  assert.deepStrictEqual(ContractDefinition.missingFields(v1Fields), []);
  assert.strictEqual(ContractDefinition.missingFields(undefined).length, 6);

  // restringe: só admin e gestor alcançam o recurso (requireRole na rota)
  const body = { ...v1Fields, escopo: 'Escopo v3' };
  const byGestor = await request(app)
    .put(`/api/contracts/${contractId}/definitions`)
    .set(as(gestorToken))
    .send(body);
  assert.strictEqual(byGestor.status, 200, JSON.stringify(byGestor.body));
  assert.strictEqual(byGestor.body.definitions.versao, 3);

  const byAdmin = await request(app)
    .put(`/api/contracts/${contractId}/definitions`)
    .set(as(adminToken))
    .send(body);
  assert.strictEqual(byAdmin.status, 200);
  assert.strictEqual(byAdmin.body.definitions.versao, 4, 'admin também edita definições');

  const byPrestador = await request(app)
    .put(`/api/contracts/${contractId}/definitions`)
    .set(as(prestadorToken))
    .send(body);
  assert.strictEqual(byPrestador.status, 403, 'prestador não edita');
  const prestadorRead = await request(app)
    .get(`/api/contracts/${contractId}/definitions`)
    .set(as(prestadorToken));
  assert.strictEqual(prestadorRead.status, 403, 'prestador não lê');
});
