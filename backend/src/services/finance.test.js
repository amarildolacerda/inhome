'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir('sddp-finance-service-');

const database = require('../config/database');
const { getContractFinance, getDomainFinance } = require('./finance');

function iso(offsetDays) {
  return new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
}

test('00020 FR-064/067: resumo por contrato e agregado de domínio derivados das mesmas linhas', async () => {
  await initTestDb();
  const db = database.createDomainDb(2001);
  db.run("INSERT INTO contracts(id, name, start_date, forecast_date) VALUES (1, 'Obra A', ?, ?)", [iso(-30), iso(60)]);
  db.run("INSERT INTO contracts(id, name, start_date, forecast_date) VALUES (2, 'Obra B', ?, ?)", [iso(-10), iso(30)]);
  db.run(
    `INSERT INTO contract_installments(id, contract_id, description, amount_cents, due_date) VALUES
      (1, 1, 'Entrada', 100000, ?),
      (2, 1, 'Parcela paga', 200000, ?),
      (3, 1, 'Parcela atrasada', 150000, ?),
      (4, 2, 'Única', 50000, ?)`,
    [iso(-5), iso(-3), iso(-1), iso(10)]
  );
  db.run("INSERT INTO contract_payments(id, installment_id, contract_id, amount_cents, paid_at) VALUES (1, 2, 1, 200000, ?)", [iso(-2)]);
  db.run("INSERT INTO contract_payments(id, installment_id, contract_id, amount_cents, paid_at) VALUES (2, 3, 1, 50000, ?)", [iso(-1)]);
  db.run("INSERT INTO contract_payments(id, installment_id, contract_id, amount_cents, paid_at) VALUES (3, 3, 1, 25000, ?)", [iso(0)]);
  db.run(
    "INSERT INTO attachments(payment_id, path, original_name, category) VALUES (2, 'uploads/recibo.pdf', 'recibo.pdf', 'payment')"
  );

  const finance = getContractFinance(db, 1);
  assert.strictEqual(finance.contract_id, 1);
  assert.strictEqual(finance.contract_name, 'Obra A');
  assert.deepStrictEqual(finance.summary, {
    planned_cents: 450000,
    paid_cents: 275000,
    balance_cents: 175000,
    overdue_count: 2, // entrada vencida sem pagamento + parcial vencida
    installments_count: 3,
  });
  const paid = finance.installments.find((item) => item.id === 2);
  assert.strictEqual(paid.paid_cents, 200000);
  assert.strictEqual(paid.balance_cents, 0);
  assert.strictEqual(paid.overdue, false, 'paid installment is never overdue');
  const partial = finance.installments.find((item) => item.id === 3);
  assert.strictEqual(partial.balance_cents, 75000);
  assert.strictEqual(partial.overdue, true, 'partially paid and past due is overdue');
  assert.strictEqual(partial.payments[0].receipt.original_name, 'recibo.pdf', 'receipt comes from attachment');
  assert.strictEqual(partial.payments[1].receipt, null, 'comprovante é opcional');

  assert.strictEqual(getContractFinance(db, 9999), null, 'unknown contract returns null');

  const domain = getDomainFinance(db);
  assert.deepStrictEqual(domain, {
    planned_cents: 500000,
    paid_cents: 275000,
    balance_cents: 225000,
    overdue_count: 2, // duas parcelas vencidas com saldo no domínio
    installments_count: 4,
    contracts_count: 2,
  });
});

test('00020 FR-067: domínio vazio tem finance zerado', async () => {
  await initTestDb();
  const db = database.createDomainDb(2002);
  assert.deepStrictEqual(getDomainFinance(db), {
    planned_cents: 0,
    paid_cents: 0,
    balance_cents: 0,
    overdue_count: 0,
    installments_count: 0,
    contracts_count: 0,
  });
});
