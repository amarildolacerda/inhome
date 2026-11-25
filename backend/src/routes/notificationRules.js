'use strict';

// 00025 (E023): rotas da régua de notificação. Mesmo padrão E001/E022:
// authenticateToken -> scopeDomain -> requireRole antes de qualquer leitura
// ou escrita. Admin e gestor apenas; nenhum canal novo entra (PDD-008).

const express = require('express');
const { authenticateToken, requireRole, scopeDomain } = require('../middleware/auth');
const { getDomainDb } = require('../config/database');
const {
  saveRule,
  setRuleActive,
  listRules,
  loadRuleSnapshot,
} = require('../services/notificationRules');

const ROLES = ['admin', 'gestor'];
const router = express.Router();

function fail(res, error) {
  const status = error.status || 500;
  return res.status(status).json(
    error.code ? { error: error.message, code: error.code } : { error: error.message }
  );
}

function list(req, res) {
  try {
    res.json({ rules: listRules(getDomainDb(req.user.domainId)) });
  } catch (error) {
    fail(res, error);
  }
}

function putRule(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const rule = saveRule(db, req.params.eventType, req.body, req.user.id, req.body?.windows);
    res.json({ rule });
  } catch (error) {
    fail(res, error);
  }
}

function patchRule(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const rule = setRuleActive(db, req.params.eventType, req.body?.active, req.user.id);
    res.json({ rule });
  } catch (error) {
    fail(res, error);
  }
}

router.use(authenticateToken);
router.use(scopeDomain());
router.get('/rules', requireRole(...ROLES), list);
router.put('/rules/:eventType', requireRole(...ROLES), putRule);
router.patch('/rules/:eventType', requireRole(...ROLES), patchRule);

// Exportado para os testes de aceite (FR-105/FR-107/FR-115).
Object.assign(router, { list, putRule, patchRule, loadRuleSnapshot });

module.exports = router;
