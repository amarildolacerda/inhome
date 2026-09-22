'use strict';

const express = require('express');
const router = express.Router();
const Contract = require('../models/Contract');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getDomainDb } = require('../config/database');

function summarizeTasks(rows) {
  const byStatus = {};
  const byPriority = {};
  const today = new Date().toISOString().slice(0, 10);
  let completed = 0;
  let inProgress = 0;
  let urgent = 0;
  let overdue = 0;
  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
    if (row.status === 'Concluída') {
      completed += 1;
    } else {
      byPriority[row.priority] = (byPriority[row.priority] || 0) + 1;
      if (row.priority === 'urgent') urgent += 1;
      if (row.due_date && row.due_date < today) overdue += 1;
    }
    if (row.status === 'Em Progresso') inProgress += 1;
  }
  const total = rows.length;
  return {
    total,
    byStatus,
    byPriority: Object.entries(byPriority).map(([priority, count]) => ({ priority, count })),
    byStatusList: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
    completed,
    inProgress,
    urgent,
    overdue,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

function summarizeContracts(rows) {
  const counts = { vigente: 0, atrasado: 0, encerrado: 0 };
  for (const row of rows) {
    counts[Contract.effectiveStatus(row)] += 1;
  }
  return counts;
}

// FR-019 / SC-011: role-scoped metrics. admin/gestor → whole domain;
// prestador → only their own tasks (and their linked contracts).
function getDomainMetrics(db, user) {
  if (user.role === 'prestador') {
    const tasks = summarizeTasks(
      db.all('SELECT status, priority, due_date FROM tasks WHERE assignee_id = ?', [user.id])
    );
    const contracts = summarizeContracts(
      db.all(
        `SELECT c.status, c.forecast_date FROM contracts c
         JOIN contract_prestadores cp ON cp.contract_id = c.id AND cp.user_id = ?`,
        [user.id]
      )
    );
    const linked = db.get(
      'SELECT COUNT(*) AS c FROM contract_prestadores WHERE user_id = ?',
      [user.id]
    ).c;
    return {
      scope: 'own',
      stats: {
        totalProjects: linked,
        activeProjects: contracts.vigente,
        totalTasks: tasks.total,
        completedTasks: tasks.completed,
        inProgressTasks: tasks.inProgress,
        urgentTasks: tasks.urgent,
        completionRate: tasks.completionRate,
        tasksOverdue: tasks.overdue,
        contractsAtrasado: contracts.atrasado,
        contractsEncerrado: contracts.encerrado,
        usersTotal: null,
        prestadoresTotal: null,
      },
      tasksByPriority: tasks.byPriority,
      tasksByStatus: tasks.byStatusList,
      recentProjects: [],
    };
  }

  const allContracts = db.all('SELECT id, name, status, forecast_date, updated_at FROM contracts ORDER BY id');
  const contracts = summarizeContracts(allContracts);
  const tasks = summarizeTasks(db.all('SELECT status, priority, due_date FROM tasks'));
  const usersTotal = db.get('SELECT COUNT(*) AS c FROM users').c;
  const prestadoresTotal = db.get("SELECT COUNT(*) AS c FROM users WHERE role = 'prestador'").c;

  const recentProjects = allContracts
    .slice(-5)
    .reverse()
    .map((row) => ({
      ...row,
      effective_status: Contract.effectiveStatus(row),
      task_count: db.get('SELECT COUNT(*) AS c FROM tasks WHERE contract_id = ?', [row.id]).c,
      completed_count: db.get(
        "SELECT COUNT(*) AS c FROM tasks WHERE contract_id = ? AND status = 'Concluída'",
        [row.id]
      ).c,
    }));

  return {
    scope: 'domain',
    stats: {
      totalProjects: allContracts.length,
      activeProjects: contracts.vigente,
      totalTasks: tasks.total,
      completedTasks: tasks.completed,
      inProgressTasks: tasks.inProgress,
      urgentTasks: tasks.urgent,
      completionRate: tasks.completionRate,
      tasksOverdue: tasks.overdue,
      contractsAtrasado: contracts.atrasado,
      contractsEncerrado: contracts.encerrado,
      usersTotal,
      prestadoresTotal,
    },
    tasksByPriority: tasks.byPriority,
    tasksByStatus: tasks.byStatusList,
    recentProjects,
  };
}

router.use(authenticateToken);

// GET /api/dashboard/stats
router.get('/stats', requireRole('admin', 'gestor', 'prestador'), (req, res) => {
  try {
    const db = getDomainDb(req.user.domainId);
    res.json(getDomainMetrics(db, req.user));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.getDomainMetrics = getDomainMetrics;

module.exports = router;
