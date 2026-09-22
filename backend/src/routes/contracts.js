'use strict';

const express = require('express');
const router = express.Router();
const Contract = require('../models/Contract');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { getDomainDb } = require('../config/database');
const { generateContractPdf, exportContractCsv } = require('../services/report');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function validDate(value) {
  return typeof value === 'string' && DATE_RE.test(value) && !Number.isNaN(Date.parse(value));
}

function parseBodyDates(body) {
  if (!body.start_date || !validDate(body.start_date)) throw httpError(400, 'start_date must be YYYY-MM-DD');
  if (!body.forecast_date || !validDate(body.forecast_date)) {
    throw httpError(400, 'forecast_date must be YYYY-MM-DD');
  }
}

function getContractOr404(db, id) {
  const row = db.get('SELECT * FROM contracts WHERE id = ?', [Number(id)]);
  if (!row) throw httpError(404, 'Contract not found');
  return row;
}

// FR-006: gestor/admin creates a contract with finalidade + dates (AD-003
// remodel target — contracts replace projects).
function createContract(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const body = req.body || {};
    if (!body.name || !String(body.name).trim()) throw httpError(400, 'name is required');
    parseBodyDates(body);

    let finalidadeId = null;
    if (body.finalidade_id !== undefined && body.finalidade_id !== null) {
      const finalidade = db.get('SELECT id, active FROM finalidades WHERE id = ?', [
        Number(body.finalidade_id),
      ]);
      if (!finalidade) throw httpError(400, 'finalidade_id does not exist');
      if (!finalidade.active) throw httpError(400, 'finalidade is retired');
      finalidadeId = finalidade.id;
    }

    db.run(
      `INSERT INTO contracts(name, object, finalidade_id, start_date, forecast_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        String(body.name).trim(),
        body.object ? String(body.object) : null,
        finalidadeId,
        body.start_date,
        body.forecast_date,
        req.user.id,
      ]
    );
    const row = getContractOr404(
      db,
      db.get('SELECT MAX(id) AS id FROM contracts WHERE created_by = ?', [req.user.id]).id
    );
    res.status(201).json({ contract: Contract.decorate(db, row) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// FR-026: paged list. Prestador sees only contracts linked to them (FR-013);
// admin/gestor see the domain.
function listContracts(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    let base;
    let params;
    if (req.user.role === 'prestador') {
      base = `FROM contracts c
              JOIN contract_prestadores cp ON cp.contract_id = c.id AND cp.user_id = ?`;
      params = [req.user.id];
    } else {
      base = 'FROM contracts c';
      params = [];
    }

    let statusWhere = '';
    const statusParams = [];
    if (req.query.status) {
      if (!['vigente', 'encerrado'].includes(req.query.status)) {
        return res.status(400).json({ error: 'status must be vigente or encerrado' });
      }
      statusWhere = ' WHERE c.status = ?';
      statusParams.push(req.query.status);
    }
    const total = db.get(`SELECT COUNT(*) AS c ${base}${statusWhere}`, [
      ...params,
      ...statusParams,
    ]).c;
    const rows = db.all(
      `SELECT c.* ${base}${statusWhere} ORDER BY c.id LIMIT ? OFFSET ?`,
      [...params, ...statusParams, limit, offset]
    );

    res.json({
      contracts: rows.map((row) => Contract.decorate(db, row)),
      total,
      limit,
      offset,
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

function getContract(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const row = getContractOr404(db, req.params.id);
    if (req.user.role === 'prestador') {
      const linked = db.get(
        'SELECT 1 AS ok FROM contract_prestadores WHERE contract_id = ? AND user_id = ?',
        [row.id, req.user.id]
      );
      if (!linked) return res.status(404).json({ error: 'Contract not found' });
    }
    res.json({ contract: Contract.decorate(db, row) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

function updateContract(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const row = getContractOr404(db, req.params.id);
    const body = req.body || {};
    const fields = [];
    const params = [];
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return res.status(400).json({ error: 'name cannot be empty' });
      fields.push('name = ?');
      params.push(String(body.name).trim());
    }
    if (body.object !== undefined) {
      fields.push('object = ?');
      params.push(body.object);
    }
    if (body.finalidade_id !== undefined) {
      fields.push('finalidade_id = ?');
      params.push(body.finalidade_id === null ? null : Number(body.finalidade_id));
    }
    if (body.start_date !== undefined || body.forecast_date !== undefined) {
      const start = body.start_date ?? row.start_date;
      const forecast = body.forecast_date ?? row.forecast_date;
      if (!validDate(start) || !validDate(forecast)) {
        return res.status(400).json({ error: 'dates must be YYYY-MM-DD' });
      }
      fields.push('start_date = ?', 'forecast_date = ?');
      params.push(start, forecast);
    }
    if (!fields.length) return res.json({ contract: Contract.decorate(db, row) });
    fields.push("updated_at = datetime('now')");
    params.push(row.id);
    db.run(`UPDATE contracts SET ${fields.join(', ')} WHERE id = ?`, params);
    res.json({ contract: Contract.decorate(db, getContractOr404(db, row.id)) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// FR-007: link a prestador to the contract.
function linkPrestador(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const row = getContractOr404(db, req.params.id);
    const userId = Number((req.body || {}).user_id);
    if (!userId) return res.status(400).json({ error: 'user_id is required' });
    const user = db.get('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'prestador') {
      return res.status(400).json({ error: 'Only prestador users can be linked' });
    }
    const existing = db.get(
      'SELECT 1 AS ok FROM contract_prestadores WHERE contract_id = ? AND user_id = ?',
      [row.id, userId]
    );
    if (existing) return res.status(409).json({ error: 'Prestador already linked' });
    db.run('INSERT INTO contract_prestadores(contract_id, user_id) VALUES (?, ?)', [row.id, userId]);
    res.status(201).json({ contract: Contract.decorate(db, getContractOr404(db, row.id)) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// FR-007: unlink is blocked while that prestador still has open tasks.
function unlinkPrestador(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const row = getContractOr404(db, req.params.id);
    const userId = Number(req.params.userId);
    const linked = db.get(
      'SELECT 1 AS ok FROM contract_prestadores WHERE contract_id = ? AND user_id = ?',
      [row.id, userId]
    );
    if (!linked) return res.status(404).json({ error: 'Prestador not linked' });
    const open = db.get(
      `SELECT COUNT(*) AS c FROM tasks
       WHERE contract_id = ? AND assignee_id = ? AND status != 'Concluída'`,
      [row.id, userId]
    ).c;
    if (open > 0) {
      return res
        .status(400)
        .json({ error: 'Tarefas abertas travam desvinculação', open_tasks: open });
    }
    db.run('DELETE FROM contract_prestadores WHERE contract_id = ? AND user_id = ?', [
      row.id,
      userId,
    ]);
    res.json({ contract: Contract.decorate(db, getContractOr404(db, row.id)) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// FR-008: prorrogação — moves the effective status from atrasado back to
// vigente (SC-003). Encerrado contracts cannot be extended.
function extendContract(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const row = getContractOr404(db, req.params.id);
    if (row.status === 'encerrado') {
      return res.status(400).json({ error: 'Encerrado contract cannot be extended' });
    }
    const forecast = (req.body || {}).forecast_date;
    if (!validDate(forecast)) {
      return res.status(400).json({ error: 'forecast_date must be YYYY-MM-DD' });
    }
    db.run("UPDATE contracts SET forecast_date = ?, updated_at = datetime('now') WHERE id = ?", [
      forecast,
      row.id,
    ]);
    res.json({ contract: Contract.decorate(db, getContractOr404(db, row.id)) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// FR-008: encerramento — final status.
function closeContract(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const row = getContractOr404(db, req.params.id);
    if (row.status === 'encerrado') {
      return res.status(400).json({ error: 'Contract already encerrado' });
    }
    db.run("UPDATE contracts SET status = 'encerrado', updated_at = datetime('now') WHERE id = ?", [
      row.id,
    ]);
    res.json({ contract: Contract.decorate(db, getContractOr404(db, row.id)) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// FR-009: only admin deletes, and deletion removes the contract's data.
function deleteContract(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const row = getContractOr404(db, req.params.id);
    const taskIds = db.all('SELECT id FROM tasks WHERE contract_id = ?', [row.id]).map((t) => t.id);
    for (const taskId of taskIds) {
      db.run('DELETE FROM attachments WHERE task_id = ?', [taskId]);
      db.run('DELETE FROM task_photos WHERE task_id = ?', [taskId]);
      db.run('DELETE FROM comments WHERE task_id = ?', [taskId]);
      db.run('DELETE FROM task_history WHERE task_id = ?', [taskId]);
    }
    db.run('DELETE FROM tasks WHERE contract_id = ?', [row.id]);
    db.run('DELETE FROM contract_prestadores WHERE contract_id = ?', [row.id]);
    db.run('DELETE FROM contracts WHERE id = ?', [row.id]);
    res.json({ message: 'Contract deleted' });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// FR-018: gestor/admin generate the per-contract report (PDF primary, CSV).
function reportPdf(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const row = getContractOr404(db, req.params.id);
    const buf = generateContractPdf(db, row.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="contrato-${row.id}.pdf"`);
    res.send(buf);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

function reportCsv(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const row = getContractOr404(db, req.params.id);
    const csv = exportContractCsv(db, row.id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="contrato-${row.id}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// FR-021: schema gate ahead of the handler (SC-012: payload → validação).
const CONTRACT_SCHEMA = {
  name: { required: true, type: 'string', min: 1, max: 200 },
  object: { type: 'string', max: 2000 },
  start_date: { required: true, type: 'date' },
  forecast_date: { required: true, type: 'date' },
  finalidade_id: { type: 'integer', min: 1 },
};

router.use(authenticateToken);
router.get('/', requireRole('admin', 'gestor', 'prestador'), listContracts);
router.post('/', requireRole('admin', 'gestor'), validate(CONTRACT_SCHEMA), createContract);
router.get('/:id', requireRole('admin', 'gestor', 'prestador'), getContract);
router.put('/:id', requireRole('admin', 'gestor'), updateContract);
router.post('/:id/prestadores', requireRole('admin', 'gestor'), linkPrestador);
router.delete('/:id/prestadores/:userId', requireRole('admin', 'gestor'), unlinkPrestador);
router.post('/:id/prorrogar', requireRole('admin', 'gestor'), extendContract);
router.post('/:id/encerrar', requireRole('admin', 'gestor'), closeContract);
router.get('/:id/report.pdf', requireRole('admin', 'gestor'), reportPdf);
router.get('/:id/report.csv', requireRole('admin', 'gestor'), reportCsv);
// FR-009: admin only — requireRole('admin') after the gestor-capable routes.
router.delete('/:id', requireRole('admin'), deleteContract);

router.createContract = createContract;
router.linkPrestador = linkPrestador;
router.unlinkPrestador = unlinkPrestador;
router.extendContract = extendContract;
router.closeContract = closeContract;
router.deleteContract = deleteContract;
router.listContracts = listContracts;
router.getContract = getContract;

module.exports = router;
