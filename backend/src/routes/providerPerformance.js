'use strict';

// 00026 (E024): leitura de desempenho do prestador. Mesmo padrão das rotas de
// relatório do domínio: JWT, escopo do domínio da sessão e papel admin/gestor
// antes de qualquer consulta. Nenhuma nota é gravada (AD-001).

const express = require('express');
const { authenticateToken, requireRole, scopeDomain } = require('../middleware/auth');
const { getDomainDb } = require('../config/database');
const {
  listPerformance,
  parsePerformanceQuery,
} = require('../services/providerPerformance');

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
    const query = parsePerformanceQuery(req.query);
    res.json(listPerformance(getDomainDb(req.user.domainId), query));
  } catch (error) {
    fail(res, error);
  }
}

router.use(authenticateToken);
router.use(scopeDomain());
router.get('/performance', requireRole(...ROLES), list);

// Exportado para os testes de aceite (FR-004/FR-009/FR-010/FR-012).
Object.assign(router, { list, listPerformance, parsePerformanceQuery });

module.exports = router;
