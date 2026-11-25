'use strict';

// 00024 (E022): rotas da agenda de manutenção. Toda entrada passa por
// authenticateToken → scopeDomain → requireRole; o payload é validado antes de
// qualquer escrita (FR-103). O acionamento manual usa o mesmo serviço do sweep
// automático, inclusive a transação por domínio (FR-104/AD-007).

const express = require('express');
const router = express.Router();
const nested = express.Router();
const { authenticateToken, requireRole, scopeDomain } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { getDomainDb } = require('../config/database');
const {
  createMaintenanceRule,
  updateMaintenanceRule,
  listRules,
  listOccurrences,
  runMaintenanceSweep,
} = require('../services/maintenanceSchedules');

const WRITE_ROLES = ['admin', 'gestor'];
// FR-092: consulta também é restrita a admin/gestor (Scope da spec).
const READ_ROLES = ['admin', 'gestor'];

const CREATE_SCHEMA = {
  title: { required: true, type: 'string', min: 1, max: 120 },
  description: { type: 'string' },
  intervalDays: { required: true, type: 'integer', min: 1 },
  startDate: { required: true, type: 'date' },
  assigneeId: { type: 'integer', min: 1 },
  leadDays: { type: 'integer', min: 0, max: 90 },
};

const PATCH_SCHEMA = {
  title: { type: 'string', min: 1, max: 120 },
  description: { type: 'string' },
  intervalDays: { type: 'integer', min: 1 },
  startDate: { type: 'date' },
  assigneeId: { type: 'integer', min: 1 },
  leadDays: { type: 'integer', min: 0, max: 90 },
  active: { type: 'boolean' },
};

function fail(res, error) {
  const status = error.status || 500;
  return res.status(status).json(error.code ? { error: error.message, code: error.code } : { error: error.message });
}

function assertContract(db, contractId) {
  const contract = db.get('SELECT id FROM contracts WHERE id = ?', [Number(contractId)]);
  if (!contract) {
    const error = new Error('Contract not found');
    error.status = 404;
    error.code = 'CONTRACT_NOT_FOUND';
    throw error;
  }
}

function listSchedules(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    assertContract(db, req.params.id);
    res.json({
      rules: listRules(db, req.params.id),
      occurrences: listOccurrences(db, req.params.id),
    });
  } catch (error) {
    fail(res, error);
  }
}

function createRule(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const rule = createMaintenanceRule(db, req.params.id, req.body, req.user.id);
    res.status(201).json({ rule });
  } catch (error) {
    fail(res, error);
  }
}

function updateRule(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const rule = updateMaintenanceRule(db, req.params.id, req.params.ruleId, req.body, req.user.id);
    res.json({ rule });
  } catch (error) {
    fail(res, error);
  }
}

function runSweep(req, res) {
  try {
    res.json(runMaintenanceSweep({ domainId: req.user.domainId }));
  } catch (error) {
    fail(res, error);
  }
}

nested.use(authenticateToken);
nested.use(scopeDomain());
nested.get('/:id/maintenance-schedules', requireRole(...READ_ROLES), listSchedules);
nested.post('/:id/maintenance-schedules', requireRole(...WRITE_ROLES), validate(CREATE_SCHEMA), createRule);
nested.patch('/:id/maintenance-schedules/:ruleId', requireRole(...WRITE_ROLES), validate(PATCH_SCHEMA), updateRule);

router.use(authenticateToken);
router.use(scopeDomain());
router.post('/sweep', requireRole(...WRITE_ROLES), runSweep);

Object.assign(nested, { assertContract, listSchedules, createRule, updateRule });
Object.assign(router, { runSweep, nested });

module.exports = router;
