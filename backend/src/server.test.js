'use strict';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { io: ioc } = require('socket.io-client');
const { setupDataDir, initTestDb } = require('./support/testenv');

setupDataDir();
const {
  app,
  server,
  start,
  emitDomainEvent,
  DEFAULT_PORT,
  CORS_ORIGINS,
} = require('./server');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

let domainId;
let adminToken;
let contractId;
let otherDomainId;

function as(token) {
  return { Authorization: `Bearer ${token}` };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function onceEvent(socket, event, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function connectClient(url) {
  const client = ioc(url, { forceNew: true, transports: ['websocket'] });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('socket connect timeout')), 3000);
    client.once('connect', () => {
      clearTimeout(timer);
      resolve(client);
    });
    client.once('connect_error', reject);
  });
}

async function listen(srv, port) {
  return new Promise((resolve, reject) => {
    srv.once('error', reject);
    srv.listen(port, () => resolve(srv));
  });
}

function closeSrv(srv) {
  return new Promise((resolve) => srv.close(resolve));
}

test.before(async () => {
  await initTestDb();

  const sys = await request(app).post('/api/auth/login').send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  const enabled = await request(app)
    .post('/api/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Teta Realtime',
      adminName: 'Rita',
      adminEmail: 'rita@teta.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201);
  domainId = enabled.body.domain.id;
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'rita@teta.test', password: 'Secret1!', domainId });
  assert.strictEqual(login.status, 200, JSON.stringify(login.body));
  adminToken = login.body.token;

  const other = await request(app)
    .post('/api/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Outro Realtime',
      adminName: 'Otto',
      adminEmail: 'otto@outro.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(other.status, 201);
  otherDomainId = other.body.domain.id;

  const contract = await request(app)
    .post('/api/contracts')
    .set(as(adminToken))
    .send({
      name: 'Obra Realtime',
      start_date: '2026-01-01',
      forecast_date: '2026-12-31',
    });
  assert.strictEqual(contract.status, 201, JSON.stringify(contract.body));
  contractId = contract.body.contract.id;
});

// FR-020 / SC-012: client A and client B in the same domain room — an API
// mutation reaches B without any reload. Cross-domain sockets stay isolated.
test('FR-020 socket', async () => {
  assert.strictEqual(typeof emitDomainEvent, 'function', 'emitDomainEvent exported');

  await listen(server, 0);
  const url = `http://127.0.0.1:${server.address().port}`;

  const clientA = await connectClient(url);
  const clientB = await connectClient(url);
  const outsider = await connectClient(url);
  try {
    clientA.emit('join_domain', domainId);
    clientB.emit('join_domain', domainId);
    outsider.emit('join_domain', otherDomainId);
    await delay(150); // let join_domain land before the mutation

    // B listens while A creates a task through the API
    const updateWait = onceEvent(clientB, 'task:updated');
    const outsiderShouldNot = new Promise((resolve) => {
      const timer = setTimeout(() => resolve('no-event'), 400);
      outsider.once('task:updated', (payload) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });

    const created = await request(app)
      .post(`/api/contracts/${contractId}/tasks`)
      .set(as(adminToken))
      .send({ title: 'Tarefa realtime' });
    assert.strictEqual(created.status, 201, JSON.stringify(created.body));

    const payload = await updateWait;
    assert.strictEqual(payload.taskId, created.body.task.id, 'payload carries the task id');
    assert.strictEqual(payload.contractId, contractId);
    assert.strictEqual(payload.action, 'created');
    assert.strictEqual(payload.status, 'A Fazer');

    // domain isolation on the socket layer too
    const outsiderResult = await outsiderShouldNot;
    assert.strictEqual(outsiderResult, 'no-event', 'other domain sockets receive nothing');

    // exported emitter broadcasts into the joined room
    const probeWait = onceEvent(clientB, 'task:probe');
    emitDomainEvent('task:probe', domainId, { hello: true });
    const probe = await probeWait;
    assert.deepStrictEqual(probe, { hello: true });

    // client A also receives B-side mutations (both directions)
    const aWait = onceEvent(clientA, 'task:updated');
    const second = await request(app)
      .post(`/api/contracts/${contractId}/tasks`)
      .set(as(adminToken))
      .send({ title: 'Segunda tarefa realtime' });
    assert.strictEqual(second.status, 201);
    const secondPayload = await aWait;
    assert.strictEqual(secondPayload.taskId, second.body.task.id);
  } finally {
    clientA.close();
    clientB.close();
    outsider.close();
    await closeSrv(server);
  }
});

// FR-029: backend binds 3001; frontend dev ports 8080/3000 are allowed by CORS.
test('FR-029 ports', async () => {
  delete process.env.PORT;
  assert.strictEqual(DEFAULT_PORT, 3001, 'backend default port 3001');
  assert.ok(CORS_ORIGINS.includes('http://localhost:8080'), 'frontend port 8080 allowed');
  assert.ok(CORS_ORIGINS.includes('http://localhost:3000'), 'frontend port 3000 allowed');

  const srv = await start();
  try {
    assert.strictEqual(srv.address().port, 3001, 'actually listening on 3001');
    const health = await request('http://127.0.0.1:3001').get('/api/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.body.status, 'ok');
  } finally {
    await closeSrv(srv);
  }
});
