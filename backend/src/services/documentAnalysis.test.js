'use strict';

process.env.UPLOAD_DIR = require('path').join(
  require('os').tmpdir(),
  `sddp-uploads-analysis-${process.pid}`
);

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir('sddp-analysis-data-');
const { getDomainDb } = require('../config/database');
const { UPLOAD_DIR } = require('../middleware/upload');
const analysis = require('./documentAnalysis');

const DOMAIN_ID = 9901;
let db;
let contractId;
let userId;

function writeUpload(name, text) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const file = path.join(UPLOAD_DIR, name);
  fs.writeFileSync(file, text, 'utf8');
  return file;
}

test.before(async () => {
  await initTestDb();
  db = getDomainDb(DOMAIN_ID);
  db.run("INSERT INTO users(name, email, password_hash, role) VALUES ('Gestor', 'g@analysis.test', 'h', 'gestor')");
  userId = db.get("SELECT id FROM users WHERE email = 'g@analysis.test'").id;
  db.run(
    "INSERT INTO contracts(name, start_date, forecast_date) VALUES ('Contrato Análise', '2026-01-01', '2026-12-31')"
  );
  contractId = db.get("SELECT id FROM contracts WHERE name = 'Contrato Análise'").id;
});

function newMessage() {
  db.run(
    'INSERT INTO chat_messages(contract_id, author_id, body) VALUES (?, ?, ?)',
    [contractId, userId, 'Segue o documento']
  );
  return db.get('SELECT MAX(id) AS id FROM chat_messages').id;
}

function attachTo(messageId, filename) {
  db.run(
    `INSERT INTO attachments(message_id, path, original_name, uploaded_by, category)
     VALUES (?, ?, ?, ?, 'chat')`,
    [messageId, `uploads/${filename}`, filename, userId]
  );
  return db.get('SELECT * FROM attachments WHERE message_id = ? ORDER BY id DESC LIMIT 1', [messageId]);
}

test('FR-059 extractFields: extrai prazos, multas, seguros, riscos e local', () => {
  const fields = analysis.extractFields([
    'Prazo de entrega: 2026-12-31',
    'Vencimento da garantia 15/06/2027',
    'Multa de 2% por atraso',
    'Seguro obrigatório de responsabilidade civil',
    'Risco de paralização da obra',
    'Local de execução: São Paulo',
  ].join('\n'));
  assert.strictEqual(fields.prazos.length, 2);
  assert.strictEqual(fields.prazos[0].date, '2026-12-31');
  assert.strictEqual(fields.prazos[1].date, '2027-06-15');
  assert.strictEqual(fields.multas.length, 1);
  assert.strictEqual(fields.seguros.length, 1);
  assert.strictEqual(fields.riscos.length, 1);
  assert.strictEqual(fields.locais.length, 1);
  assert.deepStrictEqual(fields.raw_dates, ['2026-12-31', '2027-06-15']);
});

test('FR-059 analyzeDocument: liga análise à mensagem e gera alertas', async () => {
  writeUpload('contrato-a.txt', 'Prazo de entrega: 2026-12-31\nMulta de 2% por atraso');
  const messageId = newMessage();
  const attachment = attachTo(messageId, 'contrato-a.txt');

  const report = await analysis.analyzeDocument({
    db,
    domainId: DOMAIN_ID,
    messageId,
    contractId,
    attachmentPath: attachment.path,
    filename: attachment.original_name,
  });
  assert.strictEqual(report.status, 'completed');
  assert.strictEqual(report.message_id, messageId);
  const extracted = JSON.parse(report.extracted_json);
  assert.strictEqual(extracted.prazos.length, 1);

  const alerts = db.all(
    "SELECT * FROM extracted_alerts WHERE contract_id = ? AND source_kind = 'document_analysis'",
    [contractId]
  );
  assert.strictEqual(alerts.length, 1);
  assert.strictEqual(alerts[0].due_date, '2026-12-31');
  assert.match(alerts[0].source_id, /^\d+:0$/);
});

test('FR-060 dedup: reprocessar o mesmo anexo atualiza, nunca duplica', async () => {
  writeUpload('contrato-b.txt', 'Prazo de entrega: 2027-01-31');
  const messageId = newMessage();
  const attachment = attachTo(messageId, 'contrato-b.txt');

  await analysis.analyzeDocument({
    db, domainId: DOMAIN_ID, messageId, contractId,
    attachmentPath: attachment.path, filename: attachment.original_name,
  });
  const before = db.get(
    "SELECT COUNT(*) AS c FROM extracted_alerts WHERE contract_id = ? AND source_kind = 'document_analysis'",
    [contractId]
  ).c;

  // retry reaproveita o texto do anexo e deve manter a linha existente
  const report = await analysis.retryAnalysis({
    db, domainId: DOMAIN_ID, analysisId: analysis.getAnalysis(db, messageId).id,
  });
  assert.strictEqual(report.status, 'completed');
  assert.strictEqual(report.attempts, 2);
  const after = db.get(
    "SELECT COUNT(*) AS c FROM extracted_alerts WHERE contract_id = ? AND source_kind = 'document_analysis'",
    [contractId]
  ).c;
  assert.strictEqual(after, before, 'reprocessamento não duplica alertas');
  const updated = db.get(
    "SELECT due_date FROM extracted_alerts WHERE contract_id = ? AND source_kind = 'document_analysis' AND source_id LIKE '%:0'",
    [contractId]
  );
  assert.ok(updated, 'linha de origem revisada permanece');
});

test('FR-061 falha não bloqueia mensagem e retry manual recupera', async () => {
  const messageId = newMessage();
  // anexo inexistente no disco: extrator falha sem remover a mensagem
  const attachment = attachTo(messageId, 'inexistente.txt');

  const failed = await analysis.analyzeDocument({
    db, domainId: DOMAIN_ID, messageId, contractId,
    attachmentPath: attachment.path, filename: attachment.original_name,
  });
  assert.strictEqual(failed.status, 'failed');
  assert.match(failed.error, /attachment_missing|ENOENT|no such file/i);
  assert.ok(
    db.get('SELECT 1 AS ok FROM chat_messages WHERE id = ?', [messageId]),
    'mensagem intacta após falha de análise'
  );

  // retry manual: grava o arquivo e reaponta o anexo
  writeUpload('recuperado.txt', 'Prazo final: 2026-11-30');
  db.run('UPDATE attachments SET path = ?, original_name = ? WHERE id = ?', [
    'uploads/recuperado.txt', 'recuperado.txt', attachment.id,
  ]);
  const recovered = await analysis.retryAnalysis({
    db, domainId: DOMAIN_ID, analysisId: failed.id,
  });
  assert.strictEqual(recovered.status, 'completed');
  assert.strictEqual(recovered.attempts, 2);
});

test('FR-061 withTimeout: rejeita work lento', async () => {
  await assert.rejects(
    analysis.withTimeout(() => new Promise((resolve) => setTimeout(resolve, 50)), 5),
    /timeout/i
  );
});
