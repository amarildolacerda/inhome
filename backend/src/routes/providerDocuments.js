'use strict';

// 00023 (E021): dossiê documental do prestador. Toda rota passa por
// authenticateToken → scopeDomain → requireRole; o prestador só lê o próprio
// registro. Arquivos seguem E003, com validação antes de qualquer gravação.

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole, scopeDomain } = require('../middleware/auth');
const { getDomainDb } = require('../config/database');
const { code, label } = require('../config/enums');
const { saveToUploads, decodeAndValidate } = require('../middleware/upload');
const { evaluateProviderCompliance } = require('../services/providerCompliance');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WRITE_ROLES = ['admin', 'gestor'];
const READ_ROLES = ['admin', 'gestor', 'prestador'];

function httpError(status, message, errorCode) {
  const error = new Error(message);
  error.status = status;
  if (errorCode) error.code = errorCode;
  return error;
}

function fail(res, error) {
  const payload = { error: error.message };
  if (error.code) payload.code = error.code;
  if (error.missing) payload.missing = error.missing;
  return res.status(error.status || 500).json(payload);
}

function validDate(value) {
  return typeof value === 'string' && DATE_RE.test(value) && !Number.isNaN(Date.parse(value));
}

function getProvider(db, id) {
  const row = db.get('SELECT id, name, email, role FROM users WHERE id = ?', [Number(id)]);
  if (!row || row.role !== 'prestador') throw httpError(404, 'Prestador not found', 'PROVIDER_NOT_FOUND');
  return row;
}

function assertOwnScope(req, providerId) {
  if (req.user.role === 'prestador' && Number(providerId) !== Number(req.user.id)) {
    throw httpError(403, 'Forbidden', 'PROVIDER_SCOPE_FORBIDDEN');
  }
}

function decorateWorker(row) {
  return {
    id: row.id,
    providerId: row.provider_id,
    name: row.name,
    role: row.role,
    active: Boolean(row.active),
    createdAt: row.created_at,
  };
}

function decorateDocument(row) {
  return {
    id: row.id,
    providerId: row.provider_id,
    workerId: row.worker_id ?? null,
    type: label('provider_documents.document_type', row.document_type),
    documentType: row.document_type,
    number: row.number,
    path: row.path,
    validUntil: row.valid_until,
    reviewedBy: row.reviewed_by ?? null,
    reviewedAt: row.reviewed_at ?? null,
    createdAt: row.created_at,
  };
}

function decorateRequirement(row) {
  return {
    id: row.id,
    purposeId: row.purpose_id ?? null,
    type: label('provider_documents.document_type', row.document_type),
    documentType: row.document_type,
    appliesTo: row.applies_to,
    scope: label('purpose_document_requirements.applies_to', row.applies_to),
    active: Boolean(row.active),
  };
}

function getWorkerForProvider(db, providerId, workerId) {
  const row = db.get('SELECT * FROM provider_workers WHERE id = ? AND provider_id = ?', [
    Number(workerId),
    Number(providerId),
  ]);
  if (!row) throw httpError(404, 'Worker not found', 'PROVIDER_WORKER_NOT_FOUND');
  return row;
}

function getDocumentForProvider(db, providerId, documentId) {
  const row = db.get('SELECT * FROM provider_documents WHERE id = ? AND provider_id = ?', [
    Number(documentId),
    Number(providerId),
  ]);
  if (!row) throw httpError(404, 'Document not found', 'PROVIDER_DOCUMENT_NOT_FOUND');
  return row;
}

function createWorker(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    getProvider(db, req.params.id);
    assertOwnScope(req, req.params.id);
    const body = req.body || {};
    if (!body.name || !String(body.name).trim() || !body.role || !String(body.role).trim()) {
      throw httpError(400, 'name and role are required', 'PROVIDER_WORKER_INVALID');
    }
    db.run('INSERT INTO provider_workers(provider_id, name, role) VALUES (?, ?, ?)', [
      Number(req.params.id),
      String(body.name).trim().slice(0, 120),
      String(body.role).trim().slice(0, 120),
    ]);
    const row = db.get('SELECT * FROM provider_workers WHERE id = ?', [
      db.get('SELECT MAX(id) AS id FROM provider_workers').id,
    ]);
    res.status(201).json({ worker: decorateWorker(row) });
  } catch (error) {
    fail(res, error);
  }
}

function updateWorker(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    getProvider(db, req.params.id);
    const worker = getWorkerForProvider(db, req.params.id, req.params.workerId);
    const active = (req.body || {}).active;
    if (typeof active !== 'boolean') {
      throw httpError(400, 'active must be boolean', 'PROVIDER_WORKER_INVALID');
    }
    db.run("UPDATE provider_workers SET active = ?, updated_at = datetime('now') WHERE id = ?", [
      active ? 1 : 0,
      worker.id,
    ]);
    res.json({ worker: decorateWorker(getWorkerForProvider(db, req.params.id, worker.id)) });
  } catch (error) {
    fail(res, error);
  }
}

function createDocument(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    getProvider(db, req.params.id);
    const body = req.body || {};
    const documentType = code('provider_documents.document_type', body.type);
    if (!body.number || !String(body.number).trim()) {
      throw httpError(400, 'number is required', 'PROVIDER_DOCUMENT_INVALID');
    }
    if (!validDate(body.validUntil)) {
      throw httpError(400, 'validUntil must be YYYY-MM-DD', 'PROVIDER_DOCUMENT_INVALID');
    }
    let workerId = null;
    if (body.workerId !== undefined && body.workerId !== null) {
      workerId = getWorkerForProvider(db, req.params.id, body.workerId).id;
    }
    // FR-091: validação antes de saveToUploads —(payload recusado não toca o disco).
    decodeAndValidate({ filename: body.fileName, dataBase64: body.dataBase64 });
    const filePath = saveToUploads({ filename: body.fileName, dataBase64: body.dataBase64 });
    db.run(
      `INSERT INTO provider_documents(provider_id, worker_id, document_type, number, path, valid_until)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [Number(req.params.id), workerId, documentType, String(body.number).trim().slice(0, 120), filePath, body.validUntil]
    );
    const row = db.get('SELECT * FROM provider_documents WHERE id = ?', [
      db.get('SELECT MAX(id) AS id FROM provider_documents').id,
    ]);
    res.status(201).json({ document: decorateDocument(row) });
  } catch (error) {
    fail(res, error);
  }
}

function updateDocument(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    getProvider(db, req.params.id);
    const current = getDocumentForProvider(db, req.params.id, req.params.docId);
    const body = req.body || {};
    const fields = [];
    const params = [];
    if (body.number !== undefined) {
      if (!String(body.number).trim()) throw httpError(400, 'number cannot be empty', 'PROVIDER_DOCUMENT_INVALID');
      fields.push('number = ?');
      params.push(String(body.number).trim().slice(0, 120));
    }
    if (body.validUntil !== undefined) {
      if (!validDate(body.validUntil)) {
        throw httpError(400, 'validUntil must be YYYY-MM-DD', 'PROVIDER_DOCUMENT_INVALID');
      }
      fields.push('valid_until = ?');
      params.push(body.validUntil);
    }
    // A conferência preserva autor e data da primeira vez (FR-082).
    if (body.review !== undefined && body.review !== null && !current.reviewed_at) {
      fields.push('reviewed_by = ?', "reviewed_at = datetime('now')");
      params.push(req.user.id);
    }
    if (fields.length) {
      fields.push("updated_at = datetime('now')");
      params.push(current.id);
      db.run(`UPDATE provider_documents SET ${fields.join(', ')} WHERE id = ?`, params);
    }
    res.json({ document: decorateDocument(getDocumentForProvider(db, req.params.id, current.id)) });
  } catch (error) {
    fail(res, error);
  }
}

function deleteDocument(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    getProvider(db, req.params.id);
    const current = getDocumentForProvider(db, req.params.id, req.params.docId);
    db.run('DELETE FROM provider_documents WHERE id = ?', [current.id]);
    db.run(
      "DELETE FROM extracted_alerts WHERE source_kind = 'provider_document' AND source_id LIKE ?",
      [`${current.id}:%`]
    );
    res.json({ removed: true });
  } catch (error) {
    fail(res, error);
  }
}

function listRequirements(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const rows = db.all('SELECT * FROM purpose_document_requirements ORDER BY id');
    res.json({ requirements: rows.map(decorateRequirement) });
  } catch (error) {
    fail(res, error);
  }
}

function createRequirement(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const body = req.body || {};
    const documentType = code('provider_documents.document_type', body.type);
    const appliesTo = code('purpose_document_requirements.applies_to', body.appliesTo);
    let purposeId = null;
    if (body.purposeId !== undefined && body.purposeId !== null) {
      purposeId = Number(body.purposeId);
      if (!db.get('SELECT id FROM purposes WHERE id = ?', [purposeId])) {
        throw httpError(400, 'purposeId does not exist', 'PURPOSE_NOT_FOUND');
      }
    }
    db.run(
      'INSERT INTO purpose_document_requirements(purpose_id, document_type, applies_to) VALUES (?, ?, ?)',
      [purposeId, documentType, appliesTo]
    );
    const row = db.get('SELECT * FROM purpose_document_requirements WHERE id = ?', [
      db.get('SELECT MAX(id) AS id FROM purpose_document_requirements').id,
    ]);
    res.status(201).json({ requirement: decorateRequirement(row) });
  } catch (error) {
    fail(res, error);
  }
}

function deleteRequirement(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const row = db.get('SELECT id FROM purpose_document_requirements WHERE id = ?', [Number(req.params.reqId)]);
    if (!row) throw httpError(404, 'Requirement not found', 'PROVIDER_REQUIREMENT_NOT_FOUND');
    db.run('DELETE FROM purpose_document_requirements WHERE id = ?', [row.id]);
    res.json({ removed: true });
  } catch (error) {
    fail(res, error);
  }
}

function listDossier(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    getProvider(db, req.params.id);
    assertOwnScope(req, req.params.id);
    const workers = db
      .all('SELECT * FROM provider_workers WHERE provider_id = ? ORDER BY id', [Number(req.params.id)])
      .map(decorateWorker);
    const documents = db
      .all('SELECT * FROM provider_documents WHERE provider_id = ? ORDER BY id', [Number(req.params.id)])
      .map(decorateDocument);
    const purposeId = req.query.purposeId === undefined || req.query.purposeId === ''
      ? null
      : Number(req.query.purposeId);
    const compliance = evaluateProviderCompliance(db, { providerId: req.params.id, purposeId });
    res.json({ workers, documents, compliance });
  } catch (error) {
    fail(res, error);
  }
}

router.use(authenticateToken);
router.use(scopeDomain());

router.get('/requirements', requireRole(...READ_ROLES), listRequirements);
router.post('/requirements', requireRole(...WRITE_ROLES), createRequirement);
router.delete('/requirements/:reqId', requireRole(...WRITE_ROLES), deleteRequirement);

router.get('/:id/dossier', requireRole(...READ_ROLES), listDossier);
router.post('/:id/workers', requireRole(...WRITE_ROLES), createWorker);
router.patch('/:id/workers/:workerId', requireRole(...WRITE_ROLES), updateWorker);
router.post('/:id/documents', requireRole(...WRITE_ROLES), createDocument);
router.patch('/:id/documents/:docId', requireRole(...WRITE_ROLES), updateDocument);
router.delete('/:id/documents/:docId', requireRole(...WRITE_ROLES), deleteDocument);

router.listDossier = listDossier;
router.createWorker = createWorker;
router.createDocument = createDocument;
router.updateDocument = updateDocument;
router.createRequirement = createRequirement;

module.exports = router;
