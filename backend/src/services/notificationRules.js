'use strict';

// 00025 (E023): régua de notificação configurável. Reaproveita as janelas de
// E004 (readWindows), a sala de domínio de E004 (emitDomainEvent) e o e-mail
// opt-in de E010 (notify). Nenhum canal novo entra (PDD-008).
//
// AD-005/STF-002: a régua é lida uma vez por varredura. O snapshot derivado
// aqui vale até o fim da passagem; uma mudança concorrente só aparece na
// próxima. AD-003: a identidade (alerta, evento, etapa, canal) é gravada com
// UNIQUE antes de qualquer efeito colateral.

const path = require('node:path');
const { readWindows } = require('./alerts');

const SUPPORTED_EVENT_TYPES = new Set(['vigencia']);
const CHANNELS = ['in_app', 'email'];

function httpError(status, message, errorCode) {
  const error = new Error(message);
  error.status = status;
  if (errorCode) error.code = errorCode;
  return error;
}

function domainIdFromDb(db) {
  const id = Number(path.basename(String(db.filePath || ''), '.db'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function readDomainWindows(db, explicitWindows) {
  if (Array.isArray(explicitWindows) && explicitWindows.length > 0) {
    return [...new Set(explicitWindows)].sort((a, b) => a - b);
  }
  const domainId = domainIdFromDb(db);
  if (!domainId) return readWindows(null);
  const platform = require('../config/database').getPlatformDb();
  const raw = platform.get('SELECT alert_windows FROM domains WHERE id = ?', [domainId])?.alert_windows;
  return [...readWindows(raw)].sort((a, b) => a - b);
}

// FR-107: validação estrita antes de qualquer escrita. maxReminders 1–5,
// intervalDays inteiro positivo, active booleano e tipo do catálogo E004.
function validateRuleInput(body = {}, eventType) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw httpError(400, 'body must be an object', 'RULE_INPUT_INVALID');
  }
  if (!SUPPORTED_EVENT_TYPES.has(String(eventType))) {
    throw httpError(400, `unsupported event type: ${eventType}`, 'RULE_EVENT_TYPE_INVALID');
  }
  const { maxReminders, intervalDays, active } = body;
  if (!Number.isInteger(maxReminders) || maxReminders < 1 || maxReminders > 5) {
    throw httpError(400, 'maxReminders must be an integer between 1 and 5', 'RULE_MAX_REMINDERS_INVALID');
  }
  if (!Number.isInteger(intervalDays) || intervalDays <= 0) {
    throw httpError(400, 'intervalDays must be a positive integer', 'RULE_INTERVAL_INVALID');
  }
  if (active !== undefined && typeof active !== 'boolean') {
    throw httpError(400, 'active must be boolean', 'RULE_ACTIVE_INVALID');
  }
  return {
    eventType: String(eventType),
    maxReminders,
    intervalDays,
    active: active === undefined ? true : active,
  };
}

// FR-106/STF-001: da menor janela para a maior; acrescenta uma janela só
// quando a distância para a última selecionada satisfaz intervalDays.
// Janelas insuficientes => menos etapas que maxReminders => 400 sem escrita.
function deriveSteps(windows, maxReminders, intervalDays) {
  const ordered = [...new Set((windows || []).map(Number))]
    .filter((value) => Number.isInteger(value) && value > 0)
    .sort((a, b) => a - b);
  if (ordered.length === 0) {
    throw httpError(400, 'no active alert windows for the domain', 'RULE_WINDOWS_MISSING');
  }
  const selected = [ordered[0]];
  for (const window of ordered.slice(1)) {
    if (selected.length >= maxReminders) break;
    if (window - selected[selected.length - 1] >= intervalDays) selected.push(window);
  }
  if (selected.length < maxReminders) {
    throw httpError(
      400,
      `need ${maxReminders} windows respecting intervalDays=${intervalDays}; found ${selected.length}`,
      'RULE_WINDOWS_INSUFFICIENT'
    );
  }
  return selected.map((windowDays, index) => ({ step: index + 1, windowDays }));
}

function author(db, userId) {
  if (!userId) return null;
  return db.get('SELECT name FROM users WHERE id = ?', [userId])?.name ?? String(userId);
}

function formatRule(db, row) {
  if (!row) return null;
  const steps = db
    .all('SELECT step, window_days FROM notification_rule_steps WHERE rule_id = ? ORDER BY step', [row.id])
    .map((entry) => ({ step: entry.step, windowDays: entry.window_days }));
  return {
    eventType: row.event_type,
    maxReminders: row.max_reminders,
    intervalDays: row.interval_days,
    active: row.active === 1,
    steps,
    createdBy: author(db, row.created_by) ?? String(row.created_by),
    createdAt: row.created_at,
    updatedBy: row.updated_by ? author(db, row.updated_by) : null,
    updatedAt: row.updated_at ?? null,
  };
}

function listRules(db) {
  return db
    .all('SELECT * FROM notification_rules ORDER BY event_type')
    .map((row) => formatRule(db, row));
}

function getRule(db, eventType) {
  const row = db.get('SELECT * FROM notification_rules WHERE event_type = ?', [String(eventType)]);
  return formatRule(db, row);
}

// FR-105/FR-115: upsert atômico. Etapas antigas são substituídas (config),
// eventos emitidos permanecem: alert_events.rule_id/step são snapshots e a
// UNIQUE(contract_id,event_type,step,channel) continua protegendo a trilha.
function saveRule(db, eventType, body, userId, explicitWindows) {
  const input = validateRuleInput(body, eventType);
  const steps = deriveSteps(readDomainWindows(db, explicitWindows), input.maxReminders, input.intervalDays);
  const now = new Date().toISOString();
  const existing = db.get('SELECT id, created_by, created_at FROM notification_rules WHERE event_type = ?', [
    input.eventType,
  ]);
  db.transaction(() => {
    if (existing) {
      db.run(
        `UPDATE notification_rules
            SET max_reminders = ?, interval_days = ?, active = ?, updated_by = ?, updated_at = ?
          WHERE id = ?`,
        [input.maxReminders, input.intervalDays, input.active ? 1 : 0, userId, now, existing.id]
      );
      db.run('DELETE FROM notification_rule_steps WHERE rule_id = ?', [existing.id]);
    } else {
      db.run(
        `INSERT INTO notification_rules
           (event_type, max_reminders, interval_days, active, created_by, created_at, updated_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`,
        [input.eventType, input.maxReminders, input.intervalDays, input.active ? 1 : 0, userId, now]
      );
    }
    const ruleId = existing
      ? existing.id
      : db.get('SELECT id FROM notification_rules WHERE event_type = ?', [input.eventType]).id;
    for (const step of steps) {
      db.run('INSERT INTO notification_rule_steps(rule_id, step, window_days) VALUES (?, ?, ?)', [
        ruleId,
        step.step,
        step.windowDays,
      ]);
    }
  });
  return getRule(db, input.eventType);
}

// FR-113: desativação lógica. Nenhuma linha de evento ou etapa é apagada.
function setRuleActive(db, eventType, active, userId) {
  if (typeof active !== 'boolean') {
    throw httpError(400, 'active must be boolean', 'RULE_ACTIVE_INVALID');
  }
  if (!SUPPORTED_EVENT_TYPES.has(String(eventType))) {
    throw httpError(400, `unsupported event type: ${eventType}`, 'RULE_EVENT_TYPE_INVALID');
  }
  const existing = db.get('SELECT id FROM notification_rules WHERE event_type = ?', [String(eventType)]);
  if (!existing) {
    throw httpError(404, `no rule for event type: ${eventType}`, 'RULE_NOT_FOUND');
  }
  db.run(
    'UPDATE notification_rules SET active = ?, updated_by = ?, updated_at = ? WHERE id = ?',
    [active ? 1 : 0, userId, new Date().toISOString(), existing.id]
  );
  return getRule(db, String(eventType));
}

// HINT-004/AD-005: uma leitura por varredura. Snapshot vazio => domínio sem
// régua ativa => o motor E004 continua dono do evento.
function loadRuleSnapshot(db) {
  const rows = db.all('SELECT * FROM notification_rules WHERE active = 1');
  if (rows.length === 0) return null;
  const snapshot = {};
  for (const row of rows) {
    snapshot[row.event_type] = formatRule(db, row);
  }
  return snapshot;
}

function hasActiveRule(snapshot, eventType = 'vigencia') {
  return Boolean(snapshot && snapshot[String(eventType)]);
}

// AD-003: INSERT OR IGNORE grava a identidade antes de qualquer efeito. O
// retorno false significa "já emitido" — nenhum aviso e nenhum e-mail extra.
function insertReminder(db, { contractId, eventType, windowDays, ruleId, step, channel }) {
  if (!CHANNELS.includes(channel)) throw new Error(`unsupported channel: ${channel}`);
  let created = false;
  db.transaction(() => {
    db.run(
      `INSERT OR IGNORE INTO alert_events
         (contract_id, window_days, event_type, rule_id, step, email_status)
       VALUES (?, ?, ?, ?, ?, 'skipped')`,
      [contractId, windowDays, eventType, ruleId ?? null, step]
    );
    const row = db.get(
      'SELECT id FROM alert_events WHERE contract_id = ? AND window_days = ? AND event_type = ? AND step = ?',
      [contractId, windowDays, eventType, step]
    );
    const channelResult = db.run(
      `INSERT OR IGNORE INTO alert_event_channels
         (alert_event_id, contract_id, event_type, step, channel, status)
       VALUES (?, ?, ?, ?, ?, 'skipped')`,
      [row.id, contractId, eventType, step, channel]
    );
    created = channelResult.changes > 0;
  });
  return created;
}

function setReminderStatus(db, { contractId, eventType, step, channel, status }) {
  db.run(
    `UPDATE alert_event_channels SET status = ?
      WHERE contract_id = ? AND event_type = ? AND step = ? AND channel = ?`,
    [status, contractId, eventType, step, channel]
  );
  if (channel === 'email') {
    db.run(
      `UPDATE alert_events SET email_status = ?
        WHERE contract_id = ? AND event_type = ? AND step = ?`,
      [status, contractId, eventType, step]
    );
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve({ sent: false, timedOut: true }), ms).unref?.()),
  ]);
}

// FR-108/FR-109: escolhe a janela efetiva mais apertada que ainda contém os
// dias restantes, como E004, mas sobre as etapas da régua. Emite o aviso
// interno antes do e-mail; falha de SMTP só marca `failed` e nunca aborta.
async function emitRuleReminders({
  db,
  domainId,
  contracts,
  windows,
  snapshot,
  notifyFn,
  emailTimeoutMs = 5000,
  emitEvent,
}) {
  const rule = snapshot?.vigencia;
  const notify = notifyFn || require('./email').notify;
  const emit = emitEvent || require('./events').emitDomainEvent;
  const counters = { swept: 0, emitted: 0, emailed: 0, failed: 0 };
  if (!rule) return counters;

  for (const contract of contracts) {
    if (contract.perpetual || !contract.forecast_date) continue;
    const { daysUntil } = require('./alerts');
    const days = daysUntil(contract.forecast_date);
    if (days < 0) continue;
    const applicable = rule.steps.filter((entry) => entry.windowDays >= days);
    if (applicable.length === 0) continue;
    const current = applicable.reduce((best, entry) =>
      entry.windowDays < best.windowDays ? entry : best
    );
    // Uma janela por contrato por varredura, dedupada antes do envio.
    if (!insertReminder(db, {
      contractId: contract.id,
      eventType: rule.eventType,
      windowDays: current.windowDays,
      ruleId: null,
      step: current.step,
      channel: 'in_app',
    })) {
      continue;
    }
    counters.swept += 1;
    emit('contract_reminder', domainId, {
      contractId: contract.id,
      name: contract.name,
      eventType: rule.eventType,
      step: current.step,
      windowDays: current.windowDays,
      forecastDate: contract.forecast_date,
    });
    setReminderStatus(db, {
      contractId: contract.id,
      eventType: rule.eventType,
      step: current.step,
      channel: 'in_app',
      status: 'sent',
    });
    counters.emitted += 1;

    if (!contract.creator_email) continue;
    if (!insertReminder(db, {
      contractId: contract.id,
      eventType: rule.eventType,
      windowDays: current.windowDays,
      ruleId: null,
      step: current.step,
      channel: 'email',
    })) {
      continue;
    }
    const result = await withTimeout(
      notify(rule.eventType, {
        to: [contract.creator_email],
        subject: `Lembrete ${current.windowDays} dias: ${contract.name}`,
        text: `Contrato: ${contract.name}\nPrevisão: ${contract.forecast_date}\nEtapa: ${current.step} (${current.windowDays} dias)`,
      }),
      emailTimeoutMs
    );
    const status = result.sent ? 'sent' : result.skipped ? 'skipped' : 'failed';
    setReminderStatus(db, {
      contractId: contract.id,
      eventType: rule.eventType,
      step: current.step,
      channel: 'email',
      status,
    });
    if (status === 'sent') counters.emailed += 1;
    else if (status === 'failed') counters.failed += 1;
  }
  return counters;
}

// FR-112: trilha do painel com tipo, etapa/janela e situação por canal.
function listReminders(db, limit = 200) {
  return db
    .all(
      `SELECT ch.contract_id, ch.event_type, ch.step, ae.window_days, ch.channel, ch.status
         FROM alert_event_channels ch
         JOIN alert_events ae ON ae.id = ch.alert_event_id
        ORDER BY ch.id DESC LIMIT ?`,
      [Math.min(Math.max(Number(limit) || 200, 1), 500)]
    )
    .map((row) => ({
      contractId: row.contract_id,
      eventType: row.event_type,
      step: row.step,
      windowDays: row.window_days,
      channel: row.channel,
      status: row.status,
    }));
}

module.exports = {
  validateRuleInput,
  deriveSteps,
  saveRule,
  setRuleActive,
  listRules,
  getRule,
  loadRuleSnapshot,
  hasActiveRule,
  insertReminder,
  setReminderStatus,
  emitRuleReminders,
  listReminders,
  readDomainWindows,
  SUPPORTED_EVENT_TYPES,
};
