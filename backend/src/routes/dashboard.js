'use strict';

const express = require('express');
const router = express.Router();
const Contract = require('../models/Contract');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getDomainDb, getPlatformDb } = require('../config/database');
const { code, label } = require('../config/enums');
const { readWindows, daysUntil } = require('../services/alerts');

// Fase 3 (config/enums.js): os SELECTs abaixo devolvem o código do enum; a
// contagem e a exposição seguem em texto PT (tasksByStatus, effective_status).
function summarizeTasks(rows) {
  const byStatus = {};
  const byPriority = {};
  const today = new Date().toISOString().slice(0, 10);
  let completed = 0;
  let inProgress = 0;
  let urgent = 0;
  let overdue = 0;
  for (const row of rows) {
    const status = label('tasks.status', row.status);
    byStatus[status] = (byStatus[status] || 0) + 1;
    if (status === 'Concluída') {
      completed += 1;
    } else {
      byPriority[row.priority] = (byPriority[row.priority] || 0) + 1;
      if (row.priority === 'urgent') urgent += 1;
      if (row.due_date && row.due_date < today) overdue += 1;
    }
    if (status === 'Em Progresso') inProgress += 1;
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
    counts[Contract.effectiveStatus({ ...row, status: label('contracts.status', row.status) })] += 1;
  }
  return counts;
}

// FR-039/SC-002: "a vencer" reuses the domain alert windows (E005). Exposing
// the per-contract flag keeps client-side filters (FR-043) window-correct
// without leaking the window configuration or refetching on every filter.
function isAVencer(row, windows) {
  const effective = Contract.effectiveStatus({
    ...row,
    status: label('contracts.status', row.status),
  });
  if (effective !== 'vigente' || !row.forecast_date) return false;
  const days = daysUntil(row.forecast_date);
  return days >= 0 && windows.some((window) => window >= days);
}

// FR-019 / SC-011: role-scoped metrics. admin/gestor → whole domain;
// prestador → only their own tasks (and their linked contracts).
function getDomainMetrics(db, user) {
  const platform = getPlatformDb();
  const domainRow = platform.get('SELECT alert_windows FROM domains WHERE id = ?', [user.domainId]);
  const windows = readWindows(domainRow?.alert_windows);

  if (user.role === 'prestador') {
    const tasks = summarizeTasks(
      db.all('SELECT status, priority, due_date FROM tasks WHERE assignee_id = ?', [user.id])
    );
    const linkedContracts = db.all(
      `SELECT c.id, c.name, c.status, c.forecast_date, c.updated_at, c.created_by
       FROM contracts c
       JOIN contract_providers cp ON cp.contract_id = c.id AND cp.user_id = ?
       ORDER BY c.id`,
      [user.id]
    );
    const contracts = summarizeContracts(linkedContracts);
    const linked = db.get(
      'SELECT COUNT(*) AS c FROM contract_providers WHERE user_id = ?',
      [user.id]
    ).c;
    const contractsAVencer = linkedContracts.filter((row) => isAVencer(row, windows)).length;
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
        contractsAVencer,
        usersTotal: null,
        prestadoresTotal: null,
      },
      tasksByPriority: tasks.byPriority,
      tasksByStatus: tasks.byStatusList,
      contracts: linkedContracts.map((row) => ({
        ...row,
        status: label('contracts.status', row.status),
        effective_status: Contract.effectiveStatus({ ...row, status: label('contracts.status', row.status) }),
        a_vencer: isAVencer(row, windows),
        responsavel: row.created_by
          ? (db.get('SELECT name FROM users WHERE id = ?', [row.created_by])?.name ?? null)
          : null,
      })),
      recentProjects: [],
    };
  }

  const allContracts = db.all('SELECT id, name, status, forecast_date, updated_at, created_by FROM contracts ORDER BY id');
  const contracts = summarizeContracts(allContracts);
  const tasks = summarizeTasks(db.all('SELECT status, priority, due_date FROM tasks'));
  const usersTotal = db.get('SELECT COUNT(*) AS c FROM users').c;
  const prestadoresTotal = db.get("SELECT COUNT(*) AS c FROM users WHERE role = 'prestador'").c;
  const contractsAVencer = allContracts.filter((row) => isAVencer(row, windows)).length;

  const recentProjects = allContracts
    .slice(-5)
    .reverse()
    .map((row) => ({
      ...row,
      status: label('contracts.status', row.status),
      effective_status: Contract.effectiveStatus({
        ...row,
        status: label('contracts.status', row.status),
      }),
      responsavel: row.created_by
        ? (db.get('SELECT name FROM users WHERE id = ?', [row.created_by])?.name ?? null)
        : null,
      task_count: db.get('SELECT COUNT(*) AS c FROM tasks WHERE contract_id = ?', [row.id]).c,
      completed_count: db.get('SELECT COUNT(*) AS c FROM tasks WHERE contract_id = ? AND status = ?', [
        row.id,
        code('tasks.status', 'Concluída'),
      ]).c,
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
      contractsAVencer,
      usersTotal,
      prestadoresTotal,
    },
    tasksByPriority: tasks.byPriority,
    tasksByStatus: tasks.byStatusList,
    contracts: allContracts.map((row) => ({
      ...row,
      status: label('contracts.status', row.status),
      effective_status: Contract.effectiveStatus({ ...row, status: label('contracts.status', row.status) }),
      a_vencer: isAVencer(row, windows),
      responsavel: row.created_by
        ? (db.get('SELECT name FROM users WHERE id = ?', [row.created_by])?.name ?? null)
        : null,
    })),
    recentProjects,
  };
}

router.use(authenticateToken);

// GET /api/v2/dashboard/stats
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
