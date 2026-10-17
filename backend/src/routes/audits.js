'use strict';

// E011 US1/US2 — rotas de auditoria: visão das tarefas executadas e
// classificação. Controllers puros; guards montados no fim do arquivo
// (deny-by-default: authenticateToken → scopeDomain → requireRole — FR-006).
// Nunca escreve em tabelas de E003: leituras + task_classifications apenas.

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole, scopeDomain } = require('../middleware/auth');
const { getDomainDb } = require('../config/database');
const Task = require('../models/Task');
const TaskClassification = require('../models/TaskClassification');
const { code, label } = require('../config/enums');

// Estados da visão de executadas — literais de status de E003 (FR-001), em
// texto PT: o gate responde 400 com estes literais e o SQL compara o código
// do enum (config/enums.js, fase 3).
const EXECUTED = ['Revisão', 'Concluída'];

// Domínio de estados da classificação — exatamente os três literais de
// FR-002, o mesmo conjunto do CHECK da tabela (a rota responde 400 antes de
// qualquer escrita; o CHECK é a segunda linha de defesa).
const STATES = ['atendido plenamente', 'atendido com resalva', 'deficiente (a corrigir)'];

// GET /api/v2/audits/tasks — só Revisão/Concluída do domínio do token (FR-001).
// Cada item carrega a classificação corrente (null quando ainda não
// classificada) conforme contracts/openapi.yaml (AuditTaskItem).
function listAuditTasks(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const rows = db.all('SELECT * FROM tasks WHERE status IN (?, ?) ORDER BY id', [
      code('tasks.status', EXECUTED[0]),
      code('tasks.status', EXECUTED[1]),
    ]);
    const tasks = rows.map((row) => ({
      ...Task.decorate(db, row),
      classification: TaskClassification.getByTask(db, row.id),
    }));
    res.json({ tasks });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// GET /api/v2/audits/tasks/:id — detalhe agrega histórico e anexos (FR-001).
// Tarefa de outro domínio simplesmente não existe no db do token → 404.
function getAuditTask(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const row = db.get('SELECT * FROM tasks WHERE id = ?', [Number(req.params.id)]);
    if (!row) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({
      ...Task.decorate(db, row),
      classification: TaskClassification.getByTask(db, row.id),
      history: Task.history(db, row.id),
      attachments: db.all('SELECT * FROM attachments WHERE task_id = ? ORDER BY id', [row.id]),
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// PUT /api/v2/audits/tasks/:id/classification — grava ou substitui a
// classificação corrente (FR-003: upsert, autor e data da última mudança).
// Validação primeiro (FR-002: estado inválido ou nota > 500 → 400 sem
// escrita), depois o gate de executadas (FR-004: fora de Revisão/Concluída →
// 400); tarefa de outro domínio não existe neste db → 404 (FR-004).
function putClassification(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const row = db.get('SELECT * FROM tasks WHERE id = ?', [Number(req.params.id)]);
    if (!row) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const body = req.body || {};
    if (!STATES.includes(body.state)) {
      return res.status(400).json({ error: `state must be one of ${STATES.join(', ')}` });
    }
    const note = body.note ?? null;
    if (note !== null && (typeof note !== 'string' || note.length > 500)) {
      return res.status(400).json({ error: 'note must be at most 500 characters' });
    }
    if (!EXECUTED.includes(label('tasks.status', row.status))) {
      return res.status(400).json({ error: `task must be in ${EXECUTED.join(' or ')}` });
    }
    const classification = TaskClassification.upsert(db, {
      task_id: row.id,
      state: body.state,
      note,
      classified_by: req.user.id,
    });
    res.json(classification);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// --- FR-006: isolamento e papéis antes de qualquer consulta ---------------
router.use(authenticateToken);
router.use(scopeDomain());
router.use(requireRole('auditor', 'admin', 'gestor'));

router.get('/tasks', listAuditTasks);
router.get('/tasks/:id', getAuditTask);
router.put('/tasks/:id/classification', putClassification);

router.listAuditTasks = listAuditTasks;
router.getAuditTask = getAuditTask;
router.putClassification = putClassification;

module.exports = router;
