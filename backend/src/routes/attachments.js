'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getDomainDb } = require('../config/database');
const { saveToUploads } = require('../middleware/upload');

function getTaskOr404(db, id) {
  return db.get('SELECT * FROM tasks WHERE id = ?', [Number(id)]) || null;
}

// FR-015: prestador só nas próprias; alheia → 404.
function canSee(user, task) {
  if (user.role === 'prestador') return task.assignee_id === user.id;
  return true;
}

function decorate(db, row) {
  const user = db.get('SELECT name FROM users WHERE id = ?', [row.uploaded_by]);
  return { ...row, uploaded_by_name: user ? user.name : null };
}

// POST /api/tasks/:id/attachments — FR-023: disk bytes, reference only.
function uploadAttachment(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const task = getTaskOr404(db, req.params.id);
    if (!task || !canSee(req.user, task)) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const body = req.body || {};
    const kind = body.kind === 'photo' ? 'photo' : 'file';
    const ref = saveToUploads({ filename: body.filename, dataBase64: body.dataBase64 });
    db.run(
      `INSERT INTO attachments(task_id, comment_id, kind, path, original_name, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        body.comment_id ? Number(body.comment_id) : null,
        kind,
        ref,
        body.filename || null,
        req.user.id,
      ]
    );
    const id = db.get('SELECT MAX(id) AS id FROM attachments WHERE task_id = ?', [task.id]).id;
    const attachment = db.get('SELECT * FROM attachments WHERE id = ?', [id]);
    res.status(201).json({ attachment: decorate(db, attachment) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// GET /api/tasks/:id/attachments
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
    res.status(error.status || 500).json({ error: error.message });
  }
}

router.use(authenticateToken);
router.post('/:id/attachments', requireRole('admin', 'gestor', 'prestador'), uploadAttachment);
router.get('/:id/attachments', requireRole('admin', 'gestor', 'prestador'), listAttachments);

router.uploadAttachment = uploadAttachment;
router.listAttachments = listAttachments;

module.exports = router;
