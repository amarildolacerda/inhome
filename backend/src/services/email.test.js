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
    .post('/api/v2/auth/login')
    .send({ email, password, domainId: domId });
  assert.strictEqual(res.status, 200, `${email}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

function futureDate(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

test.before(async () => {
  await initTestDb();

  const sys = await request(app).post('/api/v2/auth/login').send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  const enabled = await request(app)
    .post('/api/v2/domains/enable')
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
      .post('/api/v2/users')
      .set(as(adminToken))
      .send({ name, email, password: 'Secret1!', role, username: email.split('@')[0] });
    assert.strictEqual(res.status, 201);
  }
  gestorToken = await login('guto@teta.test', 'Secret1!', domainId);
  prestadorToken = await login('mila@teta.test', 'Secret1!', domainId);

  const db = getDomainDb(domainId);
  prestadorId = db.get("SELECT id FROM users WHERE email = 'mila@teta.test'").id;

  const contract = await request(app)
    .post('/api/v2/contracts')
    .set(as(gestorToken))
    .send({ name: 'Obra Email', start_date: futureDate(-5), forecast_date: futureDate(60) });
  assert.strictEqual(contract.status, 201);
  contractId = contract.body.contract.id;

  const linked = await request(app)
    .post(`/api/v2/contracts/${contractId}/providers`)
    .set(as(gestorToken))
    .send({ user_id: prestadorId });
  assert.ok([200, 201].includes(linked.status));
});

// Capturing dumb SMTP server: replies 220/250/354/221 and stores DATA bodies.
function startFakeSmtp() {
  const messages = [];
  // E010 T008/T009: conta sessões TCP para provar que o modo inerte nem
  // conecta (sessions === 0) — mensagens sozinhas não distinguem isso.
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

async function createTaskToRevisao(title, opts = {}) {
  const created = await request(app)
    .post(`/api/v2/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title, assignee_id: prestadorId, ...opts });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const taskId = created.body.task.id;
  for (const status of ['Em Progresso', 'Revisão']) {
    const move = await request(app)
      .patch(`/api/v2/tasks/${taskId}/status`)
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
    .post(`/api/v2/tasks/${gatedTask}/complete`)
    .set(as(prestadorToken))
    .send({ text: 'Concluida sem SMTP' });
  assert.strictEqual(gatedComplete.status, 200, JSON.stringify(gatedComplete.body));
  const gatedReopen = await request(app)
    .post(`/api/v2/tasks/${gatedTask}/reopen`)
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
      .post(`/api/v2/tasks/${task.id}/complete`)
      .set(as(prestadorToken))
      .send({ text: 'Concluida com SMTP' });
    assert.strictEqual(done.status, 200, JSON.stringify(done.body));

    // trigger 3: reopening
    const reopened = await request(app)
      .post(`/api/v2/tasks/${task.id}/reopen`)
      .set(as(gestorToken))
      .send({ motivo: 'inspecao pediu refaco' });
    assert.strictEqual(reopened.status, 200, JSON.stringify(reopened.body));

    // trigger 4: due — a task due today, then the sweep
    const dueCreated = await request(app)
      .post(`/api/v2/contracts/${contractId}/tasks`)
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

    // E010 T003 (HINT-002): o gate fecha de volta imediatamente — nenhum
    // teste seguinte (nem esta suíte) herda SMTP_* do Part B.
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    assert.strictEqual(smtpConfigured(), false, 'gate recolhido após o Part B');
  } finally {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    smtp.server.close();
  }
});

// E010 T003: higiene de env por suíte — ao final, nenhuma variável SMTP sobra
// no processo e o gate volta a fechar (modo inerte dos demais testes intacto).
test.after(() => {
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_FROM;
  assert.strictEqual(smtpConfigured(), false, 'E010 T003: nenhum env SMTP vaza para fora da suíte');
});

// E010 T004 (FR-001/SC-001): os três eventos de tarefa com servidor SMTP real
// respondem 200/201 e entregam exatamente uma mensagem cada ao destinatário
// do evento — atribuição ao atribuído, conclusão e reabertura à gestão.
test('E010 FR-001: atribuição, conclusão e reabertura respondem 200/201 e entregam por e-mail', async () => {
  const smtp = await startFakeSmtp();
  process.env.SMTP_HOST = '127.0.0.1';
  process.env.SMTP_PORT = String(smtp.port);
  try {
    assert.strictEqual(smtpConfigured(), true, 'gate aberto para o e2e');

    const taskId = await createTaskToRevisao('E010 quatro eventos');
    assert.strictEqual(smtp.messages.length, 1, 'atribuição: exatamente uma mensagem');
    assert.ok(smtp.messages[0].includes('To: <mila@teta.test>'), 'atribuição vai ao atribuído');

    const done = await request(app)
      .post(`/api/v2/tasks/${taskId}/complete`)
      .set(as(prestadorToken))
      .send({ text: 'Concluida no e2e E010' });
    assert.strictEqual(done.status, 200, JSON.stringify(done.body));
    assert.strictEqual(smtp.messages.length, 2, 'conclusão: exatamente uma mensagem');
    assert.ok(
      smtp.messages[1].includes('guto@teta.test'),
      'conclusão vai à gestão (admin+gestor em To:)'
    );

    const reopened = await request(app)
      .post(`/api/v2/tasks/${taskId}/reopen`)
      .set(as(gestorToken))
      .send({ motivo: 'ajuste pos inspecao E010' });
    assert.strictEqual(reopened.status, 200, JSON.stringify(reopened.body));
    assert.strictEqual(smtp.messages.length, 3, 'reabertura: exatamente uma mensagem');
    assert.ok(
      smtp.messages[2].includes('guto@teta.test'),
      'reabertura vai à gestão (admin+gestor em To:)'
    );

    for (const message of smtp.messages) {
      assert.ok(message.includes('Subject:'), 'mensagem RFC822 estruturada');
    }
  } finally {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    smtp.server.close();
  }
});

// E010 T008 (FR-004/SC-004): modo inerte — servidor fake escutando, mas NENHUMA
// variável SMTP_* no ambiente. Os quatro eventos respondem 200/201 e o servidor
// não recebe uma única conexão: sem configuração, sem efeito colateral.
test('E010 FR-004: quatro eventos sem SMTP_* não conectam no servidor fake', async () => {
  const smtp = await startFakeSmtp();
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  assert.strictEqual(smtpConfigured(), false, 'gate fechado');
  try {
    const created = await request(app)
      .post(`/api/v2/contracts/${contractId}/tasks`)
      .set(as(gestorToken))
      .send({ title: 'E010 modo inerte', assignee_id: prestadorId });
    assert.strictEqual(created.status, 201, JSON.stringify(created.body));
    const taskId = created.body.task.id;

    for (const status of ['Em Progresso', 'Revisão']) {
      const move = await request(app)
        .patch(`/api/v2/tasks/${taskId}/status`)
        .set(as(prestadorToken))
        .send({ status });
      assert.strictEqual(move.status, 200, JSON.stringify(move.body));
    }
    const done = await request(app)
      .post(`/api/v2/tasks/${taskId}/complete`)
      .set(as(prestadorToken))
      .send({ text: 'inerte' });
    assert.strictEqual(done.status, 200, JSON.stringify(done.body));
    const reopened = await request(app)
      .post(`/api/v2/tasks/${taskId}/reopen`)
      .set(as(gestorToken))
      .send({ motivo: 'reaberta inerte' });
    assert.strictEqual(reopened.status, 200, JSON.stringify(reopened.body));

    // O quarto gatilho (vencimento) também passa pelo notify inerte.
    const alert = await request(app).post('/api/v2/alerts/sweep').set(as(adminToken)).send({});
    assert.strictEqual(alert.status, 200, JSON.stringify(alert.body));

    // Pequena espera para qualquer conexão atrasada chegar ao servidor.
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.strictEqual(smtp.messages.length, 0, 'nenhuma mensagem sem SMTP_*');
    assert.strictEqual(smtp.state.sessions, 0, 'SC-004: zero conexões no modo inerte');
  } finally {
    smtp.server.close();
  }
});

// Porta reservada e fechada: conexão recusada na hora (ECONNREFUSED), sem
// esperar o timeout de 5 s do smtpSend.
async function closedPort() {
  const probe = net.createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

// E010 T009 (FR-005/SC-003): host morto — notify responde sent:false com erro
// registrado (rápido, sem estourar o timeout) e NENHUMA das rotas deixa de
// responder 200/201: o canal opcional falha em silêncio.
test('E010 FR-005: host morto — notify sent:false sem lançar e rotas 200/201 preservadas', async () => {
  const dead = await closedPort();
  process.env.SMTP_HOST = '127.0.0.1';
  process.env.SMTP_PORT = String(dead);
  try {
    assert.strictEqual(smtpConfigured(), true, 'config presente; só o host está morto');

    const started = Date.now();
    const result = await notify('assignment', {
      to: ['mila@teta.test'],
      subject: 'Host morto',
      text: 'deve falhar rapido',
    });
    const elapsed = Date.now() - started;
    assert.strictEqual(result.sent, false, 'sent:false para host inoperante');
    assert.ok(result.error, 'erro de conexao registrado na resposta');
    assert.ok(elapsed < 4500, `falha rapida (${elapsed}ms), nao espera o timeout de 5000ms`);

    // Resposta HTTP preservada nos quatro eventos mesmo com host morto.
    const created = await request(app)
      .post(`/api/v2/contracts/${contractId}/tasks`)
      .set(as(gestorToken))
      .send({ title: 'E010 host morto rotas', assignee_id: prestadorId });
    assert.strictEqual(created.status, 201, JSON.stringify(created.body));
    const taskId = created.body.task.id;

    for (const status of ['Em Progresso', 'Revisão']) {
      const move = await request(app)
        .patch(`/api/v2/tasks/${taskId}/status`)
        .set(as(prestadorToken))
        .send({ status });
      assert.strictEqual(move.status, 200, JSON.stringify(move.body));
    }
    const done = await request(app)
      .post(`/api/v2/tasks/${taskId}/complete`)
      .set(as(prestadorToken))
      .send({ text: 'concluida com host morto' });
    assert.strictEqual(done.status, 200, JSON.stringify(done.body));
    const reopened = await request(app)
      .post(`/api/v2/tasks/${taskId}/reopen`)
      .set(as(gestorToken))
      .send({ motivo: 'reaberta com host morto' });
    assert.strictEqual(reopened.status, 200, JSON.stringify(reopened.body));

    // E o quarto gatilho via API: varredura responde 200 mesmo sem entregar.
    const sweep = await request(app).post('/api/v2/alerts/sweep').set(as(adminToken)).send({});
    assert.strictEqual(sweep.status, 200, JSON.stringify(sweep.body));
  } finally {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
  }
});

// E010 T010 (FR-006): notify() nunca propaga exceção. Porta malformada faz
// net.createConnection lançar de forma síncrona dentro do executor da Promise
// de smtpSend — a rejeição é capturada e vira {sent:false, error}. Nos quatro
// gatilhos a exceção nunca chega ao chamador: rota responde, varredura responde.
test('E010 FR-006: notify() captura rejeição interna nos quatro gatilhos (nunca propaga)', async () => {
  process.env.SMTP_HOST = '127.0.0.1';
  process.env.SMTP_PORT = 'not-a-port';
  try {
    assert.strictEqual(smtpConfigured(), true, 'gate aberto; a porta é que está inválida');

    // Rejeição interna vira resposta, não exceção.
    await assert.doesNotReject(() =>
      notify('assignment', { to: ['mila@teta.test'], subject: 'Porta malformada', text: 'x' })
    );
    const direct = await notify('completion', { to: ['guto@teta.test'], subject: 'y', text: 'z' });
    assert.strictEqual(direct.sent, false, 'sent:false em vez de throw');
    assert.ok(direct.error, 'a rejeição interna é materializada como error');

    // Gatilhos 1-3 (atribuição, conclusão, reabertura): resposta preservada.
    const created = await request(app)
      .post(`/api/v2/contracts/${contractId}/tasks`)
      .set(as(gestorToken))
      .send({ title: 'E010 rejeicao interna', assignee_id: prestadorId });
    assert.strictEqual(created.status, 201, JSON.stringify(created.body));
    const taskId = created.body.task.id;
    for (const status of ['Em Progresso', 'Revisão']) {
      const move = await request(app)
        .patch(`/api/v2/tasks/${taskId}/status`)
        .set(as(prestadorToken))
        .send({ status });
      assert.strictEqual(move.status, 200, JSON.stringify(move.body));
    }

    const done = await request(app)
      .post(`/api/v2/tasks/${taskId}/complete`)
      .set(as(prestadorToken))
      .send({ text: 'concluida sob rejeicao interna' });
    assert.strictEqual(done.status, 200, JSON.stringify(done.body));
    const reopened = await request(app)
      .post(`/api/v2/tasks/${taskId}/reopen`)
      .set(as(gestorToken))
      .send({ motivo: 'reaberta sob rejeicao interna' });
    assert.strictEqual(reopened.status, 200, JSON.stringify(reopened.body));

    // Gatilho 4 (vencimento): a varredura completa e responde com coerência.
    const sweep = await request(app).post('/api/v2/alerts/sweep').set(as(adminToken)).send({});
    assert.strictEqual(sweep.status, 200, JSON.stringify(sweep.body));
    assert.ok(
      sweep.body.swept >= sweep.body.emailed + sweep.body.failed,
      `contagens coerentes sob rejeicao: ${JSON.stringify(sweep.body)}`
    );
  } finally {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
  }
});
