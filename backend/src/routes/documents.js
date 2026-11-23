'use strict';

// 00021 (E019): biblioteca documental do contrato sobre attachments, sem
// tabela nova. Origens: task (evidência), message (chat) e payment (comprovante).
// Toda rota passa por authenticateToken -> scopeDomain -> requireRole e a
// checagem de contrato é repetida antes de qualquer leitura ou escrita.

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole, scopeDomain } = require('../middleware/auth');
const { getDomainDb } = require('../config/database');

const ROLES = ['admin', 'gestor'];
const CATEGORIES = ['evidence', 'documentation', 'chat', 'payment'];

function httpError(status, message, code) {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  return error;
}

function fail(res, error) {
  const status = error.status || 500;
  return res.status(status).json(error.code ? { error: error.message, code: error.code } : { error: error.message });
}

function assertDocumentAccess(db, user, contractId) {
  if (!user || !ROLES.includes(user.role)) {
    throw httpError(403, 'Forbidden', 'DOCUMENT_FORBIDDEN');
  }
  const contract = db.get('SELECT id, name FROM contracts WHERE id = ?', [Number(contractId)]);
  if (!contract) throw httpError(404, 'Contract not found');
  return contract;
}

// A origem é derivada do pai do anexo; nenhuma coluna nova é necessária.
function documentSource(row) {
  if (row.payment_id) return 'payment';
  if (row.message_id) return 'chat';
  return 'task';
}

function attachAnalysis(db, contractId, document) {
  if (document.source !== 'chat' || !document.message_id) return document;
  const analysis = db.get('SELECT * FROM document_analyses WHERE message_id = ?', [document.message_id]);
  document.analysis = analysis
    ? {
        id: analysis.id,
        status: analysis.status,
        extracted: analysis.extracted_json ? JSON.parse(analysis.extracted_json) : null,
        error: analysis.error,
      }
    : null;
  const alerts = db.all(
    `SELECT id, source_kind, source_id, title, due_date, status
       FROM extracted_alerts WHERE contract_id = ? ORDER BY id`,
    [Number(contractId)]
  );
  document.alerts = alerts;
  return document;
}

function parseDocumentFilters(query = {}) {
  const category = query.category === undefined || query.category === '' ? null : String(query.category);
  const source = query.source === undefined || query.source === '' ? null : String(query.source);
  if (category && !CATEGORIES.includes(category)) {
    throw httpError(400, `category must be one of ${CATEGORIES.join(', ')}`, 'DOCUMENT_CATEGORY_INVALID');
  }
  if (source && !['task', 'chat', 'payment'].includes(source)) {
    throw httpError(400, "source must be one of task, chat, payment", 'DOCUMENT_SOURCE_INVALID');
  }
  return { category, source };
}

// Um SELECT sobre attachments com JOINs para os pais; nenhum arquivo é duplicado.
function listDocuments(db, contractId, filters = {}) {
  const rows = db.all(
    `SELECT a.*, t.contract_id AS task_contract, m.contract_id AS message_contract,
            p.contract_id AS payment_contract
       FROM attachments a
       LEFT JOIN tasks t ON t.id = a.task_id
       LEFT JOIN chat_messages m ON m.id = a.message_id
       LEFT JOIN contract_payments p ON p.id = a.payment_id
      WHERE t.contract_id = ? OR m.contract_id = ? OR p.contract_id = ?
      ORDER BY a.id`,
    [Number(contractId), Number(contractId), Number(contractId)]
  );
  return rows
    .map((row) => {
      const document = {
        id: row.id,
        path: row.path,
        original_name: row.original_name,
        kind: row.kind,
        category: row.category,
        source: documentSource(row),
        task_id: row.task_id,
        message_id: row.message_id,
        payment_id: row.payment_id,
        uploaded_by: row.uploaded_by,
        reviewed_by: row.reviewed_by,
        reviewed_at: row.reviewed_at,
        created_at: row.created_at,
      };
      return attachAnalysis(db, contractId, document);
    })
    .filter((document) => (!filters.category || document.category === filters.category)
      && (!filters.source || document.source === filters.source));
}

function getAttachmentForContract(db, contractId, attachmentId) {
  const row = db.get(
    `SELECT a.id, t.contract_id AS task_contract, m.contract_id AS message_contract,
            p.contract_id AS payment_contract
       FROM attachments a
       LEFT JOIN tasks t ON t.id = a.task_id
       LEFT JOIN chat_messages m ON m.id = a.message_id
       LEFT JOIN contract_payments p ON p.id = a.payment_id
      WHERE a.id = ?`,
    [Number(attachmentId)]
  );
  const matches = row && [row.task_contract, row.message_contract, row.payment_contract]
    .some((value) => value === Number(contractId));
  if (!matches) throw httpError(404, 'Document not found');
  return row;
}

function updateCategory(db, contractId, attachmentId, category) {
  getAttachmentForContract(db, contractId, attachmentId);
  if (!CATEGORIES.includes(category)) {
    throw httpError(400, `category must be one of ${CATEGORIES.join(', ')}`, 'DOCUMENT_CATEGORY_INVALID');
  }
  db.run('UPDATE attachments SET category = ? WHERE id = ?', [category, Number(attachmentId)]);
  return db.get('SELECT * FROM attachments WHERE id = ?', [Number(attachmentId)]);
}

function reviewDocument(db, contractId, attachmentId, user) {
  getAttachmentForContract(db, contractId, attachmentId);
  const current = db.get('SELECT reviewed_by, reviewed_at FROM attachments WHERE id = ?', [Number(attachmentId)]);
  if (!current.reviewed_at) {
    db.run('UPDATE attachments SET reviewed_by = ?, reviewed_at = datetime(\'now\') WHERE id = ?', [
      user.id,
      Number(attachmentId),
    ]);
  }
  return db.get('SELECT reviewed_by, reviewed_at FROM attachments WHERE id = ?', [Number(attachmentId)]);
}

router.use(authenticateToken);
router.use(scopeDomain());
router.use(requireRole(...ROLES));

router.get('/:id/documents', (req, res) => {
  try {
    const db = getDomainDb(req.user.domainId);
    assertDocumentAccess(db, req.user, req.params.id);
    const filters = parseDocumentFilters(req.query);
    res.json({ documents: listDocuments(db, req.params.id, filters) });
  } catch (error) {
    fail(res, error);
  }
});

router.patch('/:id/documents/:attachmentId', (req, res) => {
  try {
    const db = getDomainDb(req.user.domainId);
    assertDocumentAccess(db, req.user, req.params.id);
    const updated = updateCategory(db, req.params.id, req.params.attachmentId, (req.body || {}).category);
    res.json({ attachment: updated });
  } catch (error) {
    fail(res, error);
  }
});

router.post('/:id/documents/:attachmentId/review', (req, res) => {
  try {
    const db = getDomainDb(req.user.domainId);
    assertDocumentAccess(db, req.user, req.params.id);
    const review = reviewDocument(db, req.params.id, req.params.attachmentId, req.user);
    res.json(review);
  } catch (error) {
    fail(res, error);
  }
});

module.exports = router;
module.exports.listDocuments = listDocuments;
module.exports.attachAnalysis = attachAnalysis;
module.exports.parseDocumentFilters = parseDocumentFilters;
module.exports.assertDocumentDomain = assertDocumentAccess;
module.exports.updateCategory = updateCategory;
module.exports.reviewDocument = reviewDocument;
