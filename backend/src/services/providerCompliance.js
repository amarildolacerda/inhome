'use strict';

// 00023 (E021/AD-004): serviço único de conformidade. A avaliação é leitura
// pura — nunca desfaz vínculo, tarefa ou histórico quando um documento vence
// depois (FR-087/STF-001). A guarda só é chamada em operação nova.

const { code, label } = require('../config/enums');

const ASO = () => code('provider_documents.document_type', 'ASO');
const PROVIDER_SCOPE = () => code('purpose_document_requirements.applies_to', 'provider');
const WORKER_SCOPE = () => code('purpose_document_requirements.applies_to', 'worker');

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeRequirement(row, source) {
  return {
    id: row.id ?? null,
    purposeId: row.purpose_id ?? null,
    documentType: row.document_type,
    type: label('provider_documents.document_type', row.document_type),
    appliesTo: row.applies_to,
    source,
  };
}

// Domínios que nunca abriram um dossiê seguem o comportamento legado: não há
// checklist para avaliar. Assim que um documento ou item é cadastrado, a
// finalidade sem itens ativos passa a usar o checklist global com ASO (FR-084).
function dossierConfigured(db) {
  const documents = db.get('SELECT COUNT(*) AS c FROM provider_documents').c;
  const requirements = db.get('SELECT COUNT(*) AS c FROM purpose_document_requirements WHERE active = 1').c;
  return documents > 0 || requirements > 0;
}

function resolveChecklist(db, purposeId) {
  const rows = purposeId
    ? db.all(
        'SELECT * FROM purpose_document_requirements WHERE purpose_id = ? AND active = 1 ORDER BY id',
        [Number(purposeId)]
      )
    : [];
  if (rows.length) return rows.map((row) => normalizeRequirement(row, 'purpose'));

  const globalRows = db.all(
    'SELECT * FROM purpose_document_requirements WHERE purpose_id IS NULL AND active = 1 ORDER BY id'
  );
  if (globalRows.length) return globalRows.map((row) => normalizeRequirement(row, 'global'));
  if (!dossierConfigured(db)) return [];

  return [normalizeRequirement({ document_type: ASO(), applies_to: PROVIDER_SCOPE() }, 'global')];
}

function activeWorkers(db, providerId) {
  return db.all(
    'SELECT id, name FROM provider_workers WHERE provider_id = ? AND active = 1 ORDER BY id',
    [Number(providerId)]
  );
}

// Um documento conta somente quando conferido e com vigência igual ou posterior
// a hoje (edge case do spec: vigência hoje conta como vigente).
function findValidDocument(db, { providerId, workerId, documentType, today }) {
  if (workerId === null || workerId === undefined) {
    return db.get(
      `SELECT id, valid_until FROM provider_documents
        WHERE provider_id = ? AND worker_id IS NULL AND document_type = ?
          AND reviewed_at IS NOT NULL AND valid_until >= ?
        ORDER BY valid_until DESC LIMIT 1`,
      [Number(providerId), Number(documentType), today]
    );
  }
  return db.get(
    `SELECT id, valid_until FROM provider_documents
      WHERE provider_id = ? AND worker_id = ? AND document_type = ?
        AND reviewed_at IS NOT NULL AND valid_until >= ?
      ORDER BY valid_until DESC LIMIT 1`,
    [Number(providerId), Number(workerId), Number(documentType), today]
  );
}

function missingItem(item, reason, extra = {}) {
  return {
    documentType: item.documentType,
    type: item.type,
    appliesTo: item.appliesTo === PROVIDER_SCOPE() ? 'provider' : 'worker',
    reason,
    ...extra,
  };
}

function describeMissing(missing) {
  return missing
    .map((item) => {
      const where = item.workerName ? ` (${item.workerName})` : item.appliesTo === 'worker' ? ' (trabalhador)' : '';
      const reason = item.reason === 'expired' ? 'vencido' : item.reason === 'no_active_worker' ? 'sem trabalhador ativo' : 'ausente';
      return `${item.type}${where}: ${reason}`;
    })
    .join('; ');
}

function evaluateProviderCompliance(db, { providerId, purposeId = null, now = todayIso() }) {
  const checklist = resolveChecklist(db, purposeId);
  const missing = [];
  const workers = checklist.some((item) => item.appliesTo === WORKER_SCOPE())
    ? activeWorkers(db, providerId)
    : [];

  for (const item of checklist) {
    if (item.appliesTo === PROVIDER_SCOPE()) {
      if (!findValidDocument(db, { providerId, workerId: null, documentType: item.documentType, today: now })) {
        missing.push(missingItem(item, 'missing'));
      }
      continue;
    }
    if (workers.length === 0) {
      missing.push(missingItem(item, 'no_active_worker'));
      continue;
    }
    for (const worker of workers) {
      if (!findValidDocument(db, {
        providerId,
        workerId: worker.id,
        documentType: item.documentType,
        today: now,
      })) {
        missing.push(missingItem(item, 'missing', { workerId: worker.id, workerName: worker.name }));
      }
    }
  }

  return {
    compliant: missing.length === 0,
    missing,
    checklist,
    providerId: Number(providerId),
    purposeId: purposeId === null || purposeId === undefined ? null : Number(purposeId),
    evaluatedAt: now,
  };
}

function assertProviderCompliant(db, options) {
  const evaluation = evaluateProviderCompliance(db, options);
  if (evaluation.compliant) return evaluation;
  const error = new Error(`Documentação do prestador fora da conformidade: ${describeMissing(evaluation.missing)}`);
  error.status = 400;
  error.code = 'PROVIDER_DOCUMENTS_MISSING';
  error.missing = evaluation.missing;
  throw error;
}

module.exports = {
  resolveChecklist,
  evaluateProviderCompliance,
  assertProviderCompliant,
  activeWorkers,
};
