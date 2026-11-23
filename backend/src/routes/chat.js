'use strict';

// 00016 (E016): canal por contrato, menu de cards e ponte para o extrator
// local. Toda rota passa por authenticateToken -> scopeDomain -> requireRole;
// o guard de contrato usa o vínculo ativo de contract_providers (STF-003).

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole, scopeDomain } = require('../middleware/auth');
const { getDomainDb } = require('../config/database');
const { saveToUploads, decodeAndValidate } = require('../middleware/upload');
const { code, label } = require('../config/enums');
const { emitDomainEvent } = require('../services/events');
const Task = require('../models/Task');
const taskRoutes = require('./tasks');
const analysis = require('../services/documentAnalysis');

const CHAT_CATEGORY = 'chat';
const MAX_BODY = 4000;
const ROLES = ['admin', 'gestor', 'prestador'];

function httpError(status, message, codeName) {
  const error = new Error(message);
  error.status = status;
  if (codeName) error.code = codeName;
  return error;
}

function fail(res, error) {
  const status = error.status || 500;
  return res.status(status).json(error.code ? { error: error.message, code: error.code } : { error: error.message });
}

function assertChatAccess(db, user, contractId) {
  const contract = db.get('SELECT * FROM contracts WHERE id = ?', [Number(contractId)]);
  if (!contract) throw httpError(404, 'Contract not found');
  if (user.role === 'admin' || user.role === 'gestor') return contract;
  if (user.role === 'prestador') {
    const linked = db.get(
      'SELECT 1 AS ok FROM contract_providers WHERE contract_id = ? AND user_id = ?',
      [contract.id, user.id]
    );
    if (linked) return contract;
  }
  throw httpError(403, 'Forbidden contract', 'CHAT_CONTRACT_FORBIDDEN');
}

function eligibleUserIds(db, contractId) {
  const rows = db.all(
    `SELECT DISTINCT u.id FROM users u
      LEFT JOIN contract_providers cp ON cp.user_id = u.id AND cp.contract_id = ?
     WHERE u.active = 1 AND u.role IN ('admin','gestor') AND u.role <> 'visitante'
     UNION
     SELECT cp.user_id AS id FROM contract_providers cp WHERE cp.contract_id = ?`,
    [Number(contractId), Number(contractId)]
  );
  return rows.map((row) => row.id);
}

function emitChatMessage(domainId, contractId, payload) {
  // Melhor esforço: qualquer falha na composição ou emissão do evento nunca
  // pode falhar o POST da mensagem (Clarify Q3 / HINT-003).
  try {
    const db = getDomainDb(domainId);
    return emitDomainEvent('chat_message', domainId, {
      contractId: Number(contractId),
      allowedUserIds: eligibleUserIds(db, contractId),
      ...payload,
    });
  } catch {
    return false;
  }
}

function decorateMessage(db, row) {
  const author = db.get('SELECT id, name, role FROM users WHERE id = ?', [row.author_id]);
  const attachments = db.all(
    "SELECT id, path, original_name, category FROM attachments WHERE message_id = ? AND category = 'chat' ORDER BY id",
    [row.id]
  );
  const report = analysis.getAnalysis(db, row.id);
  return {
    id: row.id,
    contract_id: row.contract_id,
    author_id: row.author_id,
    author_name: author ? author.name : null,
    body: row.body,
    created_at: row.created_at,
    attachments,
    analysis: report
      ? { id: report.id, status: report.status, extracted: report.extracted_json ? JSON.parse(report.extracted_json) : null, error: report.error }
      : null,
  };
}

function listMessages(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    assertChatAccess(db, req.user, req.params.id);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const total = db.get('SELECT COUNT(*) AS c FROM chat_messages WHERE contract_id = ?', [Number(req.params.id)]).c;
    const rows = db.all(
      'SELECT * FROM chat_messages WHERE contract_id = ? ORDER BY id LIMIT ? OFFSET ?',
      [Number(req.params.id), limit, offset]
    );
    res.json({ messages: rows.map((row) => decorateMessage(db, row)), total, limit, offset });
  } catch (error) {
    fail(res, error);
  }
}

function postMessage(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    assertChatAccess(db, req.user, req.params.id);
    const body = (req.body || {}).body;
    const file = (req.body || {}).filename ? req.body : null;
    if (body === undefined && !file) throw httpError(400, 'body or attachment is required');
    if (body !== undefined && (typeof body !== 'string' || body.length > MAX_BODY)) {
      throw httpError(400, `body must be a string of at most ${MAX_BODY} characters`);
    }
    // Validação de disco antes de qualquer escrita (400 sem mensagem parcial).
    if (file) decodeAndValidate(file);
    const text = body === undefined ? '' : body;
    db.run(
      'INSERT INTO chat_messages(contract_id, author_id, body) VALUES (?, ?, ?)',
      [Number(req.params.id), req.user.id, text]
    );
    const id = db.get('SELECT MAX(id) AS id FROM chat_messages WHERE contract_id = ?', [Number(req.params.id)]).id;
    let attachment = null;
    if (file) {
      const ref = saveToUploads(file);
      db.run(
        `INSERT INTO attachments(task_id, message_id, kind, path, original_name, uploaded_by, category)
         VALUES (NULL, ?, 'file', ?, ?, ?, ?)`,
        [id, ref, file.filename, req.user.id, CHAT_CATEGORY]
      );
      attachment = db.get('SELECT * FROM attachments WHERE message_id = ? ORDER BY id DESC LIMIT 1', [id]);
    }
    const message = decorateMessage(db, db.get('SELECT * FROM chat_messages WHERE id = ?', [id]));
    emitChatMessage(req.user.domainId, req.params.id, { messageId: id, message });
    if (attachment) {
      // Análise fora do caminho da requisição: falha nunca bloqueia o envio.
      setImmediate(() => {
        analysis
          .analyzeDocument({
            db,
            domainId: req.user.domainId,
            messageId: id,
            contractId: Number(req.params.id),
            attachmentPath: attachment.path,
            filename: attachment.original_name,
          })
          .catch(() => {});
      });
    }
    res.status(201).json({ message, attachment });
  } catch (error) {
    fail(res, error);
  }
}

function getAnalysis(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    assertChatAccess(db, req.user, req.params.id);
    const message = db.get('SELECT * FROM chat_messages WHERE id = ? AND contract_id = ?', [
      Number(req.params.mid), Number(req.params.id),
    ]);
    if (!message) throw httpError(404, 'Message not found');
    const report = analysis.getAnalysis(db, message.id);
    res.json({ analysis: report });
  } catch (error) {
    fail(res, error);
  }
}

async function retryAnalysis(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    assertChatAccess(db, req.user, req.params.id);
    const message = db.get('SELECT * FROM chat_messages WHERE id = ? AND contract_id = ?', [
      Number(req.params.mid), Number(req.params.id),
    ]);
    if (!message) throw httpError(404, 'Message not found');
    const report = analysis.getAnalysis(db, message.id);
    if (!report) throw httpError(404, 'Analysis not found');
    res.json({ analysis: await analysis.retryAnalysis({ db, domainId: req.user.domainId, analysisId: report.id }) });
  } catch (error) {
    fail(res, error);
  }
}

function visibleTasks(db, user, contractId, filter) {
  const rows = db.all('SELECT * FROM tasks WHERE contract_id = ? ORDER BY due_date, id', [Number(contractId)]);
  return rows
    .filter((row) => user.role === 'prestador' ? row.assignee_id === user.id : true)
    .filter(filter)
    .map((row) => Task.decorate(db, row));
}

function menuAlerts(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    assertChatAccess(db, req.user, req.params.id);
    const extracted = db.all(
      'SELECT id, source_kind, source_id, title, due_date, status FROM extracted_alerts WHERE contract_id = ? ORDER BY due_date, id',
      [Number(req.params.id)]
    );
    const events = db.all(
      'SELECT window_days, email_status FROM alert_events WHERE contract_id = ? ORDER BY window_days',
      [Number(req.params.id)]
    );
    res.json({ alerts: events, extracted });
  } catch (error) {
    fail(res, error);
  }
}

function menuUpcoming(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    assertChatAccess(db, req.user, req.params.id);
    const open = code('tasks.status', 'Concluída');
    const tasks = visibleTasks(db, req.user, req.params.id, (row) => row.status !== open && Boolean(row.due_date));
    res.json({ tasks });
  } catch (error) {
    fail(res, error);
  }
}

function menuCompleted(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    assertChatAccess(db, req.user, req.params.id);
    const done = code('tasks.status', 'Concluída');
    res.json({ tasks: visibleTasks(db, req.user, req.params.id, (row) => row.status === done) });
  } catch (error) {
    fail(res, error);
  }
}

function cardAction(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const contract = assertChatAccess(db, req.user, req.params.id);
    const row = db.get('SELECT * FROM tasks WHERE id = ? AND contract_id = ?', [
      Number(req.params.tid), contract.id,
    ]);
    if (!row) throw httpError(404, 'Task not found');
    // Clarify Q5: ver cards é por papel, agir é só na própria tarefa.
    if (row.assignee_id !== req.user.id) throw httpError(403, 'Only the assigned user can move the task', 'CARD_ACTION_FORBIDDEN');
    const current = label('tasks.status', row.status);
    const target = (req.body || {}).status;
    if (!Task.FLOW.includes(target)) {
      throw httpError(400, `status must be one of ${Task.FLOW.join(', ')}`);
    }
    if (Task.flowIndex(target) !== Task.flowIndex(current) + 1) {
      throw httpError(400, `Invalid flow: ${current} → ${target}`, 'TASK_INVALID_FLOW');
    }
    const text = (req.body || {}).text;
    if (target === 'Concluída') {
      taskRoutes.markCompleted(db, { ...row, status: current }, req.user, text);
      Task.addHistory(db, row.id, 'complete', req.user.id, null);
    } else {
      db.run('UPDATE tasks SET status = ?, updated_at = datetime(\'now\') WHERE id = ?', [code('tasks.status', target), row.id]);
      Task.addHistory(db, row.id, 'status', req.user.id, `${current} → ${target}`);
    }
    emitDomainEvent('task:updated', req.user.domainId, {
      taskId: row.id,
      contractId: contract.id,
      action: target === 'Concluída' ? 'completed' : 'status',
      status: target,
    });
    res.json({ task: Task.findById(db, row.id) });
  } catch (error) {
    fail(res, error);
  }
}

router.use(authenticateToken);
router.use(scopeDomain());
router.get('/:id/chat/messages', requireRole(...ROLES), listMessages);
router.post('/:id/chat/messages', requireRole(...ROLES), postMessage);
router.get('/:id/chat/messages/:mid/analysis', requireRole(...ROLES), getAnalysis);
router.post('/:id/chat/messages/:mid/analysis/retry', requireRole(...ROLES), retryAnalysis);
router.get('/:id/chat/menu/alerts', requireRole(...ROLES), menuAlerts);
router.get('/:id/chat/menu/upcoming', requireRole(...ROLES), menuUpcoming);
router.get('/:id/chat/menu/completed', requireRole(...ROLES), menuCompleted);
router.post('/:id/chat/tasks/:tid/action', requireRole(...ROLES), cardAction);

Object.assign(router, {
  listMessages,
  postMessage,
  getAnalysis,
  retryAnalysis,
  emitChatMessage,
  assertChatAccess,
  eligibleUserIds,
  menuAlerts,
  menuUpcoming,
  menuCompleted,
  cardAction,
  visibleTasks,
});

module.exports = router;
