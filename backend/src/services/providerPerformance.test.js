'use strict';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir('sddp-provider-performance-service-');
const { app } = require('../server');
const { getDomainDb } = require('../config/database');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';
const REFERENCE_DATE = '2026-11-20';
const DAYS = 30;

function as(token) {
  return { Authorization: `Bearer ${token}` };
}

let domainId;
let db;
let adminToken;
let anaId;
let betoId;
let vazioId;
let contractId;
let query;
let service;

test.before(async () => {
  await initTestDb();
  service = require('./providerPerformance');
  const sys = await request(app)
    .post('/api/v2/auth/login')
    .send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200);

  const enabled = await request(app)
    .post('/api/v2/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Desempenho Service',
      adminName: 'Admin Desempenho',
      adminEmail: 'admin.perf.service@test.local',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201, JSON.stringify(enabled.body));
  domainId = enabled.body.domain.id;
  adminToken = (
    await request(app)
      .post('/api/v2/auth/login')
      .send({
        email: 'admin.perf.service@test.local',
        password: 'Secret1!',
        domainId,
      })
  ).body.token;

  for (const [name, email, username] of [
    ['Ana', 'ana.perf.service@test.local', 'anaperfservice'],
    ['Beto', 'beto.perf.service@test.local', 'betoperfservice'],
    ['Vazio', 'vazio.perf.service@test.local', 'vazioperfservice'],
    ['Gestor', 'gestor.perf.service@test.local', 'gestorperfservice'],
  ]) {
    const role = name === 'Gestor' ? 'gestor' : 'prestador';
    const created = await request(app)
      .post('/api/v2/users')
      .set(as(adminToken))
      .send({ name, email, password: 'Secret1!', role, username });
    assert.strictEqual(created.status, 201, `${name}: ${JSON.stringify(created.body)}`);
  }

  db = getDomainDb(domainId);
  anaId = db.get("SELECT id FROM users WHERE email = 'ana.perf.service@test.local'").id;
  betoId = db.get("SELECT id FROM users WHERE email = 'beto.perf.service@test.local'").id;
  vazioId = db.get("SELECT id FROM users WHERE email = 'vazio.perf.service@test.local'").id;
  const gestorId = db.get("SELECT id FROM users WHERE email = 'gestor.perf.service@test.local'").id;

  db.run(
    "INSERT INTO contracts(name, start_date, forecast_date) VALUES ('Contrato Desempenho', '2026-01-01', '2026-12-31')"
  );
  contractId = db.get("SELECT id FROM contracts WHERE name = 'Contrato Desempenho'").id;
  for (const providerId of [anaId, betoId, vazioId]) {
    db.run('INSERT INTO contract_providers(contract_id, user_id) VALUES (?, ?)', [contractId, providerId]);
  }

  function insertTask(title, providerId, { dueDate, completedAt, createdAt }) {
    db.run(
      `INSERT INTO tasks(contract_id, title, assignee_id, due_date, completed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [contractId, title, providerId, dueDate ?? null, completedAt ?? null, createdAt]
    );
    return db.get('SELECT MAX(id) AS id FROM tasks').id;
  }

  function insertHistory(taskId, action, note, createdAt) {
    db.run(
      'INSERT INTO task_history(task_id, user_id, action, note, created_at) VALUES (?, ?, ?, ?, ?)',
      [taskId, gestorId, action, note, createdAt]
    );
  }

  const anaOnTime = insertTask('Ana no prazo', anaId, {
    dueDate: '2026-11-10', completedAt: '2026-11-08T12:00:00.000Z', createdAt: '2026-10-25T09:00:00.000Z',
  });
  const anaLate = insertTask('Ana atrasada', anaId, {
    dueDate: '2026-11-12', completedAt: '2026-11-15T12:00:00.000Z', createdAt: '2026-10-26T09:00:00.000Z',
  });
  const anaOpen = insertTask('Ana aberta', anaId, {
    dueDate: null, completedAt: null, createdAt: '2026-10-27T09:00:00.000Z',
  });
  insertTask('Beto no prazo', betoId, {
    dueDate: '2026-11-15', completedAt: '2026-11-14T12:00:00.000Z', createdAt: '2026-10-28T09:00:00.000Z',
  });

  insertHistory(anaOnTime, 'reopen', 'Retrabalho solicitado', '2026-11-09T10:00:00.000Z');
  insertHistory(anaOnTime, 'reopen', 'Retrabalho solicitado', '2026-11-09T10:00:00.000Z');
  insertHistory(anaLate, 'maintain', 'Ajuste de escopo', '2026-11-13T10:00:00.000Z');
  insertHistory(anaOpen, 'reject', 'Revisar evidência', '2026-11-14T10:00:00.000Z');

  query = service.parsePerformanceQuery({ referenceDate: REFERENCE_DATE, days: DAYS });
});

function itemFor(payload, providerId) {
  return payload.items.find((item) => item.providerId === providerId);
}

test('FR-001 score 0..100', () => {
  const payload = service.computeProviderPerformance(db, query);
  const ana = itemFor(payload, anaId);
  const beto = itemFor(payload, betoId);
  assert.strictEqual(ana.score, 37);
  assert.strictEqual(beto.score, 100);
  for (const item of payload.items) {
    if (item.score === null) continue;
    assert.ok(item.score >= 0 && item.score <= 100, `${item.name}: ${item.score}`);
  }
});

test('FR-002 components', () => {
  const ana = itemFor(service.computeProviderPerformance(db, query), anaId);
  assert.deepStrictEqual(ana.components, {
    pontualidade: 50,
    conclusaoNoPrazo: 33,
    ocorrencias: 4,
  });
});

test('FR-003 no data', () => {
  const vazio = itemFor(service.computeProviderPerformance(db, query), vazioId);
  assert.strictEqual(vazio.hasData, false);
  assert.strictEqual(vazio.score, null);
  assert.strictEqual(vazio.components, null);
  assert.deepStrictEqual(vazio.occurrences, []);
});

test('FR-005 derive occurrences', () => {
  const tasks = db.all('SELECT * FROM tasks WHERE assignee_id = ?', [anaId]);
  const history = db.all('SELECT * FROM task_history');
  const occurrences = service.dedupeOccurrences(
    service.deriveProviderOccurrences(tasks, history, anaId)
  );
  assert.deepStrictEqual(
    occurrences.map((item) => item.type).sort(),
    ['atraso', 'manutencao', 'reabertura', 'rejeicao']
  );
});

test('FR-006 source and reason', () => {
  const ana = itemFor(service.computeProviderPerformance(db, query), anaId);
  const reopen = ana.occurrences.find((item) => item.type === 'reabertura');
  const maintain = ana.occurrences.find((item) => item.type === 'manutencao');
  const reject = ana.occurrences.find((item) => item.type === 'rejeicao');
  assert.ok(reopen.taskId > 0);
  assert.strictEqual(reopen.reason, 'Retrabalho solicitado');
  assert.strictEqual(maintain.reason, 'Ajuste de escopo');
  assert.strictEqual(reject.reason, 'Revisar evidência');
});

test('FR-007 dedupe reopen', () => {
  const ana = itemFor(service.computeProviderPerformance(db, query), anaId);
  assert.strictEqual(ana.occurrences.filter((item) => item.type === 'reabertura').length, 1);
});

test('FR-008 deterministic', () => {
  const first = service.computeProviderPerformance(db, query);
  const second = service.computeProviderPerformance(db, query);
  assert.deepStrictEqual(first, second);
});

test('FR-010 provider filter and query validation', () => {
  const filtered = service.computeProviderPerformance(db, { ...query, providerId: betoId });
  assert.strictEqual(filtered.total, 1);
  assert.strictEqual(filtered.items[0].providerId, betoId);
  assert.throws(
    () => service.parsePerformanceQuery({ days: 0 }),
    (error) => error.code === 'PERFORMANCE_DAYS_INVALID'
  );
  assert.throws(
    () => service.parsePerformanceQuery({ referenceDate: '20/11/2026' }),
    (error) => error.code === 'PERFORMANCE_REFERENCE_DATE_INVALID'
  );
});

test('FR-011 sortProviders', () => {
  const payload = service.computeProviderPerformance(db, query);
  assert.deepStrictEqual(
    payload.items.map((item) => item.score),
    [100, 37, null]
  );
});

test('FR-012 page of one hundred', () => {
  const payload = service.computeProviderPerformance(db, query);
  assert.strictEqual(payload.pageSize, 100);
  assert.strictEqual(payload.page, 1);
  assert.strictEqual(payload.total, 3);
  assert.strictEqual(payload.items.length, 3);
});
