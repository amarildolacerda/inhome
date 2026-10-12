'use strict';

process.env.UPLOAD_DIR = require('path').join(
  require('os').tmpdir(),
  `sddp-uploads-report-${process.pid}`
);

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir();
const { app } = require('../server');
const { getDomainDb } = require('../config/database');
const fs = require('fs');
const path = require('path');
const { UPLOAD_DIR } = require('../middleware/upload');
const { generateContractPdf } = require('./report');

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
      .send({ name, email, password: 'Secret1!', role, username: email.split('@')[0] });
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

// Acceptance tests (plan.md ## Acceptance Test Stubs) — RED stubs of T001
// turned GREEN by T006..T011.

function occurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

test('FR-002 PDF content', async () => {
  const pdf = await request(app).get(`/api/contracts/${contractId}/report.pdf`).set(as(gestorToken));
  assert.strictEqual(pdf.status, 200, JSON.stringify(pdf.body));
  const latin1 = pdf.body.toString('latin1');
  assert.ok(latin1.includes(`Relatorio de Contrato ${contractId} - Reforma Galpao Alpha`), 'identidade do contrato');
  assert.ok(/Status: \S+/.test(latin1), 'status do contrato');
  assert.ok(latin1.includes('Inicio: ') && latin1.includes('Previsao: '), 'datas do contrato');
  assert.ok(/\d{4}-\d{2}-\d{2}/.test(latin1), 'datas de tarefa');
  assert.ok(latin1.includes('- [Concluída] Demolicao parede norte') || latin1.includes('- [Conclu'), 'tarefa concluida listada');
  assert.ok(latin1.includes('Executor: Mila'), 'executor presente');
  assert.ok(latin1.includes('Conclusao: Parede removida e entulho recolhido'), 'evidencia de conclusao');
  assert.ok(latin1.includes('Fotos: 1'), 'contagem de fotos');
  assert.ok(latin1.includes('- [A Fazer] Reboco externo'), 'tarefa aberta listada');
});

test('FR-003 empty contract document', async () => {
  const created = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'Contrato Sem Tarefas', start_date: futureDate(-1), forecast_date: futureDate(30) });
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const emptyId = created.body.contract.id;

  const pdf = await request(app).get(`/api/contracts/${emptyId}/report.pdf`).set(as(gestorToken));
  assert.strictEqual(pdf.status, 200, JSON.stringify(pdf.body));
  const latin1 = pdf.body.toString('latin1');
  assert.ok(latin1.startsWith('%PDF-'), 'PDF valido');
  assert.ok(latin1.includes('Tarefas \\(0\\):'), 'cabecalho com zero tarefas');
  assert.ok(!latin1.includes('- ['), 'nenhuma linha de tarefa');
  assert.ok(latin1.includes('Contrato Sem Tarefas'), 'identidade presente');

  const csv = await request(app).get(`/api/contracts/${emptyId}/report.csv`).set(as(gestorToken));
  assert.strictEqual(csv.status, 200, JSON.stringify(csv.body));
  const rows = (csv.text || String(csv.body)).split(/\r?\n/).filter((l) => l.length);
  assert.strictEqual(rows.length, 1, 'CSV so cabecalho');
  assert.ok(rows[0].startsWith('contract_id,contract_name,task_id,'), 'cabecalho CSV');
});

test('FR-001 PDF embeds photos; missing file falls back to text', async () => {
  const pdfBefore = await request(app).get(`/api/contracts/${contractId}/report.pdf`).set(as(gestorToken));
  assert.strictEqual(pdfBefore.status, 200, JSON.stringify(pdfBefore.body));
  const beforeCount = occurrences(pdfBefore.body.toString('latin1'), '/Subtype /Image');
  assert.ok(beforeCount >= 1, 'foto da conclusao ja embutida na loja');

  const db = getDomainDb(domainId);
  const seed = db.get('SELECT task_id, uploaded_by FROM task_photos ORDER BY id LIMIT 1');
  assert.ok(seed, 'fixture de task_photo existente');
  const ref = 'uploads/e008-temp-embed.png';
  const abs = path.join(UPLOAD_DIR, 'e008-temp-embed.png');
  fs.writeFileSync(abs, Buffer.from(TINY_PNG, 'base64'));
  db.run('INSERT INTO task_photos(task_id, path, uploaded_by) VALUES (?, ?, ?)', [
    seed.task_id,
    ref,
    seed.uploaded_by,
  ]);
  try {
    const mid = await request(app).get(`/api/contracts/${contractId}/report.pdf`).set(as(gestorToken));
    assert.strictEqual(mid.status, 200, JSON.stringify(mid.body));
    const midCount = occurrences(mid.body.toString('latin1'), '/Subtype /Image');
    assert.ok(midCount > beforeCount, `imagem extra embutida (${beforeCount} -> ${midCount})`);

    fs.unlinkSync(abs);
    const after = await request(app).get(`/api/contracts/${contractId}/report.pdf`).set(as(gestorToken));
    assert.strictEqual(after.status, 200, 'documento segue com foto ausente');
    const afterText = after.body.toString('latin1');
    assert.ok(afterText.startsWith('%PDF-') && afterText.trimEnd().endsWith('%%EOF'), 'container integro');
    assert.ok(afterText.includes(`[foto indisponivel] ${ref}`), 'fallback textual preservado');
    assert.strictEqual(occurrences(afterText, '/Subtype /Image'), beforeCount, 'sem a imagem ausente');
    assert.ok(afterText.includes('Fotos: 2'), 'contagem segue referenciando a linha');
  } finally {
    db.run('DELETE FROM task_photos WHERE path = ?', [ref]);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  }
});

test('FR-004 CSV row parity with PDF', async () => {
  const pdf = await request(app).get(`/api/contracts/${contractId}/report.pdf`).set(as(gestorToken));
  assert.strictEqual(pdf.status, 200, JSON.stringify(pdf.body));
  const pdfTaskLines = occurrences(pdf.body.toString('latin1'), '- [');
  assert.ok(pdfTaskLines >= 2, 'linhas de tarefa no PDF');

  const csv = await request(app).get(`/api/contracts/${contractId}/report.csv`).set(as(gestorToken));
  assert.strictEqual(csv.status, 200, JSON.stringify(csv.body));
  const rows = (csv.text || String(csv.body)).split(/\r?\n/).filter((l) => l.length);
  assert.strictEqual(rows.length - 1, pdfTaskLines, 'mesmo conjunto de linhas de dados');
  const body = rows.slice(1).join('\n');
  assert.ok(body.includes('Demolicao parede norte') && body.includes('Reboco externo'), 'mesmas tarefas');
  assert.ok(body.includes('Parede removida e entulho recolhido'), 'evidencia tambem no CSV');
});

test('FR-005 scope gates before generation', async () => {
  // papel sem permissão nos dois formatos
  for (const fmt of ['report.pdf', 'report.csv']) {
    const role = await request(app).get(`/api/contracts/${contractId}/${fmt}`).set(as(prestadorToken));
    assert.strictEqual(role.status, 403, `${fmt} prestador`);
  }
  // contrato desconhecido nos dois formatos
  for (const fmt of ['report.pdf', 'report.csv']) {
    const missing = await request(app).get(`/api/contracts/999999/${fmt}`).set(as(gestorToken));
    assert.strictEqual(missing.status, 404, `${fmt} desconhecido`);
  }
  // domainId explícito divergente → 403 na porta de escopo, antes de gerar
  const sys = await request(app).post('/api/auth/login').send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200);
  const iota = await request(app)
    .post('/api/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Iota Relatorio',
      adminName: 'Ivo',
      adminEmail: 'ivo@iota.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(iota.status, 201, JSON.stringify(iota.body));
  const foreignId = iota.body.domain.id;
  const foreignToken = await login('ivo@iota.test', 'Secret1!', foreignId);
  const foreignContract = await request(app)
    .post('/api/contracts')
    .set(as(foreignToken))
    .send({ name: 'Contrato Estrangeiro', start_date: futureDate(-1), forecast_date: futureDate(30) });
  assert.strictEqual(foreignContract.status, 201, JSON.stringify(foreignContract.body));

  // id de outro domínio no banco escopado: nunca expõe o contrato estrangeiro —
  // id colidente serve o contrato do próprio domínio; id ausente → 404 (Q2)
  const foreign = await request(app)
    .get(`/api/contracts/${foreignContract.body.contract.id}/report.pdf`)
    .set(as(gestorToken));
  if (foreign.status === 200) {
    const text = foreign.body.toString('latin1');
    assert.ok(!text.includes('Contrato Estrangeiro'), 'nenhum dado do domínio estrangeiro vazou');
    assert.ok(text.includes('Relatorio de Contrato'), 'serve o contrato do próprio domínio');
  } else {
    assert.strictEqual(foreign.status, 404, JSON.stringify(foreign.body));
  }
  const absent = await request(app)
    .get(`/api/contracts/${foreignContract.body.contract.id + 100000}/report.pdf`)
    .set(as(gestorToken));
  assert.strictEqual(absent.status, 404, 'id ausente no banco escopado');

  // domainId de outro domínio em query → 403 na porta de escopo
  const foreignQuery = await request(app)
    .get(`/api/contracts/${contractId}/report.csv?domainId=${foreignId}`)
    .set(as(gestorToken));
  assert.strictEqual(foreignQuery.status, 403, JSON.stringify(foreignQuery.body));
  assert.ok(!String(foreignQuery.text || '').includes('contract_id'), 'nenhum CSV gerado');
});

test('FR-006 read failure returns 500 and persists nothing', async () => {
  // unitário: geração propaga a falha de leitura e não toca o disco
  const filesBefore = fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR).length : 0;
  const brokenDb = {
    get() {
      throw new Error('forced read failure');
    },
    all() {
      return [];
    },
  };
  assert.throws(() => generateContractPdf(brokenDb, 1), /forced read failure/);
  assert.strictEqual(
    fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR).length : 0,
    filesBefore,
    'nenhum arquivo persistido na falha'
  );

  // ponta a ponta: handler captura e responde 500 JSON (contracts.js reportPdf catch)
  const db = getDomainDb(domainId);
  const originalGet = db.get;
  db.get = () => {
    throw new Error('forced read failure');
  };
  try {
    const res = await request(app).get(`/api/contracts/${contractId}/report.pdf`).set(as(gestorToken));
    assert.strictEqual(res.status, 500, JSON.stringify(res.body));
    assert.match(JSON.stringify(res.body), /forced read failure/);
    assert.strictEqual(res.headers['content-type'].includes('application/pdf'), false, 'sem corpo de PDF');
  } finally {
    db.get = originalGet;
  }
  // repetição manual funciona após restaurar
  const ok = await request(app).get(`/api/contracts/${contractId}/report.pdf`).set(as(gestorToken));
  assert.strictEqual(ok.status, 200, 'repeticao manual apos falha');
});
