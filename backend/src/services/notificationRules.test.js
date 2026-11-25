'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir('sddp-notification-rules-');
const { getPlatformDb, getDomainDb } = require('../config/database');
const { readWindows } = require('./alerts');

function localDate(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

let domainId;
let db;
let gestorId;

function newContract(name, days) {
  db.run(
    'INSERT INTO contracts(name, purpose_id, start_date, forecast_date, created_by) VALUES (?, 1, ?, ?, ?)',
    [name, localDate(-30), localDate(days), gestorId]
  );
  return db.get('SELECT id FROM contracts WHERE name = ?', [name]).id;
}

function resetRules() {
  db.run('DELETE FROM alert_event_channels');
  db.run('DELETE FROM alert_events');
  db.run('DELETE FROM notification_rule_steps');
  db.run('DELETE FROM notification_rules');
}

test.before(async () => {
  await initTestDb();
  const platform = getPlatformDb();
  platform.run("INSERT INTO domains(name, slug, status, alert_windows) VALUES ('Régua', 'regua-e023', 'active', ?)", [
    JSON.stringify([30, 15, 7]),
  ]);
  domainId = platform.get("SELECT id FROM domains WHERE slug = 'regua-e023'").id;
  db = getDomainDb(domainId);
  db.run("INSERT INTO purposes(name) VALUES ('Geral')");
  db.run(
    "INSERT INTO users(name, email, password_hash, role) VALUES ('Gestor', 'gestor@regua.test', 'x', 'gestor')"
  );
  gestorId = db.get("SELECT id FROM users WHERE email = 'gestor@regua.test'").id;
});

test('FR-105/FR-106: salvar régua deriva as etapas das janelas ativas', () => {
  resetRules();
  const { saveRule, listRules } = require('./notificationRules');
  const rule = saveRule(
    db,
    'vigencia',
    { maxReminders: 3, intervalDays: 7, active: true },
    gestorId
  );
  assert.strictEqual(rule.active, true);
  assert.deepStrictEqual(
    rule.steps.map((entry) => entry.windowDays),
    [7, 15, 30]
  );
  assert.deepStrictEqual(
    rule.steps.map((entry) => entry.step),
    [1, 2, 3]
  );
  assert.strictEqual(rule.createdBy, 'Gestor');
  assert.ok(rule.createdAt);
  assert.deepStrictEqual(listRules(db).map((entry) => entry.eventType), ['vigencia']);
});

test('FR-107: limite, intervalo, tipo e janelas insuficientes falham sem gravar', () => {
  resetRules();
  const { saveRule, validateRuleInput, deriveSteps, listRules } = require('./notificationRules');
  assert.throws(() => validateRuleInput({ maxReminders: 6, intervalDays: 7 }, 'vigencia'));
  assert.throws(() => validateRuleInput({ maxReminders: 3, intervalDays: 0 }, 'vigencia'));
  assert.throws(() => validateRuleInput({ maxReminders: 3, intervalDays: 7 }, 'whatsapp'));
  assert.throws(() => deriveSteps([7, 15, 30], 3, 20), /need 3 windows/);
  assert.throws(() => saveRule(db, 'vigencia', { maxReminders: 9, intervalDays: 7 }, gestorId));
  assert.deepStrictEqual(listRules(db), []);
  assert.deepStrictEqual(
    readWindows(platformRaw()),
    [30, 15, 7],
    'janelas do domínio não são alteradas por uma gravação recusada'
  );
});

function platformRaw() {
  return getPlatformDb().get("SELECT alert_windows FROM domains WHERE slug = 'regua-e023'").alert_windows;
}

test('FR-111/AD-005: snapshot é congelado no início da varredura', async () => {
  resetRules();
  const { saveRule, loadRuleSnapshot, setRuleActive } = require('./notificationRules');
  saveRule(db, 'vigencia', { maxReminders: 3, intervalDays: 7, active: true }, gestorId);
  const snapshot = loadRuleSnapshot(db);
  setRuleActive(db, 'vigencia', false, gestorId);
  assert.strictEqual(snapshot.vigencia.steps.length, 3, 'snapshot não muda com gravação posterior');
  assert.strictEqual(loadRuleSnapshot(db), null, 'desativação vale na próxima leitura');
});

test('FR-108/FR-110: identidade por etapa e canal deduplica em sweeps repetidos', () => {
  resetRules();
  const { insertReminder } = require('./notificationRules');
  const first = insertReminder(db, {
    contractId: 101,
    eventType: 'vigencia',
    windowDays: 15,
    ruleId: null,
    step: 2,
    channel: 'in_app',
  });
  const second = insertReminder(db, {
    contractId: 101,
    eventType: 'vigencia',
    windowDays: 15,
    ruleId: null,
    step: 2,
    channel: 'in_app',
  });
  const email = insertReminder(db, {
    contractId: 101,
    eventType: 'vigencia',
    windowDays: 15,
    ruleId: null,
    step: 2,
    channel: 'email',
  });
  assert.strictEqual(first, true);
  assert.strictEqual(second, false);
  assert.strictEqual(email, true);
  const channels = db.all('SELECT channel, status FROM alert_event_channels WHERE contract_id = 101 ORDER BY channel');
  assert.deepStrictEqual(channels.map((row) => row.channel), ['email', 'in_app']);
  assert.strictEqual(db.all('SELECT * FROM alert_events WHERE contract_id = 101').length, 1);
});

test('FR-109: e-mail falho mantém o aviso interno e marca failed', async () => {
  resetRules();
  const { saveRule, emitRuleReminders } = require('./notificationRules');
  saveRule(db, 'vigencia', { maxReminders: 3, intervalDays: 7, active: true }, gestorId);
  const contractId = newContract('Contrato falha SMTP', 20);
  db.run('UPDATE users SET email = ? WHERE id = ?', ['gestor@regua.test', gestorId]);
  db.run('UPDATE contracts SET created_by = ? WHERE id = ?', [gestorId, contractId]);
  const events = [];
  const counters = await emitRuleReminders({
    db,
    domainId,
    contracts: db.all(
      `SELECT c.id, c.name, c.forecast_date, c.perpetual, u.email AS creator_email
         FROM contracts c LEFT JOIN users u ON u.id = c.created_by WHERE c.id = ?`,
      [contractId]
    ),
    snapshot: require('./notificationRules').loadRuleSnapshot(db),
    notifyFn: async () => ({ sent: false, error: 'smtp down' }),
    emitEvent: (event, domId, payload) => events.push({ event, domId, payload }),
  });
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].event, 'contract_reminder');
  assert.strictEqual(events[0].payload.windowDays, 30);
  assert.strictEqual(counters.failed, 1);
  const rows = db.all('SELECT channel, status FROM alert_event_channels WHERE contract_id = ? ORDER BY channel', [
    contractId,
  ]);
  assert.deepStrictEqual(rows.map((row) => `${row.channel}:${row.status}`), ['email:failed', 'in_app:sent']);
});

test('FR-113/FR-112: editar e desativar preserva eventos e a trilha do painel', () => {
  resetRules();
  const { saveRule, setRuleActive, insertReminder, listReminders } = require('./notificationRules');
  saveRule(db, 'vigencia', { maxReminders: 3, intervalDays: 7, active: true }, gestorId);
  insertReminder(db, {
    contractId: 202,
    eventType: 'vigencia',
    windowDays: 7,
    ruleId: null,
    step: 1,
    channel: 'in_app',
  });
  const before = db.all('SELECT id, step, channel, status FROM alert_event_channels WHERE contract_id = 202');
  saveRule(db, 'vigencia', { maxReminders: 2, intervalDays: 15, active: true }, gestorId);
  const disabled = setRuleActive(db, 'vigencia', false, gestorId);
  const after = db.all('SELECT id, step, channel, status FROM alert_event_channels WHERE contract_id = 202');
  assert.deepStrictEqual(after, before);
  assert.strictEqual(disabled.active, false);
  assert.strictEqual(disabled.updatedBy, 'Gestor');
  const reminders = listReminders(db);
  assert.deepStrictEqual(
    reminders.map((row) => `${row.eventType}:${row.step}:${row.channel}:${row.status}`),
    ['vigencia:1:in_app:skipped']
  );
});
