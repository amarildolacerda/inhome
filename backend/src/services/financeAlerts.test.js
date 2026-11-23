'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir('sddp-finance-alerts-');

const database = require('../config/database');
const { runInstallmentSweep, SOURCE_KIND } = require('./financeAlerts');
const { code } = require('../config/enums');

function iso(offsetDays) {
  return new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
}

function seed(db) {
  const VIGENTE = code('contracts.status', 'vigente');
  const ENCERRADO = code('contracts.status', 'encerrado');
  db.run("INSERT INTO contracts(id, name, start_date, forecast_date, status) VALUES (1, 'Ativo', ?, ?, ?)", [iso(-30), iso(30), VIGENTE]);
  db.run("INSERT INTO contracts(id, name, start_date, forecast_date, status) VALUES (2, 'Encerrado', ?, ?, ?)", [iso(-30), iso(30), ENCERRADO]);
  db.run(
    `INSERT INTO contract_installments(id, contract_id, description, amount_cents, due_date) VALUES
      (1, 1, 'Vencida aberta', 10000, ?),
      (2, 1, 'Vencida paga', 10000, ?),
      (3, 2, 'Vencida encerrada', 10000, ?),
      (4, 1, 'A vencer', 10000, ?)`,
    [iso(-5), iso(-4), iso(-3), iso(10)]
  );
  db.run('INSERT INTO contract_payments(installment_id, contract_id, amount_cents, paid_at) VALUES (2, 1, 10000, ?)', [iso(-2)]);
}

test('00020 FR-068: varredura cria alerta por parcela vencida, dedup e ignora encerradas', async () => {
  await initTestDb();
  const db = database.createDomainDb(2003);
  seed(db);

  const first = runInstallmentSweep(db);
  assert.strictEqual(first.created, 1, 'somente a parcela vencida e aberta do contrato vigente');
  assert.strictEqual(first.scanned, 3, 'três vencidas no total, uma paga e uma encerrada');
  const rows = db.all('SELECT * FROM extracted_alerts ORDER BY id');
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].contract_id, 1);
  assert.strictEqual(rows[0].source_kind, SOURCE_KIND);
  assert.strictEqual(rows[0].source_id, '1');
  assert.strictEqual(rows[0].title, 'Parcela vencida: Vencida aberta');

  const second = runInstallmentSweep(db);
  assert.strictEqual(second.created, 0, 'FR-068: dedup por tupla');
  assert.strictEqual(second.updated, 1, 'repassada atualiza o alerta existente');
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM extracted_alerts').c, 1);

  // Contrato encerrado não ganha alerta novo; histórico existente permanece.
  db.run(
    `INSERT INTO extracted_alerts(contract_id, source_kind, source_id, title, due_date)
     VALUES (2, ?, 'historico', 'Alerta antigo', ?)`,
    [SOURCE_KIND, iso(-3)]
  );
  runInstallmentSweep(db);
  assert.strictEqual(db.get("SELECT COUNT(*) AS c FROM extracted_alerts WHERE contract_id = 2 AND source_id = '3'").c, 0);
  assert.ok(db.get("SELECT id FROM extracted_alerts WHERE contract_id = 2 AND source_id = 'historico'"), 'histórico preservado');
});

test('00020 FR-068: sem vencidas a varredura é no-op', async () => {
  await initTestDb();
  const db = database.createDomainDb(2004);
  db.run("INSERT INTO contracts(id, name, start_date, forecast_date) VALUES (1, 'Futuro', ?, ?)", [iso(0), iso(30)]);
  db.run("INSERT INTO contract_installments(id, contract_id, description, amount_cents, due_date) VALUES (1, 1, 'Futura', 10000, ?)", [iso(5)]);
  const result = runInstallmentSweep(db);
  assert.strictEqual(result.created, 0);
  assert.strictEqual(result.updated, 0);
  assert.strictEqual(result.scanned, 0);
});
