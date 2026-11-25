'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir('sddp-maintenance-schedules-');
const { getPlatformDb, getDomainDb } = require('../config/database');
const { code } = require('../config/enums');

function localDate(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

let domainId;
let db;
let gestorId;
let prestadorId;

function newContract(name) {
  db.run(
    'INSERT INTO contracts(name, purpose_id, start_date, forecast_date, created_by) VALUES (?, 1, ?, ?, ?)',
    [name, localDate(-30), localDate(365), gestorId]
  );
  return db.get('SELECT id FROM contracts WHERE name = ?', [name]).id;
}

function newRule(contractId, overrides = {}) {
  return {
    title: overrides.title || 'Troca de filtro',
    intervalDays: overrides.intervalDays || 30,
    startDate: overrides.startDate || localDate(-45),
    leadDays: overrides.leadDays === undefined ? 15 : overrides.leadDays,
    assigneeId: overrides.assigneeId || null,
    description: overrides.description || 'Visita preventiva',
  };
}

function create(contractId, overrides = {}) {
  const { createMaintenanceRule } = require('./maintenanceSchedules');
  return createMaintenanceRule(db, contractId, newRule(contractId, overrides), gestorId);
}

function alerts() {
  return db.all("SELECT * FROM extracted_alerts WHERE source_kind = 'maintenance_schedule' ORDER BY source_id");
}

// Cada teste parte de uma grade vazia: os contadores da varredura são globais
// ao domínio, então regras de outros testes não podem interferir.
function resetMaintenance() {
  db.run("DELETE FROM extracted_alerts WHERE source_kind = 'maintenance_schedule'");
  db.run('DELETE FROM maintenance_occurrences');
  db.run('DELETE FROM maintenance_rules');
  db.run('DELETE FROM tasks');
}

test.before(async () => {
  await initTestDb();
  const platform = getPlatformDb();
  platform.run("INSERT INTO domains(name, slug, status) VALUES ('Manutenção', 'manutencao-e022', 'active')");
  domainId = platform.get("SELECT id FROM domains WHERE slug = 'manutencao-e022'").id;
  db = getDomainDb(domainId);
  db.run("INSERT INTO purposes(name) VALUES ('Geral')");
  for (const [name, email, role] of [
    ['Gestor', 'gestor@manutencao.test', 'gestor'],
    ['Prestador', 'prestador@manutencao.test', 'prestador'],
  ]) {
    db.run('INSERT INTO users(name, email, password_hash, role) VALUES (?, ?, ?, ?)', [name, email, 'x', role]);
  }
  gestorId = db.get("SELECT id FROM users WHERE email = 'gestor@manutencao.test'").id;
  prestadorId = db.get("SELECT id FROM users WHERE email = 'prestador@manutencao.test'").id;
});

test('FR-094: editar e inativar registra autor e data sem tocar nas tarefas', () => {
  resetMaintenance();
  const { updateMaintenanceRule, generateOccurrences } = require('./maintenanceSchedules');
  const contractId = newContract('Contrato edição');
  const rule = create(contractId, { assigneeId: prestadorId });
  generateOccurrences(db);
  const before = db.all('SELECT id, task_id FROM maintenance_occurrences WHERE rule_id = ? ORDER BY id', [rule.id]);
  assert.ok(before.length > 0);

  const edited = updateMaintenanceRule(db, contractId, rule.id, { title: 'Troca de óleo', intervalDays: 60 }, gestorId);
  assert.strictEqual(edited.title, 'Troca de óleo');
  assert.strictEqual(edited.intervalDays, 60);
  assert.strictEqual(edited.createdBy, gestorId);
  assert.strictEqual(edited.updatedBy, gestorId);
  assert.ok(edited.updatedAt);
  const disabled = updateMaintenanceRule(db, contractId, rule.id, { active: false }, gestorId);
  assert.strictEqual(disabled.active, false);
  const after = db.all('SELECT id, task_id FROM maintenance_occurrences WHERE rule_id = ? ORDER BY id', [rule.id]);
  assert.deepStrictEqual(after, before);
});

test('FR-095: a varredura cria uma tarefa por data da grade', () => {
  resetMaintenance();
  const { generateOccurrences } = require('./maintenanceSchedules');
  const contractId = newContract('Contrato geração');
  const rule = create(contractId, { intervalDays: 30, startDate: localDate(-45) });
  const result = generateOccurrences(db);
  assert.ok(result.created >= 1, JSON.stringify(result));
  const occurrences = db.all('SELECT * FROM maintenance_occurrences WHERE rule_id = ? ORDER BY due_date', [rule.id]);
  assert.strictEqual(occurrences.length, result.created);
  for (const occurrence of occurrences) {
    assert.ok(occurrence.task_id, 'toda ocorrência gerada tem tarefa');
    assert.ok(occurrence.due_date >= localDate(0));
  }
});

test('FR-096: varreduras repetidas não duplicam ocorrência nem tarefa', () => {
  resetMaintenance();
  const { generateOccurrences } = require('./maintenanceSchedules');
  const contractId = newContract('Contrato idempotente');
  const rule = create(contractId);
  const first = generateOccurrences(db);
  const before = db.get('SELECT COUNT(*) AS c FROM maintenance_occurrences WHERE rule_id = ?', [rule.id]).c;
  const beforeTasks = db.get('SELECT COUNT(*) AS c FROM tasks WHERE contract_id = ?', [contractId]).c;
  const second = generateOccurrences(db);
  assert.strictEqual(second.created, 0);
  assert.strictEqual(second.ignored, before);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM maintenance_occurrences WHERE rule_id = ?', [rule.id]).c, before);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM tasks WHERE contract_id = ?', [contractId]).c, beforeTasks);
  assert.strictEqual(first.created, before);
});

test('FR-097: tarefa gerada usa E003 com status, título, responsável e vencimento', () => {
  resetMaintenance();
  const { generateOccurrences } = require('./maintenanceSchedules');
  const contractId = newContract('Contrato tarefa');
  const rule = create(contractId, { assigneeId: prestadorId, title: 'Calibrar sensor' });
  generateOccurrences(db);
  const occurrence = db.get('SELECT * FROM maintenance_occurrences WHERE rule_id = ? ORDER BY id LIMIT 1', [rule.id]);
  const task = db.get('SELECT * FROM tasks WHERE id = ?', [occurrence.task_id]);
  assert.strictEqual(task.status, code('tasks.status', 'A Fazer'));
  assert.strictEqual(task.title, 'Calibrar sensor');
  assert.strictEqual(task.assignee_id, prestadorId);
  assert.strictEqual(task.due_date, occurrence.due_date);
  assert.ok(task.description);
});

test('FR-098: datas passadas e além de 90 dias são ignoradas', () => {
  resetMaintenance();
  const { calculateDueDates, generateOccurrences } = require('./maintenanceSchedules');
  const dates = calculateDueDates(localDate(-400), 30, new Date(), 90);
  assert.ok(dates.length > 0);
  assert.ok(dates.every((date) => date >= localDate(0) && date <= localDate(90)));
  const contractId = newContract('Contrato horizonte');
  const rule = create(contractId, { intervalDays: 365, startDate: localDate(-800) });
  const result = generateOccurrences(db);
  assert.strictEqual(result.created, 0);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM maintenance_occurrences WHERE rule_id = ?', [rule.id]).c, 0);
});

test('FR-099: editar ou inativar preserva ocorrência, tarefa e histórico', () => {
  resetMaintenance();
  const { updateMaintenanceRule, generateOccurrences } = require('./maintenanceSchedules');
  const contractId = newContract('Contrato histórico');
  const rule = create(contractId);
  generateOccurrences(db);
  const before = db.all('SELECT * FROM maintenance_occurrences WHERE rule_id = ?', [rule.id]);
  const historyBefore = db.get('SELECT COUNT(*) AS c FROM task_history').c;
  updateMaintenanceRule(db, contractId, rule.id, { title: 'Revisão geral', active: false }, prestadorId);
  const after = db.all('SELECT * FROM maintenance_occurrences WHERE rule_id = ?', [rule.id]);
  assert.deepStrictEqual(after, before);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM task_history').c, historyBefore);
});

test('FR-100: alerta deduplicado e janela da regra entra nas janelas efetivas', () => {
  resetMaintenance();
  const { generateOccurrences, syncMaintenanceAlerts } = require('./maintenanceSchedules');
  const contractId = newContract('Contrato alerta');
  const rule = create(contractId, { leadDays: 30, startDate: localDate(-15), intervalDays: 30 });
  generateOccurrences(db);
  // Domínio só avisa com 7 dias; a regra pede 30. A janela 30 precisa existir.
  const first = syncMaintenanceAlerts(db, { windows: [7] });
  assert.ok(first.created >= 1, JSON.stringify(first));
  const created = alerts();
  assert.ok(created.some((row) => row.source_id.endsWith(':30')), JSON.stringify(created.map((r) => r.source_id)));
  const count = created.length;
  syncMaintenanceAlerts(db, { windows: [7] });
  assert.strictEqual(alerts().length, count);
  const heads = db.all("SELECT title, due_date FROM extracted_alerts WHERE source_kind = 'maintenance_schedule'");
  for (const row of heads) assert.match(row.title, /^Manutenção .+ vence em \d{4}-\d{2}-\d{2}$/);
});

test('FR-101: conclusão, inativação e contrato encerrado removem alertas', () => {
  resetMaintenance();
  const {
    generateOccurrences, syncMaintenanceAlerts, updateMaintenanceRule,
  } = require('./maintenanceSchedules');
  const contractId = newContract('Contrato limpeza');
  const rule = create(contractId, { leadDays: 30, startDate: localDate(-15), intervalDays: 30 });
  generateOccurrences(db);
  syncMaintenanceAlerts(db);
  assert.ok(alerts().length > 0);
  const setTasks = (status) => db.all('SELECT task_id FROM maintenance_occurrences WHERE rule_id = ?', [rule.id])
    .forEach((row) => db.run('UPDATE tasks SET status = ? WHERE id = ?', [code('tasks.status', status), row.task_id]));

  setTasks('Concluída');
  let cleanup = syncMaintenanceAlerts(db);
  assert.ok(cleanup.removed >= 1, JSON.stringify(cleanup));
  assert.strictEqual(alerts().length, 0);

  setTasks('A Fazer');
  syncMaintenanceAlerts(db);
  assert.ok(alerts().length > 0);
  updateMaintenanceRule(db, contractId, rule.id, { active: false }, gestorId);
  syncMaintenanceAlerts(db);
  assert.strictEqual(alerts().length, 0);

  updateMaintenanceRule(db, contractId, rule.id, { active: true }, gestorId);
  syncMaintenanceAlerts(db);
  assert.ok(alerts().length > 0);
  db.run('UPDATE contracts SET status = ? WHERE id = ?', [code('contracts.status', 'encerrado'), contractId]);
  cleanup = syncMaintenanceAlerts(db);
  assert.ok(cleanup.removed >= 1, JSON.stringify(cleanup));
  assert.strictEqual(alerts().length, 0);
});
