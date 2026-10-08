'use strict';

// T021 / F-01 — a sala de domínio só abre para sessão autenticada: o handshake
// exige JWT (mesmo segredo da API) e o domainId vem do token. Reproduz o probe
// do qc-report (sem token → room → task:updated) com o resultado esperado:
// conexão recusada, então nenhum evento vaza.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { io: ioc } = require('socket.io-client');
const { setupDataDir, initTestDb } = require('./support/testenv');

setupDataDir();

// Fake OpenCode CLI for the FR-021 job (same boundary as opencode.test.js).
const fakeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-opencode-socket-'));
const fakeCli = path.join(fakeDir, 'fake.js');
fs.writeFileSync(
  fakeCli,
  `setTimeout(() => {
  if (process.env.FAKE_OPENCODE_EXIT) {
    process.stderr.write('opencode exploded');
    process.exit(Number(process.env.FAKE_OPENCODE_EXIT));
  }
  process.stdout.write(process.env.FAKE_OPENCODE_OUTPUT || '');
}, Number(process.env.FAKE_OPENCODE_DELAY_MS || 0));
`
);
process.env.OPENCODE_BIN = 'node';
process.env.OPENCODE_ARGS = fakeCli;

const GOOD_OUTPUT = JSON.stringify({
  tasks: [
    { title: 'Conferir medição', description: 'Comparar medido e projetado', justificativa: 'Evita pagamento indevido' },
    { title: 'Emitir relatório', description: 'Relatório semanal', justificativa: 'Rastreabilidade da execução' },
  ],
});

function setFake(env) {
  for (const key of ['FAKE_OPENCODE_OUTPUT', 'FAKE_OPENCODE_DELAY_MS', 'FAKE_OPENCODE_EXIT']) {
    delete process.env[key];
  }
  Object.assign(process.env, env);
}

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

const { app, io, start, emitDomainEvent } = require('./server');
const { signJwt } = require('./middleware/auth');

let baseUrl;
let sysToken;
let domainA;
let domainB;
let gestorToken;
let contractId;
const openSockets = [];

function openSocket(opts = {}) {
  const socket = ioc(baseUrl, {
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
    ...opts,
  });
  openSockets.push(socket);
  return socket;
}

// resolves with the connect_error message; rejects if the socket connects.
function refused(opts) {
  return new Promise((resolve, reject) => {
    const socket = openSocket(opts);
    const timer = setTimeout(() => reject(new Error('connect timeout')), 3000);
    socket.on('connect', () => {
      clearTimeout(timer);
      reject(new Error('connected but the handshake should have refused it'));
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      resolve(err.message);
    });
  });
}

function connected(socket, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('connect timeout')), timeoutMs);
    socket.on('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// join_domain now answers through the ack, so the room decision is observable.
function joinAck(socket, domainId) {
  return new Promise((resolve) => {
    socket.timeout(2000).emit('join_domain', domainId, (err, res) => {
      resolve(err ? { ok: false, timedOut: true } : res);
    });
  });
}

function awaitEvent(socket, event, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} timeout`)), timeoutMs);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function missedEvent(socket, event, waitMs = 400) {
  return new Promise((resolve) => {
    let seen = false;
    socket.once(event, () => {
      seen = true;
    });
    setTimeout(() => resolve(seen), waitMs);
  });
}

async function enable(name, adminEmail) {
  const res = await request(app)
    .post('/api/domains/enable')
    .set('Authorization', `Bearer ${sysToken}`)
    .send({
      name,
      adminName: `Admin ${name}`,
      adminEmail,
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  return res.body.domain;
}

// FR-021: accumulate analysis_state events for one contract until `until`.
function collectAnalysisStates(socket, contractId, until, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const seen = [];
    const finish = (err, value) => {
      clearTimeout(timer);
      socket.off('analysis_state', onEvent);
      err ? reject(err) : resolve(value);
    };
    const timer = setTimeout(
      () => finish(new Error(`analysis_state timeout; seen=${JSON.stringify(seen)}`)),
      timeoutMs
    );
    function onEvent(payload) {
      if (payload.contractId !== contractId) return;
      seen.push(payload);
      if (payload.status === until) finish(null, seen);
      else if (payload.status === 'falha' && until !== 'falha') {
        finish(new Error(`job failed: ${payload.error}`));
      }
    }
    socket.on('analysis_state', onEvent);
  });
}

// FR-021: poll GET /api/contracts/:id/analysis until the expected status.
async function pollAnalysis(status, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    const res = await request(app)
      .get(`/api/contracts/${contractId}/analysis`)
      .set('Authorization', `Bearer ${gestorToken}`);
    if (res.status === 200) {
      last = res.body.analysis;
      if (last.status === status) return last;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`analysis never reached ${status}; last=${JSON.stringify(last)}`);
}

test.before(async () => {
  await initTestDb();
  const server = await start(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const sys = await request(app)
    .post('/api/auth/login')
    .send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200, JSON.stringify(sys.body));
  sysToken = sys.body.token;

  domainA = await enable('Socket Sala A', 'socket-a@socket.test');
  domainB = await enable('Socket Sala B', 'socket-b@socket.test');

  // fixtures for the 00003 analysis flow (FR-021): gestor + contrato +
  // definições salvas no domínio A.
  const adminA = await request(app)
    .post('/api/auth/login')
    .send({ email: 'socket-a@socket.test', password: 'Secret1!', domainId: domainA.id });
  assert.strictEqual(adminA.status, 200, JSON.stringify(adminA.body));
  const created = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminA.body.token}`)
    .send({
      name: 'Gestor Sala A',
      email: 'gestor-a@socket.test',
      password: 'Secret1!',
      role: 'gestor',
      username: 'gestor-a',
    });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const gestorLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'gestor-a@socket.test', password: 'Secret1!', domainId: domainA.id });
  assert.strictEqual(gestorLogin.status, 200, JSON.stringify(gestorLogin.body));
  gestorToken = gestorLogin.body.token;

  const contract = await request(app)
    .post('/api/contracts')
    .set('Authorization', `Bearer ${gestorToken}`)
    .send({
      name: 'Contrato Sala A',
      start_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      forecast_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    });
  assert.strictEqual(contract.status, 201, JSON.stringify(contract.body));
  contractId = contract.body.contract.id;

  const definitions = await request(app)
    .put(`/api/contracts/${contractId}/definitions`)
    .set('Authorization', `Bearer ${gestorToken}`)
    .send({
      finalidade: 'Acompanhar a obra da sala A',
      limitacoes: 'Sem acesso aos fundos',
      alvo: 'Sala A',
      escopo: 'Pintura e pisos',
      premissas: 'Material próprio',
      entregaveis: 'Termo de aceite',
    });
  assert.strictEqual(definitions.status, 200, JSON.stringify(definitions.body));
});

test.after(() => {
  for (const socket of openSockets) socket.close();
  io.close(); // also closes the HTTP server the sockets hang on
  delete process.env.OPENCODE_BIN;
  delete process.env.OPENCODE_ARGS;
  for (const key of ['FAKE_OPENCODE_OUTPUT', 'FAKE_OPENCODE_DELAY_MS', 'FAKE_OPENCODE_EXIT']) {
    delete process.env[key];
  }
  fs.rmSync(fakeDir, { recursive: true, force: true });
});

test('socket sem token é recusado no handshake (F-01)', async () => {
  const message = await refused();
  assert.strictEqual(message, 'unauthorized');
});

test('token inválido ou de outro segredo é recusado (F-01)', async () => {
  const garbage = await refused({ auth: { token: 'not-a-jwt' } });
  assert.strictEqual(garbage, 'unauthorized');

  const wrongSecret = await refused({
    auth: { token: require('jsonwebtoken').sign({ id: 1, role: 'prestador', domainId: domainA.id }, 'other-secret') },
  });
  assert.strictEqual(wrongSecret, 'unauthorized');
});

test('sessão de domínio suspenso não conecta', async () => {
  const suspended = await request(app)
    .post(`/api/domains/${domainA.id}/suspend`)
    .set('Authorization', `Bearer ${sysToken}`);
  assert.strictEqual(suspended.status, 200, JSON.stringify(suspended.body));

  const token = signJwt({ id: 77, email: 'x@sus.test', role: 'admin', domainId: domainA.id });
  const message = await refused({ auth: { token } });
  assert.strictEqual(message, 'domain suspended');

  const reactivated = await request(app)
    .post(`/api/domains/${domainA.id}/reactivate`)
    .set('Authorization', `Bearer ${sysToken}`);
  assert.strictEqual(reactivated.status, 200, JSON.stringify(reactivated.body));
});

test('join_domain entra só na sala do próprio token (F-01)', async () => {
  const token = signJwt({ id: 5, email: 'a@socket.test', role: 'admin', domainId: domainA.id });
  const socket = openSocket({ auth: { token } });
  await connected(socket);

  const own = await joinAck(socket, domainA.id);
  assert.deepStrictEqual(own, { ok: true });

  const other = await joinAck(socket, domainB.id);
  assert.deepStrictEqual(other, { ok: false, error: 'Forbidden' });

  const bogus = await joinAck(socket, 'not-a-number');
  assert.deepStrictEqual(bogus, { ok: false, error: 'Forbidden' });
});

test('task:updated chega só à sala do domínio (SC-004)', async () => {
  const tokenA = signJwt({ id: 5, email: 'a@socket.test', role: 'admin', domainId: domainA.id });
  const tokenB = signJwt({ id: 6, email: 'b@socket.test', role: 'admin', domainId: domainB.id });
  const clientA = openSocket({ auth: { token: tokenA } });
  const clientB = openSocket({ auth: { token: tokenB } });
  await Promise.all([connected(clientA), connected(clientB)]);
  assert.deepStrictEqual(await joinAck(clientA, domainA.id), { ok: true });
  assert.deepStrictEqual(await joinAck(clientB, domainB.id), { ok: true });

  const received = awaitEvent(clientA, 'task:updated');
  const leaked = missedEvent(clientB, 'task:updated');
  emitDomainEvent('task:updated', domainA.id, {
    taskId: 2,
    contractId: 3,
    action: 'created',
    status: 'A Fazer',
  });

  const payload = await received;
  assert.strictEqual(payload.taskId, 2);
  assert.strictEqual(payload.status, 'A Fazer');
  assert.strictEqual(await leaked, false, 'domain B saw a domain A event');
});

// Acceptance stub per plan.md ## Acceptance Test Stubs (RED until T032).
test('FR-021 estado + retry', async () => {
  // domain room subscriber: gestor JWT signed against the same secret
  const token = signJwt({
    id: 501,
    email: 'gestor-a@socket.test',
    role: 'gestor',
    domainId: domainA.id,
  });
  const socket = openSocket({ auth: { token } });
  await connected(socket);
  assert.deepStrictEqual(await joinAck(socket, domainA.id), { ok: true });

  // state transitions arrive as analysis_state in the domain room, and the
  // polling resource answers the same state without any page reload.
  setFake({ FAKE_OPENCODE_OUTPUT: GOOD_OUTPUT });
  const collector = collectAnalysisStates(socket, contractId, 'sugerido');
  const posted = await request(app)
    .post(`/api/contracts/${contractId}/analysis`)
    .set('Authorization', `Bearer ${gestorToken}`)
    .send({});
  assert.strictEqual(posted.status, 202, JSON.stringify(posted.body));
  assert.ok(posted.headers.location, 'Location para polling');
  assert.ok(['pendente', 'analisando'].includes(posted.body.analysis.status));

  const seen = await collector;
  const statuses = seen.map((event) => event.status);
  assert.ok(statuses.includes('pendente'), `estados: ${statuses.join(',')}`);
  assert.strictEqual(statuses[statuses.length - 1], 'sugerido');
  for (const event of seen) {
    assert.strictEqual(event.contractId, contractId);
    assert.ok(
      ['pendente', 'analisando', 'sugerido', 'falha', 'aprovada'].includes(event.status),
      event.status
    );
  }

  // polling: same terminal state, with items (FR-005) visible via GET
  const suggested = await pollAnalysis('sugerido');
  assert.strictEqual(suggested.items.length, 2, JSON.stringify(suggested.items));

  // failure flips the room event and frees the manual retry (FR-006/FR-018)
  setFake({ FAKE_OPENCODE_EXIT: '1' });
  const failing = collectAnalysisStates(socket, contractId, 'falha');
  const crashed = await request(app)
    .post(`/api/contracts/${contractId}/analysis`)
    .set('Authorization', `Bearer ${gestorToken}`)
    .send({});
  assert.strictEqual(crashed.status, 202, JSON.stringify(crashed.body));
  const failedEvents = await failing;
  const last = failedEvents[failedEvents.length - 1];
  assert.strictEqual(last.status, 'falha');
  assert.match(last.error, /exploded|code/i);
  const failedState = await pollAnalysis('falha');
  assert.match(failedState.error, /exploded|code/i);

  // manual retry re-runs and settles on sugerido again; retry outside falha → 409
  setFake({ FAKE_OPENCODE_OUTPUT: GOOD_OUTPUT });
  const retrying = collectAnalysisStates(socket, contractId, 'sugerido');
  const retried = await request(app)
    .post(`/api/contracts/${contractId}/analysis/retry`)
    .set('Authorization', `Bearer ${gestorToken}`)
    .send();
  assert.strictEqual(retried.status, 202, JSON.stringify(retried.body));
  await retrying;
  const recovered = await pollAnalysis('sugerido');
  assert.strictEqual(recovered.items.length, 2);

  const tooLate = await request(app)
    .post(`/api/contracts/${contractId}/analysis/retry`)
    .set('Authorization', `Bearer ${gestorToken}`)
    .send();
  assert.strictEqual(tooLate.status, 409);
});

// FR-012: collect domain events; `first` resolves on the first payload,
// otherwise it waits the full window (to prove silence in another room).
function collectEvent(socket, event, { timeoutMs = 3000, first = true } = {}) {
  return new Promise((resolve) => {
    const seen = [];
    const timer = setTimeout(() => {
      socket.off(event, onEvent);
      resolve(seen);
    }, timeoutMs);
    function onEvent(payload) {
      seen.push(payload);
      if (first) {
        clearTimeout(timer);
        socket.off(event, onEvent);
        resolve(seen);
      }
    }
    socket.on(event, onEvent);
  });
}

test('FR-012 evento domínio', async () => {
  // subscriber in the contract's domain room (gestor JWT against same secret)
  const token = signJwt({
    id: 502,
    email: 'gestor-a@socket.test',
    role: 'gestor',
    domainId: domainA.id,
  });
  const socket = openSocket({ auth: { token } });
  await connected(socket);
  assert.deepStrictEqual(await joinAck(socket, domainA.id), { ok: true });

  // a second domain room must stay silent (SC-005: event goes to the room)
  const otherToken = signJwt({
    id: 503,
    email: 'other@socket.test',
    role: 'gestor',
    domainId: domainB.id,
  });
  const other = openSocket({ auth: { token: otherToken } });
  await connected(other);
  assert.deepStrictEqual(await joinAck(other, domainB.id), { ok: true });

  const gotHere = collectEvent(socket, 'workflow_activated', { first: true });
  const gotThere = collectEvent(other, 'workflow_activated', { first: false, timeoutMs: 600 });

  // fixture from FR-021: latest suggestion is `sugerido` — approve it
  const state = await pollAnalysis('sugerido');
  const approved = await request(app)
    .post(`/api/suggestions/${state.suggestion_id}/approve`)
    .set('Authorization', `Bearer ${gestorToken}`);
  assert.strictEqual(approved.status, 201, JSON.stringify(approved.body));

  const [payload] = await gotHere;
  assert.ok(payload, 'workflow_activated recebido na sala do domínio');
  assert.strictEqual(payload.contractId, contractId);
  assert.strictEqual(payload.suggestionId, state.suggestion_id);
  assert.strictEqual(payload.workflowVersionId, approved.body.workflow.id);

  const leaked = await gotThere;
  assert.deepStrictEqual(leaked, [], 'sala de outro domínio não recebe o evento');
});
