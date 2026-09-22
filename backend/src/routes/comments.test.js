'use strict';

process.env.UPLOAD_DIR = require('path').join(
  require('os').tmpdir(),
  `sddp-uploads-comments-${process.pid}`
);

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir();
const { app } = require('../server');
const { getDomainDb } = require('../config/database');

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
let ownTaskId;
let alheiaTaskId;

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

const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test.before(async () => {
  await initTestDb();

  const sys = await request(app).post('/api/auth/login').send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  const enabled = await request(app)
    .post('/api/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Teta Comentários',
      adminName: 'Telma',
      adminEmail: 'telma@teta.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201);
  domainId = enabled.body.domain.id;
  adminToken = await login('telma@teta.test', 'Secret1!', domainId);

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
  movToken = await login('mila@teta.test', 'Secret1!', domainId);
  outToken = await login('otavio@teta.test', 'Secret1!', domainId);

  const db = getDomainDb(domainId);
  movId = db.get("SELECT id FROM users WHERE email = 'mila@teta.test'").id;
  outId = db.get("SELECT id FROM users WHERE email = 'otavio@teta.test'").id;

  const contract = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'Obra Comentários', start_date: futureDate(-5), forecast_date: futureDate(60) });
  assert.strictEqual(contract.status, 201);
  contractId = contract.body.contract.id;

  for (const userId of [movId, outId]) {
    const linked = await request(app)
      .post(`/api/contracts/${contractId}/prestadores`)
      .set(as(gestorToken))
      .send({ user_id: userId });
    assert.ok([200, 201].includes(linked.status), JSON.stringify(linked.body));
  }

  const own = await request(app)
    .post(`/api/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Tarefa da Mila', assignee_id: movId });
  assert.strictEqual(own.status, 201);
  ownTaskId = own.body.task.id;

  const alheia = await request(app)
    .post(`/api/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Tarefa do Otavio', assignee_id: outId });
  assert.strictEqual(alheia.status, 201);
  alheiaTaskId = alheia.body.task.id;
});

test('FR-015 comments/attach', async () => {
  // management comment on any task in the domain
  const gestorComment = await request(app)
    .post(`/api/tasks/${ownTaskId}/comments`)
    .set(as(gestorToken))
    .send({ body: 'Priorize a laje' });
  assert.strictEqual(gestorComment.status, 201, JSON.stringify(gestorComment.body));
  assert.match(gestorComment.body.comment.user_name, /Guto/);

  // prestador comments on their own task
  const ownComment = await request(app)
    .post(`/api/tasks/${ownTaskId}/comments`)
    .set(as(movToken))
    .send({ body: 'Em andamento, previsão sexta' });
  assert.strictEqual(ownComment.status, 201);

  // prestador cannot comment on someone else's task (FR-015: só nas próprias)
  const alheia = await request(app)
    .post(`/api/tasks/${alheiaTaskId}/comments`)
    .set(as(movToken))
    .send({ body: 'intruso' });
  assert.strictEqual(alheia.status, 404);

  // empty body refused
  const empty = await request(app)
    .post(`/api/tasks/${ownTaskId}/comments`)
    .set(as(movToken))
    .send({ body: '   ' });
  assert.strictEqual(empty.status, 400);

  // comments listing respects visibility
  const ownList = await request(app).get(`/api/tasks/${ownTaskId}/comments`).set(as(movToken));
  assert.strictEqual(ownList.status, 200);
  assert.strictEqual(ownList.body.comments.length, 2);

  const peek = await request(app).get(`/api/tasks/${alheiaTaskId}/comments`).set(as(movToken));
  assert.strictEqual(peek.status, 404);

  const adminList = await request(app)
    .get(`/api/tasks/${alheiaTaskId}/comments`)
    .set(as(adminToken));
  assert.strictEqual(adminList.status, 200);

  // attachment upload: disk bytes, reference stored (FR-023 + FR-015)
  const attach = await request(app)
    .post(`/api/tasks/${ownTaskId}/attachments`)
    .set(as(movToken))
    .send({ filename: 'nota.pdf', dataBase64: TINY_PNG, kind: 'file' });
  assert.strictEqual(attach.status, 201, JSON.stringify(attach.body));
  assert.match(attach.body.attachment.path, /^uploads\//);
  assert.strictEqual(attach.body.attachment.original_name, 'nota.pdf');
  assert.match(attach.body.attachment.uploaded_by_name, /Mila/);

  // attachment on alheia refused
  const alheiaAttach = await request(app)
    .post(`/api/tasks/${alheiaTaskId}/attachments`)
    .set(as(movToken))
    .send({ filename: 'x.png', dataBase64: TINY_PNG });
  assert.strictEqual(alheiaAttach.status, 404);

  // attachments listing visible to management
  const attachList = await request(app)
    .get(`/api/tasks/${ownTaskId}/attachments`)
    .set(as(gestorToken));
  assert.strictEqual(attachList.status, 200);
  assert.strictEqual(attachList.body.attachments.length, 1);

  // missing payload refused with 400
  const noPayload = await request(app)
    .post(`/api/tasks/${ownTaskId}/attachments`)
    .set(as(movToken))
    .send({ filename: 'vazio.png' });
  assert.strictEqual(noPayload.status, 400);
});
