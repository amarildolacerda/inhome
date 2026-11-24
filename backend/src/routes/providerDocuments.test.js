'use strict';

process.env.UPLOAD_DIR = require('path').join(
  require('os').tmpdir(),
  `sddp-uploads-provider-docs-${process.pid}`
);

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir('sddp-provider-documents-');
const { app } = require('../server');
const { getDomainDb } = require('../config/database');
const { code } = require('../config/enums');
const { UPLOAD_DIR } = require('../middleware/upload');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';
const PDF_B64 = Buffer.from('%PDF-1.4 dossie', 'utf8').toString('base64');
const ASO = () => code('provider_documents.document_type', 'ASO');
const NR35 = () => code('provider_documents.document_type', 'NR-35');
const PROVIDER = () => code('purpose_document_requirements.applies_to', 'provider');
const WORKER = () => code('purpose_document_requirements.applies_to', 'worker');

let domainId;
let otherDomainId;
let adminToken;
let gestorToken;
let prestadorToken;
let otherPrestadorToken;
let systemToken;
let providerId;
let otherProviderId;
let purposeId;
let db;

function as(token) {
  return { Authorization: `Bearer ${token}` };
}

function futureDate(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

async function login(email, password, domId) {
  const res = await request(app)
    .post('/api/v2/auth/login')
    .send({ email, password, domainId: domId });
  assert.strictEqual(res.status, 200, `${email}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

async function enableDomain(system, name, email) {
  const res = await request(app)
    .post('/api/v2/domains/enable')
    .set(as(system))
    .send({ name, adminName: 'Admin', adminEmail: email, adminPassword: 'Secret1!' });
  assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  return res.body.domain.id;
}

test.before(async () => {
  await initTestDb();
  const sys = await request(app).post('/api/v2/auth/login').send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200);
  systemToken = sys.body.token;
  domainId = await enableDomain(systemToken, 'Dossie', 'admin@dossie.test');
  otherDomainId = await enableDomain(systemToken, 'Outro Dominio', 'admin@outro.test');
  adminToken = await login('admin@dossie.test', 'Secret1!', domainId);

  const gestor = await request(app)
    .post('/api/v2/users')
    .set(as(adminToken))
    .send({ name: 'Gestor', email: 'gestor@dossie.test', password: 'Secret1!', role: 'gestor', username: 'gestor' });
  assert.strictEqual(gestor.status, 201, JSON.stringify(gestor.body));
  gestorToken = await login('gestor@dossie.test', 'Secret1!', domainId);

  for (const [name, email] of [['Prestador', 'prestador@dossie.test'], ['Outro', 'outro@dossie.test']]) {
    const res = await request(app)
      .post('/api/v2/users')
      .set(as(adminToken))
      .send({ name, email, password: 'Secret1!', role: 'prestador', username: email.split('@')[0] });
    assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  }
  prestadorToken = await login('prestador@dossie.test', 'Secret1!', domainId);
  otherPrestadorToken = await login('outro@dossie.test', 'Secret1!', domainId);
  db = getDomainDb(domainId);
  providerId = db.get("SELECT id FROM users WHERE email = 'prestador@dossie.test'").id;
  otherProviderId = db.get("SELECT id FROM users WHERE email = 'outro@dossie.test'").id;
  db.run("INSERT INTO purposes(name) VALUES ('Manutencao')");
  purposeId = db.get("SELECT id FROM purposes WHERE name = 'Manutencao'").id;
});

test('FR-091: autenticação, papel, domínio e arquivo inválido antes de gravar', async () => {
  const anonymous = await request(app).get(`/api/v2/providers/${providerId}/dossier`);
  assert.strictEqual(anonymous.status, 401);

  const crossed = await request(app)
    .get(`/api/v2/providers/${providerId}/dossier?domainId=${otherDomainId}`)
    .set(as(adminToken));
  assert.strictEqual(crossed.status, 403);

  const auditor = await request(app).get(`/api/v2/providers/${providerId}/dossier`).set(as(systemToken));
  assert.strictEqual(auditor.status, 403);

  const filesBefore = fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR).length : 0;
  const invalid = await request(app)
    .post(`/api/v2/providers/${providerId}/documents`)
    .set(as(gestorToken))
    .send({ type: 'ASO', number: 'ASO-INVALIDO', validUntil: futureDate(30), fileName: 'virus.exe', dataBase64: PDF_B64 });
  assert.strictEqual(invalid.status, 400, JSON.stringify(invalid.body));
  const filesAfter = fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR).length : 0;
  assert.strictEqual(filesAfter, filesBefore, 'recusa não grava arquivo');
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM provider_documents').c, 0);
});

test('FR-080: trabalhador é cadastrado, listado e desativado', async () => {
  const created = await request(app)
    .post(`/api/v2/providers/${providerId}/workers`)
    .set(as(gestorToken))
    .send({ name: 'Joao', role: 'Eletricista' });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  assert.strictEqual(created.body.worker.name, 'Joao');
  assert.strictEqual(created.body.worker.active, true);

  const denied = await request(app)
    .post(`/api/v2/providers/${providerId}/workers`)
    .set(as(prestadorToken))
    .send({ name: 'Não pode', role: 'Ajudante' });
  assert.strictEqual(denied.status, 403);

  const dossier = await request(app).get(`/api/v2/providers/${providerId}/dossier`).set(as(adminToken));
  assert.strictEqual(dossier.status, 200, JSON.stringify(dossier.body));
  assert.strictEqual(dossier.body.workers.length, 1);

  const deactivated = await request(app)
    .patch(`/api/v2/providers/${providerId}/workers/${created.body.worker.id}`)
    .set(as(adminToken))
    .send({ active: false });
  assert.strictEqual(deactivated.status, 200, JSON.stringify(deactivated.body));
  assert.strictEqual(deactivated.body.worker.active, false);
});

test('FR-081: documento exige prestador, tipo, número, arquivo e vigência ISO', async () => {
  const missing = await request(app)
    .post(`/api/v2/providers/${providerId}/documents`)
    .set(as(gestorToken))
    .send({ type: 'ASO', number: 'SEM-ARQUIVO', validUntil: futureDate(30) });
  assert.strictEqual(missing.status, 400, JSON.stringify(missing.body));

  const created = await request(app)
    .post(`/api/v2/providers/${providerId}/documents`)
    .set(as(gestorToken))
    .send({
      type: 'NR-35',
      number: 'NR35-1',
      validUntil: futureDate(30),
      fileName: 'nr35.pdf',
      dataBase64: PDF_B64,
    });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  assert.strictEqual(created.body.document.type, 'NR-35');
  assert.strictEqual(created.body.document.number, 'NR35-1');
  assert.match(created.body.document.path, /^uploads\//);
  assert.strictEqual(created.body.document.reviewedAt, null);

  const wrongProvider = await request(app)
    .post(`/api/v2/providers/${otherProviderId}/documents`)
    .set(as(prestadorToken))
    .send({ type: 'ASO', number: 'X', validUntil: futureDate(30), fileName: 'aso.pdf', dataBase64: PDF_B64 });
  assert.strictEqual(wrongProvider.status, 403);
});

test('FR-082: edição preserva a anterior e a conferência registra autor e data', async () => {
  const document = db.get("SELECT id FROM provider_documents WHERE number = 'NR35-1'");
  const updated = await request(app)
    .patch(`/api/v2/providers/${providerId}/documents/${document.id}`)
    .set(as(gestorToken))
    .send({ number: 'NR35-2', validUntil: futureDate(60), review: {} });
  assert.strictEqual(updated.status, 200, JSON.stringify(updated.body));
  assert.strictEqual(updated.body.document.number, 'NR35-2');
  assert.ok(updated.body.document.reviewedBy);
  assert.ok(updated.body.document.reviewedAt);
  assert.strictEqual(
    db.get('SELECT number FROM provider_documents WHERE id = ?', [document.id]).number,
    'NR35-2'
  );
});

test('FR-083: checklist por finalidade com tipo e abrangência', async () => {
  const created = await request(app)
    .post('/api/v2/providers/requirements')
    .set(as(adminToken))
    .send({ purposeId, type: 'NR-35', appliesTo: 'worker' });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  assert.strictEqual(created.body.requirement.documentType, NR35());
  assert.strictEqual(created.body.requirement.appliesTo, WORKER());

  const listed = await request(app).get('/api/v2/providers/requirements').set(as(gestorToken));
  assert.strictEqual(listed.status, 200);
  assert.ok(listed.body.requirements.some((item) => item.id === created.body.requirement.id));

  const removed = await request(app)
    .delete(`/api/v2/providers/requirements/${created.body.requirement.id}`)
    .set(as(adminToken));
  assert.strictEqual(removed.status, 200);
  assert.strictEqual(
    db.get('SELECT COUNT(*) AS c FROM purpose_document_requirements WHERE id = ?', [created.body.requirement.id]).c,
    0
  );
});

test('FR-090: dossiê devolve documentos, trabalhadores e conformidade no escopo do prestador', async () => {
  const own = await request(app).get(`/api/v2/providers/${providerId}/dossier`).set(as(prestadorToken));
  assert.strictEqual(own.status, 200, JSON.stringify(own.body));
  assert.strictEqual(own.body.documents.length, 1);
  assert.strictEqual(own.body.workers.length, 1);
  assert.ok(own.body.compliance);

  const foreign = await request(app).get(`/api/v2/providers/${otherProviderId}/dossier`).set(as(prestadorToken));
  assert.strictEqual(foreign.status, 403);
  const gestorView = await request(app).get(`/api/v2/providers/${otherProviderId}/dossier`).set(as(gestorToken));
  assert.strictEqual(gestorView.status, 200);
  assert.deepStrictEqual(gestorView.body.documents, []);
  assert.strictEqual(ASO() > 0 && PROVIDER() > 0, true);
});

test('FR-082 FR-089: remover documento limpa os alertas do dossiê', async () => {
  const document = db.get("SELECT id FROM provider_documents WHERE number = 'NR35-2'");
  db.run(
    `INSERT INTO extracted_alerts(contract_id, source_kind, source_id, title)
     VALUES (1, 'provider_document', ?, 'Alerta de teste')`,
    [`${document.id}:30`]
  );
  const removed = await request(app)
    .delete(`/api/v2/providers/${providerId}/documents/${document.id}`)
    .set(as(gestorToken));
  assert.strictEqual(removed.status, 200, JSON.stringify(removed.body));
  assert.strictEqual(
    db.get("SELECT COUNT(*) AS c FROM extracted_alerts WHERE source_kind = 'provider_document'").c,
    0
  );
});
