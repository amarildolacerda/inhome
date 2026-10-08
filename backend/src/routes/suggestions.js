'use strict';

const express = require('express');
const router = express.Router(); // /api/suggestions (top-level, T015-T018)
const nested = express.Router(); // /api/contracts/:id/analysis|suggestions
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { getDomainDb } = require('../config/database');
const opencodeConfig = require('../config/opencode');
const ContractDefinition = require('../models/ContractDefinition');
const TaskSuggestion = require('../models/TaskSuggestion');
const opencode = require('../services/opencode');
const { emitDomainEvent, emitWorkflowActivated } = require('../services/events');

// FR-003: returns the list of mandatory definitions that are missing for the
// contract. The 6 columns are NOT NULL, so an existing version is complete —
// "missing" means no version has ever been saved.
function assertDefinitionsComplete(db, contractId) {
  if (ContractDefinition.latest(db, contractId)) return [];
  return [...ContractDefinition.FIELDS];
}

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

// AnalysisInput has no client fields (additionalProperties: false): a body
// with any key is refused before the handler runs (FR-004/FR-020).
function hasClientFields(body) {
  return Boolean(body && typeof body === 'object' && Object.keys(body).length > 0);
}

function analysisResource(db, contractId) {
  const state = TaskSuggestion.analysisState(db, contractId);
  if (!state) {
    const err = new Error('Analysis not found');
    err.status = 404;
    return { err };
  }
  return { state };
}

// Top-level suggestion resolution (/api/suggestions/:sid): the contract scope
// comes from the token domain — a suggestion from another domain is a 404.
function suggestionOr404(db, rawSid) {
  const sid = Number(rawSid);
  const row = Number.isInteger(sid) && sid > 0 ? TaskSuggestion.find(db, sid) : null;
  if (!row) {
    const err = new Error('Suggestion not found');
    err.status = 404;
    return { err };
  }
  return { sid, row };
}

function itemOr404(db, sid, rawItemId) {
  const itemId = Number(rawItemId);
  const item =
    Number.isInteger(itemId) && itemId > 0
      ? db.get('SELECT * FROM suggestion_items WHERE id = ? AND suggestion_id = ?', [itemId, sid])
      : null;
  if (!item) {
    const err = new Error('Suggestion item not found');
    err.status = 404;
    return { err };
  }
  return { item };
}

// FR-007: `removed` is state, not a DELETE. Edits accept the openapi field
// names (titulo/descricao/justificativa/removed) and map to the columns.
const ITEM_INPUT_FIELDS = {
  titulo: 'title',
  descricao: 'description',
  justificativa: 'justification',
};

function buildItemUpdate(body) {
  const updates = [];
  const fail = (message) => ({ details: [message] });
  for (const [input, column] of Object.entries(ITEM_INPUT_FIELDS)) {
    if (!(input in body)) continue;
    const value = body[input];
    if (input === 'titulo') {
      if (typeof value !== 'string' || !value.trim() || value.length > 200) {
        return fail('titulo must be a non-empty string of at most 200 characters');
      }
    } else if (typeof value !== 'string' || value.length > 5000) {
      return fail(`${input} must be a string of at most 5000 characters`);
    }
    updates.push([column, value]);
  }
  if ('removed' in body) {
    if (typeof body.removed !== 'boolean') return fail('removed must be a boolean');
    updates.push(['removed', body.removed ? 1 : 0]);
  }
  if (!updates.length) return fail('at least one field is required');
  return { updates };
}

// GET /api/suggestions/:sid — detail with item ids, the base for FR-007.
function getSuggestion(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const found = suggestionOr404(db, req.params.sid);
    if (found.err) return res.status(404).json({ error: found.err.message });
    const suggestion = TaskSuggestion.findSerialized(db, found.sid, true);
    return res.json({ suggestion });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

// PATCH /api/suggestions/:sid/items/:itemId — edit fields or flip `removed`.
// Only while the suggestion is `sugerido`; any other state is 409 (FR-007).
function updateSuggestionItem(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const found = suggestionOr404(db, req.params.sid);
    if (found.err) return res.status(404).json({ error: found.err.message });
    if (found.row.status !== 'sugerido') {
      return res.status(409).json({ error: 'Suggestion not editable' });
    }
    const target = itemOr404(db, found.sid, req.params.itemId);
    if (target.err) return res.status(404).json({ error: target.err.message });

    const built = buildItemUpdate(req.body || {});
    if (built.details) {
      return res.status(400).json({ error: 'Validation failed', details: built.details });
    }
    const assignments = built.updates.map(([column]) => `${column} = ?`).join(', ');
    db.run(
      `UPDATE suggestion_items SET ${assignments}, updated_at = datetime('now') WHERE id = ?`,
      [...built.updates.map(([, value]) => value), target.item.id]
    );
    const updated = db.get('SELECT * FROM suggestion_items WHERE id = ?', [target.item.id]);
    return res.json({ item: TaskSuggestion.serializeItem(updated) });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

const REFINE_SCHEMA = {
  instrucoes: { required: true, type: 'string', min: 1, max: 5000 },
};

// POST /api/suggestions/:sid/refine — FR-008/AD-006: synchronous refinement.
// The CLI runs FIRST; only a successful run creates the new version (row +
// items inside one transaction). The previous version is never touched. A job
// in progress or a non-`sugerido` state answers 409 (refaça a análise).
async function refineSuggestion(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const found = suggestionOr404(db, req.params.sid);
    if (found.err) return res.status(404).json({ error: found.err.message });
    if (found.row.status !== 'sugerido') {
      return res.status(409).json({ error: 'Refine allowed only while the suggestion is sugerido' });
    }
    if (TaskSuggestion.activeJob(db, found.row.contract_id)) {
      return res.status(409).json({ error: 'Refine allowed only while the suggestion is sugerido' });
    }
    if (!opencodeConfig.isEnabled()) {
      return res.status(400).json({ error: 'OpenCode integration disabled' });
    }

    const { stdout } = await opencode.requestRefinement(db, found.row, req.body.instrucoes);
    const items = TaskSuggestion.parseSuggestion(stdout);
    const created = db.transaction((tx) =>
      TaskSuggestion.refineSuggestion(tx, {
        sourceId: found.sid,
        items,
        instructions: req.body.instrucoes,
        userId: req.user.id,
      })
    );
    if (!created) return res.status(404).json({ error: 'Suggestion not found' });
    return res.status(201).json({
      suggestion: TaskSuggestion.findSerialized(db, created.id, true),
    });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

// POST /api/suggestions/:sid/approve — FR-009/FR-010/AD-003: materializes the
// kept items as the contract's official tasks and activates the workflow
// version, all inside ONE transaction. Empty kept list → 400; any state other
// than `sugerido` → 409; only gestor (FR-007/FR-019). The `workflow_activated`
// event fires only after the commit (FR-012).
function approveSuggestion(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const found = suggestionOr404(db, req.params.sid);
    if (found.err) return res.status(404).json({ error: found.err.message });
    if (found.row.status !== 'sugerido') {
      return res
        .status(409)
        .json({ error: 'Approval allowed only while the suggestion is sugerido' });
    }
    if (TaskSuggestion.countKeptItems(db, found.sid) === 0) {
      return res.status(400).json({ error: 'Approval requires at least one kept item' });
    }

    const { activateWorkflow } = require('./workflow');
    const result = db.transaction((tx) =>
      activateWorkflow(tx, { suggestion: found.row, userId: req.user.id })
    );
    emitWorkflowActivated(req.user.domainId, {
      contractId: found.row.contract_id,
      workflowVersionId: result.workflow.id,
      suggestionId: found.sid,
    });
    return res.status(201).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

// POST /api/contracts/:id/analysis — FR-003 gate first (400 + missing), then
// integration state: disabled 400, running job 409; otherwise a new suggestion
// version is queued and answered with 202 + Location (FR-021 polling).
function startAnalysis(req, res) {
  try {
    if (hasClientFields(req.body)) {
      return res
        .status(400)
        .json({ error: 'Validation failed', details: ['body must not contain fields'] });
    }
    const db = getDomainDb(req.user.domainId);
    const found = contractOr404(db, req.params.id);
    if (found.err) return res.status(404).json({ error: found.err.message });

    const missing = assertDefinitionsComplete(db, found.id);
    if (missing.length) {
      return res.status(400).json({ error: 'Missing required definitions', missing });
    }
    if (!opencodeConfig.isEnabled()) {
      return res.status(400).json({ error: 'OpenCode integration disabled' });
    }
    const active = TaskSuggestion.activeJob(db, found.id);
    if (active) return res.status(409).json({ error: 'Analysis already in progress' });

    const definitions = ContractDefinition.latest(db, found.id);
    const suggestion = TaskSuggestion.createSuggestion(db, {
      contractId: found.id,
      definitionsId: definitions.id,
      kind: 'analise',
      userId: req.user.id,
    });
    emitDomainEvent('analysis_state', req.user.domainId, {
      contractId: found.id,
      suggestionId: suggestion.id,
      status: 'pendente',
      error: null,
    });
    setImmediate(() => {
      opencode.runAnalysisJob(req.user.domainId, suggestion.id).catch(() => {});
    });

    const { state } = analysisResource(db, found.id);
    res.status(202).set('Location', `/api/contracts/${found.id}/analysis`);
    return res.json({ analysis: state });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

// GET /api/contracts/:id/analysis — FR-021 polling resource. The reader lives
// in server.js (getAnalysisStatus) per plan Requirement Coverage Map.
function getAnalysis(req, res) {
  try {
    const { getAnalysisStatus } = require('../server'); // lazy: server mounts this router
    const analysis = getAnalysisStatus(req.user.domainId, Number(req.params.id));
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
    return res.json({ analysis });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

// POST /api/contracts/:id/analysis/retry — manual retry only: falha → pendente
// re-runs the same row; any other state answers 409 (FR-006/FR-018).
function retryAnalysis(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const found = contractOr404(db, req.params.id);
    if (found.err) return res.status(404).json({ error: found.err.message });

    const row = TaskSuggestion.latestForContract(db, found.id, 'analise');
    if (!row) return res.status(404).json({ error: 'Analysis not found' });
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
    emitDomainEvent('analysis_state', req.user.domainId, {
      contractId: found.id,
      suggestionId: row.id,
      status: 'pendente',
      error: null,
    });
    setImmediate(() => {
      opencode.runAnalysisJob(req.user.domainId, row.id).catch(() => {});
    });

    const { state } = analysisResource(db, found.id);
    res.status(202).set('Location', `/api/contracts/${found.id}/analysis`);
    return res.json({ analysis: state });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

// GET /api/contracts/:id/suggestions — every analysis version of the contract,
// newest first (FR-008 refines append, FR-017 keeps them consultable). Scoped
// to kind='analise': reviews are listed through /review, so "sem análise" is
// exactly an empty list. Contract resolved inside the caller's domain (404
// outside), gestor only (FR-019).
function listSuggestions(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const found = contractOr404(db, req.params.id);
    if (found.err) return res.status(404).json({ error: found.err.message });
    const suggestions = TaskSuggestion.listByContract(db, found.id, 'analise').map((row) =>
      TaskSuggestion.serialize(row, TaskSuggestion.listItems(db, row.id))
    );
    return res.json({ suggestions });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

nested.use(authenticateToken);
nested.post('/:id/analysis', requireRole('gestor'), startAnalysis);
nested.get('/:id/analysis', requireRole('gestor'), getAnalysis);
nested.post('/:id/analysis/retry', requireRole('gestor'), retryAnalysis);
nested.get('/:id/suggestions', requireRole('gestor'), listSuggestions);

router.use(authenticateToken);
router.get('/:sid', requireRole('gestor'), getSuggestion);
router.patch('/:sid/items/:itemId', requireRole('gestor'), updateSuggestionItem);
router.post('/:sid/refine', requireRole('gestor'), validate(REFINE_SCHEMA), refineSuggestion);
router.post('/:sid/approve', requireRole('gestor'), approveSuggestion);

router.assertDefinitionsComplete = assertDefinitionsComplete;
router.startAnalysis = startAnalysis;
router.getAnalysis = getAnalysis;
router.retryAnalysis = retryAnalysis;
router.getSuggestion = getSuggestion;
router.listSuggestions = listSuggestions;
router.updateSuggestionItem = updateSuggestionItem;
router.refineSuggestion = refineSuggestion;
router.approveSuggestion = approveSuggestion;
router.nested = nested;

module.exports = router;
