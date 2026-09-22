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
let prestadorToken;
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

const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test.before(async () => {
  await initTestDb();

  const sys = await request(app).post('/api/auth/login').send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  const enabled = await request(app)
    .post('/api/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Teta Relatorio',
      adminName: 'Teresa',
      adminEmail: 'teresa@teta.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201);
  domainId = enabled.body.domain.id;
  adminToken = await login('teresa@teta.test', 'Secret1!', domainId);

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
  const movId = db.get("SELECT id FROM users WHERE email = 'mila@teta.test'").id;

  const contract = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({
      name: 'Reforma Galpao Alpha',
      start_date: futureDate(-30),
      forecast_date: futureDate(90),
    });
  assert.strictEqual(contract.status, 201);
  contractId = contract.body.contract.id;

  const linked = await request(app)
    .post(`/api/contracts/${contractId}/prestadores`)
    .set(as(gestorToken))
    .send({ user_id: movId });
  assert.ok([200, 201].includes(linked.status));

  // concluded task with photo (SC-007 data)
  const doneTask = await request(app)
    .post(`/api/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Demolicao parede norte', assignee_id: movId, due_date: futureDate(-1) });
  assert.strictEqual(doneTask.status, 201);
  const doneId = doneTask.body.task.id;
  for (const status of ['Em Progresso', 'Revisão']) {
    const move = await request(app)
      .patch(`/api/tasks/${doneId}/status`)
      .set(as(prestadorToken))
      .send({ status });
    assert.strictEqual(move.status, 200, JSON.stringify(move.body));
  }
  const completed = await request(app)
    .post(`/api/tasks/${doneId}/complete`)
    .set(as(prestadorToken))
    .send({
      text: 'Parede removida e entulho recolhido',
      photos: [{ filename: 'demolicao.png', dataBase64: TINY_PNG }],
    });
  assert.strictEqual(completed.status, 200, JSON.stringify(completed.body));

  // open task
  const openTask = await request(app)
    .post(`/api/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Reboco externo', assignee_id: movId });
  assert.strictEqual(openTask.status, 201);
});

test('FR-018 PDF/CSV', async () => {
  // auth + role gate
  const anon = await request(app).get(`/api/contracts/${contractId}/report.pdf`);
  assert.strictEqual(anon.status, 401);
  const asPrestador = await request(app)
    .get(`/api/contracts/${contractId}/report.pdf`)
    .set(as(prestadorToken));
  assert.strictEqual(asPrestador.status, 403);

  // PDF: valid container + SC-007 content (tarefa, conclusão, executor, datas, fotos)
  const pdf = await request(app).get(`/api/contracts/${contractId}/report.pdf`).set(as(gestorToken));
  assert.strictEqual(pdf.status, 200, JSON.stringify(pdf.body));
  assert.match(pdf.headers['content-type'], /application\/pdf/);
  assert.ok(Buffer.isBuffer(pdf.body), 'binary body');
  const pdfBuf = pdf.body;
  assert.strictEqual(pdfBuf.subarray(0, 5).toString('latin1'), '%PDF-');
  assert.ok(pdfBuf.toString('latin1').trimEnd().endsWith('%%EOF'), 'PDF closes with EOF');

  const latin1 = pdfBuf.toString('latin1');
  assert.ok(latin1.includes('Reforma Galpao Alpha'), 'contract name present');
  assert.ok(latin1.includes('Demolicao parede norte'), 'tarefa presente (SC-007)');
  assert.ok(latin1.includes('Parede removida e entulho recolhido'), 'conclusão presente');
  assert.ok(latin1.includes('Mila'), 'executor presente');
  assert.ok(/\d{4}-\d{2}-\d{2}/.test(latin1), 'datas presentes');
  assert.ok(latin1.includes('Fotos: 1'), 'fotos contadas');
  assert.ok(latin1.includes('Reboco externo'), 'tarefa aberta listada');

  // CSV secondary export
  const csv = await request(app).get(`/api/contracts/${contractId}/report.csv`).set(as(gestorToken));
  assert.strictEqual(csv.status, 200, JSON.stringify(csv.body));
  assert.match(csv.headers['content-type'], /text\/csv/);
  const text = csv.text || String(csv.body);
  assert.ok(text.startsWith('contract_id,contract_name,task_id,'), 'CSV header');
  assert.ok(text.includes('Demolicao parede norte'), 'concluded task row');
  assert.ok(text.includes('Parede removida e entulho recolhido'), 'completion text in CSV');
  assert.ok(text.includes('Mila'), 'executor in CSV');
  assert.ok(text.includes('Reboco externo'), 'open task row');

  // unknown contract → 404
  const missing = await request(app).get('/api/contracts/999999/report.pdf').set(as(gestorToken));
  assert.strictEqual(missing.status, 404);

  // admin can also generate
  const asAdmin = await request(app).get(`/api/contracts/${contractId}/report.csv`).set(as(adminToken));
  assert.strictEqual(asAdmin.status, 200);
});
