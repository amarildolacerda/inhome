'use strict';

process.env.UPLOAD_DIR = require('path').join(
  require('os').tmpdir(),
  `sddp-uploads-tasks-${process.pid}`
);

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir();
const { app } = require('../server');
const { getDomainDb } = require('../config/database');
const { UPLOAD_DIR } = require('../middleware/upload');

// Acceptance stub per plan.md ## Acceptance Test Stubs (RED until T019).
test('FR-012 reopen', async () => {
  // prestador completes their own task first
  const created = await request(app)
    .post(`/api/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Reabrivel', assignee_id: movId });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const taskId = created.body.task.id;
  for (const status of ['Em Progresso', 'Revisão']) {
    const move = await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set(as(movToken))
      .send({ status });
    assert.strictEqual(move.status, 200, JSON.stringify(move.body));
  }
  const done = await request(app)
    .post(`/api/tasks/${taskId}/complete`)
    .set(as(movToken))
    .send({ text: 'Concluida antes da inspecao' });
  assert.strictEqual(done.status, 200, JSON.stringify(done.body));
  assert.strictEqual(done.body.task.status, 'Concluída');

  // prestador reabre → negado (FR-012)
  const byPrestador = await request(app)
    .post(`/api/tasks/${taskId}/reopen`)
    .set(as(movToken))
    .send({ motivo: 'quero reabrir' });
  assert.strictEqual(byPrestador.status, 403);

  // sem motivo → recusa
  const noMotivo = await request(app)
    .post(`/api/tasks/${taskId}/reopen`)
    .set(as(gestorToken))
    .send({ motivo: '  ' });
  assert.strictEqual(noMotivo.status, 400);
  assert.match(noMotivo.body.error, /motivo/i);

  // gestor reabre com motivo → volta ao fluxo e registra quem/por quê (SC-006)
  const reopened = await request(app)
    .post(`/api/tasks/${taskId}/reopen`)
    .set(as(gestorToken))
    .send({ motivo: 'Inspeção apontou infiltração' });
  assert.strictEqual(reopened.status, 200, JSON.stringify(reopened.body));
  assert.strictEqual(reopened.body.task.status, 'Em Progresso');
  assert.strictEqual(reopened.body.task.completed_text, null);

  const fetched = await request(app).get(`/api/tasks/${taskId}`).set(as(gestorToken));
  assert.strictEqual(fetched.status, 200);
  const reopenEntry = fetched.body.history.find((h) => h.action === 'reopen');
  assert.ok(reopenEntry, 'reopen recorded in history');
  assert.match(reopenEntry.note, /infiltração/);
  assert.match(reopenEntry.user_name, /Guto/, 'histórico registra quem');

  // reabrir tarefa que não está Concluída → recusa
  const notConcluded = await request(app)
    .post(`/api/tasks/${taskId}/reopen`)
    .set(as(gestorToken))
    .send({ motivo: 'de novo' });
  assert.strictEqual(notConcluded.status, 400);
});

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

let domainId;
let adminToken;
let gestorToken;
let movToken;
let outToken;
let contractId;
let movId;
let outId;

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

function futureDate(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

test.before(async () => {
  await initTestDb();

  const sys = await request(app).post('/api/auth/login').send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  const enabled = await request(app)
    .post('/api/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Zeta Tarefas',
      adminName: 'Zeca',
      adminEmail: 'zeca@zeta.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201);
  domainId = enabled.body.domain.id;
  adminToken = await login('zeca@zeta.test', 'Secret1!', domainId);

  for (const [name, email, role] of [
    ['Guto', 'guto@zeta.test', 'gestor'],
    ['Mila', 'mila@zeta.test', 'prestador'],
    ['Otavio', 'otavio@zeta.test', 'prestador'],
  ]) {
    const res = await request(app)
      .post('/api/users')
      .set(as(adminToken))
      .send({ name, email, password: 'Secret1!', role });
    assert.strictEqual(res.status, 201);
  }
  gestorToken = await login('guto@zeta.test', 'Secret1!', domainId);
  movToken = await login('mila@zeta.test', 'Secret1!', domainId);
  outToken = await login('otavio@zeta.test', 'Secret1!', domainId);

  const db = getDomainDb(domainId);
  movId = db.get("SELECT id FROM users WHERE email = 'mila@zeta.test'").id;
  outId = db.get("SELECT id FROM users WHERE email = 'otavio@zeta.test'").id;

  const contract = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({
      name: 'Obra Fluxo',
      start_date: futureDate(-5),
      forecast_date: futureDate(60),
    });
  assert.strictEqual(contract.status, 201);
  contractId = contract.body.contract.id;

  const linked = await request(app)
    .post(`/api/contracts/${contractId}/prestadores`)
    .set(as(gestorToken))
    .send({ user_id: movId });
  assert.strictEqual(linked.status, 201);
});

test('FR-010 flow+link', async () => {
  // SC-004: assignment to a prestador who is NOT linked is refused
  const unlinked = await request(app)
    .post(`/api/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Nao atribuivel', assignee_id: outId });
  assert.strictEqual(unlinked.status, 400);
  assert.match(unlinked.body.error, /vinculado/i);

  // assigning a non-prestador is refused
  const db = getDomainDb(domainId);
  const gestorId = db.get("SELECT id FROM users WHERE email = 'guto@zeta.test'").id;
  const wrongRole = await request(app)
    .post(`/api/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Gestor nao executa', assignee_id: gestorId });
  assert.strictEqual(wrongRole.status, 400);

  // linked prestador assignment succeeds; task starts at A Fazer
  const created = await request(app)
    .post(`/api/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Fundacao', priority: 'high', assignee_id: movId });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const taskId = created.body.task.id;
  assert.strictEqual(created.body.task.status, 'A Fazer');
  assert.strictEqual(created.body.task.assignee_id, movId);

  // prestador cannot create tasks (gestor/admin only)
  const byPrestador = await request(app)
    .post(`/api/contracts/${contractId}/tasks`)
    .set(as(movToken))
    .send({ title: 'Auto criada' });
  assert.strictEqual(byPrestador.status, 403);

  // invalid priority refused
  const badPriority = await request(app)
    .post(`/api/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'X', priority: 'mega' });
  assert.strictEqual(badPriority.status, 400);

  // happy path flow: A Fazer → Em Progresso → Revisão (linked prestador only)
  const step1 = await request(app)
    .patch(`/api/tasks/${taskId}/status`)
    .set(as(movToken))
    .send({ status: 'Em Progresso' });
  assert.strictEqual(step1.status, 200, JSON.stringify(step1.body));
  assert.strictEqual(step1.body.task.status, 'Em Progresso');

  const step2 = await request(app)
    .patch(`/api/tasks/${taskId}/status`)
    .set(as(movToken))
    .send({ status: 'Revisão' });
  assert.strictEqual(step2.status, 200);
  assert.strictEqual(step2.body.task.status, 'Revisão');

  // skipping a stage is refused
  db.run("UPDATE tasks SET status = 'A Fazer' WHERE id = ?", [taskId]);
  const skip = await request(app)
    .patch(`/api/tasks/${taskId}/status`)
    .set(as(movToken))
    .send({ status: 'Revisão' });
  assert.strictEqual(skip.status, 400);
  assert.match(skip.body.error, /Fluxo/i);

  // moving backward is refused (reopen flow is the gestor's, T019)
  db.run("UPDATE tasks SET status = 'Revisão' WHERE id = ?", [taskId]);
  const back = await request(app)
    .patch(`/api/tasks/${taskId}/status`)
    .set(as(movToken))
    .send({ status: 'Em Progresso' });
  assert.strictEqual(back.status, 400);

  // only the assigned/linked prestador moves the task
  const byGestor = await request(app)
    .patch(`/api/tasks/${taskId}/status`)
    .set(as(gestorToken))
    .send({ status: 'Concluída', text: 'feito' });
  assert.strictEqual(byGestor.status, 403);

  const byOther = await request(app)
    .patch(`/api/tasks/${taskId}/status`)
    .set(as(outToken))
    .send({ status: 'Concluída', text: 'feito' });
  assert.strictEqual(byOther.status, 403);

  // Concluída without text refused (edge case: sem texto → recusa)
  db.run("UPDATE tasks SET status = 'Revisão' WHERE id = ?", [taskId]);
  const noText = await request(app)
    .patch(`/api/tasks/${taskId}/status`)
    .set(as(movToken))
    .send({ status: 'Concluída' });
  assert.strictEqual(noText.status, 400);
  assert.match(noText.body.error, /texto/i);

  // completing with text finishes the flow
  const done = await request(app)
    .patch(`/api/tasks/${taskId}/status`)
    .set(as(movToken))
    .send({ status: 'Concluída', text: 'Fundacao concluida com laje' });
  assert.strictEqual(done.status, 200, JSON.stringify(done.body));
  assert.strictEqual(done.body.task.status, 'Concluída');
  assert.match(done.body.task.completed_text, /Fundacao/);

  // GET /:id exposes the task + history trail
  const fetched = await request(app).get(`/api/tasks/${taskId}`).set(as(movToken));
  assert.strictEqual(fetched.status, 200);
  assert.ok(fetched.body.history.length >= 2, 'create + status history recorded');

  // prestador list: only own tasks (FR-013 basis)
  const movList = await request(app).get('/api/tasks').set(as(movToken));
  assert.ok(movList.body.tasks.every((t) => t.assignee_id === movId));
  const outList = await request(app).get('/api/tasks').set(as(outToken));
  assert.strictEqual(outList.body.tasks.length, 0);

  // admin list: whole domain
  const adminList = await request(app).get('/api/tasks').set(as(adminToken));
  assert.ok(adminList.body.tasks.some((t) => t.id === taskId));

  // edge case: overdue contract does not block task edits (vencido so sinaliza)
  const overdue = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'Vencido Tarefas', start_date: futureDate(-90), forecast_date: futureDate(-2) });
  assert.strictEqual(overdue.status, 201);
  const db2 = getDomainDb(domainId);
  db2.run(
    `INSERT INTO contract_prestadores(contract_id, user_id) VALUES (?, ?)`,
    [overdue.body.contract.id, movId]
  );
  const lateTask = await request(app)
    .post(`/api/contracts/${overdue.body.contract.id}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Tarefa em vencido', assignee_id: movId });
  assert.strictEqual(lateTask.status, 201);
  const lateMove = await request(app)
    .patch(`/api/tasks/${lateTask.body.task.id}/status`)
    .set(as(movToken))
    .send({ status: 'Em Progresso' });
  assert.strictEqual(lateMove.status, 200, 'tarefas seguem editáveis em contrato vencido');
});

const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function createTaskToRevisao(title) {
  const created = await request(app)
    .post(`/api/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title, assignee_id: movId });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const taskId = created.body.task.id;
  for (const status of ['Em Progresso', 'Revisão']) {
    const move = await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set(as(movToken))
      .send({ status });
    assert.strictEqual(move.status, 200, JSON.stringify(move.body));
  }
  return taskId;
}

test('FR-011 complete', async () => {
  const taskId = await createTaskToRevisao('Cobertura');

  // edge case: conclusão sem texto → recusa
  const noText = await request(app)
    .post(`/api/tasks/${taskId}/complete`)
    .set(as(movToken))
    .send({ text: '   ', photos: [] });
  assert.strictEqual(noText.status, 400);
  assert.match(noText.body.error, /texto/i);

  // gestor cannot complete (FR-011: prestador conclui só as suas)
  const byGestor = await request(app)
    .post(`/api/tasks/${taskId}/complete`)
    .set(as(gestorToken))
    .send({ text: 'feito pelo gestor' });
  assert.strictEqual(byGestor.status, 403);

  // another prestador sees the task as invisible (FR-013 applies, asserted here too)
  const byOther = await request(app)
    .post(`/api/tasks/${taskId}/complete`)
    .set(as(outToken))
    .send({ text: 'intruso' });
  assert.strictEqual(byOther.status, 404);

  // completion with text + photo: status, text, disk reference (SC-005)
  const done = await request(app)
    .post(`/api/tasks/${taskId}/complete`)
    .set(as(movToken))
    .send({
      text: 'Cobertura pronta',
      photos: [{ filename: 'cobertura.png', dataBase64: TINY_PNG }],
    });
  assert.strictEqual(done.status, 200, JSON.stringify(done.body));
  assert.strictEqual(done.body.task.status, 'Concluída');
  assert.match(done.body.task.completed_text, /Cobertura pronta/);
  assert.strictEqual(done.body.task.photo_count, 1, 'photo recorded');

  // FR-023: DB keeps only a reference; bytes live on disk and are served
  const db = getDomainDb(domainId);
  const photo = db.get('SELECT path FROM task_photos WHERE task_id = ?', [taskId]);
  assert.match(photo.path, /^uploads\//);
  assert.ok(photo.path.length < 100, 'reference only, no payload in DB');
  assert.ok(fs.existsSync(path.join(UPLOAD_DIR, path.basename(photo.path))), 'file on disk');
  const served = await request(app).get(`/${photo.path}`);
  assert.strictEqual(served.status, 200, 'fotos visíveis (SC-005)');

  // photos are optional: second task completes with text only
  const taskId2 = await createTaskToRevisao('Impermeabilizacao');
  const textOnly = await request(app)
    .post(`/api/tasks/${taskId2}/complete`)
    .set(as(movToken))
    .send({ text: 'Sem foto, ok' });
  assert.strictEqual(textOnly.status, 200);
  assert.strictEqual(textOnly.body.task.photo_count, 0);

  // completing an already-concluded task is refused (flow guard)
  const again = await request(app)
    .post(`/api/tasks/${taskId}/complete`)
    .set(as(movToken))
    .send({ text: 'de novo' });
  assert.strictEqual(again.status, 400);
});

test('FR-013 visibility', async () => {
  // give the other prestador their own contract + task
  const db = getDomainDb(domainId);
  const linked = await request(app)
    .post(`/api/contracts/${contractId}/prestadores`)
    .set(as(gestorToken))
    .send({ user_id: outId });
  assert.ok([200, 201, 409].includes(linked.status), JSON.stringify(linked.body));

  const created = await request(app)
    .post(`/api/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Vistoria', assignee_id: outId });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const otherTaskId = created.body.task.id;

  const movTask = db.get("SELECT id FROM tasks WHERE title = 'Fundacao'");

  // prestador list: only own tasks
  const movList = await request(app).get('/api/tasks').set(as(movToken));
  assert.strictEqual(movList.status, 200);
  assert.ok(movList.body.tasks.length > 0);
  assert.ok(
    movList.body.tasks.every((t) => t.assignee_id === movId),
    'mov sees only own tasks'
  );
  assert.ok(
    !movList.body.tasks.some((t) => t.id === otherTaskId),
    "other prestador's task hidden from mov"
  );

  const outList = await request(app).get('/api/tasks').set(as(outToken));
  assert.ok(outList.body.tasks.every((t) => t.assignee_id === outId));
  assert.ok(outList.body.tasks.some((t) => t.id === otherTaskId));

  // alheia invisível: direct fetch also 404
  const peek = await request(app).get(`/api/tasks/${otherTaskId}`).set(as(movToken));
  assert.strictEqual(peek.status, 404);

  // management: admin/gestor see the whole domain
  const gestorView = await request(app).get(`/api/tasks/${otherTaskId}`).set(as(gestorToken));
  assert.strictEqual(gestorView.status, 200);
  const adminList = await request(app).get('/api/tasks').set(as(adminToken));
  assert.ok(adminList.body.tasks.some((t) => t.id === otherTaskId));
  assert.ok(adminList.body.tasks.some((t) => t.id === movTask.id));

  // prestador contract list: only contracts they are linked to
  const movContracts = await request(app).get('/api/contracts').set(as(movToken));
  const movIds = movContracts.body.contracts.map((c) => c.id);
  const vencido = db.get("SELECT id FROM contracts WHERE name = 'Vencido Tarefas'");
  assert.ok(movIds.includes(vencido.id), 'mov linked to vencido contract');
  assert.ok(!movIds.includes(999999), 'sanity');

  const outContracts = await request(app).get('/api/contracts').set(as(outToken));
  const outIds = outContracts.body.contracts.map((c) => c.id);
  assert.ok(!outIds.includes(vencido.id), 'out not linked to vencido → hidden');
});
