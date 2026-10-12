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
const { code } = require('../config/enums');
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
  assert.strictEqual(noMotivo.body.code, 'TASK_REOPEN_REASON_REQUIRED');

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
      .send({ name, email, password: 'Secret1!', role, username: email.split('@')[0] });
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
  assert.match(unlinked.body.error, /not linked/i);
  assert.strictEqual(unlinked.body.code, 'PRESTADOR_NOT_LINKED');

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
  db.run('UPDATE tasks SET status = ? WHERE id = ?', [code('tasks.status', 'A Fazer'), taskId]);
  const skip = await request(app)
    .patch(`/api/tasks/${taskId}/status`)
    .set(as(movToken))
    .send({ status: 'Revisão' });
  assert.strictEqual(skip.status, 400);
  assert.match(skip.body.error, /invalid flow/i);
  assert.strictEqual(skip.body.code, 'TASK_INVALID_FLOW');

  // moving backward is refused (reopen flow is the gestor's, T019)
  db.run('UPDATE tasks SET status = ? WHERE id = ?', [code('tasks.status', 'Revisão'), taskId]);
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
  db.run('UPDATE tasks SET status = ? WHERE id = ?', [code('tasks.status', 'Revisão'), taskId]);
  const noText = await request(app)
    .patch(`/api/tasks/${taskId}/status`)
    .set(as(movToken))
    .send({ status: 'Concluída' });
  assert.strictEqual(noText.status, 400);
  assert.match(noText.body.error, /requires text/i);
  assert.strictEqual(noText.body.code, 'TASK_CONCLUSION_TEXT_REQUIRED');

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
    `INSERT INTO contract_providers(contract_id, user_id) VALUES (?, ?)`,
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
  assert.match(noText.body.error, /requires text/i);

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

// Acceptance stub — plan.md §Acceptance Test Stubs (RED until T012).
test('FR-009 tarefas seguem em atrasado', async () => {
  const created = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({
      name: 'FR-009 Atrasado',
      start_date: futureDate(-30),
      forecast_date: futureDate(-1),
    });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const atrasadoId = created.body.contract.id;
  assert.strictEqual(created.body.contract.status, 'atrasado');

  const linked = await request(app)
    .post(`/api/contracts/${atrasadoId}/prestadores`)
    .set(as(gestorToken))
    .send({ user_id: movId });
  assert.strictEqual(linked.status, 201, JSON.stringify(linked.body));

  // criação aceita nas mesmas condições de um vigente
  const task = await request(app)
    .post(`/api/contracts/${atrasadoId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Tarefa sobre atrasado', assignee_id: movId });
  assert.strictEqual(task.status, 201, JSON.stringify(task.body));
  const taskId = task.body.task.id;

  // movimentação pelo fluxo segue aceita
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
    .send({ text: 'Concluída sobre contrato atrasado' });
  assert.strictEqual(done.status, 200, JSON.stringify(done.body));
  assert.strictEqual(done.body.task.status, 'Concluída');

  // tarefa não altera o status derivado do contrato
  const fetched = await request(app).get(`/api/contracts/${atrasadoId}`).set(as(gestorToken));
  assert.strictEqual(fetched.status, 200);
  assert.strictEqual(fetched.body.contract.status, 'atrasado');
});

// Acceptance stubs — plan.md §Acceptance Test Stubs (RED until T003–T005).
test('FR-001 fluxo e conclusão só do prestador vinculado', async () => {
  const created = await request(app)
    .post(`/api/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'FR-001 fluxo', assignee_id: movId });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const taskId = created.body.task.id;
  assert.strictEqual(created.body.task.status, 'A Fazer');

  // fluxo só para frente: A Fazer → Em Progresso → Revisão → Concluída
  const step1 = await request(app)
    .patch(`/api/tasks/${taskId}/status`)
    .set(as(movToken))
    .send({ status: 'Em Progresso' });
  assert.strictEqual(step1.status, 200);
  const skip = await request(app)
    .patch(`/api/tasks/${taskId}/status`)
    .set(as(movToken))
    .send({ status: 'Concluída' });
  assert.strictEqual(skip.status, 400, 'pulo de fluxo recusado');
  const step2 = await request(app)
    .patch(`/api/tasks/${taskId}/status`)
    .set(as(movToken))
    .send({ status: 'Revisão' });
  assert.strictEqual(step2.status, 200);

  // admin e gestor não concluem: 403 (só o prestador vinculado)
  for (const [token, label] of [
    [adminToken, 'admin'],
    [gestorToken, 'gestor'],
  ]) {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/complete`)
      .set(as(token))
      .send({ text: 'não é meu ofício' });
    assert.strictEqual(res.status, 403, label);
  }

  // prestador vinculado conclui e o histórico registra a conclusão
  const done = await request(app)
    .post(`/api/tasks/${taskId}/complete`)
    .set(as(movToken))
    .send({ text: 'FR-001 executado' });
  assert.strictEqual(done.status, 200, JSON.stringify(done.body));
  assert.strictEqual(done.body.task.status, 'Concluída');

  const db = getDomainDb(domainId);
  const hist = db.all(
    "SELECT action, user_id FROM task_history WHERE task_id = ? AND action = 'complete'",
    [taskId]
  );
  assert.strictEqual(hist.length, 1, 'conclusão no histórico');
  assert.strictEqual(hist[0].user_id, movId, 'autor da conclusão');
});
test('FR-002 conclusão sem texto responde 400', async () => {
  const taskId = await createTaskToRevisao('FR-002 sem texto');
  const db = getDomainDb(domainId);
  const before = db.get(
    'SELECT COUNT(*) AS n FROM task_history WHERE task_id = ?',
    [taskId]
  ).n;

  const res = await request(app)
    .post(`/api/tasks/${taskId}/complete`)
    .set(as(movToken))
    .send({ text: '   ', photos: [] });
  assert.strictEqual(res.status, 400, JSON.stringify(res.body));
  assert.match(res.body.error, /requires text/i);

  // nada muda: status, evidência e histórico intactos
  const row = db.get('SELECT status FROM tasks WHERE id = ?', [taskId]);
  assert.strictEqual(row.status, code('tasks.status', 'Revisão'), 'status preservado');
  const photos = db.get(
    'SELECT COUNT(*) AS n FROM task_photos WHERE task_id = ?',
    [taskId]
  ).n;
  assert.strictEqual(photos, 0, 'sem fotos gravadas');
  const after = db.get(
    'SELECT COUNT(*) AS n FROM task_history WHERE task_id = ?',
    [taskId]
  ).n;
  assert.strictEqual(after, before, 'sem linha nova no histórico');
});
test('FR-003 fotos opcionais gravadas antes da referência', async () => {
  const taskId = await createTaskToRevisao('FR-003 com fotos');
  const photos = Array.from({ length: 10 }, (_, i) => ({
    filename: `fr003-${i}.png`,
    dataBase64: TINY_PNG,
  }));
  const res = await request(app)
    .post(`/api/tasks/${taskId}/complete`)
    .set(as(movToken))
    .send({ text: 'FR-003 cobertura pronta', photos });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(res.body.task.photo_count, 10);

  const db = getDomainDb(domainId);
  const rows = db.all('SELECT path FROM task_photos WHERE task_id = ?', [taskId]);
  assert.strictEqual(rows.length, 10, '10 referências');
  for (const r of rows) {
    assert.match(r.path, /^uploads\//, 'referência relativa, sem bytes');
    assert.ok(
      fs.existsSync(path.join(UPLOAD_DIR, path.basename(r.path))),
      `arquivo gravado antes da referência: ${r.path}`
    );
  }
  const hist = db.all(
    "SELECT COUNT(*) AS n FROM task_history WHERE task_id = ? AND action = 'complete'",
    [taskId]
  );
  assert.strictEqual(hist[0].n, 1, 'conclusão no histórico');

  // 11 fotos → 400 antes de qualquer escrita
  const taskId2 = await createTaskToRevisao('FR-003 onze fotos');
  const many = Array.from({ length: 11 }, () => ({
    filename: 'f.png',
    dataBase64: TINY_PNG,
  }));
  const over = await request(app)
    .post(`/api/tasks/${taskId2}/complete`)
    .set(as(movToken))
    .send({ text: 'dezena', photos: many });
  assert.strictEqual(over.status, 400, JSON.stringify(over.body));
  const row2 = db.get('SELECT status FROM tasks WHERE id = ?', [taskId2]);
  assert.strictEqual(row2.status, code('tasks.status', 'Revisão'), 'status preservado no 400');
  const photos2 = db.get(
    'SELECT COUNT(*) AS n FROM task_photos WHERE task_id = ?',
    [taskId2]
  ).n;
  assert.strictEqual(photos2, 0, 'nenhuma foto gravada');
});

// Acceptance stubs — plan.md §Acceptance Test Stubs (RED until T008–T009).
test('FR-005 reabertura sem motivo responde 400', async () => {
  const taskId = await createTaskToRevisao('FR-005 reabertura');
  const done = await request(app)
    .post(`/api/tasks/${taskId}/complete`)
    .set(as(movToken))
    .send({ text: 'concluída para reabrir' });
  assert.strictEqual(done.status, 200, JSON.stringify(done.body));

  const db = getDomainDb(domainId);
  const before = db.get(
    'SELECT COUNT(*) AS n FROM task_history WHERE task_id = ?',
    [taskId]
  ).n;

  for (const motivo of ['', '   ']) {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/reopen`)
      .set(as(gestorToken))
      .send({ motivo });
    assert.strictEqual(res.status, 400, JSON.stringify(res.body));
    assert.match(res.body.error, /motivo/i);
  }

  // 400 antes de qualquer escrita: status e histórico intactos
  const row = db.get('SELECT status FROM tasks WHERE id = ?', [taskId]);
  assert.strictEqual(row.status, code('tasks.status', 'Concluída'), 'status preservado');
  const after = db.get(
    'SELECT COUNT(*) AS n FROM task_history WHERE task_id = ?',
    [taskId]
  ).n;
  assert.strictEqual(after, before, 'sem linha nova no histórico');
});
test('FR-006 histórico de reabertura com autor e motivo', async () => {
  const taskId = await createTaskToRevisao('FR-006 reabertura justificada');
  const done = await request(app)
    .post(`/api/tasks/${taskId}/complete`)
    .set(as(movToken))
    .send({ text: 'concluída antes da correção' });
  assert.strictEqual(done.status, 200);

  // prestador não reabre: 403
  const byPrestador = await request(app)
    .post(`/api/tasks/${taskId}/reopen`)
    .set(as(movToken))
    .send({ motivo: 'quero reabrir' });
  assert.strictEqual(byPrestador.status, 403);

  // gestor reabre: volta ao fluxo e grava ação, autor, motivo e data
  const reopened = await request(app)
    .post(`/api/tasks/${taskId}/reopen`)
    .set(as(gestorToken))
    .send({ motivo: 'rebite mal fixado' });
  assert.strictEqual(reopened.status, 200, JSON.stringify(reopened.body));
  assert.strictEqual(reopened.body.task.status, 'Em Progresso');

  const db = getDomainDb(domainId);
  const gestorId = db.get("SELECT id FROM users WHERE email = 'guto@zeta.test'").id;
  const rows = db.all(
    "SELECT action, user_id, note, created_at FROM task_history WHERE task_id = ? AND action = 'reopen'",
    [taskId]
  );
  assert.strictEqual(rows.length, 1, 'uma reabertura no histórico');
  assert.strictEqual(rows[0].user_id, gestorId, 'autor da reabertura');
  assert.strictEqual(rows[0].note, 'rebite mal fixado', 'motivo registrado');
  assert.ok(rows[0].created_at, 'data registrada');

  // admin também reabre (autoridade admin/gestor): leva de volta até Revisão
  const backToRevisao = await request(app)
    .patch(`/api/tasks/${taskId}/status`)
    .set(as(movToken))
    .send({ status: 'Revisão' });
  assert.strictEqual(backToRevisao.status, 200, JSON.stringify(backToRevisao.body));
  const done2 = await request(app)
    .post(`/api/tasks/${taskId}/complete`)
    .set(as(movToken))
    .send({ text: 'concluída de novo' });
  assert.strictEqual(done2.status, 200);
  const byAdmin = await request(app)
    .post(`/api/tasks/${taskId}/reopen`)
    .set(as(adminToken))
    .send({ motivo: 'inspeção reprovou a correção' });
  assert.strictEqual(byAdmin.status, 200, JSON.stringify(byAdmin.body));
  const all = db.all(
    "SELECT COUNT(*) AS n FROM task_history WHERE task_id = ? AND action = 'reopen'",
    [taskId]
  );
  assert.strictEqual(all[0].n, 2, 'segunda reabertura registrada');
});

// Acceptance stubs — plan.md §Acceptance Test Stubs (RED until T017–T018).
// FR-010 (E003, AD-002): domainId estrangeiro → 403 nos três roteadores,
// antes de qualquer leitura ou escrita.
test('FR-010 domainId estrangeiro 403 nos três roteadores', async () => {
  const created = await request(app)
    .post(`/api/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'FR-010 escopo', assignee_id: movId });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const taskId = created.body.task.id;
  const foreign = domainId + 1000;

  const rotas = [
    ['tasks', `/api/tasks?domainId=${foreign}`],
    ['comments', `/api/tasks/${taskId}/comments?domainId=${foreign}`],
    ['attachments', `/api/tasks/${taskId}/attachments?domainId=${foreign}`],
  ];
  for (const [label, url] of rotas) {
    const res = await request(app).get(url).set(as(gestorToken));
    assert.strictEqual(res.status, 403, `${label}: ${JSON.stringify(res.body)}`);
    assert.match(res.body.error, /forbidden/i);
  }

  // escrita também passa pelo guarda: POST com domainId estrangeiro → 403
  const write = await request(app)
    .post(`/api/tasks/${taskId}/comments?domainId=${foreign}`)
    .set(as(movToken))
    .send({ body: 'não deve gravar' });
  assert.strictEqual(write.status, 403);

  // domínio do próprio token continua liberado
  const own = await request(app).get(`/api/tasks?domainId=${domainId}`).set(as(gestorToken));
  assert.strictEqual(own.status, 200);
  const plain = await request(app).get(`/api/tasks/${taskId}/comments`).set(as(gestorToken));
  assert.strictEqual(plain.status, 200);
});
// FR-011 (E003): o prestador só enxerga as próprias tarefas na leitura.
test('FR-011 prestador só enxerga as próprias tarefas', async () => {
  const created = await request(app)
    .post(`/api/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'FR-011 restrito', assignee_id: movId });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const taskId = created.body.task.id;

  // Otávio (outToken) não enxerga a tarefa de Mila: 404 esconde existência
  const other = await request(app).get(`/api/tasks/${taskId}`).set(as(outToken));
  assert.strictEqual(other.status, 404);

  // a lista do Otávio não expõe a tarefa de terceiros
  const list = await request(app).get('/api/tasks').set(as(outToken));
  assert.strictEqual(list.status, 200);
  assert.ok(
    !list.body.tasks.some((t) => t.id === taskId),
    'tarefa alheia fora da lista do prestador'
  );
  // a lista da própria Mila segue trazendo a tarefa
  const mine = await request(app).get('/api/tasks').set(as(movToken));
  assert.ok(mine.body.tasks.some((t) => t.id === taskId), 'tarefa própria visível');

  // admin/gestor seguem vendo o domínio inteiro
  const byGestor = await request(app).get(`/api/tasks/${taskId}`).set(as(gestorToken));
  assert.strictEqual(byGestor.status, 200);

  // contrato de exportação: canSeeTask exposto e correto no roteador
  const tasksRouter = require('./tasks');
  assert.strictEqual(typeof tasksRouter.canSeeTask, 'function');
  assert.strictEqual(
    tasksRouter.canSeeTask({ role: 'prestador', id: outId }, { assignee_id: movId }),
    false
  );
  assert.strictEqual(
    tasksRouter.canSeeTask({ role: 'prestador', id: movId }, { assignee_id: movId }),
    true
  );
  assert.strictEqual(tasksRouter.canSeeTask({ role: 'gestor', id: 1 }, { assignee_id: movId }), true);
});

// ---- E010 (00012): avisos por e-mail — rotas de tarefa com SMTP vivo ----
// Copia mínima do servidor fake de services/email.test.js (padrão do projeto):
// 220/250 EHLO·MAIL·RCPT, 354 em DATA, 221 em QUIT, porta efêmera.
const net = require('node:net');
function startFakeSmtp() {
  const messages = [];
  // E010 T008: sessões TCP contadas para provar zero conexão no modo inerte.
  const state = { sessions: 0 };
  const server = net.createServer((sock) => {
    state.sessions += 1;
    let buf = '';
    let inData = false;
    sock.write('220 localhost ESMTP\r\n');
    sock.on('data', (chunk) => {
      buf += chunk;
      if (inData) {
        const end = buf.indexOf('\r\n.\r\n');
        if (end !== -1) {
          messages.push(buf.slice(0, end));
          buf = buf.slice(end + 5);
          inData = false;
          sock.write('250 2.0.0 queued\r\n');
        }
        return;
      }
      let i;
      while ((i = buf.indexOf('\r\n')) !== -1) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (line.startsWith('EHLO')) sock.write('250-localhost\r\n250 SIZE 10000000\r\n');
        else if (line.startsWith('MAIL')) sock.write('250 2.1.0 Ok\r\n');
        else if (line.startsWith('RCPT')) sock.write('250 2.1.5 Ok\r\n');
        else if (line.startsWith('DATA')) {
          inData = true;
          sock.write('354 End data with <CR><LF>.<CR><LF>\r\n');
        } else if (line.startsWith('QUIT')) {
          sock.write('221 2.0.0 Bye\r\n');
          sock.end();
        }
      }
    });
    sock.on('error', () => {});
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, messages, state, port: server.address().port });
    });
  });
}

// E010 T004 (SC-001): com SMTP configurado e vivo, atribuição, conclusão e
// reabertura preservam as respostas 200/201 e entregam seus e-mails — o canal
// opcional não muda o contrato das rotas.
test('E010 FR-001: rotas de tarefa preservam 200/201 com SMTP vivo', async () => {
  const smtp = await startFakeSmtp();
  process.env.SMTP_HOST = '127.0.0.1';
  process.env.SMTP_PORT = String(smtp.port);
  try {
    const created = await request(app)
      .post(`/api/contracts/${contractId}/tasks`)
      .set(as(gestorToken))
      .send({ title: 'E010 SMTP vivo', assignee_id: movId });
    assert.strictEqual(created.status, 201, JSON.stringify(created.body));

    for (const status of ['Em Progresso', 'Revisão']) {
      const move = await request(app)
        .patch(`/api/tasks/${created.body.task.id}/status`)
        .set(as(movToken))
        .send({ status });
      assert.strictEqual(move.status, 200, JSON.stringify(move.body));
    }

    const done = await request(app)
      .post(`/api/tasks/${created.body.task.id}/complete`)
      .set(as(movToken))
      .send({ text: 'Fluxo completo com SMTP vivo' });
    assert.strictEqual(done.status, 200, JSON.stringify(done.body));

    const reopened = await request(app)
      .post(`/api/tasks/${created.body.task.id}/reopen`)
      .set(as(gestorToken))
      .send({ motivo: 'ajuste pos inspecao' });
    assert.strictEqual(reopened.status, 200, JSON.stringify(reopened.body));

    assert.ok(
      smtp.messages.length >= 3,
      `assignment+completion+reopening entregues (${smtp.messages.length})`
    );
    const body = smtp.messages.join('\n--\n');
    assert.ok(body.includes('Evento: assignment'), 'mensagem de atribuição capturada');
    assert.ok(body.includes('Evento: completion'), 'mensagem de conclusão capturada');
    assert.ok(body.includes('Evento: reopening'), 'mensagem de reabertura capturada');
  } finally {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    smtp.server.close();
  }
});

// E010 T008 (FR-004/SC-004): modo inerte — servidor fake ao vivo, nenhum
// SMTP_* no ambiente. Os quatro eventos respondem 200/201, nenhum erro sobe
// e nenhuma conexão TCP é aberta (sessions === 0).
test('E010 FR-004: rotas de tarefa respondem 200/201 sem SMTP_* (zero conexões)', async () => {
  const smtp = await startFakeSmtp();
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  try {
    const created = await request(app)
      .post(`/api/contracts/${contractId}/tasks`)
      .set(as(gestorToken))
      .send({ title: 'E010 inerte rotas', assignee_id: movId });
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
      .send({ text: 'concluida sem smtp' });
    assert.strictEqual(done.status, 200, JSON.stringify(done.body));
    const reopened = await request(app)
      .post(`/api/tasks/${taskId}/reopen`)
      .set(as(gestorToken))
      .send({ motivo: 'reaberta sem smtp' });
    assert.strictEqual(reopened.status, 200, JSON.stringify(reopened.body));

    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.strictEqual(smtp.messages.length, 0, 'nenhuma mensagem entregue');
    assert.strictEqual(smtp.state.sessions, 0, 'SC-004: nenhuma conexao aberta sem SMTP_*');
  } finally {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    smtp.server.close();
  }
});
