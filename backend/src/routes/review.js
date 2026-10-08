'use strict';

// 00003 US7: revisão na vigência (openapi /api/contracts/{id}/review*).
// The review is a versioned suggestion (kind='revisao'): the gestor's manual
// trigger loads the contract's definitions and current tasks (FR-022), one
// OpenCode job proposes edits/creates — never a re-analysis (FR-024) — and a
// review queued behind a running analysis starts when that analysis ends
// (Edge Case: revisão durante análise aguarda a anterior). Approval applies
// the proposals (FR-023) in ./apply below.

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getDomainDb } = require('../config/database');
const opencodeConfig = require('../config/opencode');
const opencode = require('../services/opencode');
const { emitDomainEvent } = require('../services/events');
const ContractDefinition = require('../models/ContractDefinition');
const TaskSuggestion = require('../models/TaskSuggestion');
const Task = require('../models/Task');
const History = require('../models/History');
const suggestionsRouter = require('./suggestions');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function hasClientFields(body) {
  return Boolean(body && typeof body === 'object' && Object.keys(body).length > 0);
}

// FR-019: `:id` resolves only inside req.user.domainId (404 elsewhere).
function contractOr404(db, rawId) {
  const id = Number(rawId);
  const contract = Number.isInteger(id)
    ? db.get('SELECT id FROM contracts WHERE id = ?', [id])
    : null;
  if (!contract) throw httpError(404, 'Contract not found');
  return contract.id;
}

function findReview(db, contractId, rawId) {
  const id = Number(rawId);
  const row = Number.isInteger(id)
    ? db.get(
        `SELECT * FROM task_suggestions
          WHERE id = ? AND contract_id = ? AND kind = 'revisao'`,
        [id, contractId]
      )
    : null;
  if (!row) throw httpError(404, 'Review not found');
  return row;
}

// FR-022: the context loaded when the review starts — the contract's
// definitions plus a snapshot of its current tasks (server-built; no client
// payload, FR-020 convention). Persisted in task_suggestions.context_json.
function loadReviewContext(db, contractId) {
  const definitions = ContractDefinition.latest(db, contractId);
  const active = db.get(
    `SELECT id FROM workflow_versions WHERE contract_id = ? AND status = 'ativo'`,
    [contractId]
  );
  const rows = db.all(
    `SELECT t.*, u.name AS assignee_name
       FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
      WHERE t.contract_id = ?
      ORDER BY t.id`,
    [contractId]
  );
  const tasks = rows.map((task) => ({
    id: task.id,
    contract_id: task.contract_id,
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority ?? null,
    assignee_id: task.assignee_id ?? null,
    assignee_name: task.assignee_name ?? null,
    due_date: task.due_date ?? null,
    in_workflow: Boolean(active) && task.workflow_version_id === active.id,
  }));
  return { definitions, tasks };
}

// FR-024: the prompt carries the server-built allowlist context + the task
// snapshot and asks only for changes to the current list — no re-analysis.
function buildReviewPrompt(allowlist, tasks) {
  const lines = [
    'Revise a lista de tarefas deste contrato durante a vigência.',
    'Responda SOMENTE com JSON válido no formato:',
    '{"propostas":[{"op":"criar","titulo":"...","descricao":"...","justificativa":"..."},{"op":"editar","tarefa_id":1,"titulo":"...","descricao":"...","justificativa":"..."}]}',
    'op criar propõe uma tarefa nova; op editar modifica a tarefa existente com o tarefa_id exato informado.',
    'Não reanalise o contrato do zero: proponha somente as mudanças necessárias nas tarefas atuais, cada uma com justificativa.',
    `Tarefas atuais: ${JSON.stringify(tasks)}`,
    `Contexto do contrato (allowlist do servidor): ${JSON.stringify(allowlist)}`,
  ];
  return lines.join('\n');
}

function asString(value, field) {
  if (value == null) return null;
  if (typeof value !== 'string') throw new Error(`Proposal ${field} must be a string`);
  return value;
}

// Strict parse (same stance as parseSuggestion): anything that is not the
// fixed shape is a job failure (falha), never a proposal.
function parseReview(stdout) {
  const text = typeof stdout === 'string' ? stdout.trim() : '';
  if (!text) throw new Error('Empty OpenCode response');
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('Unparseable OpenCode response (not JSON)');
  }
  const list = payload && payload.propostas;
  if (!Array.isArray(list)) throw new Error('Review proposals missing (propostas)');
  return list.map((proposal) => {
    if (!proposal || typeof proposal !== 'object') {
      throw new Error('Proposal must be an object');
    }
    const justification = asString(proposal.justificativa, 'justificativa');
    if (proposal.op === 'criar') {
      const title = typeof proposal.titulo === 'string' ? proposal.titulo.trim() : '';
      if (!title) throw new Error('Proposal criar requires titulo');
      const description = asString(proposal.descricao, 'descricao');
      return { op: 'criar', task_id: null, title, description, justification };
    }
    if (proposal.op === 'editar') {
      const taskId = Number(proposal.tarefa_id);
      if (!Number.isInteger(taskId) || taskId <= 0) {
        throw new Error('Proposal editar requires tarefa_id');
      }
      const title =
        typeof proposal.titulo === 'string' && proposal.titulo.trim()
          ? proposal.titulo.trim()
          : null;
      const description = asString(proposal.descricao, 'descricao');
      if (title == null && description == null) {
        throw new Error('Proposal editar requires titulo or descricao');
      }
      return { op: 'editar', task_id: taskId, title, description, justification };
    }
    throw new Error(`Unknown proposal op: ${String(proposal.op)}`);
  });
}

// FR-022: proposals land as suggestion_items on the review row — `op` lives
// in target_task_id (editar targets the task; criar stays NULL, openapi
// RevisionProposal.task_id) and one transaction writes items + status.
function submitRevision(db, reviewId, proposals, authorId) {
  const review = TaskSuggestion.find(db, reviewId);
  if (!review) throw httpError(404, 'Review not found');
  if (review.status !== 'analisando') {
    throw new Error('Review is not accepting proposals');
  }
  db.transaction((tx) => {
    proposals.forEach((proposal, index) => {
      let title = proposal.title;
      if (proposal.op === 'editar') {
        const target = tx.get(
          'SELECT id, title FROM tasks WHERE id = ? AND contract_id = ?',
          [proposal.task_id, review.contract_id]
        );
        if (!target) {
          throw new Error(`Proposal targets a task that does not exist: ${proposal.task_id}`);
        }
        if (title == null) title = target.title;
      }
      tx.run(
        `INSERT INTO suggestion_items(suggestion_id, title, description, justification, ordem, target_task_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [reviewId, title, proposal.description, proposal.justification, index,
          proposal.op === 'editar' ? proposal.task_id : null]
      );
    });
    tx.run(
      `UPDATE task_suggestions
          SET status = 'sugerido', error = NULL, finished_at = datetime('now'),
              updated_at = datetime('now')
        WHERE id = ? AND status = 'analisando'`,
      [reviewId]
    );
  });
  // FR-017: the proposal version registers its author + date.
  History.recordVersion(db, {
    entityType: 'suggestion',
    entityId: reviewId,
    snapshot: { status: 'sugerido', proposals: proposals.length },
    authorId,
  });
}

// openapi ReviewSummary: task_suggestions row, `error` kept in English
// (unlike TaskSuggestion.erro — the review schema declares `error`).
function serializeReviewSummary(row) {
  if (!row) return null;
  return {
    id: row.id,
    contract_id: row.contract_id,
    status: row.status,
    error: row.error ?? null,
    created_by: row.created_by ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function serializeProposal(item) {
  const op = item.target_task_id == null ? 'criar' : 'editar';
  const changes = { title: item.title };
  if (item.description != null) changes.description = item.description;
  return {
    id: item.id,
    review_id: item.suggestion_id,
    op,
    task_id: item.target_task_id ?? null,
    changes,
    justificativa: item.justification ?? null,
  };
}

function serializeConflict(row) {
  return {
    id: row.id,
    review_id: row.suggestion_id,
    task_id: row.task_id,
    motivo: row.motivo,
  };
}

// openapi Review: summary + loaded context (definitions/tasks) + proposals +
// conflicts. A queued review has no persisted context yet — load it live
// (still "definições e tarefas atuais", FR-022).
function serializeReview(db, row) {
  let context = null;
  if (row.context_json) {
    try {
      context = JSON.parse(row.context_json);
    } catch {
      context = null;
    }
  }
  if (!context || !context.definitions) context = loadReviewContext(db, row.contract_id);
  const proposals = db
    .all('SELECT * FROM suggestion_items WHERE suggestion_id = ? ORDER BY ordem, id', [row.id])
    .map(serializeProposal);
  const conflicts = db
    .all('SELECT * FROM revision_conflicts WHERE suggestion_id = ? ORDER BY id', [row.id])
    .map(serializeConflict);
  return {
    ...serializeReviewSummary(row),
    definitions: context.definitions,
    tasks: context.tasks,
    proposals,
    conflicts,
  };
}

// The review job: pendente → analisando → sugerido | falha. Context is loaded
// and stored first (FR-022), one CLI call proposes the changes (FR-024), and
// the guard on `status` keeps double dispatches from racing (single-threaded
// sync prefix before the first await).
async function runReviewJob(domainId, reviewId) {
  const db = getDomainDb(domainId);
  const row = TaskSuggestion.find(db, reviewId);
  if (!row || row.status !== 'pendente') return null;

  const allowlist = opencode.buildContext(db, row.contract_id);
  if (!allowlist) {
    TaskSuggestion.markFalha(db, reviewId, 'No definitions available for analysis');
    return null;
  }
  const context = loadReviewContext(db, row.contract_id);
  const started = TaskSuggestion.markStarted(db, reviewId, JSON.stringify(context));
  if (!started || started.status !== 'analisando') return null;

  try {
    const { stdout } = await opencodeConfig.run({
      prompt: buildReviewPrompt(allowlist, context.tasks),
      timeoutMs: opencodeConfig.getTimeoutMs(),
    });
    const proposals = parseReview(stdout);
    submitRevision(db, reviewId, proposals, row.created_by);
    return TaskSuggestion.find(db, reviewId);
  } catch (error) {
    TaskSuggestion.markFalha(db, reviewId, error.message);
    return null;
  }
}

// Edge Case (openapi startReview): a review created while an analysis runs
// stays `pendente` and starts when the analysis reaches a terminal state —
// called by runAnalysisJob at the end of both success and failure.
function startQueuedReviews(domainId, contractId) {
  const db = getDomainDb(domainId);
  const queued = db.all(
    `SELECT id FROM task_suggestions
      WHERE contract_id = ? AND kind = 'revisao' AND status = 'pendente'
      ORDER BY id`,
    [contractId]
  );
  for (const row of queued) {
    setImmediate(() => {
      runReviewJob(domainId, row.id).catch(() => {});
    });
  }
  return queued.length;
}

function reviewLocation(contractId, reviewId) {
  return `/api/contracts/${contractId}/review/${reviewId}`;
}

// POST /api/contracts/:id/review — FR-024 manual trigger, gestor only.
// Queued (pendente, not dispatched) when an analysis is running; 409 when a
// review is already in progress.
async function startManualReview(req, res) {
  try {
    if (hasClientFields(req.body)) {
      return res
        .status(400)
        .json({ error: 'Validation failed', details: ['body must not contain fields'] });
    }
    const db = getDomainDb(req.user.domainId);
    const contractId = contractOr404(db, req.params.id);

    const missing = suggestionsRouter.assertDefinitionsComplete(db, contractId);
    if (missing.length) {
      return res.status(400).json({ error: 'Missing required definitions', missing });
    }
    if (!opencodeConfig.isEnabled()) {
      return res.status(400).json({ error: 'OpenCode integration disabled' });
    }
    if (TaskSuggestion.activeJob(db, contractId, 'revisao')) {
      return res.status(409).json({ error: 'Review already in progress' });
    }

    const definitions = ContractDefinition.latest(db, contractId);
    const review = TaskSuggestion.createSuggestion(db, {
      contractId,
      definitionsId: definitions.id,
      kind: 'revisao',
      userId: req.user.id,
    });
    const analysisRunning = Boolean(TaskSuggestion.activeJob(db, contractId, 'analise'));
    if (!analysisRunning) {
      setImmediate(() => {
        runReviewJob(req.user.domainId, review.id).catch(() => {});
      });
    }

    const created = TaskSuggestion.find(db, review.id);
    res.status(202).set('Location', reviewLocation(contractId, review.id));
    return res.json({ review: serializeReviewSummary(created) });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

// GET /api/contracts/:id/review — newest first (openapi listReviews).
function listReviews(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const contractId = contractOr404(db, req.params.id);
    const rows = db.all(
      `SELECT * FROM task_suggestions
        WHERE contract_id = ? AND kind = 'revisao'
        ORDER BY id DESC`,
      [contractId]
    );
    return res.json({ reviews: rows.map(serializeReviewSummary) });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

// GET /api/contracts/:id/review/:rid — polling resource (FR-022 context,
// proposals, conflicts).
function getReview(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const contractId = contractOr404(db, req.params.id);
    const row = findReview(db, contractId, req.params.rid);
    return res.json({ review: serializeReview(db, row) });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

// POST /api/contracts/:id/review/:rid/retry — manual retry only: falha →
// pendente re-runs the same row (FR-018 policy applied to reviews).
async function retryReview(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const contractId = contractOr404(db, req.params.id);
    const row = findReview(db, contractId, req.params.rid);
    if (row.status !== 'falha') {
      return res.status(409).json({ error: 'Retry available only after a failure' });
    }
    if (!opencodeConfig.isEnabled()) {
      return res.status(400).json({ error: 'OpenCode integration disabled' });
    }
    const requeued = TaskSuggestion.requeue(db, row.id);
    if (!requeued || requeued.status !== 'pendente') {
      return res.status(409).json({ error: 'Retry available only after a failure' });
    }
    setImmediate(() => {
      runReviewJob(req.user.domainId, row.id).catch(() => {});
    });
    res.status(202).set('Location', reviewLocation(contractId, row.id));
    return res.json({ review: serializeReviewSummary(requeued) });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

// POST /api/contracts/:id/review/:rid/apply — FR-023: approval and
// application in one step (openapi applyReview). Only tasks in `A Fazer`
// change — the single eligibility rule (data-model §Validation rules);
// any other current status becomes a revision_conflicts row and the task
// stays intact (status, fields and history preserved). Created tasks are
// regular tasks: `A Fazer`, `workflow_version_id NULL` (opt-in per FR-010),
// a `task:updated` created event (openapi x-socket-events) and the
// `execution_plans` pendente shell (SC-006).
//
// Spec contradiction (reported): spec.md §Assumptions claims reopen returns
// a task to 'A Fazer'; existing E003 behavior returns 'Em Progresso'
// (checked test asserts it), so a reopened task conflicts like any started
// task — reopening is out of this feature's scope (Clarifications).
function applyApprovedRevision(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const contractId = contractOr404(db, req.params.id);
    const review = findReview(db, contractId, req.params.rid);
    if (review.status !== 'sugerido') {
      return res
        .status(409)
        .json({ error: 'Apply allowed only while the review is sugerido' });
    }
    const proposals = db.all(
      'SELECT * FROM suggestion_items WHERE suggestion_id = ? ORDER BY ordem, id',
      [review.id]
    );
    if (proposals.length === 0) {
      return res.status(400).json({ error: 'Review has no proposals' });
    }

    const result = db.transaction((tx) => {
      let edited = 0;
      let created = 0;
      const createdTasks = [];
      for (const item of proposals) {
        if (item.target_task_id == null) {
          tx.run(
            `INSERT INTO tasks(contract_id, title, description, status, suggestion_item_id)
             VALUES (?, ?, ?, 'A Fazer', ?)`,
            [contractId, item.title, item.description ?? null, item.id]
          );
          // sql.js: last_insert_rowid() resets on persist — read back MAX(id).
          const taskRow = tx.get('SELECT * FROM tasks WHERE id = (SELECT MAX(id) FROM tasks)');
          tx.run('INSERT INTO execution_plans(task_id, status) VALUES (?, ?)', [
            taskRow.id,
            'pendente',
          ]);
          Task.addHistory(tx, taskRow.id, 'create', req.user.id, null);
          created += 1;
          createdTasks.push(taskRow.id);
          continue;
        }

        const task = tx.get('SELECT * FROM tasks WHERE id = ? AND contract_id = ?', [
          item.target_task_id,
          contractId,
        ]);
        if (!task || task.status !== 'A Fazer') {
          const statusAlvo = task ? task.status : 'inexistente';
          const motivo = task
            ? `Tarefa em ${task.status} — mudança não aplicada`
            : 'Tarefa não existe — mudança não aplicada';
          tx.run(
            `INSERT INTO revision_conflicts(suggestion_id, task_id, status_alvo, motivo)
             VALUES (?, ?, ?, ?)`,
            [review.id, item.target_task_id, statusAlvo, motivo]
          );
          continue;
        }

        const sets = ['title = ?', 'updated_at = datetime(\'now\')'];
        const params = [item.title];
        if (item.description != null) {
          sets.splice(1, 0, 'description = ?');
          params.push(item.description);
        }
        params.push(task.id);
        tx.run(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, params);
        edited += 1;
      }
      TaskSuggestion.markAprovada(tx, review.id);
      History.recordVersion(tx, {
        entityType: 'suggestion',
        entityId: review.id,
        snapshot: { status: 'aprovada', applied: { edited, created } },
        authorId: req.user.id,
      });
      return { edited, created, createdTasks };
    });

    // openapi x-socket-events: created tasks emit task:updated after commit.
    for (const taskId of result.createdTasks) {
      emitDomainEvent('task:updated', req.user.domainId, {
        taskId,
        contractId,
        action: 'created',
        status: 'A Fazer',
      });
    }

    const row = TaskSuggestion.find(db, review.id);
    const conflicts = db
      .all('SELECT * FROM revision_conflicts WHERE suggestion_id = ? ORDER BY id', [review.id])
      .map(serializeConflict);
    return res.json({
      review: serializeReviewSummary(row),
      applied: { edited: result.edited, created: result.created },
      conflicts,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

router.use(authenticateToken);
router.post('/:id/review', requireRole('gestor'), startManualReview);
router.get('/:id/review', requireRole('gestor'), listReviews);
router.get('/:id/review/:rid', requireRole('gestor'), getReview);
router.post('/:id/review/:rid/apply', requireRole('gestor'), applyApprovedRevision);
router.post('/:id/review/:rid/retry', requireRole('gestor'), retryReview);

router.loadReviewContext = loadReviewContext;
router.submitRevision = submitRevision;
router.startManualReview = startManualReview;
router.applyApprovedRevision = applyApprovedRevision;
router.runReviewJob = runReviewJob;
router.startQueuedReviews = startQueuedReviews;
router.serializeReviewSummary = serializeReviewSummary;
router.serializeReview = serializeReview;
router.parseReview = parseReview;

module.exports = router;
