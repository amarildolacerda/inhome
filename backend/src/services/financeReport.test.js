'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir('sddp-finance-report-');

const database = require('../config/database');
const { generateFinancePdf, exportFinanceCsv, brl } = require('./financeReport');

function iso(offsetDays) {
  return new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
}

test('00020 FR-069: CSV e PDF derivam do mesmo resumo financeiro', async () => {
  await initTestDb();
  const db = database.createDomainDb(2005);
  db.run("INSERT INTO contracts(id, name, start_date, forecast_date) VALUES (1, 'Obra, A', ?, ?)", [iso(-10), iso(30)]);
  db.run(
    `INSERT INTO contract_installments(id, contract_id, description, amount_cents, due_date) VALUES
      (1, 1, 'Entrada "especial"', 123456, ?),
      (2, 1, 'Segunda', 50000, ?)`,
    [iso(-3), iso(10)]
  );
  db.run('INSERT INTO contract_payments(installment_id, contract_id, amount_cents, paid_at) VALUES (1, 1, 10000, ?)', [iso(-1)]);

  const csv = exportFinanceCsv(db, 1);
  const lines = csv.trim().split('\n');
  assert.strictEqual(lines[0], 'contract_id,contract_name,installment_id,description,due_date,amount_cents,paid_cents,balance_cents,status,planned_cents,total_paid_cents,total_balance_cents,overdue_count');
  assert.ok(csv.includes('"Obra, A"'), 'vírgula escapada no nome');
  assert.ok(csv.includes('"Entrada ""especial"""'), 'aspas escapadas na descrição');
  assert.ok(csv.includes(',123456,10000,113456,atrasada,'), 'parcela atrasada com saldo');
  assert.ok(csv.includes(',50000,0,50000,aberta,'), 'parcela futura aberta');
  assert.strictEqual(exportFinanceCsv(db, 9999), null, 'contrato inexistente');

  const pdf = generateFinancePdf(db, 1);
  assert.ok(Buffer.isBuffer(pdf), 'PDF em Buffer');
  assert.strictEqual(pdf.subarray(0, 5).toString(), '%PDF-', 'cabeçalho PDF');
  assert.ok(pdf.length > 300, 'PDF com conteúdo');
  assert.strictEqual(generateFinancePdf(db, 9999), null);

  assert.strictEqual(brl(123456), 'R$ 1.234,56');
  assert.strictEqual(brl(0), 'R$ 0,00');
  assert.strictEqual(brl(-500), '-R$ 5,00');
});
