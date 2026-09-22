'use strict';

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
let p1Token;
let p2Token;
let p1Id;
let p2Id;
let reformaId;
let limpezaId;
let c1Id;
let c2Id;
let t1Id;

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
      name: 'Teta Busca',
      adminName: 'Bia',
      adminEmail: 'bia@teta.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201);
  domainId = enabled.body.domain.id;
  adminToken = await login('bia@teta.test', 'Secret1!', domainId);

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
  p2Token = await login('otavio@teta.test', 'Secret1!', domainId);

  const db = getDomainDb(domainId);
  p1Id = db.get("SELECT id FROM users WHERE email = 'mila@teta.test'").id;
  p2Id = db.get("SELECT id FROM users WHERE email = 'otavio@teta.test'").id;

  // finalidade dictionary entries
  const fReforma = await request(app)
    .post('/api/finalidades')
    .set(as(adminToken))
    .send({ name: 'Reforma Estrutural' });
  assert.strictEqual(fReforma.status, 201);
  reformaId = fReforma.body.finalidade.id;
  const fLimpeza = await request(app)
    .post('/api/finalidades')
    .set(as(adminToken))
    .send({ name: 'Limpeza Geral' });
  assert.strictEqual(fLimpeza.status, 201);
  limpezaId = fLimpeza.body.finalidade.id;

  // contracts with distinct name/status/finalidade/prestador
  const c1 = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({
      name: 'Almoxarifado Norte Reforma',
      start_date: futureDate(-10),
      forecast_date: futureDate(60),
      finalidade_id: reformaId,
    });
  assert.strictEqual(c1.status, 201, JSON.stringify(c1.body));
  c1Id = c1.body.contract.id;

  const c2 = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({
      name: 'Galpao Sul Limpeza',
      start_date: futureDate(-40),
      forecast_date: futureDate(30),
      finalidade_id: limpezaId,
    });
  assert.strictEqual(c2.status, 201, JSON.stringify(c2.body));
  c2Id = c2.body.contract.id;

  // encerrar c2 → status encerrado
  const closed = await request(app)
    .post(`/api/contracts/${c2Id}/encerrar`)
    .set(as(gestorToken))
    .send({ note: 'encerrado para o teste de filtro' });
  assert.strictEqual(closed.status, 200, JSON.stringify(closed.body));

  // links: C1 → p1+p2, C2 → p2
  for (const [cid, uid] of [
    [c1Id, p1Id],
    [c1Id, p2Id],
    [c2Id, p2Id],
  ]) {
    const linked = await request(app)
      .post(`/api/contracts/${cid}/prestadores`)
      .set(as(gestorToken))
      .send({ user_id: uid });
    assert.ok([200, 201].includes(linked.status), JSON.stringify(linked.body));
  }

  // tasks with distinct priority/prestador/due dates
  const t1 = await request(app)
    .post(`/api/contracts/${c1Id}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Instalacao eletrica', priority: 'high', assignee_id: p1Id, due_date: futureDate(10) });
  assert.strictEqual(t1.status, 201, JSON.stringify(t1.body));
  t1Id = t1.body.task.id;

  const t2 = await request(app)
    .post(`/api/contracts/${c1Id}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Reaperto de parafusos', priority: 'low', assignee_id: p2Id, due_date: futureDate(90) });
  assert.strictEqual(t2.status, 201, JSON.stringify(t2.body));

  const t3 = await request(app)
    .post(`/api/contracts/${c2Id}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Pintura galpao', priority: 'high', assignee_id: p2Id, due_date: futureDate(40) });
  assert.strictEqual(t3.status, 201, JSON.stringify(t3.body));
});

test('FR-016 filters', async () => {
  const ids = (body, key) => body[key].map((row) => row.id);

  // contrato: name/object substring
  const byName = await request(app).get('/api/search/contracts?q=Almoxarifado').set(as(gestorToken));
  assert.strictEqual(byName.status, 200, JSON.stringify(byName.body));
  assert.deepStrictEqual(ids(byName.body, 'contracts'), [c1Id]);

  // status
  const byStatus = await request(app)
    .get('/api/search/contracts?status=encerrado')
    .set(as(gestorToken));
  assert.deepStrictEqual(ids(byStatus.body, 'contracts'), [c2Id]);

  const byVigente = await request(app)
    .get('/api/search/contracts?status=vigente')
    .set(as(gestorToken));
  assert.deepStrictEqual(ids(byVigente.body, 'contracts'), [c1Id]);

  // finalidade
  const byFinalidade = await request(app)
    .get(`/api/search/contracts?finalidade_id=${reformaId}`)
    .set(as(gestorToken));
  assert.deepStrictEqual(ids(byFinalidade.body, 'contracts'), [c1Id]);

  // prestador (contract link)
  const byPrestadorC = await request(app)
    .get(`/api/search/contracts?prestador_id=${p1Id}`)
    .set(as(gestorToken));
  assert.deepStrictEqual(ids(byPrestadorC.body, 'contracts'), [c1Id]);

  // prioridade (tasks)
  const byPriority = await request(app)
    .get('/api/search/tasks?priority=high')
    .set(as(gestorToken));
  const priorityIds = ids(byPriority.body, 'tasks').sort();
  assert.strictEqual(byPriority.body.total, 2, 'two high-priority tasks');
  assert.ok(priorityIds.length === 2);

  // prestador (task assignee)
  const byPrestadorT = await request(app)
    .get(`/api/search/tasks?prestador_id=${p1Id}`)
    .set(as(gestorToken));
  assert.deepStrictEqual(ids(byPrestadorT.body, 'tasks'), [t1Id]);

  // prazo: due date window
  const soon = await request(app)
    .get(`/api/search/tasks?due_before=${futureDate(15)}`)
    .set(as(gestorToken));
  assert.deepStrictEqual(ids(soon.body, 'tasks'), [t1Id], 'only the task due within 15 days');

  const later = await request(app)
    .get(`/api/search/tasks?due_after=${futureDate(30)}`)
    .set(as(gestorToken));
  const laterIds = ids(later.body, 'tasks');
  assert.strictEqual(later.body.total, 2, 'tasks due after 30 days');
  assert.ok(!laterIds.includes(t1Id));

  // combined filters
  const combined = await request(app)
    .get('/api/search/tasks?q=Instalacao&priority=high')
    .set(as(gestorToken));
  assert.deepStrictEqual(ids(combined.body, 'tasks'), [t1Id]);

  const combinedC = await request(app)
    .get(`/api/search/contracts?status=vigente&finalidade_id=${reformaId}&prestador_id=${p1Id}`)
    .set(as(gestorToken));
  assert.deepStrictEqual(ids(combinedC.body, 'contracts'), [c1Id]);

  // status filter on tasks (flow value)
  const concluida = await request(app)
    .get('/api/search/tasks?status=Concluída')
    .set(as(gestorToken));
  assert.strictEqual(concluida.body.total, 0, 'no concluded tasks yet');

  // prestador scoping: p1 sees only own tasks / linked contracts
  const p1Tasks = await request(app).get('/api/search/tasks?q=').set(as(p1Token));
  assert.strictEqual(p1Tasks.status, 200);
  assert.ok(p1Tasks.body.tasks.every((t) => t.assignee_id === p1Id), 'prestador: só as suas');

  const p1Contracts = await request(app).get('/api/search/contracts?q=Galpao').set(as(p1Token));
  assert.strictEqual(p1Contracts.status, 200);
  assert.strictEqual(p1Contracts.body.total, 0, 'p1 not linked to Galpao Sul');

  // unknown page params and empty result are fine
  const empty = await request(app).get('/api/search/contracts?q=inexistente').set(as(gestorToken));
  assert.strictEqual(empty.status, 200);
  assert.strictEqual(empty.body.total, 0);
});
