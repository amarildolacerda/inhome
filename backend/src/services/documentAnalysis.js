'use strict';

// 00016 (E016, FR-059/060/061): extrator local determinístico de documentos.
// Nenhum dado contratual sai do domínio: o arquivo é lido do disco e os
// campos vêm de regras fixas. A análise roda fora do caminho da requisição;
// falha marca status e mantém mensagem/anexo intactos, com retry manual.

const fs = require('fs');
const path = require('path');
const { UPLOAD_DIR } = require('../middleware/upload');

const ANALYSIS_TIMEOUT_MS = 5000;
const TEXT_EXT = new Set(['.txt', '.csv', '.md']);
const SUPPORTED_EXT = new Set([
  '.txt', '.csv', '.md', '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
]);

function withTimeout(work, ms = ANALYSIS_TIMEOUT_MS) {
  return Promise.race([
    Promise.resolve().then(work),
    new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error('analysis timeout')), ms);
      timer.unref?.();
    }),
  ]);
}

function toIsoDate(raw) {
  const value = String(raw || '').trim();
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return value;
  const pt = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (pt) return `${pt[3]}-${pt[2]}-${pt[1]}`;
  return null;
}

// Regras fixas, sem IA externa: uma linha por campo, primeiro texto após a
// etiqueta. Datas viram itens de prazo com source_id estável por índice.
function extractFields(text) {
  const result = { prazos: [], multas: [], seguros: [], riscos: [], locais: [], raw_dates: [] };
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const datePattern = /\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/g;

  for (const line of lines) {
    for (const match of line.match(datePattern) || []) {
      const iso = toIsoDate(match);
      if (iso && !result.raw_dates.includes(iso)) result.raw_dates.push(iso);
    }
    const dated = (line.match(datePattern) || [])[0];
    if (/\b(prazo|vencimento|data)\b/i.test(line) && dated) {
      result.prazos.push({ label: line.slice(0, 160), date: toIsoDate(dated) });
    }
    if (/\bmulta\b/i.test(line)) result.multas.push(line.slice(0, 240));
    if (/\bseguro\b/i.test(line)) result.seguros.push(line.slice(0, 240));
    if (/\brisco\b/i.test(line)) result.riscos.push(line.slice(0, 240));
    if (/\b(local|execução|execucao)\b/i.test(line)) result.locais.push(line.slice(0, 240));
  }
  return result;
}

function resolveAttachmentPath(ref) {
  if (!ref) return null;
  const base = String(ref).replace(/\\/g, '/');
  const name = path.posix.basename(base);
  return path.isAbsolute(base) ? base : path.join(UPLOAD_DIR, name);
}

function readExtractableText(ref, filename) {
  const ext = path.extname(String(filename || ref || '')).toLowerCase();
  if (!SUPPORTED_EXT.has(ext)) throw new Error('unsupported_file_type');
  const absolute = resolveAttachmentPath(ref);
  if (!absolute || !fs.existsSync(absolute)) throw new Error('attachment_missing');
  if (TEXT_EXT.has(ext)) return fs.readFileSync(absolute, 'utf8');
  // PDF/DOCX/imagem: varredura determinística de texto ASCII imprimível.
  // Arquivos sem texto legível ficam como falha de extração (FR-061).
  const latin = fs.readFileSync(absolute).toString('latin1');
  const runs = latin.match(/[\x20-\x7E]{6,}/g) || [];
  const text = runs.join('\n');
  if (text.trim().length < 8) throw new Error('no_text_extracted');
  return text;
}

function getAnalysis(db, messageId) {
  return db.get('SELECT * FROM document_analyses WHERE message_id = ?', [Number(messageId)]) || null;
}

function upsertExtractedAlert(db, { contractId, sourceKind, sourceId, title, dueDate }) {
  db.run(
    `INSERT INTO extracted_alerts(contract_id, source_kind, source_id, title, due_date)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(contract_id, source_kind, source_id)
     DO UPDATE SET title = excluded.title, due_date = excluded.due_date,
                   status = 'open', updated_at = datetime('now')`,
    [Number(contractId), sourceKind, String(sourceId), String(title), dueDate || null]
  );
  return db.get(
    'SELECT * FROM extracted_alerts WHERE contract_id = ? AND source_kind = ? AND source_id = ?',
    [Number(contractId), sourceKind, String(sourceId)]
  );
}

function emitAnalysis(domainId, analysis) {
  const { emitDomainEvent } = require('./events');
  emitDomainEvent('chat_analysis_updated', domainId, {
    contractId: analysis.contract_id,
    messageId: analysis.message_id,
    analysis: { id: analysis.id, status: analysis.status, extracted: analysis.extracted_json },
  });
}

async function finish(db, domainId, analysisId, status, fields, error) {
  db.run(
    `UPDATE document_analyses SET status = ?, extracted_json = ?, error = ?, finished_at = datetime('now'),
     updated_at = datetime('now') WHERE id = ?`,
    [status, fields ? JSON.stringify(fields) : null, error || null, Number(analysisId)]
  );
  const row = db.get('SELECT * FROM document_analyses WHERE id = ?', [Number(analysisId)]);
  emitAnalysis(domainId, row);
  return row;
}

async function markFailed(db, domainId, analysisId, reason) {
  return finish(db, domainId, analysisId, 'failed', null, String(reason || 'analysis_failed'));
}

// Cria (ou reaproveita, no retry) a análise de um anexo de mensagem.
async function analyzeDocument({ db, domainId, messageId, contractId, attachmentPath, filename }) {
  const existing = getAnalysis(db, messageId);
  if (existing && existing.status === 'pending') return existing;
  if (existing) {
    db.run("UPDATE document_analyses SET status = 'pending', error = NULL, attempts = attempts + 1, started_at = datetime('now'), finished_at = NULL, updated_at = datetime('now') WHERE id = ?", [existing.id]);
  } else {
    db.run(
      `INSERT INTO document_analyses(message_id, contract_id, status, attempts, started_at)
       VALUES (?, ?, 'pending', 1, datetime('now'))`,
      [Number(messageId), Number(contractId)]
    );
  }
  const analysis = getAnalysis(db, messageId);
  try {
    const text = await withTimeout(() => readExtractableText(attachmentPath, filename));
    const fields = extractFields(text);
    db.transaction((tx) => {
      fields.prazos.forEach((prazo, index) => {
        upsertExtractedAlert(tx, {
          contractId,
          sourceKind: 'document_analysis',
          sourceId: `${analysis.id}:${index}`,
          title: prazo.label,
          dueDate: prazo.date,
        });
      });
    });
    return finish(db, domainId, analysis.id, 'completed', fields, null);
  } catch (error) {
    return markFailed(db, domainId, analysis.id, error.message);
  }
}

async function retryAnalysis({ db, domainId, analysisId }) {
  const analysis = db.get('SELECT * FROM document_analyses WHERE id = ?', [Number(analysisId)]);
  if (!analysis) return null;
  const attachment = db.get(
    "SELECT path, original_name FROM attachments WHERE message_id = ? AND category = 'chat' ORDER BY id LIMIT 1",
    [analysis.message_id]
  );
  if (!attachment) return markFailed(db, domainId, analysis.id, 'attachment_missing');
  return analyzeDocument({
    db,
    domainId,
    messageId: analysis.message_id,
    contractId: analysis.contract_id,
    attachmentPath: attachment.path,
    filename: attachment.original_name,
  });
}

module.exports = {
  ANALYSIS_TIMEOUT_MS,
  withTimeout,
  extractFields,
  upsertExtractedAlert,
  analyzeDocument,
  markFailed,
  retryAnalysis,
  getAnalysis,
  resolveAttachmentPath,
};
