'use strict';

// 00003 US5: execution plan endpoints (openapi /api/tasks/{id}/execution-plan).
// Generation is an async job: 202 + Location, then poll GET for status.
// FR-015: activation only queues pendente shells — POST dispatches the job,
// so activation never blocks on OpenCode. FR-016: the job only writes
// `execution_plans` (model enforces it).

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getDomainDb } = require('../config/database');
const opencodeConfig = require('../config/opencode');
const opencode = require('../services/opencode');
const ExecutionPlan = require('../models/ExecutionPlan');

// In-memory registry of running generation jobs (task id). A row stuck in
// `pendente` with no running job is a queued shell — POST may dispatch it;
// a row with a running job answers 409 ("Com geração já pendente").
const runningPlanJobs = new Set();

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function getTaskOr404(db, id) {
  const row = db.get('SELECT * FROM tasks WHERE id = ?', [Number(id)]);
  if (!row) throw httpError(404, 'Task not found');
  return row;
}

// Prestador: only its own assigned tasks (GET /api/tasks/:id convention —
// foreign task answers 404, never 403).
function assertVisible(user, task) {
  if (user.role === 'prestador' && task.assignee_id !== user.id) {
    throw httpError(404, 'Task not found');
  }
}

async function runPlanJob(domainId, taskId) {
  const key = Number(taskId);
  try {
    const db = getDomainDb(domainId);
    const row = ExecutionPlan.getForTask(db, key);
    // Dispatch only when the row still waits for generation (no racing writes)
    if (!row || row.status !== 'pendente') return;
    const task = db.get('SELECT * FROM tasks WHERE id = ?', [key]);
    if (!task) {
      ExecutionPlan.markFalha(db, key, 'Task not found');
      return;
    }
    const context = opencode.buildContext(db, task.contract_id);
    if (!context) {
      ExecutionPlan.markFalha(db, key, 'No definitions available for analysis');
      return;
    }
    const { stdout } = await opencode.requestExecutionPlan(db, task, context);
    const plan = opencode.parsePlan(stdout);
    ExecutionPlan.upsertPlan(db, { taskId: key, plan });
  } catch (error) {
    try {
      ExecutionPlan.markFalha(getDomainDb(domainId), key, error.message);
    } catch {
      // domain db unavailable — job stays pendente and can be re-POSTed
    }
  } finally {
    runningPlanJobs.delete(key);
  }
}

function enqueuePlanJob(domainId, taskId) {
  const key = Number(taskId);
  runningPlanJobs.add(key);
  setImmediate(() => {
    runPlanJob(domainId, key).catch(() => {});
  });
}

function sendAccepted(req, res, row, task) {
  const key = row.task_id;
  res
    .status(202)
    .set('Location', `/api/tasks/${key}/execution-plan`)
    .json({ plan: ExecutionPlan.serialize(getDomainDb(req.user.domainId), row, task) });
}

// GET /api/tasks/:id/execution-plan — gestor + prestador. `plan: null` while
// the task has no plan yet (openapi getExecutionPlan).
function getPlan(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const task = getTaskOr404(db, req.params.id);
    assertVisible(req.user, task);
    const row = ExecutionPlan.getForTask(db, task.id);
    res.json({ plan: row ? ExecutionPlan.serialize(db, row, task) : null });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// POST /api/tasks/:id/execution-plan — gestor only. Accepts shells in any
// state except a running job (409): pendente (queued shell), gerado
// (regenerate on demand), falha (explicit regenerate path).
function requestPlan(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const task = getTaskOr404(db, req.params.id);
    if (!opencodeConfig.isEnabled()) {
      return res.status(400).json({ error: 'OpenCode integration disabled' });
    }
    if (runningPlanJobs.has(task.id)) {
      return res.status(409).json({ error: 'Plan generation already in progress' });
    }
    const row = ExecutionPlan.ensureRow(db, task.id, req.user.id);
    enqueuePlanJob(req.user.domainId, task.id);
    sendAccepted(req, res, row, task);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// POST /api/tasks/:id/execution-plan/regenerate — gestor only, only after a
// failure (openapi regenerateExecutionPlan).
function regeneratePlan(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const task = getTaskOr404(db, req.params.id);
    if (!opencodeConfig.isEnabled()) {
      return res.status(400).json({ error: 'OpenCode integration disabled' });
    }
    if (runningPlanJobs.has(task.id)) {
      return res.status(409).json({ error: 'Plan generation already in progress' });
    }
    const row = ExecutionPlan.getForTask(db, task.id);
    if (!row) throw httpError(404, 'Plan not found');
    if (row.status !== 'falha') {
      return res.status(409).json({ error: 'Regenerate available only after a failure' });
    }
    const requeued = ExecutionPlan.requeue(db, task.id);
    enqueuePlanJob(req.user.domainId, task.id);
    sendAccepted(req, res, requeued, task);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

router.use(authenticateToken);
router.get('/:id/execution-plan', requireRole('gestor', 'prestador'), getPlan);
router.post('/:id/execution-plan', requireRole('gestor'), requestPlan);
router.post('/:id/execution-plan/regenerate', requireRole('gestor'), regeneratePlan);

router.getPlan = getPlan;
router.requestPlan = requestPlan;
router.regeneratePlan = regeneratePlan;
router.runningPlanJobs = runningPlanJobs;

module.exports = router;
