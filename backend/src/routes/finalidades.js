'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getDomainDb } = require('../config/database');

function httpError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  // fase 5: código estável aditivo — o payload segue { error, code? }.
  if (code) err.code = code;
  return err;
}

// fase 5: emite o code estável junto do texto, quando o erro carrega um.
function errorPayload(error) {
  return error.code ? { error: error.message, code: error.code } : { error: error.message };
}

function createFinalidade(db, name) {
  if (!name || !String(name).trim()) throw httpError(400, 'name is required');
  const trimmed = String(name).trim();
  if (db.get('SELECT id FROM purposes WHERE name = ?', [trimmed])) {
    throw httpError(409, 'Purpose already exists', 'PURPOSE_ALREADY_EXISTS');
  }
  db.run('INSERT INTO purposes(name) VALUES (?)', [trimmed]);
  return db.get('SELECT * FROM purposes WHERE name = ?', [trimmed]);
}

// FR-005: admin adds a finalidade to the domain dictionary.
function create(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const finalidade = createFinalidade(db, (req.body || {}).name);
    res.status(201).json({ finalidade });
  } catch (error) {
    res.status(error.status || 500).json(errorPayload(error));
  }
}

// FR-005: dictionary listing used by the contract form.
function listFinalidade(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const includeRetired = req.query.showRetired === '1' || req.query.showRetired === 'true';
    const rows = includeRetired
      ? db.all('SELECT id, name, active, created_at, updated_at FROM purposes ORDER BY name')
      : db.all('SELECT id, name, active, created_at, updated_at FROM purposes WHERE active = 1 ORDER BY name');
    res.json({ finalidades: rows });
  } catch (error) {
    res.status(error.status || 500).json(errorPayload(error));
  }
}

// FR-005: editar — rename.
function update(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const id = Number(req.params.id);
    const target = db.get('SELECT id FROM purposes WHERE id = ?', [id]);
    if (!target) return res.status(404).json({ error: 'Purpose not found', code: 'PURPOSE_NOT_FOUND' });
    const name = String((req.body || {}).name || '').trim();
    if (!name) return res.status(400).json({ error: 'name is required' });
    const clash = db.get('SELECT id FROM purposes WHERE name = ? AND id != ?', [name, id]);
    if (clash) {
      return res.status(409).json({ error: 'Purpose already exists', code: 'PURPOSE_ALREADY_EXISTS' });
    }
    db.run("UPDATE purposes SET name = ?, updated_at = datetime('now') WHERE id = ?", [name, id]);
    res.json({ finalidade: db.get('SELECT * FROM purposes WHERE id = ?', [id]) });
  } catch (error) {
    res.status(error.status || 500).json(errorPayload(error));
  }
}

// FR-005: retirar — soft-delete. Contracts that already reference the
// finalidade keep their reference untouched (spec edge case).
function remove(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const id = Number(req.params.id);
    const target = db.get('SELECT id FROM purposes WHERE id = ?', [id]);
    if (!target) return res.status(404).json({ error: 'Purpose not found', code: 'PURPOSE_NOT_FOUND' });
    db.run("UPDATE purposes SET active = 0, updated_at = datetime('now') WHERE id = ?", [id]);
    res.json({ message: 'Finalidade retired' });
  } catch (error) {
    res.status(error.status || 500).json(errorPayload(error));
  }
}

router.use(authenticateToken);
router.get('/', requireRole('admin', 'gestor'), listFinalidade);
router.post('/', requireRole('admin'), create);
router.put('/:id', requireRole('admin'), update);
router.delete('/:id', requireRole('admin'), remove);

router.create = create;
router.listFinalidade = listFinalidade;

module.exports = router;
