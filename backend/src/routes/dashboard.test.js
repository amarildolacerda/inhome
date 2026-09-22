'use strict';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir();
const { app } = require('../server');
const { getDomainDb } = require('../config/database');
const { getDomainMetrics } = require('../routes/dashboard');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

let domainId;
let adminToken;
let gestorToken;
let p1Token;
let p1Id;

function as(token) {
  return { Authorization: `Bearer ${token}` };
}

async function login(email, password, domId) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password, domainId: domId });
  assert.strictEqual(res.status, 200, `${email}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

function dateOnly(offsetDays) {
  return new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
}

test.before(async () => {
  await initTestDb();

  const sys = await request(app).post('/api/auth/login').send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  const enabled = await request(app)
    .post('/api/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Teta Dashboard',
      adminName: 'Davi',
      adminEmail: 'davi@teta.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201);
  domainId = enabled.body.domain.id;
  adminToken = await login('davi@teta.test', 'Secret1!', domainId);

  for (const [name, email, role] of [
    ['Guto', 'guto@teta.test', 'gestor'],
    ['Mila', 'mila@teta.test', 'prestador'],
    ['Otavio', 'otavio@teta.test', 'prestador'],
  ]) {
    const res = await request(app)
      .post('/api/users')
      .set(as(adminToken))
      .send({ name, email, password: 'Secret1!', role });
    assert.strictEqual(res.status, 201);
  }
  gestorToken = await login('guto@teta.test', 'Secret1!', domainId);
  p1Token = await login('mila@teta.test', 'Secret1!', domainId);

  const db = getDomainDb(domainId);
  p1Id = db.get("SELECT id FROM users WHERE email = 'mila@teta.test'").id;
  const p2Id = db.get("SELECT id FROM users WHERE email = 'otavio@teta.test'").id;

  // C1: vigente, linked p1+p2; C2: no links; C3: forecast in the past → atrasado
  for (const [name, forecast] of [
    ['C1 Obra', dateOnly(60)],
    ['C2 Galpao', dateOnly(45)],
    ['C3 Atrasado', dateOnly(-3)],
  ]) {
    const created = await request(app)
      .post('/api/contracts')
      .set(as(gestorToken))
      .send({ name, start_date: dateOnly(-10), forecast_date: forecast });
    assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  }
  const db2 = getDomainDb(domainId);
  const c1 = db2.get("SELECT id FROM contracts WHERE name = 'C1 Obra'");
  for (const uid of [p1Id, p2Id]) {
    const linked = await request(app)
      .post(`/api/contracts/${c1.id}/prestadores`)
      .set(as(gestorToken))
      .send({ user_id: uid });
    assert.ok([200, 201].includes(linked.status), JSON.stringify(linked.body));
  }

  // tasks: t1 p1 Concluída, t2 p1 open (overdue), t3 p2 open urgent
  const t1 = await request(app)
    .post(`/api/contracts/${c1.id}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'T1 fechada', assignee_id: p1Id, due_date: dateOnly(-5) });
  assert.strictEqual(t1.status, 201);
  for (const status of ['Em Progresso', 'Revisão']) {
    const move = await request(app)
      .patch(`/api/tasks/${t1.body.task.id}/status`)
      .set(as(p1Token))
      .send({ status });
    assert.strictEqual(move.status, 200, JSON.stringify(move.body));
  }
  const done = await request(app)
    .post(`/api/tasks/${t1.body.task.id}/complete`)
    .set(as(p1Token))
    .send({ text: 'concluida para metricas' });
  assert.strictEqual(done.status, 200, JSON.stringify(done.body));

  const t2 = await request(app)
    .post(`/api/contracts/${c1.id}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'T2 atrasada', assignee_id: p1Id, priority: 'high', due_date: dateOnly(-1) });
  assert.strictEqual(t2.status, 201, JSON.stringify(t2.body));

  const t3 = await request(app)
    .post(`/api/contracts/${c1.id}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'T3 urgente', assignee_id: p2Id, priority: 'urgent', due_date: dateOnly(10) });
  assert.strictEqual(t3.status, 201, JSON.stringify(t3.body));
});

test('FR-019 metrics', async () => {
  // export contract present
  assert.strictEqual(typeof getDomainMetrics, 'function');

  // admin/gestor: whole domain (SC-011 <2s)
  for (const [label, token] of [
    ['admin', adminToken],
    ['gestor', gestorToken],
  ]) {
    const started = Date.now();
    const res = await request(app).get('/api/dashboard/stats').set(as(token));
    const elapsed = Date.now() - started;
    assert.strictEqual(res.status, 200, `${label}: ${JSON.stringify(res.body)}`);
    assert.ok(elapsed < 2000, `${label} dashboard took ${elapsed}ms (limit 2000ms)`);

    const { stats, tasksByStatus, scope } = res.body;
    assert.strictEqual(scope, 'domain');
    assert.strictEqual(stats.totalProjects, 3, `${label}: three contracts`);
    assert.strictEqual(stats.activeProjects, 2, `${label}: two vigente`);
    assert.strictEqual(stats.contractsAtrasado, 1, `${label}: one atrasado`);
    assert.strictEqual(stats.contractsEncerrado, 0, `${label}: none encerrado`);
    assert.strictEqual(stats.totalTasks, 3, `${label}: three tasks`);
    assert.strictEqual(stats.completedTasks, 1, `${label}: one completed`);
    assert.strictEqual(stats.inProgressTasks, 0, `${label}: none in progress`);
    assert.strictEqual(stats.urgentTasks, 1, `${label}: one urgent open`);
    assert.strictEqual(stats.tasksOverdue, 1, `${label}: one overdue open task`);
    assert.strictEqual(stats.completionRate, 33, `${label}: 1/3 rounded`);
    assert.strictEqual(stats.usersTotal, 4, `${label}: admin+gestor+2 prestadores`);
    assert.strictEqual(stats.prestadoresTotal, 2);

    const statusMap = Object.fromEntries(tasksByStatus.map((row) => [row.status, row.count]));
    assert.strictEqual(statusMap['Concluída'], 1, `${label}: status breakdown`);
    assert.strictEqual(statusMap['A Fazer'], 2, `${label}: status breakdown`);
  }

  // prestador: only their own tasks (FR-019 "prestador só próprias")
  const p1 = await request(app).get('/api/dashboard/stats').set(as(p1Token));
  assert.strictEqual(p1.status, 200, JSON.stringify(p1.body));
  assert.strictEqual(p1.body.scope, 'own');
  assert.strictEqual(p1.body.stats.totalTasks, 2, 'p1 sees only t1+t2');
  assert.strictEqual(p1.body.stats.completedTasks, 1, 't1 completed');
  assert.strictEqual(p1.body.stats.totalProjects, 1, 'p1 linked to C1 only');
  assert.ok(
    p1.body.stats.usersTotal === null,
    'prestador does not receive domain user counters'
  );
  // no trace of t3 (owned by the other prestador)
  const p1Statuses = Object.fromEntries(p1.body.tasksByStatus.map((r) => [r.status, r.count]));
  assert.strictEqual((p1Statuses['A Fazer'] || 0), 1, 'only one open task of p1');

  // system_admin (platform session) has no business dashboard access (FR-003)
  const sys = await request(app)
    .post('/api/auth/login')
    .send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  const denied = await request(app).get('/api/dashboard/stats').set(as(sys.body.token));
  assert.strictEqual(denied.status, 403);

  // anonymous → 401
  const anon = await request(app).get('/api/dashboard/stats');
  assert.strictEqual(anon.status, 401);
});
