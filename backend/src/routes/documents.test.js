'use strict';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir('sddp-documents-routes-');
const { app } = require('../server');
const { getDomainDb } = require('../config/database');
const { signJwt } = require('../middleware/auth');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

function as(token) {
  return { Authorization: `Bearer ${token}` };
}

function iso(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

async function login(email, password, domainId) {
  const res = await request(app)
    .post('/api/v2/auth/login')
    .send({ email, password, domainId });
  assert.strictEqual(res.status, 200, `${email}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

let domainId;
let otherDomainId;
let adminToken;
let gestorToken;
let prestadorToken;
let visitanteToken;
let otherDomainToken;
let contractId;
let otherContractId;
let taskAttachmentId;
let chatAttachmentId;
let chatMessageId;
let paymentAttachmentId;
let prestadorId;

test.before(async () => {
  await initTestDb();
  const sys = await request(app)
    .post('/api/v2/auth/login')
    .send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  const enabled = await request(app)
    .post('/api/v2/domains/enable')
    .set(as(sys.body.token))
    .send({ name: 'Documentos', adminName: 'Ana', adminEmail: 'ana@docs.test', adminPassword: 'Secret1!' });
  assert.strictEqual(enabled.status, 201, JSON.stringify(enabled.body));
  domainId = enabled.body.domain.id;
  adminToken = await login('ana@docs.test', 'Secret1!', domainId);

  const gestor = await request(app)
    .post('/api/v2/users')
    .set(as(adminToken))
    .send({ name: 'Guto', email: 'guto@docs.test', password: 'Secret1!', role: 'gestor', username: 'guto' });
  assert.strictEqual(gestor.status, 201, JSON.stringify(gestor.body));
  gestorToken = await login('guto@docs.test', 'Secret1!', domainId);

  const prestador = await request(app)
    .post('/api/v2/users')
    .set(as(adminToken))
    .send({ name: 'Mila', email: 'mila@docs.test', password: 'Secret1!', role: 'prestador', username: 'mila' });
  assert.strictEqual(prestador.status, 201, JSON.stringify(prestador.body));
  prestadorId = prestador.body.user.id;
  prestadorToken = await login('mila@docs.test', 'Secret1!', domainId);
  visitanteToken = signJwt({ id: prestadorId, email: 'vis@docs.test', role: 'visitante', domainId });

  const contract = await request(app)
    .post('/api/v2/contracts')
    .set(as(gestorToken))
    .send({ name: 'Contrato Documentos', start_date: iso(-5), forecast_date: iso(60) });
  assert.strictEqual(contract.status, 201, JSON.stringify(contract.body));
  contractId = contract.body.contract.id;

  const other = await request(app)
    .post('/api/v2/domains/enable')
    .set(as(sys.body.token))
    .send({ name: 'Outro Domínio', adminName: 'Bia', adminEmail: 'bia@docs.test', adminPassword: 'Secret1!' });
  assert.strictEqual(other.status, 201, JSON.stringify(other.body));
  otherDomainId = other.body.domain.id;
  otherDomainToken = await login('bia@docs.test', 'Secret1!', otherDomainId);
  const otherContract = await request(app)
    .post('/api/v2/contracts')
    .set(as(otherDomainToken))
    .send({ name: 'Contrato Alheio', start_date: iso(-5), forecast_date: iso(60) });
  otherContractId = otherContract.body.contract.id;

  const db = getDomainDb(domainId);
  db.run("INSERT INTO tasks(id, contract_id, title, status, created_at) VALUES (1, ?, 'Tarefa', 1, datetime('now'))", [contractId]);
  db.run("INSERT INTO attachments(task_id, path, original_name, category) VALUES (1, 'uploads/evidencia.png', 'evidencia.png', 'evidence')");
  taskAttachmentId = db.get('SELECT MAX(id) AS id FROM attachments').id;

  db.run("INSERT INTO chat_messages(id, contract_id, author_id, body, created_at) VALUES (5, ?, ?, 'Segue', datetime('now'))", [contractId, prestadorId]);
  chatMessageId = 5;
  db.run("INSERT INTO attachments(message_id, path, original_name, category) VALUES (5, 'uploads/contrato.pdf', 'contrato.pdf', 'chat')");
  chatAttachmentId = db.get('SELECT MAX(id) AS id FROM attachments').id;
  db.run("INSERT INTO document_analyses(message_id, contract_id, status, extracted_json) VALUES (5, ?, 'completed', ?)", [contractId, JSON.stringify({ deadline: '2026-12-01' })]);
  db.run("INSERT INTO extracted_alerts(contract_id, source_kind, source_id, title, due_date) VALUES (?, 'document', '5', 'Prazo', '2026-12-01')", [contractId]);

  db.run("INSERT INTO contract_installments(id, contract_id, description, amount_cents, due_date) VALUES (1, ?, 'Parcela', 1000, '2026-12-01')", [contractId]);
  db.run("INSERT INTO contract_payments(id, installment_id, contract_id, amount_cents, paid_at) VALUES (1, 1, ?, 1000, '2026-12-01')", [contractId]);
  db.run("INSERT INTO attachments(payment_id, path, original_name, category) VALUES (1, 'uploads/recibo.pdf', 'recibo.pdf', 'payment')");
  paymentAttachmentId = db.get('SELECT MAX(id) AS id FROM attachments').id;
});

test('FR-067: papéis sem permissão e domínio divergente recebem 403', async () => {
  for (const [label, token] of [
    ['prestador', prestadorToken],
    ['visitante', visitanteToken],
  ]) {
    const read = await request(app).get(`/api/v2/contracts/${contractId}/documents`).set(as(token));
    assert.strictEqual(read.status, 403, `${label} read: ${JSON.stringify(read.body)}`);
  }
  const anon = await request(app).get(`/api/v2/contracts/${contractId}/documents`);
  assert.strictEqual(anon.status, 401);
  const cross = await request(app)
    .get(`/api/v2/contracts/${contractId}/documents`)
    .query({ domainId: otherDomainId })
    .set(as(gestorToken));
  assert.strictEqual(cross.status, 403);
  const foreign = await request(app)
    .get('/api/v2/contracts/777777/documents')
    .set(as(gestorToken));
  assert.strictEqual(foreign.status, 404, 'contrato inexistente não vaza');
});

test('FR-064/065/066: lista única por origem, análise e filtros', async () => {
  const listed = await request(app)
    .get(`/api/v2/contracts/${contractId}/documents`)
    .set(as(adminToken));
  assert.strictEqual(listed.status, 200, JSON.stringify(listed.body));
  assert.strictEqual(listed.body.documents.length, 3);
  assert.deepStrictEqual(
    listed.body.documents.map((d) => d.source),
    ['task', 'chat', 'payment']
  );
  const ids = listed.body.documents.map((d) => d.id);
  assert.strictEqual(new Set(ids).size, 3, 'nenhum anexo duplicado');
  const chat = listed.body.documents.find((d) => d.id === chatAttachmentId);
  assert.strictEqual(chat.analysis.status, 'completed');
  assert.strictEqual(chat.analysis.extracted.deadline, '2026-12-01');
  assert.strictEqual(chat.alerts.length, 1);

  const byCategory = await request(app)
    .get(`/api/v2/contracts/${contractId}/documents`)
    .query({ category: 'payment' })
    .set(as(gestorToken));
  assert.strictEqual(byCategory.body.documents.length, 1);
  assert.strictEqual(byCategory.body.documents[0].id, paymentAttachmentId);

  const bySource = await request(app)
    .get(`/api/v2/contracts/${contractId}/documents`)
    .query({ source: 'chat' })
    .set(as(gestorToken));
  assert.strictEqual(bySource.body.documents.length, 1);
  assert.strictEqual(bySource.body.documents[0].id, chatAttachmentId);

  const badCategory = await request(app)
    .get(`/api/v2/contracts/${contractId}/documents`)
    .query({ category: 'unknown' })
    .set(as(gestorToken));
  assert.strictEqual(badCategory.status, 400);
});

test('FR-068: categoria desconhecida é 400 sem escrita; conhecida atualiza in-place', async () => {
  const bad = await request(app)
    .patch(`/api/v2/contracts/${contractId}/documents/${taskAttachmentId}`)
    .set(as(gestorToken))
    .send({ category: 'unknown' });
  assert.strictEqual(bad.status, 400);
  const db = getDomainDb(domainId);
  assert.strictEqual(db.get('SELECT category FROM attachments WHERE id = ?', [taskAttachmentId]).category, 'evidence');

  const good = await request(app)
    .patch(`/api/v2/contracts/${contractId}/documents/${taskAttachmentId}`)
    .set(as(adminToken))
    .send({ category: 'documentation' });
  assert.strictEqual(good.status, 200, JSON.stringify(good.body));
  assert.strictEqual(good.body.attachment.category, 'documentation');
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM attachments WHERE task_id = 1').c, 1, 'sem duplicação');
});

test('FR-069/070: conferência idempotente com autor e data; outro domínio 404', async () => {
  const first = await request(app)
    .post(`/api/v2/contracts/${contractId}/documents/${chatAttachmentId}/review`)
    .set(as(gestorToken));
  assert.strictEqual(first.status, 200, JSON.stringify(first.body));
  assert.strictEqual(first.body.reviewed_by, getDomainDb(domainId).get("SELECT id FROM users WHERE email = 'guto@docs.test'").id);
  assert.ok(first.body.reviewed_at);

  const second = await request(app)
    .post(`/api/v2/contracts/${contractId}/documents/${chatAttachmentId}/review`)
    .set(as(adminToken));
  assert.strictEqual(second.status, 200);
  assert.strictEqual(second.body.reviewed_by, first.body.reviewed_by, 'conferência não é sobrescrita');
  assert.strictEqual(second.body.reviewed_at, first.body.reviewed_at);

  const forbidden = await request(app)
    .post(`/api/v2/contracts/${contractId}/documents/${chatAttachmentId}/review`)
    .set(as(prestadorToken));
  assert.strictEqual(forbidden.status, 403);

  const foreign = await request(app)
    .patch(`/api/v2/contracts/777777/documents/${chatAttachmentId}`)
    .set(as(gestorToken));
  assert.strictEqual(foreign.status, 404, 'documento de outro contrato não é alterado');
  assert.strictEqual(chatMessageId, 5);
});
