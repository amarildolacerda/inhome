'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole, scopeDomain } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { getDomainDb } = require('../config/database');
const ContractDefinition = require('../models/ContractDefinition');
const History = require('../models/History');

// FR-001: the 6 mandatory definition fields. Payload *validation* (type/max)
// runs in the middleware and answers 400 { error: "Validation failed",
// details }; blank/absent fields fall through to the handler, which answers
// 400 with `missing` (openapi saveDefinitions description).
const DEFINITION_SCHEMA = {
  finalidade: { type: 'string', max: 5000 },
  limitacoes: { type: 'string', max: 5000 },
  alvo: { type: 'string', max: 5000 },
  escopo: { type: 'string', max: 5000 },
  premissas: { type: 'string', max: 5000 },
  entregaveis: { type: 'string', max: 5000 },
};

// FR-019: `:id` resolves only inside req.user.domainId's database — another
// domain's contract simply does not exist here (404).
function contractOr404(db, rawId) {
  const id = Number(rawId);
  const contract = Number.isInteger(id)
    ? db.get('SELECT id FROM contracts WHERE id = ?', [id])
    : null;
  if (!contract) {
    const err = new Error('Contract not found');
    err.status = 404;
    return { err };
  }
  return { id };
}

// GET /api/contracts/:id/definitions — active version, 404 when none saved.
function getDefinitions(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const found = contractOr404(db, req.params.id);
    if (found.err) return res.status(404).json({ error: found.err.message });
    const definitions = ContractDefinition.latest(db, found.id);
    if (!definitions) return res.status(404).json({ error: 'Definitions not found' });
    return res.json({ definitions });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

// PUT /api/contracts/:id/definitions — append a new version (FR-001/FR-002).
function saveDefinitions(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const found = contractOr404(db, req.params.id);
    if (found.err) return res.status(404).json({ error: found.err.message });

    const missing = ContractDefinition.missingFields(req.body);
    if (missing.length) {
      return res.status(400).json({ error: 'Missing required definitions', missing });
    }

    const definitions = ContractDefinition.versionDefinitions(
      db,
      found.id,
      req.body,
      req.user.id
    );
    // FR-017: every saved version appends its author + date to entity_history.
    History.recordVersion(db, {
      entityType: 'definition',
      entityId: definitions.id,
      version: definitions.versao,
      snapshot: {
        finalidade: definitions.finalidade,
        limitacoes: definitions.limitacoes,
        alvo: definitions.alvo,
        escopo: definitions.escopo,
        premissas: definitions.premissas,
        entregaveis: definitions.entregaveis,
      },
      authorId: req.user.id,
    });
    return res.json({ definitions });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

// GET /api/contracts/:id/definitions/history — FR-017: versions with author
// and date, newest first.
function getDefinitionHistory(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const found = contractOr404(db, req.params.id);
    if (found.err) return res.status(404).json({ error: found.err.message });
    return res.json({ history: ContractDefinition.listVersions(db, found.id) });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

// FR-002/FR-019: definitions are edited by admin and gestor only; prestador
// never reaches the router handlers (403 before any query runs). scopeDomain
// refuses an explicit ?domainId= cross-domain probe (FR-019).
router.use(authenticateToken);
router.use(scopeDomain());
router.get('/:id/definitions', requireRole('admin', 'gestor'), getDefinitions);
router.put(
  '/:id/definitions',
  requireRole('admin', 'gestor'),
  validate(DEFINITION_SCHEMA),
  saveDefinitions
);
router.get('/:id/definitions/history', requireRole('admin', 'gestor'), getDefinitionHistory);

router.getDefinitions = getDefinitions;
router.saveDefinitions = saveDefinitions;
router.getDefinitionHistory = getDefinitionHistory;

module.exports = router;
