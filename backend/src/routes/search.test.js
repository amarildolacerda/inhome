'use strict';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir();
const { app } = require('../server');
const { getDomainDb } = require('../config/database');
const { code } = require('../config/enums');

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
      .post('/api/v2/users')
      .set(as(adminToken))
      .send({ name, email, password: 'Secret1!', role, username: email.split('@')[0] });
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
    .post('/api/v2/purposes')
    .set(as(adminToken))
    .send({ name: 'Reforma Estrutural' });
  assert.strictEqual(fReforma.status, 201);
  reformaId = fReforma.body.finalidade.id;
  const fLimpeza = await request(app)
    .post('/api/v2/purposes')
    .set(as(adminToken))
    .send({ name: 'Limpeza Geral' });
  assert.strictEqual(fLimpeza.status, 201);
  limpezaId = fLimpeza.body.finalidade.id;

  // contracts with distinct name/status/finalidade/prestador
  const c1 = await request(app)
    .post('/api/v2/contracts')
    .set(as(gestorToken))
    .send({
      name: 'Almoxarifado Norte Reforma',
      start_date: futureDate(-10),
      forecast_date: futureDate(60),
      purpose_id: reformaId,
    });
  assert.strictEqual(c1.status, 201, JSON.stringify(c1.body));
  c1Id = c1.body.contract.id;

  const c2 = await request(app)
    .post('/api/v2/contracts')
    .set(as(gestorToken))
    .send({
      name: 'Galpao Sul Limpeza',
      start_date: futureDate(-40),
      forecast_date: futureDate(30),
      purpose_id: limpezaId,
    });
  assert.strictEqual(c2.status, 201, JSON.stringify(c2.body));
  c2Id = c2.body.contract.id;

  // encerrar c2 → status encerrado
  const closed = await request(app)
    .post(`/api/v2/contracts/${c2Id}/close`)
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
      .post(`/api/v2/contracts/${cid}/providers`)
      .set(as(gestorToken))
      .send({ user_id: uid });
    assert.ok([200, 201].includes(linked.status), JSON.stringify(linked.body));
  }

  // tasks with distinct priority/prestador/due dates
  const t1 = await request(app)
    .post(`/api/v2/contracts/${c1Id}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Instalacao eletrica', priority: 'high', assignee_id: p1Id, due_date: futureDate(10) });
  assert.strictEqual(t1.status, 201, JSON.stringify(t1.body));
  t1Id = t1.body.task.id;

  const t2 = await request(app)
    .post(`/api/v2/contracts/${c1Id}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Reaperto de parafusos', priority: 'low', assignee_id: p2Id, due_date: futureDate(90) });
  assert.strictEqual(t2.status, 201, JSON.stringify(t2.body));

  const t3 = await request(app)
    .post(`/api/v2/contracts/${c2Id}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Pintura galpao', priority: 'high', assignee_id: p2Id, due_date: futureDate(40) });
  assert.strictEqual(t3.status, 201, JSON.stringify(t3.body));
});

test('FR-016 filters', async () => {
  const ids = (body, key) => body[key].map((row) => row.id);

  // contrato: name/object substring
  const byName = await request(app).get('/api/v2/search/contracts?q=Almoxarifado').set(as(gestorToken));
  assert.strictEqual(byName.status, 200, JSON.stringify(byName.body));
  assert.deepStrictEqual(ids(byName.body, 'contracts'), [c1Id]);

  // status
  const byStatus = await request(app)
    .get('/api/v2/search/contracts?status=encerrado')
    .set(as(gestorToken));
  assert.deepStrictEqual(ids(byStatus.body, 'contracts'), [c2Id]);

  const byVigente = await request(app)
    .get('/api/v2/search/contracts?status=vigente')
    .set(as(gestorToken));
  assert.deepStrictEqual(ids(byVigente.body, 'contracts'), [c1Id]);

  // finalidade
  const byFinalidade = await request(app)
    .get(`/api/v2/search/contracts?purpose_id=${reformaId}`)
    .set(as(gestorToken));
  assert.deepStrictEqual(ids(byFinalidade.body, 'contracts'), [c1Id]);

  // prestador (contract link)
  const byPrestadorC = await request(app)
    .get(`/api/v2/search/contracts?prestador_id=${p1Id}`)
    .set(as(gestorToken));
  assert.deepStrictEqual(ids(byPrestadorC.body, 'contracts'), [c1Id]);

  // prioridade (tasks)
  const byPriority = await request(app)
    .get('/api/v2/search/tasks?priority=high')
    .set(as(gestorToken));
  const priorityIds = ids(byPriority.body, 'tasks').sort();
  assert.strictEqual(byPriority.body.total, 2, 'two high-priority tasks');
  assert.ok(priorityIds.length === 2);

  // prestador (task assignee)
  const byPrestadorT = await request(app)
    .get(`/api/v2/search/tasks?prestador_id=${p1Id}`)
    .set(as(gestorToken));
  assert.deepStrictEqual(ids(byPrestadorT.body, 'tasks'), [t1Id]);

  // prazo: due date window
  const soon = await request(app)
    .get(`/api/v2/search/tasks?due_before=${futureDate(15)}`)
    .set(as(gestorToken));
  assert.deepStrictEqual(ids(soon.body, 'tasks'), [t1Id], 'only the task due within 15 days');

  const later = await request(app)
    .get(`/api/v2/search/tasks?due_after=${futureDate(30)}`)
    .set(as(gestorToken));
  const laterIds = ids(later.body, 'tasks');
  assert.strictEqual(later.body.total, 2, 'tasks due after 30 days');
  assert.ok(!laterIds.includes(t1Id));

  // combined filters
  const combined = await request(app)
    .get('/api/v2/search/tasks?q=Instalacao&priority=high')
    .set(as(gestorToken));
  assert.deepStrictEqual(ids(combined.body, 'tasks'), [t1Id]);

  const combinedC = await request(app)
    .get(`/api/v2/search/contracts?status=vigente&purpose_id=${reformaId}&prestador_id=${p1Id}`)
    .set(as(gestorToken));
  assert.deepStrictEqual(ids(combinedC.body, 'contracts'), [c1Id]);

  // status filter on tasks (flow value)
  const concluida = await request(app)
    .get('/api/v2/search/tasks?status=Concluída')
    .set(as(gestorToken));
  assert.strictEqual(concluida.body.total, 0, 'no concluded tasks yet');

  // prestador scoping: p1 sees only own tasks / linked contracts
  const p1Tasks = await request(app).get('/api/v2/search/tasks?q=').set(as(p1Token));
  assert.strictEqual(p1Tasks.status, 200);
  assert.ok(p1Tasks.body.tasks.every((t) => t.assignee_id === p1Id), 'prestador: só as suas');

  const p1Contracts = await request(app).get('/api/v2/search/contracts?q=Galpao').set(as(p1Token));
  assert.strictEqual(p1Contracts.status, 200);
  assert.strictEqual(p1Contracts.body.total, 0, 'p1 not linked to Galpao Sul');

  // unknown page params and empty result are fine
  const empty = await request(app).get('/api/v2/search/contracts?q=inexistente').set(as(gestorToken));
  assert.strictEqual(empty.status, 200);
  assert.strictEqual(empty.body.total, 0);
});

// E007: per-requirement acceptance tests (plan.md Acceptance Test Stubs, FR-001..FR-004).

test('FR-001 seis filtros isolados e combinados', async () => {
  const ids = (body, key) => body[key].map((row) => row.id);

  // contrato (contract_id on tasks) — t1,t2 belong to c1; t3 to c2
  const byContract = await request(app)
    .get(`/api/v2/search/tasks?contract_id=${c1Id}`)
    .set(as(gestorToken));
  assert.strictEqual(byContract.status, 200, JSON.stringify(byContract.body));
  const contractIds = ids(byContract.body, 'tasks').sort((a, b) => a - b);
  const t1 = getDomainDb(domainId).get('SELECT id FROM tasks WHERE title = ?', ['Instalacao eletrica']).id;
  const t2 = getDomainDb(domainId).get('SELECT id FROM tasks WHERE title = ?', ['Reaperto de parafusos']).id;
  assert.deepStrictEqual(contractIds, [t1, t2].sort((a, b) => a - b), 'contract_id filters tasks of that contract');

  // status (contracts)
  const byStatus = await request(app).get('/api/v2/search/contracts?status=vigente').set(as(gestorToken));
  assert.strictEqual(byStatus.body.total, 1);
  assert.strictEqual(byStatus.body.contracts[0].id, c1Id);

  // prioridade (tasks)
  const byPriority = await request(app).get('/api/v2/search/tasks?priority=high').set(as(gestorToken));
  assert.strictEqual(byPriority.body.total, 2, 'two high-priority tasks');

  // prestador (tasks)
  const byPrestador = await request(app).get(`/api/v2/search/tasks?prestador_id=${p2Id}`).set(as(gestorToken));
  assert.strictEqual(byPrestador.body.total, 2, 'p2 owns t2 and t3');

  // finalidade (contracts)
  const byFinalidade = await request(app).get(`/api/v2/search/contracts?purpose_id=${limpezaId}`).set(as(gestorToken));
  assert.strictEqual(byFinalidade.body.total, 1);
  assert.strictEqual(byFinalidade.body.contracts[0].id, c2Id);

  // prazo (tasks, both bounds combined)
  const byPrazo = await request(app)
    .get(`/api/v2/search/tasks?due_after=${futureDate(5)}&due_before=${futureDate(20)}`)
    .set(as(gestorToken));
  assert.deepStrictEqual(ids(byPrazo.body, 'tasks'), [t1], 'only t1 due within 5..20 days');

  // combined: status + finalidade + prestador on contracts
  const combined = await request(app)
    .get(`/api/v2/search/contracts?status=encerrado&purpose_id=${limpezaId}&prestador_id=${p2Id}`)
    .set(as(gestorToken));
  assert.deepStrictEqual(ids(combined.body, 'contracts'), [c2Id], 'c2 satisfies all three');
});

test('FR-002 resultado vazio sem erro e paginação consistente', async () => {
  // empty result: no error, total 0, arrays empty
  const empty = await request(app).get('/api/v2/search/tasks?q=zzz-inexistente').set(as(gestorToken));
  assert.strictEqual(empty.status, 200, JSON.stringify(empty.body));
  assert.strictEqual(empty.body.total, 0);
  assert.deepStrictEqual(empty.body.tasks, []);

  // pagination consistency: total is the full count, rows limited by limit
  const page = await request(app).get('/api/v2/search/tasks?limit=1&offset=0').set(as(gestorToken));
  assert.strictEqual(page.status, 200);
  assert.strictEqual(page.body.total, 3, 'three tasks seeded');
  assert.strictEqual(page.body.tasks.length, 1, 'limit=1 returns one row');
  assert.strictEqual(page.body.limit, 1);
  assert.strictEqual(page.body.offset, 0);

  // page beyond total: empty rows, total still correct, no error
  const beyond = await request(app).get('/api/v2/search/tasks?limit=50&offset=100').set(as(gestorToken));
  assert.strictEqual(beyond.status, 200, JSON.stringify(beyond.body));
  assert.deepStrictEqual(beyond.body.tasks, [], 'no rows beyond total');
  assert.strictEqual(beyond.body.total, 3, 'total unchanged');
});

test('FR-003 p95 abaixo de 2 s com ensureIndexes ativo', async () => {
  // ensureIndexes covers the filtered columns
  const dbx = getDomainDb(domainId);
  const indexes = dbx.all("SELECT name FROM sqlite_master WHERE type = 'index'").map((r) => r.name);
  for (const idx of ['idx_contracts_status', 'idx_contracts_purpose', 'idx_tasks_status', 'idx_tasks_assignee', 'idx_tasks_contract']) {
    assert.ok(indexes.includes(idx), `${idx} present`);
  }
  // conditional indexes may be absent until a p95 gap is found; when present they must target the right columns
  for (const [idx, table] of [['idx_tasks_priority', 'tasks'], ['idx_tasks_due_date', 'tasks']]) {
    if (indexes.includes(idx)) {
      const info = dbx.all(`PRAGMA index_info(${idx})`);
      assert.strictEqual(info[0].name, table === 'tasks' ? (idx.includes('priority') ? 'priority' : 'due_date') : info[0].name);
    }
  }

  // seed representative volume directly (fast, bypasses API)
  const dbx2 = getDomainDb(domainId);
  const items = [];
  for (let i = 0; i < 2000; i += 1) {
    items.push({
      sql: 'INSERT INTO tasks (contract_id, title, description, status, priority, assignee_id, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      params: [c1Id, `Tarefa volume ${i}`, `desc ${i}`, i % 2 ? code('tasks.status', 'Em Progresso') : code('tasks.status', 'A Fazer'), i % 3 ? 'low' : 'high', i % 2 ? p1Id : p2Id, futureDate(i % 100)],
    });
  }
  dbx2.runBatch(items);

  // measure p95 over N sequential requests with combined filters
  const N = 25;
  const samples = [];
  for (let i = 0; i < N; i += 1) {
    const start = process.hrtime.bigint();
    const res = await request(app)
      .get(`/api/v2/search/tasks?status=${i % 2 ? 'Em Progresso' : 'A Fazer'}&priority=${i % 3 ? 'low' : 'high'}&prestador_id=${i % 2 ? p1Id : p2Id}&limit=50`)
      .set(as(gestorToken));
    const end = process.hrtime.bigint();
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    samples.push(Number(end - start) / 1e6);
  }
  samples.sort((a, b) => a - b);
  const p95 = samples[Math.floor(samples.length * 0.95)];
  assert.ok(p95 < 2000, `p95 ${p95.toFixed(1)} ms < 2000 ms`);
});

test('FR-004 escopo de domínio e papel na busca', async () => {
  // prestador sees only own tasks (explicit)
  const p1Tasks = await request(app).get('/api/v2/search/tasks?q=').set(as(p1Token));
  assert.strictEqual(p1Tasks.status, 200);
  assert.ok(p1Tasks.body.tasks.every((t) => t.assignee_id === p1Id), 'prestador: only own tasks');

  // admin/gestor see the whole domain
  const gestorTasks = await request(app).get('/api/v2/search/tasks?q=').set(as(gestorToken));
  const domainCount = getDomainDb(domainId).get('SELECT COUNT(*) AS c FROM tasks').c;
  assert.strictEqual(gestorTasks.body.total, domainCount, 'gestor sees all domain tasks');

  // domainId param is ignored — results stay in token domain, no leak
  const sys = await request(app).post('/api/v2/auth/login').send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  const iota = await request(app)
    .post('/api/v2/domains/enable')
    .set(as(sys.body.token))
    .send({ name: 'Iota Busca', adminName: 'Ivo', adminEmail: 'ivo@iota.test', adminPassword: 'Secret1!' });
  assert.strictEqual(iota.status, 201, JSON.stringify(iota.body));
  const foreign = iota.body.domain.id;
  assert.notStrictEqual(Number(foreign), Number(domainId));

  const withForeign = await request(app).get(`/api/v2/search/tasks?domainId=${foreign}`).set(as(gestorToken));
  assert.strictEqual(withForeign.status, 200, 'search ignores domainId param (token isolation)');
  assert.strictEqual(withForeign.body.total, domainCount, 'still only own-domain tasks');

  // foreign-domain session cannot see this domain's tasks
  const foreignAdmin = await login('ivo@iota.test', 'Secret1!', foreign);
  const foreignSearch = await request(app).get('/api/v2/search/tasks?q=').set(as(foreignAdmin));
  assert.strictEqual(foreignSearch.status, 200);
  assert.strictEqual(foreignSearch.body.total, 0, 'foreign domain sees none of our tasks');
});
