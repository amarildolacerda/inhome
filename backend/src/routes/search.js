'use strict';

const express = require('express');
const router = express.Router();
const Contract = require('../models/Contract');
const Task = require('../models/Task');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getDomainDb } = require('../config/database');

// FR-016: combined filters — contrato, status, prioridade, prestador,
// finalidade, prazo. Prestador searches stay inside their own scope.
function likeParam(value) {
  if (value === undefined || value === null || value === '') return null;
  return `%${String(value).replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
}

function paging(query) {
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
  const offset = Math.max(Number(query.offset) || 0, 0);
  return { limit, offset };
}

function searchContracts(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const { limit, offset } = paging(req.query);

    const where = [];
    const params = [];
    const q = likeParam(req.query.q);
    if (q) {
      where.push("(c.name LIKE ? ESCAPE '\\' OR c.object LIKE ? ESCAPE '\\')");
      params.push(q, q);
    }
    if (req.query.status) {
      where.push('c.status = ?');
      params.push(req.query.status);
    }
    if (req.query.finalidade_id) {
      where.push('c.finalidade_id = ?');
      params.push(Number(req.query.finalidade_id));
    }
    let base = 'FROM contracts c';
    if (req.query.prestador_id) {
      base += ' JOIN contract_prestadores cp ON cp.contract_id = c.id AND cp.user_id = ?';
      params.unshift(Number(req.query.prestador_id));
    }
    if (req.user.role === 'prestador') {
      base += ' JOIN contract_prestadores cp2 ON cp2.contract_id = c.id AND cp2.user_id = ?';
      params.unshift(req.user.id);
    }
    const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    const total = db.get(`SELECT COUNT(*) AS c ${base}${whereSql}`, params).c;
    const rows = db.all(
      `SELECT c.* ${base}${whereSql} ORDER BY c.id LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({ contracts: rows.map((row) => Contract.decorate(db, row)), total, limit, offset });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

function searchTasks(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const { limit, offset } = paging(req.query);

    const where = [];
    const params = [];
    const q = likeParam(req.query.q);
    if (q) {
      where.push("(t.title LIKE ? ESCAPE '\\' OR t.description LIKE ? ESCAPE '\\')");
      params.push(q, q);
    }
    if (req.query.status) {
      where.push('t.status = ?');
      params.push(req.query.status);
    }
    if (req.query.priority) {
      where.push('t.priority = ?');
      params.push(req.query.priority);
    }
    if (req.query.prestador_id) {
      where.push('t.assignee_id = ?');
      params.push(Number(req.query.prestador_id));
    }
    if (req.query.contract_id) {
      where.push('t.contract_id = ?');
      params.push(Number(req.query.contract_id));
    }
    // prazo: due date window (due_after = on/after, due_before = on/before)
    if (req.query.due_after) {
      where.push('t.due_date >= ?');
      params.push(req.query.due_after);
    }
    if (req.query.due_before) {
      where.push('t.due_date <= ?');
      params.push(req.query.due_before);
    }
    if (req.user.role === 'prestador') {
      where.push('t.assignee_id = ?');
      params.unshift(req.user.id);
    }
    const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    const total = db.get(`SELECT COUNT(*) AS c FROM tasks t${whereSql}`, params).c;
    const rows = db.all(
      `SELECT t.* FROM tasks t${whereSql} ORDER BY t.id LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({ tasks: rows.map((row) => Task.decorate(db, row)), total, limit, offset });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

router.use(authenticateToken);
router.get('/contracts', requireRole('admin', 'gestor', 'prestador'), searchContracts);
router.get('/tasks', requireRole('admin', 'gestor', 'prestador'), searchTasks);

router.searchContracts = searchContracts;
router.searchTasks = searchTasks;

module.exports = router;
