'use strict';

const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { getDomainDb } = require('../config/database');
const { saveToUploads } = require('../middleware/upload');
const { notify } = require('../services/email');
const { emitDomainEvent } = require('../services/events');

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// FR-010 / SC-004: a task may only be assigned to a prestador who is linked
// to the contract. Throws 400 when the assignment is refused.
function assertLinkedPrestador(db, contractId, userId) {
  const user = db.get('SELECT id, role FROM users WHERE id = ?', [Number(userId)]);
  if (!user) throw httpError(404, 'User not found');
  if (user.role !== 'prestador') throw httpError(400, 'assignee must have the prestador role');
  const linked = db.get(
    'SELECT 1 AS ok FROM contract_prestadores WHERE contract_id = ? AND user_id = ?',
    [contractId, user.id]
  );
  if (!linked) throw httpError(400, 'Prestador não está vinculado ao contrato');
  return user.id;
}

function getTaskOr404(db, id) {
  const row = db.get('SELECT * FROM tasks WHERE id = ?', [Number(id)]);
  if (!row) throw httpError(404, 'Task not found');
  return row;
}

// Prestador: only tasks assigned to them. Admin/gestor: whole domain (FR-013).
function canSeeTask(user, task) {
  if (user.role === 'prestador') return task.assignee_id === user.id;
  return true;
}

// Mover da tarefa: only the assigned (linked) prestador (FR-010).
function assertMover(user, task) {
  if (user.role !== 'prestador' || task.assignee_id !== user.id) {
    const err = httpError(403, 'Só o prestador vinculado move a tarefa');
    throw err;
  }
}

function markCompleted(db, task, user, text) {
  if (!text || !String(text).trim()) {
    throw httpError(400, 'Conclusão exige texto');
  }
  db.run(
    `UPDATE tasks SET status = 'Concluída', completed_text = ?, completed_at = datetime('now'),
     completed_by = ?, updated_at = datetime('now') WHERE id = ?`,
    [String(text).trim(), user.id, task.id]
  );
}

// FR-017 recipients: completion/reopening go to the domain management.
function managementEmails(db) {
  return db
    .all("SELECT email FROM users WHERE role IN ('admin', 'gestor') AND active = 1")
    .map((row) => row.email);
}

function assigneeEmail(db, userId) {
  const row = userId ? db.get('SELECT email FROM users WHERE id = ?', [userId]) : null;
  return row ? row.email : null;
}

// POST /api/contracts/:contractId/tasks — gestor/admin creates; assignee must
// be a contract-linked prestador (FR-010, SC-004). Trigger 1/4: assignment.
async function createTask(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const contractId = Number(req.params.contractId);
    const contract = db.get('SELECT id FROM contracts WHERE id = ?', [contractId]);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const body = req.body || {};
    if (!body.title || !String(body.title).trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (body.priority && !PRIORITIES.includes(body.priority)) {
      return res.status(400).json({ error: `priority must be one of ${PRIORITIES.join(', ')}` });
    }
    if (body.due_date && !DATE_RE.test(body.due_date)) {
      return res.status(400).json({ error: 'due_date must be YYYY-MM-DD' });
    }

    let assigneeId = null;
    if (body.assignee_id !== undefined && body.assignee_id !== null) {
      assigneeId = assertLinkedPrestador(db, contractId, body.assignee_id);
    }

    const task = Task.create(db, {
      contract_id: contractId,
      title: String(body.title).trim(),
      description: body.description || null,
      priority: body.priority || 'medium',
      assignee_id: assigneeId,
      due_date: body.due_date || null,
    });
    Task.addHistory(db, task.id, 'create', req.user.id, null);
    emitDomainEvent('task:updated', req.user.domainId, {
      taskId: task.id,
      contractId,
      action: 'created',
      status: task.status,
    });
    if (assigneeId) {
      await notify('assignment', {
        to: [assigneeEmail(db, assigneeId)],
        subject: `Tarefa atribuida: ${task.title}`,
        text: `Evento: assignment\nTarefa: ${task.title}\nContrato: ${contractId}`,
      });
    }
    res.status(201).json({ task });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// GET /api/tasks — role-scoped list (FR-013).
function listTasks(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    let rows;
    if (req.user.role === 'prestador') {
      rows = db.all('SELECT * FROM tasks WHERE assignee_id = ? ORDER BY id', [req.user.id]);
    } else if (req.query.contract_id) {
      rows = db.all('SELECT * FROM tasks WHERE contract_id = ? ORDER BY id', [
        Number(req.query.contract_id),
      ]);
    } else {
      rows = db.all('SELECT * FROM tasks ORDER BY id');
    }
    res.json({ tasks: rows.map((row) => Task.decorate(db, row)) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

function getTask(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const task = Task.findById(db, req.params.id);
    if (!task || !canSeeTask(req.user, task)) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ task, history: Task.history(db, task.id) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// gestor/admin edits fields; reassignment re-checks the contract link.
// Trigger 1/4 (reassignment): assignment mail to the new prestador.
async function updateTaskFields(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const row = getTaskOr404(db, req.params.id);
    const body = req.body || {};
    const fields = {};
    if (body.title !== undefined) {
      if (!String(body.title).trim()) return res.status(400).json({ error: 'title cannot be empty' });
      fields.title = String(body.title).trim();
    }
    if (body.description !== undefined) fields.description = body.description;
    if (body.priority !== undefined) {
      if (!PRIORITIES.includes(body.priority)) {
        return res.status(400).json({ error: 'invalid priority' });
      }
      fields.priority = body.priority;
    }
    if (body.due_date !== undefined) {
      if (body.due_date && !DATE_RE.test(body.due_date)) {
        return res.status(400).json({ error: 'due_date must be YYYY-MM-DD' });
      }
      fields.due_date = body.due_date;
    }
    let reassignedTo = null;
    if (Object.hasOwn(body, 'assignee_id') && body.assignee_id !== null) {
      reassignedTo = assertLinkedPrestador(db, row.contract_id, body.assignee_id);
      fields.assignee_id = reassignedTo;
      Task.addHistory(db, row.id, 'assign', req.user.id, null);
    }
    const task = Task.update(db, row.id, fields);
    if (reassignedTo && reassignedTo !== row.assignee_id) {
      await notify('assignment', {
        to: [assigneeEmail(db, reassignedTo)],
        subject: `Tarefa atribuida: ${task.title}`,
        text: `Evento: assignment\nTarefa: ${task.title}\nContrato: ${row.contract_id}`,
      });
    }
    res.json({ task });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// FR-010: sequential flow, only the linked prestador moves; Concluída
// requires completion text (edge case: sem texto → recusa).
// Trigger 2/4 also fires on the PATCH path to Concluída.
async function updateTaskStatus(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const task = getTaskOr404(db, req.params.id);
    const next = (req.body || {}).status;
    const text = (req.body || {}).text;

    if (!Task.FLOW.includes(next)) {
      return res.status(400).json({ error: `status must be one of ${Task.FLOW.join(', ')}` });
    }
    assertMover(req.user, task);

    const currentIdx = Task.flowIndex(task.status);
    const nextIdx = Task.flowIndex(next);
    if (nextIdx !== currentIdx + 1) {
      return res.status(400).json({ error: `Fluxo inválido: ${task.status} → ${next}` });
    }

    if (next === 'Concluída') {
      markCompleted(db, task, req.user, text);
      emitDomainEvent('task:updated', req.user.domainId, {
        taskId: task.id,
        contractId: task.contract_id,
        action: 'completed',
        status: 'Concluída',
      });
      await notify('completion', {
        to: managementEmails(db),
        subject: `Tarefa concluida: ${task.title}`,
        text: `Evento: completion\nTarefa: ${task.title}\nTexto: ${String(text).trim()}`,
      });
    } else {
      db.run("UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?", [
        next,
        task.id,
      ]);
      Task.addHistory(db, task.id, 'status', req.user.id, `${task.status} → ${next}`);
      emitDomainEvent('task:updated', req.user.domainId, {
        taskId: task.id,
        contractId: task.contract_id,
        action: 'status',
        status: next,
      });
    }

    res.json({ task: Task.findById(db, task.id) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// FR-011: the assigned prestador completes their own task. Text is required,
// photos optional (spec edge case: conclusão exige texto; fotos opcionais).
// Trigger 2/4: completion mail to management.
async function completeTask(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const row = getTaskOr404(db, req.params.id);
    // Alheia invisível (FR-013): other prestadores get 404, not 403.
    if (!canSeeTask(req.user, row)) {
      return res.status(404).json({ error: 'Task not found' });
    }
    if (req.user.role !== 'prestador' || row.assignee_id !== req.user.id) {
      return res.status(403).json({ error: 'Só o prestador responsável conclui a tarefa' });
    }
    if (row.status !== 'Revisão') {
      return res.status(400).json({ error: 'Conclusão exige status Revisão' });
    }

    const body = req.body || {};
    markCompleted(db, row, req.user, body.text); // throws 400 without text

    const photos = Array.isArray(body.photos) ? body.photos : [];
    if (photos.length > 10) {
      return res.status(400).json({ error: 'no máximo 10 fotos por conclusão' });
    }
    for (const photo of photos) {
      const ref = saveToUploads(photo);
      db.run('INSERT INTO task_photos(task_id, path, uploaded_by) VALUES (?, ?, ?)', [
        row.id,
        ref,
        req.user.id,
      ]);
    }
    Task.addHistory(db, row.id, 'complete', req.user.id, null);
    emitDomainEvent('task:updated', req.user.domainId, {
      taskId: row.id,
      contractId: row.contract_id,
      action: 'completed',
      status: 'Concluída',
    });
    await notify('completion', {
      to: managementEmails(db),
      subject: `Tarefa concluida: ${row.title}`,
      text: `Evento: completion\nTarefa: ${row.title}\nTexto: ${String(body.text).trim()}`,
    });

    res.json({ task: Task.findById(db, row.id) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// FR-012 / SC-006: gestor/admin reopens a concluded task with a motivo that
// lands in the history (who/why). Prestador cannot reopen.
// Trigger 3/4: reopening mail to management.
async function reopenTask(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const row = getTaskOr404(db, req.params.id);
    if (req.user.role === 'prestador') {
      return res.status(403).json({ error: 'Prestador não reabre tarefas' });
    }
    if (row.status !== 'Concluída') {
      return res.status(400).json({ error: 'Só tarefas Concluída podem ser reabertas' });
    }
    const motivo = (req.body || {}).motivo;
    if (!motivo || !String(motivo).trim()) {
      return res.status(400).json({ error: 'motivo é obrigatório' });
    }
    db.run(
      `UPDATE tasks SET status = 'Em Progresso', completed_text = NULL, completed_at = NULL,
       completed_by = NULL, updated_at = datetime('now') WHERE id = ?`,
      [row.id]
    );
    Task.addHistory(db, row.id, 'reopen', req.user.id, String(motivo).trim());
    emitDomainEvent('task:updated', req.user.domainId, {
      taskId: row.id,
      contractId: row.contract_id,
      action: 'reopened',
      status: 'Em Progresso',
    });
    await notify('reopening', {
      to: managementEmails(db),
      subject: `Tarefa reaberta: ${row.title}`,
      text: `Evento: reopening\nTarefa: ${row.title}\nMotivo: ${String(motivo).trim()}`,
    });
    res.json({ task: Task.findById(db, row.id) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

router.use(authenticateToken);
router.get('/', requireRole('admin', 'gestor', 'prestador'), listTasks);
router.get('/:id', requireRole('admin', 'gestor', 'prestador'), getTask);
router.put('/:id', requireRole('admin', 'gestor'), updateTaskFields);
router.patch('/:id/status', requireRole('admin', 'gestor', 'prestador'), updateTaskStatus);
router.post('/:id/complete', requireRole('admin', 'gestor', 'prestador'), completeTask);
router.post('/:id/reopen', requireRole('admin', 'gestor', 'prestador'), reopenTask);

router.createTask = createTask;
router.completeTask = completeTask;
router.reopenTask = reopenTask;
router.updateTaskStatus = updateTaskStatus;
router.assertLinkedPrestador = assertLinkedPrestador;
router.listTasks = listTasks;
router.markCompleted = markCompleted;

// FR-021: schema gate for task creation (SC-012).
const TASK_SCHEMA = {
  title: { required: true, type: 'string', min: 1, max: 200 },
  description: { type: 'string', max: 5000 },
  priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
  assignee_id: { type: 'integer', min: 1 },
  due_date: { type: 'date' },
};

// Nested mount at /api/contracts — param lives in the route path so Express
// 4 exposes it (app.use mount-path params do not reach a sub-router).
const nested = express.Router();
nested.post(
  '/:contractId/tasks',
  requireRole('admin', 'gestor'),
  validate(TASK_SCHEMA),
  createTask
);
router.nested = nested;

module.exports = router;
