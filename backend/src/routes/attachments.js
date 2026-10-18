'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole, scopeDomain } = require('../middleware/auth');
const { getDomainDb } = require('../config/database');
const { saveToUploads } = require('../middleware/upload');
const { code } = require('../config/enums');

// AD-005 (FR-036): evidence (00005 conclusion photo) stays the default;
// documentation is the new opt-in category for how-to files.
const CATEGORIES = ['evidence', 'documentation'];

function getTaskOr404(db, id) {
  return db.get('SELECT * FROM tasks WHERE id = ?', [Number(id)]) || null;
}

// FR-015: prestador só nas próprias; alheia → 404.
function canSee(user, task) {
  if (user.role === 'prestador') return task.assignee_id === user.id;
  return true;
}

// fase 5: mesmo contrato de erro das rotas de tarefa — { error, code? }.
function errorPayload(error) {
  return error.code ? { error: error.message, code: error.code } : { error: error.message };
}

function decorate(db, row) {
  const user = db.get('SELECT name FROM users WHERE id = ?', [row.uploaded_by]);
  return { ...row, uploaded_by_name: user ? user.name : null };
}

// POST /api/v2/tasks/:id/attachments — FR-023: disk bytes, reference only.
function uploadAttachment(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const task = getTaskOr404(db, req.params.id);
    if (!task || !canSee(req.user, task)) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const body = req.body || {};
    // AD-005: categoria desconhecida → 400 antes de disco ou banco.
    const category =
      body.category === undefined || body.category === null || body.category === ''
        ? 'evidence'
        : body.category;
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: `category must be one of ${CATEGORIES.join(', ')}`,
        code: 'TASK_ATTACHMENT_CATEGORY_INVALID',
      });
    }
    // AD-005 stage gate (FR-036): prestador não anexa em Concluída; gestor e
    // admin anexam em qualquer estado. Pós canSee, antes de qualquer
    // gravação — a recusa não deixa arquivo em disco nem linha no banco.
    if (req.user.role === 'prestador' && task.status === code('tasks.status', 'Concluída')) {
      return res.status(403).json({
        error: 'Prestador cannot attach files to concluded tasks',
        code: 'TASK_ATTACHMENT_STATUS_FORBIDDEN',
      });
    }
    const kind = body.kind === 'photo' ? 'photo' : 'file';
    const ref = saveToUploads({ filename: body.filename, dataBase64: body.dataBase64 });
    db.run(
      `INSERT INTO attachments(task_id, comment_id, kind, path, original_name, uploaded_by, category)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        body.comment_id ? Number(body.comment_id) : null,
        kind,
        ref,
        body.filename || null,
        req.user.id,
        category,
      ]
    );
    const id = db.get('SELECT MAX(id) AS id FROM attachments WHERE task_id = ?', [task.id]).id;
    const attachment = db.get('SELECT * FROM attachments WHERE id = ?', [id]);
    res.status(201).json({ attachment: decorate(db, attachment) });
  } catch (error) {
    res.status(error.status || 500).json(errorPayload(error));
  }
}

// GET /api/v2/tasks/:id/attachments
function listAttachments(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const task = getTaskOr404(db, req.params.id);
    if (!task || !canSee(req.user, task)) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const rows = db.all('SELECT * FROM attachments WHERE task_id = ? ORDER BY id', [task.id]);
    res.json({ attachments: rows.map((row) => decorate(db, row)) });
  } catch (error) {
    res.status(error.status || 500).json(errorPayload(error));
  }
}

router.use(authenticateToken);
// FR-010 (E003): guarda de escopo ligado também aqui (AD-002).
router.use(scopeDomain());
router.post('/:id/attachments', requireRole('admin', 'gestor', 'prestador'), uploadAttachment);
router.get('/:id/attachments', requireRole('admin', 'gestor', 'prestador'), listAttachments);

router.uploadAttachment = uploadAttachment;
router.listAttachments = listAttachments;

module.exports = router;
