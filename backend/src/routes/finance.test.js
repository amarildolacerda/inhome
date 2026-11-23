'use strict';

let uploadDir;

process.env.UPLOAD_DIR = require('path').join(
  require('os').tmpdir(),
  `sddp-uploads-finance-${process.pid}`
);
uploadDir = process.env.UPLOAD_DIR;

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir('sddp-finance-routes-');
const { app } = require('../server');
const { getDomainDb } = require('../config/database');
const { signJwt } = require('../middleware/auth');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';
const RECEIPT_B64 = Buffer.from('comprovante de pagamento', 'utf8').toString('base64');

let domainId;
let adminToken;
let gestorToken;
let prestadorToken;
let visitanteToken;
let outsiderToken;
let prestadorId;
let contractId;
let otherDomainToken;
let otherDomainId;

function as(token) {
  return { Authorization: `Bearer ${token}` };
}

function iso(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

async function login(email, password, domId) {
  const res = await request(app)
    .post('/api/v2/auth/login')
    .send({ email, password, domainId: domId });
  assert.strictEqual(res.status, 200, `${email}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

async function createInstallment(token, body = {}) {
  return request(app)
    .post(`/api/v2/contracts/${contractId}/finance/installments`)
    .set(as(token))
    .send({
      description: body.description || 'Parcela 1',
      amount_cents: body.amount_cents === undefined ? 100000 : body.amount_cents,
      due_date: body.due_date || iso(10),
    });
}

test.before(async () => {
  await initTestDb();

  const sys = await request(app)
    .post('/api/v2/auth/login')
    .send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  const enabled = await request(app)
    .post('/api/v2/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Financeiro',
      adminName: 'Ana',
      adminEmail: 'ana@finance.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201, JSON.stringify(enabled.body));
  domainId = enabled.body.domain.id;
  adminToken = await login('ana@finance.test', 'Secret1!', domainId);

  for (const [name, email, role] of [
    ['Guto', 'guto@finance.test', 'gestor'],
    ['Mila', 'mila@finance.test', 'prestador'],
    ['Nuno', 'nuno@finance.test', 'prestador'],
  ]) {
    const res = await request(app)
      .post('/api/v2/users')
      .set(as(adminToken))
      .send({ name, email, password: 'Secret1!', role, username: email.split('@')[0] });
    assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  }
  gestorToken = await login('guto@finance.test', 'Secret1!', domainId);
  prestadorToken = await login('mila@finance.test', 'Secret1!', domainId);
  outsiderToken = await login('nuno@finance.test', 'Secret1!', domainId);

  const db = getDomainDb(domainId);
  prestadorId = db.get("SELECT id FROM users WHERE email = 'mila@finance.test'").id;
  visitanteToken = signJwt({ id: prestadorId, email: 'vis@finance.test', role: 'visitante', domainId });

  const contract = await request(app)
    .post('/api/v2/contracts')
    .set(as(gestorToken))
    .send({ name: 'Contrato Financeiro', start_date: iso(-5), forecast_date: iso(60) });
  assert.strictEqual(contract.status, 201, JSON.stringify(contract.body));
  contractId = contract.body.contract.id;

  const linked = await request(app)
    .post(`/api/v2/contracts/${contractId}/providers`)
    .set(as(gestorToken))
    .send({ user_id: prestadorId });
  assert.ok([200, 201].includes(linked.status), JSON.stringify(linked.body));

  const second = await request(app)
    .post('/api/v2/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Outro Domínio',
      adminName: 'Bia',
      adminEmail: 'bia@other.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(second.status, 201, JSON.stringify(second.body));
  otherDomainId = second.body.domain.id;
  otherDomainToken = await login('bia@other.test', 'Secret1!', otherDomainId);
});

// --- FR-064/FR-070: leitura e escrita só para admin/gestor ---
test('FR-070: prestador, visitante, sem token e domínio divergente recebem 403/401', async () => {
  for (const [label, token] of [
    ['prestador', prestadorToken],
    ['visitante', visitanteToken],
    ['prestador de fora', outsiderToken],
  ]) {
    const read = await request(app).get(`/api/v2/contracts/${contractId}/finance`).set(as(token));
    assert.strictEqual(read.status, 403, `${label} read: ${JSON.stringify(read.body)}`);
    const write = await createInstallment(token);
    assert.strictEqual(write.status, 403, `${label} write: ${JSON.stringify(write.body)}`);
  }

  const anon = await request(app).get(`/api/v2/contracts/${contractId}/finance`);
  assert.strictEqual(anon.status, 401);

  const cross = await request(app)
    .get(`/api/v2/contracts/${contractId}/finance`)
    .query({ domainId: otherDomainId })
    .set(as(gestorToken));
  assert.strictEqual(cross.status, 403, 'domínio divergente é recusado');

  const foreign = await request(app)
    .get(`/api/v2/contracts/${contractId}/finance`)
    .set(as(otherDomainToken));
  assert.strictEqual(foreign.status, 404, 'escopo por domínio impede leitura de contrato alheio');

  const missing = await request(app).get('/api/v2/contracts/999999/finance').set(as(gestorToken));
  assert.strictEqual(missing.status, 404);
});

// --- FR-064: parcelas ---
test('FR-064: cria, lista, valida e exclui parcelas sem pagamento; limite 500', async () => {
  const created = await createInstallment(gestorToken, { description: 'Entrada', amount_cents: 150000, due_date: iso(-2) });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  assert.strictEqual(created.body.installment.description, 'Entrada');
  assert.strictEqual(created.body.installment.amount_cents, 150000);
  const installmentId = created.body.installment.id;

  const listed = await request(app)
    .get(`/api/v2/contracts/${contractId}/finance/installments`)
    .set(as(adminToken));
  assert.strictEqual(listed.status, 200);
  assert.strictEqual(listed.body.installments.length, 1);
  assert.strictEqual(listed.body.summary.planned_cents, 150000);
  assert.strictEqual(listed.body.summary.balance_cents, 150000);
  assert.strictEqual(listed.body.installments[0].overdue, true, 'parcela vencida sem pagamento');

  const summary = await request(app).get(`/api/v2/contracts/${contractId}/finance`).set(as(gestorToken));
  assert.strictEqual(summary.body.contract_id, contractId);
  assert.strictEqual(summary.body.contract_name, 'Contrato Financeiro');
  assert.strictEqual(summary.body.summary.overdue_count, 1);

  const invalid = await createInstallment(gestorToken, { amount_cents: 0, due_date: 'não-data' });
  assert.strictEqual(invalid.status, 400);
  assert.strictEqual(invalid.body.code, 'INSTALLMENT_AMOUNT_INVALID');
  const badDate = await createInstallment(gestorToken, { due_date: '13/01/2027' });
  assert.strictEqual(badDate.status, 400);
  assert.strictEqual(badDate.body.code, 'INSTALLMENT_DATE_INVALID');

  const removed = await request(app)
    .delete(`/api/v2/contracts/${contractId}/finance/installments/${installmentId}`)
    .set(as(gestorToken));
  assert.strictEqual(removed.status, 204);
  const gone = await request(app).get(`/api/v2/contracts/${contractId}/finance`).set(as(gestorToken));
  assert.strictEqual(gone.body.summary.installments_count, 0);

  // Contrato separado para não contaminar os cenários de pagamento/export.
  const limitContract = await request(app)
    .post('/api/v2/contracts')
    .set(as(gestorToken))
    .send({ name: 'Contrato Limite', start_date: iso(-1), forecast_date: iso(30) });
  assert.strictEqual(limitContract.status, 201);
  const limitId = limitContract.body.contract.id;
  const db = getDomainDb(domainId);
  db.runBatch(
    Array.from({ length: 500 }, (_, i) => ({
      sql: 'INSERT INTO contract_installments(contract_id, description, amount_cents, due_date) VALUES (?, ?, 100, ?)',
      params: [limitId, `Parcela ${i + 1}`, iso(1)],
    }))
  );
  const atLimit = await request(app)
    .post(`/api/v2/contracts/${limitId}/finance/installments`)
    .set(as(gestorToken))
    .send({ description: 'Demais', amount_cents: 100, due_date: iso(1) });
  assert.strictEqual(atLimit.status, 400, 'limite de 500 parcelas');
  assert.strictEqual(atLimit.body.code, 'INSTALLMENT_LIMIT_REACHED');
});

// --- FR-065/FR-066: pagamentos, comprovante e imutabilidade ---
test('FR-065: pagamento parcial, comprovante opcional e parcela com pagamento não exclui', async () => {
  const created = await createInstallment(gestorToken, { description: 'Aluguel', amount_cents: 200000, due_date: iso(-1) });
  const installmentId = created.body.installment.id;

  const partial = await request(app)
    .post(`/api/v2/contracts/${contractId}/finance/installments/${installmentId}/payments`)
    .set(as(gestorToken))
    .send({ amount_cents: 80000, paid_at: iso(0), receipt: { filename: 'recibo.pdf', dataBase64: RECEIPT_B64 } });
  assert.strictEqual(partial.status, 201, JSON.stringify(partial.body));
  assert.strictEqual(partial.body.payment.amount_cents, 80000);
  assert.strictEqual(partial.body.payment.receipt.original_name, 'recibo.pdf');

  const second = await request(app)
    .post(`/api/v2/contracts/${contractId}/finance/installments/${installmentId}/payments`)
    .set(as(adminToken))
    .send({ amount_cents: 120000 });
  assert.strictEqual(second.status, 201);
  assert.strictEqual(second.body.payment.receipt, null, 'comprovante é opcional');

  const summary = await request(app).get(`/api/v2/contracts/${contractId}/finance`).set(as(gestorToken));
  const paid = summary.body.installments.find((item) => item.id === installmentId);
  assert.strictEqual(paid.paid_cents, 200000);
  assert.strictEqual(paid.balance_cents, 0);
  assert.strictEqual(paid.overdue, false, 'quitada deixa de ser atrasada');

  const blocked = await request(app)
    .delete(`/api/v2/contracts/${contractId}/finance/installments/${installmentId}`)
    .set(as(gestorToken));
  assert.strictEqual(blocked.status, 400);
  assert.strictEqual(blocked.body.code, 'INSTALLMENT_HAS_PAYMENT');

  const patch = await request(app)
    .patch(`/api/v2/contracts/${contractId}/finance/installments/${installmentId}/payments/${partial.body.payment.id}`)
    .set(as(gestorToken))
    .send({ amount_cents: 1 });
  assert.strictEqual(patch.status, 404, 'pagamento é imutável: sem rota de alteração');
  const del = await request(app)
    .delete(`/api/v2/contracts/${contractId}/finance/installments/${installmentId}/payments/${partial.body.payment.id}`)
    .set(as(gestorToken));
  assert.strictEqual(del.status, 404, 'pagamento é imutável: sem rota de exclusão');
});

test('FR-066: pagamento acima do saldo é 400 sem escrita; comprovante inválido não grava', async () => {
  const created = await createInstallment(gestorToken, { description: 'Única', amount_cents: 100000, due_date: iso(3) });
  const installmentId = created.body.installment.id;

  const over = await request(app)
    .post(`/api/v2/contracts/${contractId}/finance/installments/${installmentId}/payments`)
    .set(as(gestorToken))
    .send({ amount_cents: 100001 });
  assert.strictEqual(over.status, 400);
  assert.strictEqual(over.body.code, 'PAYMENT_EXCEEDS_INSTALLMENT');

  const db = getDomainDb(domainId);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM contract_payments WHERE installment_id = ?', [installmentId]).c, 0, 'nenhuma escrita no overpay');

  const badReceipt = await request(app)
    .post(`/api/v2/contracts/${contractId}/finance/installments/${installmentId}/payments`)
    .set(as(gestorToken))
    .send({ amount_cents: 10000, receipt: { filename: 'virus.exe', dataBase64: RECEIPT_B64 } });
  assert.strictEqual(badReceipt.status, 400);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM contract_payments WHERE installment_id = ?', [installmentId]).c, 0, 'nenhuma escrita no comprovante inválido');

  const wrongInstallment = await request(app)
    .post(`/api/v2/contracts/${contractId}/finance/installments/999999/payments`)
    .set(as(gestorToken))
    .send({ amount_cents: 100 });
  assert.strictEqual(wrongInstallment.status, 404);

  const forbiddenReceipt = prestadorToken;
  const denied = await request(app)
    .post(`/api/v2/contracts/${contractId}/finance/installments/${installmentId}/payments`)
    .set(as(forbiddenReceipt))
    .send({ amount_cents: 100, receipt: { filename: 'a.pdf', dataBase64: RECEIPT_B64 } });
  assert.strictEqual(denied.status, 403);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM contract_payments WHERE installment_id = ?', [installmentId]).c, 0);
});

// --- FR-069: exportação autenticada ---
test('FR-069: CSV e PDF exportados com autorização; prestador recebe 403', async () => {
  const csv = await request(app)
    .get(`/api/v2/contracts/${contractId}/finance/export.csv`)
    .set(as(gestorToken));
  assert.strictEqual(csv.status, 200);
  assert.match(csv.headers['content-type'], /text\/csv/);
  assert.match(csv.text, /contract_id,contract_name/);

  const pdf = await request(app)
    .get(`/api/v2/contracts/${contractId}/finance/export.pdf`)
    .set(as(adminToken));
  assert.strictEqual(pdf.status, 200);
  assert.match(pdf.headers['content-type'], /application\/pdf/);
  assert.strictEqual(pdf.body.subarray(0, 5).toString(), '%PDF-');

  const denied = await request(app)
    .get(`/api/v2/contracts/${contractId}/finance/export.csv`)
    .set(as(prestadorToken));
  assert.strictEqual(denied.status, 403);
});
