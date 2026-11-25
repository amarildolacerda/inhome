'use strict';

// 00024 (E022): agenda de manutenção preventiva recorrente. A regra guarda o
// plano; a ocorrência guarda a data da grade fixa; a tarefa vem de E003 e o
// alerta de E004. Geração e sincronização rodam na mesma transação por domínio
// (STF-001) e as janelas efetivas incluem a antecedência da regra (STF-002).

const path = require('node:path');
const { code, label } = require('../config/enums');
const Task = require('../models/Task');
const { readWindows, daysUntil } = require('./alerts');

const SOURCE_KIND = 'maintenance_schedule';
const HORIZON_DAYS = 90;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function httpError(status, message, errorCode) {
  const error = new Error(message);
  error.status = status;
  if (errorCode) error.code = errorCode;
  return error;
}

function validDate(value) {
  return typeof value === 'string' && DATE_RE.test(value) && !Number.isNaN(Date.parse(value));
}

function dateParts(iso) {
  const [year, month, day] = String(iso).split('-').map(Number);
  return { year, month, day };
}

function addDays(iso, amount) {
  const { year, month, day } = dateParts(iso);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function localToday(now = new Date()) {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function domainIdFromDb(db) {
  const id = Number(path.basename(String(db.filePath || ''), '.db'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function resolveWindows(db, explicitWindows) {
  if (Array.isArray(explicitWindows) && explicitWindows.length > 0) return [...explicitWindows];
  const domainId = domainIdFromDb(db);
  if (!domainId) return readWindows(null);
  const platform = require('../config/database').getPlatformDb();
  const raw = platform.get('SELECT alert_windows FROM domains WHERE id = ?', [domainId])?.alert_windows;
  return readWindows(raw);
}

// Validação antes de qualquer escrita. No PATCH, somente campos presentes são
// avaliados; um payload vazio é recusado para não gerar auditoria sem mudança.
function validateScheduleInput(body = {}, { partial = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw httpError(400, 'body must be an object', 'MAINTENANCE_INPUT_INVALID');
  }
  const fields = {};
  const present = (key) => Object.hasOwn(body, key) && body[key] !== undefined;

  if (present('title') || !partial) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title || title.length > 120) {
      throw httpError(400, 'title must be 1-120 characters', 'MAINTENANCE_TITLE_INVALID');
    }
    fields.title = title;
  }
  if (present('description')) {
    if (body.description !== null && typeof body.description !== 'string') {
      throw httpError(400, 'description must be a string', 'MAINTENANCE_DESCRIPTION_INVALID');
    }
    fields.description = body.description === null ? null : body.description.slice(0, 2000);
  }
  if (present('intervalDays') || !partial) {
    if (!Number.isInteger(body.intervalDays) || body.intervalDays < 1 || body.intervalDays > 365) {
      throw httpError(400, 'intervalDays must be an integer between 1 and 365', 'MAINTENANCE_INTERVAL_INVALID');
    }
    fields.intervalDays = body.intervalDays;
  }
  if (present('startDate') || !partial) {
    if (!validDate(body.startDate)) {
      throw httpError(400, 'startDate must be a valid YYYY-MM-DD date', 'MAINTENANCE_START_DATE_INVALID');
    }
    fields.startDate = body.startDate;
  }
  if (present('leadDays')) {
    if (!Number.isInteger(body.leadDays) || body.leadDays < 0 || body.leadDays > 90) {
      throw httpError(400, 'leadDays must be an integer between 0 and 90', 'MAINTENANCE_LEAD_INVALID');
    }
    fields.leadDays = body.leadDays;
  } else if (!partial) {
    fields.leadDays = 15;
  }
  if (present('assigneeId')) {
    if (body.assigneeId !== null && (!Number.isInteger(body.assigneeId) || body.assigneeId <= 0)) {
      throw httpError(400, 'assigneeId must be a positive integer or null', 'MAINTENANCE_ASSIGNEE_INVALID');
    }
    fields.assigneeId = body.assigneeId;
  }
  if (partial && present('active')) {
    if (typeof body.active !== 'boolean') {
      throw httpError(400, 'active must be boolean', 'MAINTENANCE_ACTIVE_INVALID');
    }
    fields.active = body.active;
  }
  if (partial && Object.keys(fields).length === 0) {
    throw httpError(400, 'at least one field is required', 'MAINTENANCE_PATCH_EMPTY');
  }
  return fields;
}

function columnFor(field) {
  const map = {
    title: 'title',
    description: 'description',
    intervalDays: 'interval_days',
    startDate: 'start_date',
    leadDays: 'lead_days',
    assigneeId: 'assignee_id',
    active: 'active',
  };
  if (!Object.hasOwn(map, field)) throw new Error(`unsupported field ${field}`);
  return map[field];
}

function assertContractActive(db, contractId) {
  const contract = db.get('SELECT id, status FROM contracts WHERE id = ?', [Number(contractId)]);
  if (!contract) throw httpError(404, 'Contract not found', 'CONTRACT_NOT_FOUND');
  if (contract.status !== code('contracts.status', 'vigente')) {
    throw httpError(400, 'Contract is not active', 'CONTRACT_NOT_ACTIVE');
  }
  return contract;
}

function assertAssignee(db, assigneeId) {
  if (assigneeId === null || assigneeId === undefined) return;
  const user = db.get('SELECT id FROM users WHERE id = ?', [Number(assigneeId)]);
  if (!user) throw httpError(400, 'assigneeId not found in domain', 'MAINTENANCE_ASSIGNEE_INVALID');
}

function decorateRule(row) {
  return {
    id: row.id,
    contractId: row.contract_id,
    title: row.title,
    description: row.description ?? null,
    intervalDays: row.interval_days,
    startDate: row.start_date,
    assigneeId: row.assignee_id ?? null,
    leadDays: row.lead_days,
    active: Boolean(row.active),
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedBy: row.updated_by ?? null,
    updatedAt: row.updated_at,
  };
}

function decorateOccurrence(row) {
  return {
    id: row.id,
    ruleId: row.rule_id,
    contractId: row.contract_id,
    dueDate: row.due_date,
    taskId: row.task_id ?? null,
    status: row.task_status ? label('tasks.status', row.task_status) : 'A Fazer',
    title: row.rule_title,
    assigneeId: row.assignee_id ?? null,
  };
}

function createMaintenanceRule(db, contractId, body, userId) {
  assertContractActive(db, contractId);
  const fields = validateScheduleInput(body);
  assertAssignee(db, fields.assigneeId);
  const result = db.run(
    `INSERT INTO maintenance_rules(contract_id, title, description, interval_days, start_date,
       assignee_id, lead_days, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      Number(contractId), fields.title, fields.description ?? null, fields.intervalDays,
      fields.startDate, fields.assigneeId ?? null, fields.leadDays, userId ?? null,
    ]
  );
  const row = db.get('SELECT * FROM maintenance_rules WHERE id = ?', [
    db.get('SELECT MAX(id) AS id FROM maintenance_rules').id,
  ]);
  return decorateRule(row);
}

function updateMaintenanceRule(db, contractId, ruleId, body, userId) {
  const rule = db.get('SELECT * FROM maintenance_rules WHERE id = ? AND contract_id = ?', [
    Number(ruleId), Number(contractId),
  ]);
  if (!rule) throw httpError(404, 'Maintenance rule not found', 'MAINTENANCE_RULE_NOT_FOUND');
  const fields = validateScheduleInput(body, { partial: true });
  assertAssignee(db, fields.assigneeId);
  const sets = Object.entries(fields).map(([field, value]) => {
    const stored = field === 'active' ? (value ? 1 : 0) : value;
    return `${columnFor(field)} = ?`;
  });
  const params = Object.entries(fields).map(([field, value]) => field === 'active' ? (value ? 1 : 0) : value);
  sets.push('updated_by = ?', "updated_at = datetime('now')");
  params.push(userId ?? null, Number(ruleId));
  db.run(`UPDATE maintenance_rules SET ${sets.join(', ')} WHERE id = ?`, params);
  return decorateRule(db.get('SELECT * FROM maintenance_rules WHERE id = ?', [Number(ruleId)]));
}

function listRules(db, contractId) {
  return db.all(
    'SELECT * FROM maintenance_rules WHERE contract_id = ? ORDER BY id',
    [Number(contractId)]
  ).map(decorateRule);
}

function listOccurrences(db, contractId) {
  return db.all(
    `SELECT o.id, o.rule_id, o.contract_id, o.due_date, o.task_id,
            r.title AS rule_title, r.assignee_id, t.status AS task_status
       FROM maintenance_occurrences o
       JOIN maintenance_rules r ON r.id = o.rule_id
       LEFT JOIN tasks t ON t.id = o.task_id
      WHERE o.contract_id = ? ORDER BY o.due_date, o.id`,
    [Number(contractId)]
  ).map(decorateOccurrence);
}

// Grade fixa: a primeira data é a primeira ocorrência da série que ainda não
// passou. Concluir uma tarefa nunca reancora a série (AD-003).
function calculateDueDates(startDate, intervalDays, now = new Date(), horizonDays = HORIZON_DAYS) {
  if (!validDate(startDate) || !Number.isInteger(intervalDays) || intervalDays < 1) {
    throw httpError(400, 'invalid start date or interval', 'MAINTENANCE_GRID_INVALID');
  }
  const today = localToday(now);
  const start = dateParts(startDate);
  const current = dateParts(today);
  const startTs = new Date(start.year, start.month - 1, start.day).getTime();
  const todayTs = new Date(current.year, current.month - 1, current.day).getTime();
  const elapsed = Math.max(0, Math.round((todayTs - startTs) / 86400000));
  const firstIndex = Math.ceil(elapsed / intervalDays);
  const dates = [];
  for (let index = firstIndex; ; index += 1) {
    const due = addDays(startDate, index * intervalDays);
    const days = daysUntil(due);
    if (days < 0) continue;
    if (days > horizonDays) break;
    dates.push(due);
  }
  return dates;
}

function createTaskForOccurrence(db, rule, occurrenceId, dueDate) {
  const task = Task.create(db, {
    contract_id: rule.contract_id,
    title: rule.title,
    description: rule.description || `Manutenção preventiva agendada para ${dueDate}`,
    priority: 'medium',
    assignee_id: rule.assignee_id ?? null,
    due_date: dueDate,
  });
  db.run('UPDATE maintenance_occurrences SET task_id = ? WHERE id = ?', [task.id, occurrenceId]);
  return task.id;
}

function generateOccurrences(db, { now, horizonDays } = {}) {
  const rules = db.all(
    `SELECT r.* FROM maintenance_rules r
       JOIN contracts c ON c.id = r.contract_id AND c.status = ?
      WHERE r.active = 1 ORDER BY r.id`,
    [code('contracts.status', 'vigente')]
  );
  let created = 0;
  let ignored = 0;
  for (const rule of rules) {
    for (const dueDate of calculateDueDates(rule.start_date, rule.interval_days, now, horizonDays)) {
      const result = db.run(
        `INSERT OR IGNORE INTO maintenance_occurrences(rule_id, contract_id, due_date, lead_days)
         VALUES (?, ?, ?, ?)`,
        [rule.id, rule.contract_id, dueDate, rule.lead_days]
      );
      if (result.changes === 0) {
        ignored += 1;
        continue;
      }
      const occurrenceId = db.get('SELECT MAX(id) AS id FROM maintenance_occurrences').id;
      createTaskForOccurrence(db, rule, occurrenceId, dueDate);
      created += 1;
    }
  }
  return { created, ignored, scanned: rules.length };
}

// Alvo corrente: contrato vigente, regra ativa, tarefa não concluída e data
// dentro de alguma janela efetiva. O restante é removido na mesma transação.
function syncMaintenanceAlerts(db, { windows: explicitWindows } = {}) {
  if (!db) throw new Error('db is required');
  const domainWindows = resolveWindows(db, explicitWindows);
  const rows = db.all(
    `SELECT o.id AS occurrence_id, o.contract_id, o.due_date, o.lead_days,
            r.title, r.active, c.status AS contract_status, t.status AS task_status
       FROM maintenance_occurrences o
       JOIN maintenance_rules r ON r.id = o.rule_id
       JOIN contracts c ON c.id = o.contract_id
       LEFT JOIN tasks t ON t.id = o.task_id
      ORDER BY o.id`
  );
  const vigente = code('contracts.status', 'vigente');
  const concluded = code('tasks.status', 'Concluída');
  const desired = new Map();
  for (const row of rows) {
    if (row.contract_status !== vigente || !row.active || row.task_status === concluded) continue;
    const days = daysUntil(row.due_date);
    if (days < 0) continue;
    const effective = [...new Set([...domainWindows, row.lead_days])];
    const applicable = effective.filter((window) => window >= days);
    if (applicable.length === 0) continue;
    const window = Math.min(...applicable);
    const sourceId = `${row.occurrence_id}:${window}`;
    desired.set(`${row.contract_id}|${sourceId}`, {
      contractId: row.contract_id,
      sourceId,
      title: `Manutenção ${row.title} vence em ${row.due_date}`,
      dueDate: row.due_date,
    });
  }

  const existing = db.all('SELECT id, contract_id, source_id FROM extracted_alerts WHERE source_kind = ?', [SOURCE_KIND]);
  const byKey = new Map(existing.map((row) => [`${row.contract_id}|${row.source_id}`, row]));
  let created = 0;
  let updated = 0;
  let removed = 0;
  for (const [key, alert] of desired) {
    const current = byKey.get(key);
    if (!current) {
      db.run(
        `INSERT INTO extracted_alerts(contract_id, source_kind, source_id, title, due_date, status)
         VALUES (?, ?, ?, ?, ?, 'open')`,
        [alert.contractId, SOURCE_KIND, alert.sourceId, alert.title, alert.dueDate]
      );
      created += 1;
      continue;
    }
    db.run(
      "UPDATE extracted_alerts SET title = ?, due_date = ?, updated_at = datetime('now') WHERE id = ?",
      [alert.title, alert.dueDate, current.id]
    );
    updated += 1;
    byKey.delete(key);
  }
  for (const stale of byKey.values()) {
    db.run('DELETE FROM extracted_alerts WHERE id = ?', [stale.id]);
    removed += 1;
  }
  return {
    created, updated, removed, scanned: rows.length, desired: desired.size,
    alertsUpserted: created + updated, alertsRemoved: removed,
  };
}

// Varredura de todos os domínios ativos (ou um, no acionamento manual). Uma
// falha por domínio não aborta os demais e nunca altera o formato do resultado.
function runMaintenanceSweep({ domainId, now } = {}) {
  const { getPlatformDb, getDomainDb } = require('../config/database');
  const platform = getPlatformDb();
  const domains = domainId
    ? platform.all("SELECT id, alert_windows FROM domains WHERE status = 'active' AND id = ?", [Number(domainId)])
    : platform.all("SELECT id, alert_windows FROM domains WHERE status = 'active'");
  const result = { created: 0, ignored: 0, alertsUpserted: 0, alertsRemoved: 0, domains: 0, failed: 0 };
  for (const domain of domains) {
    try {
      const db = getDomainDb(domain.id);
      const windows = readWindows(domain.alert_windows);
      const counters = db.transaction(() => {
        const generated = generateOccurrences(db, { now });
        const alerts = syncMaintenanceAlerts(db, { windows });
        return { generated, alerts };
      });
      result.created += counters.generated.created;
      result.ignored += counters.generated.ignored;
      result.alertsUpserted += counters.alerts.alertsUpserted;
      result.alertsRemoved += counters.alerts.alertsRemoved;
      result.domains += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
}

module.exports = {
  SOURCE_KIND,
  HORIZON_DAYS,
  httpError,
  validateScheduleInput,
  createMaintenanceRule,
  updateMaintenanceRule,
  listRules,
  listOccurrences,
  calculateDueDates,
  createTaskForOccurrence,
  generateOccurrences,
  syncMaintenanceAlerts,
  runMaintenanceSweep,
};
