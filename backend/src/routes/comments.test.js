'use strict';

process.env.UPLOAD_DIR = require('path').join(
  require('os').tmpdir(),
  `sddp-uploads-comments-${process.pid}`
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
    .post('/api/v2/auth/login')
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

  const sys = await request(app).post('/api/v2/auth/login').send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  const enabled = await request(app)
    .post('/api/v2/domains/enable')
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
      .post('/api/v2/users')
      .set(as(adminToken))
      .send({ name, email, password: 'Secret1!', role, username: email.split('@')[0] });
    assert.strictEqual(res.status, 201);
  }
  gestorToken = await login('guto@teta.test', 'Secret1!', domainId);
  movToken = await login('mila@teta.test', 'Secret1!', domainId);
  outToken = await login('otavio@teta.test', 'Secret1!', domainId);

  const db = getDomainDb(domainId);
  movId = db.get("SELECT id FROM users WHERE email = 'mila@teta.test'").id;
  outId = db.get("SELECT id FROM users WHERE email = 'otavio@teta.test'").id;

  const contract = await request(app)
    .post('/api/v2/contracts')
    .set(as(gestorToken))
    .send({ name: 'Obra Comentários', start_date: futureDate(-5), forecast_date: futureDate(60) });
  assert.strictEqual(contract.status, 201);
  contractId = contract.body.contract.id;

  for (const userId of [movId, outId]) {
    const linked = await request(app)
      .post(`/api/v2/contracts/${contractId}/providers`)
      .set(as(gestorToken))
      .send({ user_id: userId });
    assert.ok([200, 201].includes(linked.status), JSON.stringify(linked.body));
  }

  const own = await request(app)
    .post(`/api/v2/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Tarefa da Mila', assignee_id: movId });
  assert.strictEqual(own.status, 201);
  ownTaskId = own.body.task.id;

  const alheia = await request(app)
    .post(`/api/v2/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Tarefa do Otavio', assignee_id: outId });
  assert.strictEqual(alheia.status, 201);
  alheiaTaskId = alheia.body.task.id;
});

test('FR-015 comments/attach', async () => {
  // management comment on any task in the domain
  const gestorComment = await request(app)
    .post(`/api/v2/tasks/${ownTaskId}/comments`)
    .set(as(gestorToken))
    .send({ body: 'Priorize a laje' });
  assert.strictEqual(gestorComment.status, 201, JSON.stringify(gestorComment.body));
  assert.match(gestorComment.body.comment.user_name, /Guto/);

  // prestador comments on their own task
  const ownComment = await request(app)
    .post(`/api/v2/tasks/${ownTaskId}/comments`)
    .set(as(movToken))
    .send({ body: 'Em andamento, previsão sexta' });
  assert.strictEqual(ownComment.status, 201);

  // prestador cannot comment on someone else's task (FR-015: só nas próprias)
  const alheia = await request(app)
    .post(`/api/v2/tasks/${alheiaTaskId}/comments`)
    .set(as(movToken))
    .send({ body: 'intruso' });
  assert.strictEqual(alheia.status, 404);

  // empty body refused
  const empty = await request(app)
    .post(`/api/v2/tasks/${ownTaskId}/comments`)
    .set(as(movToken))
    .send({ body: '   ' });
  assert.strictEqual(empty.status, 400);

  // comments listing respects visibility
  const ownList = await request(app).get(`/api/v2/tasks/${ownTaskId}/comments`).set(as(movToken));
  assert.strictEqual(ownList.status, 200);
  assert.strictEqual(ownList.body.comments.length, 2);

  const peek = await request(app).get(`/api/v2/tasks/${alheiaTaskId}/comments`).set(as(movToken));
  assert.strictEqual(peek.status, 404);

  const adminList = await request(app)
    .get(`/api/v2/tasks/${alheiaTaskId}/comments`)
    .set(as(adminToken));
  assert.strictEqual(adminList.status, 200);

  // attachment upload: disk bytes, reference stored (FR-023 + FR-015)
  const attach = await request(app)
    .post(`/api/v2/tasks/${ownTaskId}/attachments`)
    .set(as(movToken))
    .send({ filename: 'nota.pdf', dataBase64: TINY_PNG, kind: 'file' });
  assert.strictEqual(attach.status, 201, JSON.stringify(attach.body));
  assert.match(attach.body.attachment.path, /^uploads\//);
  assert.strictEqual(attach.body.attachment.original_name, 'nota.pdf');
  assert.match(attach.body.attachment.uploaded_by_name, /Mila/);

  // attachment on alheia refused
  const alheiaAttach = await request(app)
    .post(`/api/v2/tasks/${alheiaTaskId}/attachments`)
    .set(as(movToken))
    .send({ filename: 'x.png', dataBase64: TINY_PNG });
  assert.strictEqual(alheiaAttach.status, 404);

  // attachments listing visible to management
  const attachList = await request(app)
    .get(`/api/v2/tasks/${ownTaskId}/attachments`)
    .set(as(gestorToken));
  assert.strictEqual(attachList.status, 200);
  assert.strictEqual(attachList.body.attachments.length, 1);

  // missing payload refused with 400
  const noPayload = await request(app)
    .post(`/api/v2/tasks/${ownTaskId}/attachments`)
    .set(as(movToken))
    .send({ filename: 'vazio.png' });
  assert.strictEqual(noPayload.status, 400);
});

// Acceptance stub — plan.md §Acceptance Test Stubs (RED until T006).
test('FR-004 comentário e anexo com autor e data', async () => {
  // comentário gravado junto da tarefa com autor e data
  const comment = await request(app)
    .post(`/api/v2/tasks/${ownTaskId}/comments`)
    .set(as(movToken))
    .send({ body: 'FR-004 anotação de execução' });
  assert.strictEqual(comment.status, 201, JSON.stringify(comment.body));
  assert.match(comment.body.comment.user_name, /Mila/, 'autor do comentário');
  assert.ok(comment.body.comment.created_at, 'data do comentário');

  const db = getDomainDb(domainId);
  const stored = db.get(
    'SELECT user_id, created_at FROM comments WHERE id = ?',
    [comment.body.comment.id]
  );
  assert.strictEqual(stored.user_id, movId, 'autor persistido');
  assert.ok(stored.created_at, 'data persistida');

  // anexo gravado junto da tarefa com autor e data
  const attach = await request(app)
    .post(`/api/v2/tasks/${ownTaskId}/attachments`)
    .set(as(movToken))
    .send({ filename: 'relatorio-fr004.pdf', dataBase64: TINY_PNG, kind: 'file' });
  assert.strictEqual(attach.status, 201, JSON.stringify(attach.body));
  assert.match(attach.body.attachment.uploaded_by_name, /Mila/, 'autor do anexo');
  assert.ok(attach.body.attachment.created_at, 'data do anexo');
  const storedAtt = db.get(
    'SELECT uploaded_by, created_at FROM attachments WHERE id = ?',
    [attach.body.attachment.id]
  );
  assert.strictEqual(storedAtt.uploaded_by, movId, 'autor do anexo persistido');
  assert.ok(storedAtt.created_at, 'data do anexo persistida');
});

// ---- 00014 (FR-036/FR-037): categoria do anexo + gate do prestador ---------
// Upload aceita evidence (default, 00005 intocado) e documentation; prestador
// é bloqueado em Concluída com 403 antes de gravar; gestor/admin anexam em
// qualquer estado; o detalhe segue expondo autor e data.
test('FR-036 anexo com category e gate do prestador em Concluída', async () => {
  const db = getDomainDb(domainId);

  const created = await request(app)
    .post(`/api/v2/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'FR-036 documentação', assignee_id: movId });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const taskId = created.body.task.id;

  // prestador anexa documentação em execução → 201 com a categoria
  const doc = await request(app)
    .post(`/api/v2/tasks/${taskId}/attachments`)
    .set(as(movToken))
    .send({ filename: 'como-fazer.pdf', dataBase64: TINY_PNG, kind: 'file', category: 'documentation' });
  assert.strictEqual(doc.status, 201, JSON.stringify(doc.body));
  assert.strictEqual(doc.body.attachment.category, 'documentation', 'categoria gravada');
  assert.match(doc.body.attachment.path, /^uploads\//, 'arquivo antes da referência');
  assert.ok(fs.existsSync(path.join(UPLOAD_DIR, path.basename(doc.body.attachment.path))), 'no disco');

  // sem categoria → default evidence (evidência de 00005 inalterada)
  const evidence = await request(app)
    .post(`/api/v2/tasks/${taskId}/attachments`)
    .set(as(movToken))
    .send({ filename: 'foto-execucao.png', dataBase64: TINY_PNG, kind: 'photo' });
  assert.strictEqual(evidence.status, 201, JSON.stringify(evidence.body));
  assert.strictEqual(evidence.body.attachment.category, 'evidence', 'default evidence');

  // categoria desconhecida → 400 sem gravação (disco e banco intactos)
  const rowsBefore = db.get('SELECT COUNT(*) AS n FROM attachments WHERE task_id = ?', [taskId]).n;
  const filesBefore = fs.readdirSync(UPLOAD_DIR).length;
  const badCategory = await request(app)
    .post(`/api/v2/tasks/${taskId}/attachments`)
    .set(as(movToken))
    .send({ filename: 'x.png', dataBase64: TINY_PNG, category: 'folha-de-obra' });
  assert.strictEqual(badCategory.status, 400, JSON.stringify(badCategory.body));
  assert.strictEqual(badCategory.body.code, 'TASK_ATTACHMENT_CATEGORY_INVALID');
  assert.strictEqual(
    db.get('SELECT COUNT(*) AS n FROM attachments WHERE task_id = ?', [taskId]).n,
    rowsBefore,
    'recusa sem registro'
  );
  assert.strictEqual(fs.readdirSync(UPLOAD_DIR).length, filesBefore, 'recusa sem arquivo');

  // leva a tarefa até Concluída pelo fluxo do prestador (00005)
  for (const status of ['Em Progresso', 'Revisão']) {
    const move = await request(app)
      .patch(`/api/v2/tasks/${taskId}/status`)
      .set(as(movToken))
      .send({ status });
    assert.strictEqual(move.status, 200, JSON.stringify(move.body));
  }
  const done = await request(app)
    .post(`/api/v2/tasks/${taskId}/complete`)
    .set(as(movToken))
    .send({ text: 'FR-036 concluída' });
  assert.strictEqual(done.status, 200, JSON.stringify(done.body));
  assert.strictEqual(done.body.task.status, 'Concluída');

  // prestador em Concluída → 403 com code estável, antes de gravar
  const gateRows = db.get('SELECT COUNT(*) AS n FROM attachments WHERE task_id = ?', [taskId]).n;
  const gateFiles = fs.readdirSync(UPLOAD_DIR).length;
  const blocked = await request(app)
    .post(`/api/v2/tasks/${taskId}/attachments`)
    .set(as(movToken))
    .send({ filename: 'tarja.png', dataBase64: TINY_PNG, category: 'documentation' });
  assert.strictEqual(blocked.status, 403, JSON.stringify(blocked.body));
  assert.strictEqual(blocked.body.code, 'TASK_ATTACHMENT_STATUS_FORBIDDEN');
  assert.strictEqual(
    db.get('SELECT COUNT(*) AS n FROM attachments WHERE task_id = ?', [taskId]).n,
    gateRows,
    '403 sem registro'
  );
  assert.strictEqual(fs.readdirSync(UPLOAD_DIR).length, gateFiles, '403 sem arquivo');

  // gestor e admin anexam em qualquer estado (Concluída inclusive)
  const byGestor = await request(app)
    .post(`/api/v2/tasks/${taskId}/attachments`)
    .set(as(gestorToken))
    .send({ filename: 'manual-gestor.pdf', dataBase64: TINY_PNG, kind: 'file', category: 'documentation' });
  assert.strictEqual(byGestor.status, 201, JSON.stringify(byGestor.body));
  assert.strictEqual(byGestor.body.attachment.category, 'documentation');
  const byAdmin = await request(app)
    .post(`/api/v2/tasks/${taskId}/attachments`)
    .set(as(adminToken))
    .send({ filename: 'laudo-admin.pdf', dataBase64: TINY_PNG, kind: 'file' });
  assert.strictEqual(byAdmin.status, 201, JSON.stringify(byAdmin.body));
  assert.strictEqual(byAdmin.body.attachment.category, 'evidence');

  // FR-037: o detalhe expõe os anexos com autor, data e categoria
  const list = await request(app)
    .get(`/api/v2/tasks/${taskId}/attachments`)
    .set(as(gestorToken));
  assert.strictEqual(list.status, 200, JSON.stringify(list.body));
  assert.strictEqual(list.body.attachments.length, 4, 'todos os anexos no detalhe');
  assert.ok(
    list.body.attachments.every((a) => a.uploaded_by_name && a.created_at),
    'autor e data em cada anexo'
  );
  assert.ok(
    list.body.attachments.some((a) => a.category === 'documentation'),
    'categoria exposta no detalhe'
  );
});
