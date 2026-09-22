'use strict';

const test = require('node:test');
const assert = require('node:assert');
const net = require('node:net');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

// Part A must run with no SMTP_* (delete in case a developer exported them).
delete process.env.SMTP_HOST;
delete process.env.SMTP_PORT;
delete process.env.SMTP_FROM;

setupDataDir();
const { app } = require('../server');
const { getDomainDb } = require('../config/database');
const { notify, smtpConfigured, runDueSweep } = require('./email');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

let domainId;
let adminToken;
let gestorToken;
let prestadorToken;
let prestadorId;
let contractId;

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
      name: 'Teta Email',
      adminName: 'Elias',
      adminEmail: 'elias@teta.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201);
  domainId = enabled.body.domain.id;
  adminToken = await login('elias@teta.test', 'Secret1!', domainId);

  for (const [name, email, role] of [
    ['Guto', 'guto@teta.test', 'gestor'],
    ['Mila', 'mila@teta.test', 'prestador'],
  ]) {
    const res = await request(app)
      .post('/api/users')
      .set(as(adminToken))
      .send({ name, email, password: 'Secret1!', role });
    assert.strictEqual(res.status, 201);
  }
  gestorToken = await login('guto@teta.test', 'Secret1!', domainId);
  prestadorToken = await login('mila@teta.test', 'Secret1!', domainId);

  const db = getDomainDb(domainId);
  prestadorId = db.get("SELECT id FROM users WHERE email = 'mila@teta.test'").id;

  const contract = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'Obra Email', start_date: futureDate(-5), forecast_date: futureDate(60) });
  assert.strictEqual(contract.status, 201);
  contractId = contract.body.contract.id;

  const linked = await request(app)
    .post(`/api/contracts/${contractId}/prestadores`)
    .set(as(gestorToken))
    .send({ user_id: prestadorId });
  assert.ok([200, 201].includes(linked.status));
});

// Capturing dumb SMTP server: replies 220/250/354/221 and stores DATA bodies.
function startFakeSmtp() {
  const messages = [];
  const server = net.createServer((sock) => {
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
      resolve({ server, messages, port: server.address().port });
    });
  });
}

async function createTaskToRevisao(title, opts = {}) {
  const created = await request(app)
    .post(`/api/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title, assignee_id: prestadorId, ...opts });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const taskId = created.body.task.id;
  for (const status of ['Em Progresso', 'Revisão']) {
    const move = await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set(as(prestadorToken))
      .send({ status });
    assert.strictEqual(move.status, 200, JSON.stringify(move.body));
  }
  return taskId;
}

test('FR-017 SMTP gate', async () => {
  // ---- Part A: no SMTP_* → zero sends, zero errors (SC-010) ----
  assert.strictEqual(smtpConfigured(), false, 'gate closed');
  const skipped = await notify('assignment', {
    to: ['anyone@teta.test'],
    subject: 'nao deve sair',
    text: 'nao deve sair',
  });
  assert.deepStrictEqual(skipped, { sent: false, skipped: 'not configured' });

  const sweepOff = await runDueSweep();
  assert.deepStrictEqual(sweepOff, { sent: 0, skipped: 'not configured' });

  // the four API flows work with the gate closed — no errors surface
  const gatedTask = await createTaskToRevisao('Tarefa com gate fechado');
  const gatedComplete = await request(app)
    .post(`/api/tasks/${gatedTask}/complete`)
    .set(as(prestadorToken))
    .send({ text: 'Concluida sem SMTP' });
  assert.strictEqual(gatedComplete.status, 200, JSON.stringify(gatedComplete.body));
  const gatedReopen = await request(app)
    .post(`/api/tasks/${gatedTask}/reopen`)
    .set(as(gestorToken))
    .send({ motivo: 'reabrir com gate fechado' });
  assert.strictEqual(gatedReopen.status, 200, JSON.stringify(gatedReopen.body));

  // ---- Part B: SMTP_* set → four triggers fire ----
  const smtp = await startFakeSmtp();
  process.env.SMTP_HOST = '127.0.0.1';
  process.env.SMTP_PORT = String(smtp.port);
  try {
    assert.strictEqual(smtpConfigured(), true, 'gate open');

    // trigger 1: assignment (createTask with assignee)
    await createTaskToRevisao('Tarefa com SMTP aberto');

    // trigger 2: completion (PATCH path already sent one during setup? no —
    // setup ran with the gate closed; complete this task now)
    const db = getDomainDb(domainId);
    const task = db.get(
      "SELECT id FROM tasks WHERE title = 'Tarefa com SMTP aberto'"
    );
    const done = await request(app)
      .post(`/api/tasks/${task.id}/complete`)
      .set(as(prestadorToken))
      .send({ text: 'Concluida com SMTP' });
    assert.strictEqual(done.status, 200, JSON.stringify(done.body));

    // trigger 3: reopening
    const reopened = await request(app)
      .post(`/api/tasks/${task.id}/reopen`)
      .set(as(gestorToken))
      .send({ motivo: 'inspecao pediu refaco' });
    assert.strictEqual(reopened.status, 200, JSON.stringify(reopened.body));

    // trigger 4: due — a task due today, then the sweep
    const dueCreated = await request(app)
      .post(`/api/contracts/${contractId}/tasks`)
      .set(as(gestorToken))
      .send({ title: 'Tarefa vence hoje', assignee_id: prestadorId, due_date: futureDate(0) });
    assert.strictEqual(dueCreated.status, 201, JSON.stringify(dueCreated.body));
    const dueSweep = await runDueSweep();
    assert.ok(dueSweep.sent >= 1, `due sweep sent at least one (${JSON.stringify(dueSweep)})`);
    // second sweep dedupes
    const dueAgain = await runDueSweep();
    assert.strictEqual(dueAgain.sent, 0, 'due trigger deduplicated');

    const body = smtp.messages.join('\n--\n');
    for (const event of ['assignment', 'completion', 'reopening', 'due']) {
      assert.ok(body.includes(`Evento: ${event}`), `trigger fired: ${event}`);
    }
    assert.ok(smtp.messages.length >= 4, `four triggers captured (${smtp.messages.length})`);

    // recipients are real addresses from the domain
    assert.ok(body.includes('mila@teta.test'), 'assignment/due go to the prestador');
    assert.ok(body.includes('guto@teta.test'), 'completion/reopening go to management');
    assert.ok(body.includes('Subject:'), 'RFC822 message structure');
  } finally {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    smtp.server.close();
  }
});
