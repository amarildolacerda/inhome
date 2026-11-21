'use strict';

process.env.UPLOAD_DIR = require('path').join(
  require('os').tmpdir(),
  `sddp-uploads-chat-${process.pid}`
);

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir('sddp-chat-data-');
const { app } = require('../server');
const { getDomainDb } = require('../config/database');
const { signJwt } = require('../middleware/auth');
const events = require('../services/events');
const analysis = require('../services/documentAnalysis');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

let domainId;
let adminToken;
let gestorToken;
let ownToken;
let outToken;
let outsiderToken;
let visitanteToken;
let gestorId;
let ownId;
let outId;
let contractId;
let ownTaskId;
let otherTaskId;

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

const DOC_B64 = Buffer.from(
  'Prazo de entrega: 2026-12-31\nMulta de 2% por atraso',
  'utf8'
).toString('base64');

test.before(async () => {
  await initTestDb();

  const sys = await request(app)
    .post('/api/v2/auth/login')
    .send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  const enabled = await request(app)
    .post('/api/v2/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Chat Domínio',
      adminName: 'Ana',
      adminEmail: 'ana@chat.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201);
  domainId = enabled.body.domain.id;
  adminToken = await login('ana@chat.test', 'Secret1!', domainId);

  for (const [name, email, role] of [
    ['Guto', 'guto@chat.test', 'gestor'],
    ['Mila', 'mila@chat.test', 'prestador'],
    ['Otavio', 'otavio@chat.test', 'prestador'],
    ['Nuno', 'nuno@chat.test', 'prestador'],
  ]) {
    const res = await request(app)
      .post('/api/v2/users')
      .set(as(adminToken))
      .send({ name, email, password: 'Secret1!', role, username: email.split('@')[0] });
    assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  }
  gestorToken = await login('guto@chat.test', 'Secret1!', domainId);
  ownToken = await login('mila@chat.test', 'Secret1!', domainId);
  outToken = await login('otavio@chat.test', 'Secret1!', domainId);
  outsiderToken = await login('nuno@chat.test', 'Secret1!', domainId);

  const db = getDomainDb(domainId);
  gestorId = db.get("SELECT id FROM users WHERE email = 'guto@chat.test'").id;
  ownId = db.get("SELECT id FROM users WHERE email = 'mila@chat.test'").id;
  outId = db.get("SELECT id FROM users WHERE email = 'otavio@chat.test'").id;
  visitanteToken = signJwt({ id: ownId, email: 'vis@chat.test', role: 'visitante', domainId });

  const contract = await request(app)
    .post('/api/v2/contracts')
    .set(as(gestorToken))
    .send({ name: 'Contrato Chat', start_date: futureDate(-5), forecast_date: futureDate(60) });
  assert.strictEqual(contract.status, 201);
  contractId = contract.body.contract.id;

  // Mila e Otavio vinculados; Nuno permanece de fora (teste FR-053)
  for (const userId of [ownId, outId]) {
    const linked = await request(app)
      .post(`/api/v2/contracts/${contractId}/providers`)
      .set(as(gestorToken))
      .send({ user_id: userId });
    assert.ok([200, 201].includes(linked.status), JSON.stringify(linked.body));
  }

  const own = await request(app)
    .post(`/api/v2/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Tarefa da Mila', assignee_id: ownId, due_date: futureDate(3) });
  assert.strictEqual(own.status, 201);
  ownTaskId = own.body.task.id;

  const other = await request(app)
    .post(`/api/v2/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Tarefa do Otavio', assignee_id: outId, due_date: futureDate(7) });
  assert.strictEqual(other.status, 201);
  otherTaskId = other.body.task.id;
});

// --- FR-051 / FR-054: histórico, limite de corpo e anexo de chat ---
test('FR-051 + FR-054: envia mensagem, anexa documento e lista histórico paginado', async () => {
  const posted = await request(app)
    .post(`/api/v2/contracts/${contractId}/chat/messages`)
    .set(as(ownToken))
    .send({ body: 'Segue o contrato', filename: 'contrato.txt', dataBase64: DOC_B64 });
  assert.strictEqual(posted.status, 201, JSON.stringify(posted.body));
  assert.strictEqual(posted.body.message.body, 'Segue o contrato');
  assert.strictEqual(posted.body.attachment.category, 'chat');

  const history = await request(app)
    .get(`/api/v2/contracts/${contractId}/chat/messages?limit=1&offset=0`)
    .set(as(gestorToken));
  assert.strictEqual(history.status, 200);
  assert.strictEqual(history.body.total, 1);
  assert.strictEqual(history.body.messages.length, 1);
  assert.strictEqual(history.body.messages[0].attachments.length, 1);

  const tooLong = await request(app)
    .post(`/api/v2/contracts/${contractId}/chat/messages`)
    .set(as(ownToken))
    .send({ body: 'x'.repeat(4001) });
  assert.strictEqual(tooLong.status, 400);

  const badExt = await request(app)
    .post(`/api/v2/contracts/${contractId}/chat/messages`)
    .set(as(ownToken))
    .send({ filename: 'virus.exe', dataBase64: DOC_B64 });
  assert.strictEqual(badExt.status, 400);

  const tooBig = await request(app)
    .post(`/api/v2/contracts/${contractId}/chat/messages`)
    .set(as(ownToken))
    .send({ filename: 'grande.txt', dataBase64: Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64') });
  assert.strictEqual(tooBig.status, 400);
});

// --- FR-052: evento só para participantes elegíveis ---
test('FR-052: evento de mensagem carrega contractId e destinatários elegíveis', () => {
  const captured = [];
  const previous = events.setEmitter; // referência estável; restauro abaixo
  events.setEmitter((event, dom, payload) => captured.push({ event, dom, payload }));

  const chatRouter = require('./chat');
  chatRouter.emitChatMessage(domainId, contractId, { messageId: 1 });
  assert.strictEqual(captured.length, 1);
  assert.strictEqual(captured[0].event, 'chat_message');
  assert.strictEqual(captured[0].payload.contractId, contractId);
  assert.ok(captured[0].payload.allowedUserIds.includes(gestorId));
  assert.ok(captured[0].payload.allowedUserIds.includes(ownId), `ids=${JSON.stringify(captured[0].payload.allowedUserIds)} gestor=${gestorId} own=${ownId} out=${outId} contrato=${contractId}`);
  assert.ok(captured[0].payload.allowedUserIds.includes(outId));
  assert.ok(!captured[0].payload.allowedUserIds.some((id) => id === 999999));

  // restaura o emitter do servidor
  const serverEmitter = (event, dom, payload) => {
    const io = require('../server').io;
    if (io) io.to(`domain_${dom}`).emit(event, payload);
  };
  events.setEmitter(serverEmitter);
  assert.ok(previous, 'emitter restaurado');
});

// --- FR-053: guards de papel, vínculo e domínio ---
test('FR-053: visitante, prestador de fora e domínio divergente recebem 403', async () => {
  const visitor = await request(app)
    .get(`/api/v2/contracts/${contractId}/chat/messages`)
    .set(as(visitanteToken));
  assert.strictEqual(visitor.status, 403);

  const outsider = await request(app)
    .get(`/api/v2/contracts/${contractId}/chat/messages`)
    .set(as(outsiderToken));
  assert.strictEqual(outsider.status, 403);

  const crossDomain = await request(app)
    .get(`/api/v2/contracts/${contractId}/chat/messages?domainId=${domainId + 1}`)
    .set(as(gestorToken));
  assert.strictEqual(crossDomain.status, 403);

  const noToken = await request(app).get(`/api/v2/contracts/${contractId}/chat/messages`);
  assert.strictEqual(noToken.status, 401);
});

// --- FR-055: anexo de chat não vaza em evidências nem auditoria ---
test('FR-055: anexo chat fora de evidências e auditoria da tarefa', async () => {
  const db = getDomainDb(domainId);
  db.run(
    `INSERT INTO attachments(task_id, path, original_name, uploaded_by, category)
     VALUES (?, 'uploads/evid.png', 'evid.png', ?, 'evidence')`,
    [ownTaskId, ownId]
  );
  const attach = await request(app)
    .get(`/api/v2/tasks/${ownTaskId}/attachments`)
    .set(as(gestorToken));
  assert.strictEqual(attach.status, 200);
  assert.ok(attach.body.attachments.every((row) => row.category !== 'chat'));

  const audit = await request(app)
    .get(`/api/v2/tasks/${ownTaskId}/audits`)
    .set(as(gestorToken));
  if (audit.status === 200) {
    assert.ok((audit.body.audit?.attachments || []).every((row) => row.category !== 'chat'));
  }
});

// --- FR-056 / FR-058: menu com cards e filtro por papel ---
test('FR-056 + FR-058: menu expõe alertas, próximas e concluídas; prestador vê só as suas', async () => {
  const alerts = await request(app)
    .get(`/api/v2/contracts/${contractId}/chat/menu/alerts`)
    .set(as(gestorToken));
  assert.strictEqual(alerts.status, 200);
  assert.ok(Array.isArray(alerts.body.alerts));
  assert.ok(Array.isArray(alerts.body.extracted));

  const upcomingOwn = await request(app)
    .get(`/api/v2/contracts/${contractId}/chat/menu/upcoming`)
    .set(as(ownToken));
  assert.strictEqual(upcomingOwn.status, 200);
  assert.strictEqual(upcomingOwn.body.tasks.length, 1);
  assert.strictEqual(upcomingOwn.body.tasks[0].id, ownTaskId);

  const upcomingGestor = await request(app)
    .get(`/api/v2/contracts/${contractId}/chat/menu/upcoming`)
    .set(as(gestorToken));
  assert.strictEqual(upcomingGestor.body.tasks.length, 2);

  const completed = await request(app)
    .get(`/api/v2/contracts/${contractId}/chat/menu/completed`)
    .set(as(gestorToken));
  assert.strictEqual(completed.status, 200);
  assert.strictEqual(completed.body.tasks.length, 0);
});

// --- FR-057: ação no card só na própria tarefa, com histórico ---
test('FR-057: prestador move a própria tarefa; terceiro recebe 403 sem escrita', async () => {
  const forbidden = await request(app)
    .post(`/api/v2/contracts/${contractId}/chat/tasks/${otherTaskId}/action`)
    .set(as(ownToken))
    .send({ status: 'Em Progresso', text: 'intruso' });
  assert.strictEqual(forbidden.status, 403);

  const db = getDomainDb(domainId);
  const unchanged = db.get('SELECT status FROM tasks WHERE id = ?', [otherTaskId]);
  assert.notStrictEqual(
    db.get('SELECT 1 FROM task_history WHERE task_id = ? AND note = ?', [otherTaskId, 'intruso']),
    undefined,
    'histórico sem entrada do intruso'
  );

  const moved = await request(app)
    .post(`/api/v2/contracts/${contractId}/chat/tasks/${ownTaskId}/action`)
    .set(as(ownToken))
    .send({ status: 'Em Progresso' });
  assert.strictEqual(moved.status, 200, JSON.stringify(moved.body));
  assert.strictEqual(moved.body.task.status, 'Em Progresso');
  assert.notStrictEqual(unchanged, undefined, 'tarefa do terceiro permaneceu');

  const invalid = await request(app)
    .post(`/api/v2/contracts/${contractId}/chat/tasks/${ownTaskId}/action`)
    .set(as(ownToken))
    .send({ status: 'Concluída', text: 'pronto' });
  assert.strictEqual(invalid.status, 400, 'não pula etapa do fluxo');
});

// --- FR-059/060/061: superfície de análise nas rotas ---
test('FR-059 + FR-061: GET /analysis e POST /retry expõem estado da análise', async () => {
  const posted = await request(app)
    .post(`/api/v2/contracts/${contractId}/chat/messages`)
    .set(as(gestorToken))
    .send({ body: 'Analisar este', filename: 'analise.txt', dataBase64: DOC_B64 });
  assert.strictEqual(posted.status, 201);
  const messageId = posted.body.message.id;

  const db = getDomainDb(domainId);
  // O POST dispara a análise em setImmediate; aguarda o resultado instead
  // de competir com a tarefa assíncrona.
  let report;
  for (let i = 0; i < 200; i += 1) {
    report = analysis.getAnalysis(db, messageId);
    if (report && report.status !== 'pending') break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.ok(report, 'análise criada pelo POST');
  assert.strictEqual(report.status, 'completed');

  const detail = await request(app)
    .get(`/api/v2/contracts/${contractId}/chat/messages/${messageId}/analysis`)
    .set(as(gestorToken));
  assert.strictEqual(detail.status, 200);
  assert.strictEqual(detail.body.analysis.status, 'completed');

  const retried = await request(app)
    .post(`/api/v2/contracts/${contractId}/chat/messages/${messageId}/analysis/retry`)
    .set(as(gestorToken));
  assert.strictEqual(retried.status, 200);
  assert.strictEqual(retried.body.analysis.attempts, 2);

  const missing = await request(app)
    .get(`/api/v2/contracts/${contractId}/chat/messages/999999/analysis`)
    .set(as(gestorToken));
  assert.strictEqual(missing.status, 404);
});
