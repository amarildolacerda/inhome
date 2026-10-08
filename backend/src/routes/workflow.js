'use strict';

// US4 workflow resources (T021 opt-in, T024 read side). The activation core
// lives here from T018 on, because approving a suggestion (US3) materializes
// the official workflow (FR-010/AD-003).

const express = require('express');
const router = express.Router(); // mounted at /api/contracts (server.js)
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getDomainDb } = require('../config/database');
const Task = require('../models/Task');
const TaskSuggestion = require('../models/TaskSuggestion');
const History = require('../models/History');

// openapi WorkflowVersion: the column is `activated_by`, the wire field is
// `created_by` (the gestor that activated this version).
function serializeWorkflow(row) {
  if (!row) return null;
  return {
    id: row.id,
    contract_id: row.contract_id,
    suggestion_id: row.suggestion_id,
    status: row.status,
    created_by: row.activated_by ?? null,
    created_at: row.created_at,
  };
}

// One `ativo` version per contract (partial UNIQUE). null = never approved.
function activeWorkflow(db, contractId) {
  return db.get(
    `SELECT * FROM workflow_versions WHERE contract_id = ? AND status = 'ativo'`,
    [contractId]
  );
}

// openapi WorkflowTask: real task fields plus `in_workflow`, relative to the
// ACTIVE version — tasks of a substituted version are no longer "in the list".
function workflowTask(db, row, activeRow) {
  return {
    ...Task.decorate(db, row),
    in_workflow: Boolean(activeRow) && row.workflow_version_id === activeRow.id,
  };
}

function contractOr404(db, rawId) {
  const id = Number(rawId);
  const contract = Number.isInteger(id) ? db.get('SELECT id FROM contracts WHERE id = ?', [id]) : null;
  if (!contract) {
    const err = new Error('Contract not found');
    err.status = 404;
    return { err };
  }
  return { id };
}

// FR-009/FR-010/FR-014 (data-model invariants): runs INSIDE the approval
// transaction — previous `ativo` version → `substituido`, new `ativo` version,
// kept items materialized as tasks linked to it, pendente execution plans for
// every new task, suggestion → `aprovada`. Any failure rolls the whole thing
// back: no task exists outside an active workflow version.
function activateWorkflow(db, { suggestion, userId }) {
  const previous = db.get(
    `SELECT id FROM workflow_versions WHERE contract_id = ? AND status = 'ativo'`,
    [suggestion.contract_id]
  );
  if (previous) {
    db.run(`UPDATE workflow_versions SET status = 'substituido' WHERE id = ?`, [previous.id]);
  }
  db.run(
    `INSERT INTO workflow_versions(contract_id, suggestion_id, status, activated_by)
     VALUES (?, ?, 'ativo', ?)`,
    [suggestion.contract_id, suggestion.id, userId]
  );
  // sql.js: no last_insert_rowid() after persist — read back through MAX(id).
  const workflowRow = db.get(
    `SELECT * FROM workflow_versions WHERE id = (SELECT MAX(id) FROM workflow_versions)`
  );

  const keptItems = db.all(
    `SELECT * FROM suggestion_items
      WHERE suggestion_id = ? AND removed = 0
      ORDER BY ordem, id`,
    [suggestion.id]
  );
  const tasks = keptItems.map((item) => {
    db.run(
      `INSERT INTO tasks(contract_id, title, description, status, workflow_version_id, suggestion_item_id)
       VALUES (?, ?, ?, 'A Fazer', ?, ?)`,
      [suggestion.contract_id, item.title, item.description ?? null, workflowRow.id, item.id]
    );
    const taskRow = db.get(`SELECT id FROM tasks WHERE id = (SELECT MAX(id) FROM tasks)`);
    // FR-014: activation never waits for the plan — it exists as `pendente`.
    db.run(`INSERT INTO execution_plans(task_id, status, requested_by) VALUES (?, 'pendente', ?)`, [
      taskRow.id,
      userId,
    ]);
    return {
      id: taskRow.id,
      contract_id: suggestion.contract_id,
      title: item.title,
      description: item.description ?? null,
      status: 'A Fazer',
      in_workflow: true,
    };
  });

  TaskSuggestion.markAprovada(db, suggestion.id);
  // FR-017: activation/approval appends the author + date of this version
  // (inside the caller's approval transaction).
  History.recordVersion(db, {
    entityType: 'suggestion',
    entityId: suggestion.id,
    snapshot: { status: 'aprovada', workflow_version_id: workflowRow.id },
    authorId: userId,
  });
  return { workflow: serializeWorkflow(workflowRow), tasks };
}

// POST /api/contracts/:id/workflow/tasks/:taskId/opt-in — FR-010: a task
// created outside the approved list only joins it through this confirmation
// (opt_in_by/opt_in_at recorded). Already-linked → 409; task outside the
// contract → 400; no active workflow yet → 400; gestor only (FR-019).
function optInManualTask(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const found = contractOr404(db, req.params.id);
    if (found.err) return res.status(404).json({ error: found.err.message });

    const taskId = Number(req.params.taskId);
    const task =
      Number.isInteger(taskId) && taskId > 0
        ? db.get('SELECT * FROM tasks WHERE id = ?', [taskId])
        : null;
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.contract_id !== found.id) {
      return res.status(400).json({ error: 'Task does not belong to this contract' });
    }
    if (task.workflow_version_id !== null || task.opt_in_at !== null) {
      return res.status(409).json({ error: 'Task already in workflow' });
    }
    const active = activeWorkflow(db, found.id);
    if (!active) {
      return res.status(400).json({ error: 'No active workflow for this contract' });
    }

    db.run(
      `UPDATE tasks
          SET workflow_version_id = ?, opt_in_by = ?, opt_in_at = datetime('now'),
              updated_at = datetime('now')
        WHERE id = ?`,
      [active.id, req.user.id, task.id]
    );
    const updated = db.get('SELECT * FROM tasks WHERE id = ?', [task.id]);
    return res.json({ task: workflowTask(db, updated, active) });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

// GET /api/contracts/:id/workflow — FR-011/FR-013: the active version (or
// null when never approved) plus the contract's tasks. admin/gestor see every
// task with the `in_workflow` flag (base for the FR-010 opt-in); prestador
// sees ONLY the approved list and gets 404 when not linked to the contract —
// suggestions never appear here (FR-013).
function getActiveWorkflow(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const found = contractOr404(db, req.params.id);
    if (found.err) return res.status(404).json({ error: found.err.message });
    const active = activeWorkflow(db, found.id);

    let rows;
    if (req.user.role === 'prestador') {
      const linked = db.get(
        'SELECT 1 AS ok FROM contract_providers WHERE contract_id = ? AND user_id = ?',
        [found.id, req.user.id]
      );
      if (!linked) return res.status(404).json({ error: 'Workflow not found' });
      rows = active
        ? db.all(
            'SELECT * FROM tasks WHERE contract_id = ? AND workflow_version_id = ? ORDER BY id',
            [found.id, active.id]
          )
        : [];
    } else {
      rows = db.all('SELECT * FROM tasks WHERE contract_id = ? ORDER BY id', [found.id]);
    }

    return res.json({
      workflow: serializeWorkflow(active),
      tasks: rows.map((row) => workflowTask(db, row, active)),
    });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

router.use(authenticateToken);
router.get('/:id/workflow', requireRole('admin', 'gestor', 'prestador'), getActiveWorkflow);
router.post(
  '/:id/workflow/tasks/:taskId/opt-in',
  requireRole('gestor'),
  optInManualTask
);

router.serializeWorkflow = serializeWorkflow;
router.activeWorkflow = activeWorkflow;
router.workflowTask = workflowTask;
router.activateWorkflow = activateWorkflow;
router.optInManualTask = optInManualTask;
router.getActiveWorkflow = getActiveWorkflow;

module.exports = router;
