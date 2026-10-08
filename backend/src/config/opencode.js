'use strict';

// AD-001 / FR-018: OpenCode runs as a local CLI (`opencode run <prompt>`),
// spawned in-process. run() resolves exactly once with stdout or rejects —
// there is no automatic retry anywhere in this module (FR-018). The job layer
// decides what a rejection means (`falha` + manual retry).

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DEFAULT_TIMEOUT_MS = 60000; // FR-018: 60 s default; 30 s is the UX goal (SC-002)
const MIN_TIMEOUT_MS = 1000;

// FR-004/FR-020: the only fields that may reach the OpenCode payload —
// 6 definitions + contract identification + validity window.
const CONTEXT_ALLOWLIST = Object.freeze([
  'finalidade',
  'limitacoes',
  'alvo',
  'escopo',
  'premissas',
  'entregaveis',
  'identificacao',
  'vigencia',
]);

function dataDir() {
  return process.env.DATA_DIR || path.resolve(__dirname, '..', '..', '..', 'data');
}

function configPath() {
  return path.join(dataDir(), 'opencode-config.json');
}

// NEW-CONFIG: global (per DATA_DIR) integration settings; file-backed because
// no config table exists in this release. Defaults: enabled, 60000 ms.
function loadConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath(), 'utf8'));
    return {
      enabled: typeof raw.enabled === 'boolean' ? raw.enabled : true,
      timeout_ms:
        Number.isInteger(raw.timeout_ms) && raw.timeout_ms >= MIN_TIMEOUT_MS
          ? raw.timeout_ms
          : DEFAULT_TIMEOUT_MS,
      updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : null,
    };
  } catch {
    return { enabled: true, timeout_ms: DEFAULT_TIMEOUT_MS, updated_at: null };
  }
}

function saveConfig(patch) {
  const next = {
    ...loadConfig(),
    ...patch,
    updated_at: new Date().toISOString(),
  };
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.writeFileSync(configPath(), `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

function isEnabled() {
  return loadConfig().enabled;
}

function getTimeoutMs() {
  return loadConfig().timeout_ms;
}

// Single CLI invocation with a hard timeout. On timeout the child is killed
// and the promise rejects (ETIMEDOUT) — no second attempt (FR-018).
function run({ prompt, timeoutMs }) {
  const bin = process.env.OPENCODE_BIN || 'opencode';
  const extraArgs = (process.env.OPENCODE_ARGS || '').split(/\s+/).filter(Boolean);
  const args = [...extraArgs, 'run', prompt];
  const timeout =
    Number.isInteger(timeoutMs) && timeoutMs >= MIN_TIMEOUT_MS ? timeoutMs : DEFAULT_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      const err = new Error(`OpenCode timeout after ${timeout} ms`);
      err.code = 'ETIMEDOUT';
      reject(err);
    }, timeout);

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        const err = new Error(stderr.trim() || `OpenCode exited with code ${code}`);
        err.code = 'EOPENCODE';
        reject(err);
        return;
      }
      resolve({ stdout });
    });
  });
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  MIN_TIMEOUT_MS,
  CONTEXT_ALLOWLIST,
  loadConfig,
  saveConfig,
  isEnabled,
  getTimeoutMs,
  run,
};
