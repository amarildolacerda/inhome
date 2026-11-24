'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir('sddp-provider-alerts-');
const { getPlatformDb, getDomainDb } = require('../config/database');
const { code } = require('../config/enums');

const ASO = () => code('provider_documents.document_type', 'ASO');
const PROVIDER = () => code('purpose_document_requirements.applies_to', 'provider');

// Datas locais: daysUntil() em alerts.js compara contra a meia-noite local.
// Usar toISOString() aqui deslocaria "ontem" para "hoje" em fusos a oeste de UTC.
function futureDate(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

let domainId;
let db;
let providerId;
let contractA;
let contractB;
let documentId;

test.before(async () => {
  await initTestDb();
  const platform = getPlatformDb();
  platform.run("INSERT INTO domains(name, slug, status) VALUES ('Alertas', 'alertas-provider', 'active')");
  domainId = platform.get("SELECT id FROM domains WHERE slug = 'alertas-provider'").id;
  db = getDomainDb(domainId);
  db.run(
    "INSERT INTO users(name, email, password_hash, role) VALUES ('Prestador', 'p@alertas.test', 'x', 'prestador')"
  );
  providerId = db.get("SELECT id FROM users WHERE email = 'p@alertas.test'").id;
  db.run("INSERT INTO purposes(name) VALUES ('Manutencao')");
  const purposeId = db.get("SELECT id FROM purposes WHERE name = 'Manutencao'").id;
  for (const name of ['Contrato A', 'Contrato B']) {
    db.run(
      'INSERT INTO contracts(name, purpose_id, start_date, forecast_date) VALUES (?, ?, ?, ?)',
      [name, purposeId, futureDate(-10), futureDate(90)]
    );
    const contract = db.get('SELECT id FROM contracts WHERE name = ?', [name]);
    db.run('INSERT INTO contract_providers(contract_id, user_id) VALUES (?, ?)', [contract.id, providerId]);
    if (name === 'Contrato A') contractA = contract.id;
    else contractB = contract.id;
  }
  db.run(
    `INSERT INTO provider_documents(provider_id, document_type, number, path, valid_until, reviewed_by, reviewed_at)
     VALUES (?, ?, 'ASO-1', 'uploads/aso.pdf', ?, ?, ?)`,
    [providerId, ASO(), futureDate(30), providerId, futureDate(-1)]
  );
  documentId = db.get('SELECT MAX(id) AS id FROM provider_documents').id;
});

test('FR-088: duas varreduras geram dois alertas sem duplicar', () => {
  const { syncProviderDocumentAlerts } = require('./providerDocumentAlerts');
  const first = syncProviderDocumentAlerts(db);
  assert.strictEqual(first.created, 2, JSON.stringify(first));
  syncProviderDocumentAlerts(db);
  const rows = db.all(
    "SELECT contract_id, source_kind, source_id FROM extracted_alerts WHERE source_kind = 'provider_document' ORDER BY contract_id"
  );
  assert.strictEqual(rows.length, 2);
  assert.deepStrictEqual(rows.map((row) => row.contract_id).sort(), [contractA, contractB].sort());
  for (const row of rows) {
    assert.match(row.source_id, new RegExp(`^${documentId}:\\d+$`));
  }
});

test('FR-089: regularização e fim de vínculo removem os alertas', () => {
  const { syncProviderDocumentAlerts } = require('./providerDocumentAlerts');
  db.run('UPDATE provider_documents SET valid_until = ? WHERE id = ?', [futureDate(400), documentId]);
  const regularized = syncProviderDocumentAlerts(db);
  assert.strictEqual(regularized.removed, 2, JSON.stringify(regularized));
  assert.strictEqual(
    db.get("SELECT COUNT(*) AS c FROM extracted_alerts WHERE source_kind = 'provider_document'").c,
    0
  );

  db.run('UPDATE provider_documents SET valid_until = ? WHERE id = ?', [futureDate(30), documentId]);
  syncProviderDocumentAlerts(db);
  db.run('DELETE FROM contract_providers WHERE contract_id = ? AND user_id = ?', [contractB, providerId]);
  const unlinked = syncProviderDocumentAlerts(db);
  assert.strictEqual(unlinked.removed, 1, JSON.stringify(unlinked));
  const remaining = db.all("SELECT contract_id FROM extracted_alerts WHERE source_kind = 'provider_document'");
  assert.deepStrictEqual(remaining.map((row) => row.contract_id), [contractA]);

  db.run('UPDATE contracts SET status = ? WHERE id = ?', [code('contracts.status', 'encerrado'), contractA]);
  const closed = syncProviderDocumentAlerts(db);
  assert.strictEqual(closed.removed, 1, JSON.stringify(closed));
  assert.strictEqual(
    db.get("SELECT COUNT(*) AS c FROM extracted_alerts WHERE source_kind = 'provider_document'").c,
    0
  );
});

test('FR-088: itens sem conferência e documentos vencidos não geram alerta', () => {
  const { syncProviderDocumentAlerts } = require('./providerDocumentAlerts');
  db.run('UPDATE contracts SET status = ? WHERE id = ?', [code('contracts.status', 'vigente'), contractA]);
  db.run('UPDATE provider_documents SET valid_until = ? WHERE id = ?', [futureDate(-1), documentId]);
  const expired = syncProviderDocumentAlerts(db);
  assert.strictEqual(expired.created, 0);

  db.run('UPDATE provider_documents SET valid_until = ?, reviewed_by = NULL, reviewed_at = NULL WHERE id = ?', [futureDate(30), documentId]);
  const unreviewed = syncProviderDocumentAlerts(db);
  assert.strictEqual(unreviewed.created, 0);
  assert.strictEqual(
    db.get("SELECT COUNT(*) AS c FROM extracted_alerts WHERE source_kind = 'provider_document'").c,
    0
  );
});
