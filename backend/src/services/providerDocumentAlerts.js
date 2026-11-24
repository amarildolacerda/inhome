'use strict';

// 00023 (E021/AD-002): alertas de vencimento no mesmo painel do E016. Dedup
// tripla de `extracted_alerts`; `source_id = <documentId>:<window>` e limpeza
// das linhas que saíram do conjunto corrente (regularização, desvinculamento ou
// contrato encerrado — FR-089/STF-002).

const path = require('node:path');
const { code, label } = require('../config/enums');
const { readWindows, daysUntil } = require('./alerts');

const SOURCE_KIND = 'provider_document';

function domainIdFromDb(db) {
  const id = Number(path.basename(String(db.filePath || ''), '.db'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function documentTitle(documentType, workerName, validUntil) {
  const type = label('provider_documents.document_type', documentType);
  const owner = workerName ? ` de ${workerName}` : ' do prestador';
  return `Documento${owner} ${type} vence em ${validUntil}`;
}

function syncProviderDocumentAlerts(db, { windows: explicitWindows } = {}) {
  if (!db) throw new Error('db is required');
  const domainId = domainIdFromDb(db);
  let windows = explicitWindows;
  if (!windows && domainId) {
    const platform = require('../config/database').getPlatformDb();
    windows = readWindows(platform.get('SELECT alert_windows FROM domains WHERE id = ?', [domainId])?.alert_windows);
  }
  if (!windows || windows.length === 0) windows = readWindows(null);

  const vigente = code('contracts.status', 'vigente');
  const rows = db.all(
    `SELECT d.id AS document_id, d.document_type, d.valid_until, d.provider_id,
            c.id AS contract_id, w.name AS worker_name
       FROM provider_documents d
       JOIN contract_providers cp ON cp.user_id = d.provider_id
       JOIN contracts c ON c.id = cp.contract_id AND c.status = ?
       LEFT JOIN provider_workers w ON w.id = d.worker_id
      WHERE d.reviewed_at IS NOT NULL AND d.valid_until IS NOT NULL
      ORDER BY d.id`,
    [vigente]
  );

  const desired = new Map();
  let skipped = 0;
  for (const document of rows) {
    const days = daysUntil(document.valid_until);
    if (days < 0) {
      skipped += 1;
      continue;
    }
    const applicable = windows.filter((window) => window >= days);
    if (applicable.length === 0) {
      skipped += 1;
      continue;
    }
    const window = Math.min(...applicable);
    const sourceId = `${document.document_id}:${window}`;
    desired.set(`${document.contract_id}|${sourceId}`, {
      contractId: document.contract_id,
      sourceId,
      title: documentTitle(document.document_type, document.worker_name, document.valid_until),
      dueDate: document.valid_until,
    });
  }

  const existing = db.all(
    'SELECT id, contract_id, source_id FROM extracted_alerts WHERE source_kind = ?',
    [SOURCE_KIND]
  );
  const byKey = new Map(existing.map((row) => [`${row.contract_id}|${row.source_id}`, row]));

  let created = 0;
  let updated = 0;
  let removed = 0;
  for (const [key, alert] of desired) {
    const current = byKey.get(key);
    if (!current) {
      db.run(
        `INSERT INTO extracted_alerts(contract_id, source_kind, source_id, title, due_date, status)
         VALUES (?, ?, ?, ?, ?, 'open')`,
        [alert.contractId, SOURCE_KIND, alert.sourceId, alert.title, alert.dueDate]
      );
      created += 1;
      continue;
    }
    db.run(
      "UPDATE extracted_alerts SET title = ?, due_date = ?, updated_at = datetime('now') WHERE id = ?",
      [alert.title, alert.dueDate, current.id]
    );
    updated += 1;
    byKey.delete(key);
  }
  for (const stale of byKey.values()) {
    db.run('DELETE FROM extracted_alerts WHERE id = ?', [stale.id]);
    removed += 1;
  }

  return { created, updated, removed, skipped, scanned: rows.length, desired: desired.size };
}

module.exports = { syncProviderDocumentAlerts, SOURCE_KIND };
