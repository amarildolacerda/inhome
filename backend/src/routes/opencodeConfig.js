'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const config = require('../config/opencode');

// NEW-CONFIG / FR-018: integration settings. `context_allowlist` is read-only
// (FR-004/FR-020); only gestor may change the configuration (Clarifications
// Q1 — admin edits definitions, never the integration).
const CONFIG_SCHEMA = {
  enabled: { type: 'boolean' },
  timeout_ms: { type: 'integer', min: config.MIN_TIMEOUT_MS },
};

function toResponse(stored) {
  return {
    config: {
      enabled: stored.enabled,
      timeout_ms: stored.timeout_ms,
      context_allowlist: [...config.CONTEXT_ALLOWLIST],
      updated_at: stored.updated_at,
    },
  };
}

function getConfig(req, res) {
  try {
    return res.json(toResponse(config.loadConfig()));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function updateConfig(req, res) {
  try {
    const body = req.body || {};
    if (Object.keys(body).length === 0) {
      return res
        .status(400)
        .json({ error: 'Validation failed', details: ['at least one field is required'] });
    }
    const patch = {};
    if (Object.prototype.hasOwnProperty.call(body, 'enabled')) patch.enabled = body.enabled;
    if (Object.prototype.hasOwnProperty.call(body, 'timeout_ms')) patch.timeout_ms = body.timeout_ms;
    return res.json(toResponse(config.saveConfig(patch)));
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

router.use(authenticateToken);
router.get('/config', requireRole('admin', 'gestor'), getConfig);
router.put('/config', requireRole('gestor'), validate(CONFIG_SCHEMA), updateConfig);

router.getConfig = getConfig;
router.updateConfig = updateConfig;

module.exports = router;
