'use strict';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir('sddp-provider-compliance-');
const { app } = require('../server');
const { getDomainDb } = require('../config/database');
const { code } = require('../config/enums');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';
const ASO = () => code('provider_documents.document_type', 'ASO');
const NR35 = () => code('provider_documents.document_type', 'NR-35');
const PROVIDER = () => code('purpose_document_requirements.applies_to', 'provider');
const WORKER = () => code('purpose_document_requirements.applies_to', 'worker');

let domainId;
let providerId;
let purposeId;
let db;

function as(token) {
  return { Authorization: `Bearer ${token}` };
}

function futureDate(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

function addDocument({ workerId = null, type = ASO(), validUntil = futureDate(30), reviewed = true }) {
  db.run(
    `INSERT INTO provider_documents(provider_id, worker_id, document_type, number, path, valid_until, reviewed_by, reviewed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [providerId, workerId, type, `DOC-${Math.random().toString(36).slice(2, 8)}`, 'uploads/aso.pdf', validUntil,
      reviewed ? providerId : null, reviewed ? new Date().toISOString().slice(0, 10) : null]
  );
  return db.get('SELECT MAX(id) AS id FROM provider_documents').id;
}

test.before(async () => {
  await initTestDb();
  const sys = await request(app).post('/api/v2/auth/login').send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200);
  const enabled = await request(app)
    .post('/api/v2/domains/enable')
    .set(as(sys.body.token))
    .send({ name: 'Conformidade', adminName: 'Ana', adminEmail: 'ana@compliance.test', adminPassword: 'Secret1!' });
  assert.strictEqual(enabled.status, 201, JSON.stringify(enabled.body));
  domainId = enabled.body.domain.id;
  const admin = await request(app)
    .post('/api/v2/auth/login')
    .send({ email: 'ana@compliance.test', password: 'Secret1!', domainId });
  const created = await request(app)
    .post('/api/v2/users')
    .set(as(admin.body.token))
    .send({ name: 'Prestador', email: 'prestador@compliance.test', password: 'Secret1!', role: 'prestador', username: 'prestador' });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  db = getDomainDb(domainId);
  providerId = db.get("SELECT id FROM users WHERE email = 'prestador@compliance.test'").id;
  db.run("INSERT INTO purposes(name) VALUES ('Manutencao')");
  purposeId = db.get("SELECT id FROM purposes WHERE name = 'Manutencao'").id;
});

test('FR-084: finalidade sem itens ativos usa o checklist global com ASO', () => {
  const { resolveChecklist } = require('./providerCompliance');
  // O domínio entra no modo dossiê ao receber o primeiro documento; a partir
  // daí a finalidade sem itens ativos cai no ASO global.
  addDocument({ reviewed: false });
  const checklist = resolveChecklist(db, purposeId);
  assert.deepStrictEqual(
    checklist.map((item) => ({ type: item.documentType, scope: item.appliesTo })),
    [{ type: ASO(), scope: PROVIDER() }]
  );
  db.run(
    'INSERT INTO purpose_document_requirements(purpose_id, document_type, applies_to, active) VALUES (?, ?, ?, 1)',
    [purposeId, NR35(), WORKER()]
  );
  const specific = resolveChecklist(db, purposeId);
  assert.strictEqual(specific.length, 1);
  assert.strictEqual(specific[0].documentType, NR35());
  assert.strictEqual(specific[0].appliesTo, WORKER());
  db.run('DELETE FROM purpose_document_requirements WHERE purpose_id = ?', [purposeId]);
});

test('FR-085 FR-086: avaliação aponta tipo e trabalhador e a guarda recusa sem gravar', () => {
  const { evaluateProviderCompliance, assertProviderCompliant } = require('./providerCompliance');
  db.run(
    'INSERT INTO purpose_document_requirements(purpose_id, document_type, applies_to, active) VALUES (NULL, ?, ?, 1)',
    [ASO(), PROVIDER()]
  );
  db.run("INSERT INTO provider_workers(provider_id, name, role, active) VALUES (?, 'Joao', 'Eletricista', 1)", [providerId]);
  const workerId = db.get('SELECT MAX(id) AS id FROM provider_workers').id;

  const evaluation = evaluateProviderCompliance(db, { providerId, purposeId: null });
  assert.strictEqual(evaluation.compliant, false);
  assert.ok(evaluation.missing.some((item) => item.documentType === ASO() && item.appliesTo === 'provider'));

  let refused;
  try {
    assertProviderCompliant(db, { providerId, purposeId: null });
  } catch (error) {
    refused = error;
  }
  assert.ok(refused, 'guard must refuse');
  assert.strictEqual(refused.status, 400);
  assert.strictEqual(refused.code, 'PROVIDER_DOCUMENTS_MISSING');
  assert.ok(Array.isArray(refused.missing));

  addDocument({ validUntil: futureDate(30), reviewed: true });
  addDocument({ workerId, type: ASO(), validUntil: futureDate(30), reviewed: true });
  assertProviderCompliant(db, { providerId, purposeId: null });
});

test('FR-087: vencimento posterior não desfaz vínculo nem tarefa e a guarda é leitura pura', () => {
  const { evaluateProviderCompliance } = require('./providerCompliance');
  db.run("INSERT INTO contracts(name, start_date, forecast_date) VALUES ('Legado', '2026-01-01', '2026-12-31')");
  const contractId = db.get("SELECT id FROM contracts WHERE name = 'Legado'").id;
  db.run('INSERT INTO contract_providers(contract_id, user_id) VALUES (?, ?)', [contractId, providerId]);
  db.run("INSERT INTO tasks(contract_id, title, assignee_id) VALUES (?, 'Aberta', ?)", [contractId, providerId]);
  db.run("INSERT INTO task_history(task_id, user_id, action) VALUES ((SELECT MAX(id) FROM tasks), ?, 'create')", [providerId]);
  db.run('UPDATE provider_documents SET valid_until = ?', [futureDate(-1)]);

  const before = {
    links: db.get('SELECT COUNT(*) AS c FROM contract_providers').c,
    tasks: db.get('SELECT COUNT(*) AS c FROM tasks').c,
    history: db.get('SELECT COUNT(*) AS c FROM task_history').c,
  };
  const evaluation = evaluateProviderCompliance(db, { providerId, purposeId: null });
  assert.strictEqual(evaluation.compliant, false);
  assert.ok(evaluation.missing.length > 0);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM contract_providers').c, before.links);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM tasks').c, before.tasks);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM task_history').c, before.history);
});
