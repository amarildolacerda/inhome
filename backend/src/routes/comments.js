'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getDomainDb } = require('../config/database');

function getTaskOr404(db, id) {
  const row = db.get('SELECT * FROM tasks WHERE id = ?', [Number(id)]);
  if (!row) return null;
  return row;
}

// FR-015: prestador só nas próprias; alheia → 404.
function canSee(user, task) {
  if (user.role === 'prestador') return task.assignee_id === user.id;
  return true;
}

function decorate(db, row) {
  const user = db.get('SELECT name, email FROM users WHERE id = ?', [row.user_id]);
  return {
    ...row,
    user_name: user ? user.name : null,
    user_email: user ? user.email : null,
  };
}

// POST /api/tasks/:id/comments
function addComment(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const task = getTaskOr404(db, req.params.id);
    if (!task || !canSee(req.user, task)) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const body = (req.body || {}).body;
    if (!body || !String(body).trim()) {
      return res.status(400).json({ error: 'body is required' });
    }
    db.run('INSERT INTO comments(task_id, user_id, body) VALUES (?, ?, ?)', [
      task.id,
      req.user.id,
      String(body).trim(),
    ]);
    const id = db.get('SELECT MAX(id) AS id FROM comments WHERE task_id = ?', [task.id]).id;
    const comment = db.get('SELECT * FROM comments WHERE id = ?', [id]);
    res.status(201).json({ comment: decorate(db, comment) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// GET /api/tasks/:id/comments
function listComments(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const task = getTaskOr404(db, req.params.id);
    if (!task || !canSee(req.user, task)) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const rows = db.all('SELECT * FROM comments WHERE task_id = ? ORDER BY id', [task.id]);
    res.json({ comments: rows.map((row) => decorate(db, row)) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

router.use(authenticateToken);
router.post('/:id/comments', requireRole('admin', 'gestor', 'prestador'), addComment);
router.get('/:id/comments', requireRole('admin', 'gestor', 'prestador'), listComments);

router.addComment = addComment;
router.listComments = listComments;

module.exports = router;
