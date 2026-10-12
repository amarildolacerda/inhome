'use strict';

// 00003 US7: revisão na vigência (FR-022 contexto, FR-023 aplicação,
// FR-024 gatilho manual). A revisão é uma sugestão versionada (kind=revisao).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir();

// Fake OpenCode CLI (AD-001): echoes FAKE_OPENCODE_OUTPUT, honours delay
// (queue tests) and FAKE_OPENCODE_EXIT (failure/retry); captures the prompt.
const fakeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-opencode-review-'));
const fakeCli = path.join(fakeDir, 'fake.js');
const captureFile = path.join(fakeDir, 'prompt.txt');
fs.writeFileSync(
  fakeCli,
  `const fs = require('fs');
if (process.env.FAKE_OPENCODE_CAPTURE) {
  fs.writeFileSync(process.env.FAKE_OPENCODE_CAPTURE, process.argv.slice(3).join(' '));
}
if (process.env.FAKE_OPENCODE_EXIT) {
  process.stderr.write('opencode exploded');
  process.exit(Number(process.env.FAKE_OPENCODE_EXIT));
}
setTimeout(() => {
  process.stdout.write(process.env.FAKE_OPENCODE_OUTPUT || '');
}, Number(process.env.FAKE_OPENCODE_DELAY_MS || 0));
`
);
process.env.OPENCODE_BIN = 'node';
process.env.OPENCODE_ARGS = fakeCli;

const { app } = require('../server');
const { getDomainDb } = require('../config/database');
const { code } = require('../config/enums');
const ContractDefinition = require('../models/ContractDefinition');
const TaskSuggestion = require('../models/TaskSuggestion');
const History = require('../models/History');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

const DEFINITIONS = {
  finalidade: 'Executar a revisão da obra',
  limitacoes: 'Sem acesso à cobertura à noite',
  alvo: 'Obra inteira',
  escopo: 'Estrutura e acabamento',
  premissas: 'Projeto revisado aprovado',
  entregaveis: 'Relatório de vigência',
};

const ANALYSIS_OUTPUT = JSON.stringify({
  tasks: [
    {
      title: 'Inspecionar estrutura',
      description: 'Vistoria antes da revisão',
      justificativa: 'Base da revisão na vigência',
    },
  ],
});

let domainId;
let db;
let adminToken;
let gestorToken;
let prestadorToken;
let contractId;
let contractNoDefs;
let gestorId;
let latestDefId;
let wt1Id;
let wt2Id;
let tEdit;
let tProg;
let tDone;
let tReopened;
let reviewProposalOutput;

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

async function createTask(title, assigneeId = null) {
  const body = { title };
  if (assigneeId) body.assignee_id = assigneeId;
  const res = await request(app)
    .post(`/api/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send(body);
  assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  return res.body.task.id;
}

async function waitForReview(rid, status, token, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    const res = await request(app)
      .get(`/api/contracts/${contractId}/review/${rid}`)
      .set(as(token || gestorToken));
    if (res.status === 200) {
      last = res.body.review;
      if (last.status === status) return last;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`review ${rid} never reached ${status}; last=${JSON.stringify(last && last.status)}`);
}

async function waitForAnalysis(status, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    const res = await request(app)
      .get(`/api/contracts/${contractId}/analysis`)
      .set(as(gestorToken));
    if (res.status === 200) {
      last = res.body.analysis;
      if (last.status === status) return last;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`analysis never reached ${status}; last=${JSON.stringify(last && last.status)}`);
}

test.before(async () => {
  await initTestDb();

  const sys = await request(app)
    .post('/api/auth/login')
    .send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200);

  const enabled = await request(app)
    .post('/api/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Reta Revisão',
      adminName: 'Rui',
      adminEmail: 'rui@reta.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201);
  domainId = enabled.body.domain.id;
  db = getDomainDb(domainId);
  adminToken = await login('rui@reta.test', 'Secret1!', domainId);

  for (const [name, email, role] of [
    ['Gina', 'gina@reta.test', 'gestor'],
    ['Pia', 'pia@reta.test', 'prestador'],
  ]) {
    const res = await request(app)
      .post('/api/users')
      .set(as(adminToken))
      .send({ name, email, password: 'Secret1!', role, username: email.split('@')[0] });
    assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  }
  gestorToken = await login('gina@reta.test', 'Secret1!', domainId);
  prestadorToken = await login('pia@reta.test', 'Secret1!', domainId);
  gestorId = db.get(`SELECT id FROM users WHERE email = 'gina@reta.test'`).id;
  const prestadorId = db.get(`SELECT id FROM users WHERE email = 'pia@reta.test'`).id;

  const contract = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'Obra Revisão', start_date: '2026-01-01', forecast_date: '2026-12-31' });
  assert.strictEqual(contract.status, 201, JSON.stringify(contract.body));
  contractId = contract.body.contract.id;

  const noDefs = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'Obra Sem Definições', start_date: '2026-01-01', forecast_date: '2026-12-31' });
  assert.strictEqual(noDefs.status, 201);
  contractNoDefs = noDefs.body.contract.id;

  const defs = await request(app)
    .put(`/api/contracts/${contractId}/definitions`)
    .set(as(gestorToken))
    .send(DEFINITIONS);
  assert.strictEqual(defs.status, 200, JSON.stringify(defs.body));
  latestDefId = defs.body.definitions.id;

  const linked = await request(app)
    .post(`/api/contracts/${contractId}/prestadores`)
    .set(as(gestorToken))
    .send({ user_id: prestadorId });
  assert.strictEqual(linked.status, 201, JSON.stringify(linked.body));

  // approved workflow → two tasks in the official list (FR-022 context)
  const seeded = TaskSuggestion.createSuggestion(db, {
    contractId,
    definitionsId: latestDefId,
    kind: 'analise',
    userId: gestorId,
  });
  TaskSuggestion.markSuggested(db, seeded.id, [
    {
      title: 'Conferir medição da obra',
      description: 'Comparar medido e projetado',
      justification: 'Evita pagamento indevido',
    },
    {
      title: 'Emitir relatório de vigência',
      description: null,
      justification: 'Rastreabilidade da execução',
    },
  ]);
  const approved = await request(app)
    .post(`/api/suggestions/${seeded.id}/approve`)
    .set(as(gestorToken));
  assert.strictEqual(approved.status, 201, JSON.stringify(approved.body));
  wt1Id = approved.body.tasks[0].id;
  wt2Id = approved.body.tasks[1].id;

  // tasks covering the FR-023 eligibility matrix
  tEdit = await createTask('Revisar medição');
  tProg = await createTask('Avançar estrutura', prestadorId);
  const moveProg = await request(app)
    .patch(`/api/tasks/${tProg}/status`)
    .set(as(prestadorToken))
    .send({ status: 'Em Progresso' });
  assert.strictEqual(moveProg.status, 200, JSON.stringify(moveProg.body));

  tDone = await createTask('Instalar telhado', prestadorId);
  for (const status of ['Em Progresso', 'Revisão']) {
    const move = await request(app)
      .patch(`/api/tasks/${tDone}/status`)
      .set(as(prestadorToken))
      .send({ status });
    assert.strictEqual(move.status, 200, JSON.stringify(move.body));
  }
  const done = await request(app)
    .post(`/api/tasks/${tDone}/complete`)
    .set(as(prestadorToken))
    .send({ text: 'Telhado instalado e fotografado' });
  assert.strictEqual(done.status, 200, JSON.stringify(done.body));

  tReopened = await createTask('Pintar muro', prestadorId);
  for (const status of ['Em Progresso', 'Revisão']) {
    const move = await request(app)
      .patch(`/api/tasks/${tReopened}/status`)
      .set(as(prestadorToken))
      .send({ status });
    assert.strictEqual(move.status, 200, JSON.stringify(move.body));
  }
  const doneReopen = await request(app)
    .post(`/api/tasks/${tReopened}/complete`)
    .set(as(prestadorToken))
    .send({ text: 'Muro pintado' });
  assert.strictEqual(doneReopen.status, 200);
  const reopened = await request(app)
    .post(`/api/tasks/${tReopened}/reopen`)
    .set(as(gestorToken))
    .send({ motivo: 'Infiltração na parede' });
  assert.strictEqual(reopened.status, 200, JSON.stringify(reopened.body));
  // existing E003 behavior: reopen returns the task to 'Em Progresso'
  assert.strictEqual(reopened.body.task.status, 'Em Progresso');

  reviewProposalOutput = JSON.stringify({
    propostas: [
      {
        op: 'editar',
        tarefa_id: wt1Id,
        titulo: 'Conferir medição revisada',
        descricao: 'Comparar medido e projetado na vigência',
        justificativa: 'A vigência mudou os parâmetros de medição',
      },
      {
        op: 'criar',
        titulo: 'Nova checagem de fachada',
        descricao: 'Conferir a pintura da fachada',
        justificativa: 'Exigência da vigência atual',
      },
    ],
  });
  process.env.FAKE_OPENCODE_OUTPUT = reviewProposalOutput;
  process.env.FAKE_OPENCODE_CAPTURE = captureFile;
  delete process.env.FAKE_OPENCODE_DELAY_MS;
  delete process.env.FAKE_OPENCODE_EXIT;
});

test.after(() => {
  for (const key of [
    'OPENCODE_BIN',
    'OPENCODE_ARGS',
    'FAKE_OPENCODE_OUTPUT',
    'FAKE_OPENCODE_DELAY_MS',
    'FAKE_OPENCODE_EXIT',
    'FAKE_OPENCODE_CAPTURE',
  ]) {
    delete process.env[key];
  }
  fs.rmSync(fakeDir, { recursive: true, force: true });
});

// FR-022: revisão carrega definições e tarefas atuais; proposta versionada
// aguarda aprovação (status sugerido).
test('FR-022 revisão carrega contexto e aguarda aprovação', async () => {
  // sem definições → 400 com o que falta (pré-condição de FR-022)
  const noDefs = await request(app)
    .post(`/api/contracts/${contractNoDefs}/review`)
    .set(as(gestorToken));
  assert.strictEqual(noDefs.status, 400, JSON.stringify(noDefs.body));
  assert.strictEqual(noDefs.body.error, 'Missing required definitions');
  assert.ok(Array.isArray(noDefs.body.missing) && noDefs.body.missing.length > 0);

  // campos de cliente não são aceitos (ReviewInput sem campos)
  const withBody = await request(app)
    .post(`/api/contracts/${contractId}/review`)
    .set(as(gestorToken))
    .send({ instrucoes: 'texto livre' });
  assert.strictEqual(withBody.status, 400, JSON.stringify(withBody.body));
  assert.strictEqual(withBody.body.error, 'Validation failed');

  // gatilho → 202 + Location (polling no recurso da revisão)
  const started = await request(app)
    .post(`/api/contracts/${contractId}/review`)
    .set(as(gestorToken));
  assert.strictEqual(started.status, 202, JSON.stringify(started.body));
  const rid = started.body.review.id;
  assert.strictEqual(
    started.headers.location,
    `/api/contracts/${contractId}/review/${rid}`
  );
  assert.strictEqual(started.body.review.contract_id, contractId);
  assert.strictEqual(started.body.review.created_by, gestorId);
  assert.ok(
    ['pendente', 'analisando', 'sugerido'].includes(started.body.review.status),
    `estado inicial da revisão: ${started.body.review.status}`
  );

  const review = await waitForReview(rid, 'sugerido');

  // contexto carregado no início (FR-022): definições + tarefas atuais
  assert.strictEqual(review.definitions.id, latestDefId, 'definições vigentes');
  assert.strictEqual(review.definitions.finalidade, DEFINITIONS.finalidade);
  const byId = new Map(review.tasks.map((task) => [task.id, task]));
  assert.ok(byId.has(wt1Id) && byId.has(wt2Id), 'tarefas do workflow no contexto');
  assert.ok(byId.has(tEdit) && byId.has(tProg) && byId.has(tDone) && byId.has(tReopened),
    'tarefas atuais completas no contexto');
  assert.strictEqual(byId.get(wt1Id).in_workflow, true, 'workflow oficial marcado');
  assert.strictEqual(byId.get(tEdit).in_workflow, false, 'manual fora do workflow');
  assert.strictEqual(byId.get(tProg).status, 'Em Progresso', 'status real no snapshot');
  assert.strictEqual(byId.get(tDone).status, 'Concluída');

  // proposta versionada aguardando aprovação
  assert.strictEqual(review.status, 'sugerido', 'aguarda aprovação');
  assert.strictEqual(review.proposals.length, 2);
  const editar = review.proposals.find((p) => p.op === 'editar');
  assert.ok(editar, 'proposta de edição presente');
  assert.strictEqual(editar.task_id, wt1Id);
  assert.strictEqual(editar.changes.title, 'Conferir medição revisada');
  assert.strictEqual(
    editar.justificativa,
    'A vigência mudou os parâmetros de medição'
  );
  const criar = review.proposals.find((p) => p.op === 'criar');
  assert.ok(criar, 'proposta de criação presente');
  assert.strictEqual(criar.task_id, null, 'criar não tem tarefa alvo (openapi)');
  assert.strictEqual(criar.changes.title, 'Nova checagem de fachada');
  assert.deepStrictEqual(review.conflicts, [], 'sem conflitos antes da aplicação');

  // prompt montado no servidor: allowlist + tarefas atuais (FR-020/FR-024)
  const promptText = fs.readFileSync(captureFile, 'utf8');
  assert.match(promptText, /Tarefas atuais/, 'tarefas no prompt');
  assert.match(promptText, /Conferir medição da obra/, 'tarefa real no prompt');
  assert.match(promptText, /Contexto do contrato \(allowlist do servidor\)/, 'allowlist no prompt');
  assert.match(promptText, /finalidade/, 'campo da allowlist');
  assert.ok(!/cnpj/i.test(promptText), 'sem CNPJ no prompt');

  // listagem mais recente primeiro, só revisões
  const list = await request(app)
    .get(`/api/contracts/${contractId}/review`)
    .set(as(gestorToken));
  assert.strictEqual(list.status, 200, JSON.stringify(list.body));
  assert.ok(list.body.reviews.length >= 1);
  assert.strictEqual(list.body.reviews[0].id, rid, 'mais recente primeiro');
  assert.strictEqual(list.body.reviews[0].status, 'sugerido');

  // consultas sem recurso → 404; domínio divergente → 404
  const ghost = await request(app)
    .get(`/api/contracts/${contractId}/review/999999`)
    .set(as(gestorToken));
  assert.strictEqual(ghost.status, 404);
  assert.strictEqual(ghost.body.error, 'Review not found');
  const ghostContract = await request(app)
    .post('/api/contracts/999999/review')
    .set(as(gestorToken));
  assert.strictEqual(ghostContract.status, 404);
  assert.strictEqual(ghostContract.body.error, 'Contract not found');

  // autoridade (FR-019, x-roles: gestor)
  assert.strictEqual(
    (await request(app).post(`/api/contracts/${contractId}/review`)).status,
    401,
    'sem token → 401'
  );
  assert.strictEqual(
    (await request(app).post(`/api/contracts/${contractId}/review`).set(as(adminToken)))
      .status,
    403,
    'admin não inicia revisão'
  );
  assert.strictEqual(
    (await request(app).get(`/api/contracts/${contractId}/review`).set(as(prestadorToken)))
      .status,
    403,
    'prestador não vê revisões'
  );
});

// FR-023: aplicação aprovada edita e cria só em A Fazer; iniciada/concluída
// fica intacta e vira conflito; nada é removido ou fechado.
test('FR-023 aplicação só em A Fazer com conflitos', async () => {
  const defRow = ContractDefinition.latest(db, contractId);
  db.run(
    `INSERT INTO task_suggestions(contract_id, definitions_id, kind, status, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [
      contractId,
      defRow.id,
      code('task_suggestions.kind', 'revisao'),
      code('task_suggestions.status', 'sugerido'),
      gestorId,
    ]
  );
  const rid = db.get('SELECT MAX(id) AS id FROM task_suggestions').id;

  let ordem = 0;
  const addProposal = (targetTaskId, title, description) => {
    db.run(
      `INSERT INTO suggestion_items(suggestion_id, title, description, justification, ordem, target_task_id)
       VALUES (?, ?, ?, 'Justificativa da revisão', ?, ?)`,
      [rid, title, description, ordem++, targetTaskId]
    );
  };
  addProposal(tEdit, 'Medição revisada pela vigência', 'Comparar com o orçamento vigente');
  addProposal(tProg, 'Estrutura avançada editada', null);
  addProposal(tDone, 'Telhado editado', null);
  addProposal(tReopened, 'Muro reaberto editado', null);
  addProposal(null, 'Criada pela revisão', 'Nova checagem de fachada');

  const before = await request(app)
    .get(`/api/contracts/${contractId}/review/${rid}`)
    .set(as(gestorToken));
  assert.strictEqual(before.status, 200, JSON.stringify(before.body));
  assert.deepStrictEqual(
    before.body.review.proposals.map((p) => p.op),
    ['editar', 'editar', 'editar', 'editar', 'criar']
  );

  const snapshot = (id) => ({
    task: db.get('SELECT title, description, status FROM tasks WHERE id = ?', [id]),
    history: db.get('SELECT COUNT(*) AS c FROM task_history WHERE task_id = ?', [id]).c,
  });
  const beforeProg = snapshot(tProg);
  const beforeDone = snapshot(tDone);
  const beforeReopened = snapshot(tReopened);
  const beforeEdit = snapshot(tEdit);

  const applied = await request(app)
    .post(`/api/contracts/${contractId}/review/${rid}/apply`)
    .set(as(gestorToken));
  assert.strictEqual(applied.status, 200, JSON.stringify(applied.body));
  assert.deepStrictEqual(applied.body.applied, { edited: 1, created: 1 });

  // conflitos: status diferente de A Fazer — tarefa intacta + motivo
  assert.strictEqual(applied.body.conflicts.length, 3, JSON.stringify(applied.body.conflicts));
  const conflictIds = applied.body.conflicts.map((c) => c.task_id).sort((a, b) => a - b);
  assert.deepStrictEqual(conflictIds, [tProg, tDone, tReopened].sort((a, b) => a - b));
  for (const conflict of applied.body.conflicts) {
    assert.match(conflict.motivo, /Tarefa em (Em Progresso|Concluída) — mudança não aplicada/);
    assert.strictEqual(conflict.review_id, rid);
    assert.ok(Number.isInteger(conflict.id));
  }
  assert.deepStrictEqual(snapshot(tProg), beforeProg, 'iniciada permanece intacta');
  assert.deepStrictEqual(snapshot(tDone), beforeDone, 'concluída permanece intacta');
  // reaberta: E003 devolve 'Em Progresso' (não 'A Fazer') → conflito
  assert.deepStrictEqual(snapshot(tReopened), beforeReopened, 'reaberta permanece intacta');

  // edição aplicada só em A Fazer, sem mudar status nem histórico
  const afterEdit = snapshot(tEdit);
  assert.strictEqual(afterEdit.task.title, 'Medição revisada pela vigência');
  assert.strictEqual(afterEdit.task.description, 'Comparar com o orçamento vigente');
  assert.strictEqual(afterEdit.task.status, code('tasks.status', 'A Fazer'));
  assert.strictEqual(afterEdit.history, beforeEdit.history, 'edição de campos não escreve histórico');

  // tarefa criada: A Fazer, fora do workflow (opt-in), plano pendente, origem
  const criarItem = db.get(
    'SELECT * FROM suggestion_items WHERE suggestion_id = ? AND target_task_id IS NULL',
    [rid]
  );
  const createdTask = db.get('SELECT * FROM tasks WHERE suggestion_item_id = ?', [criarItem.id]);
  assert.ok(createdTask, 'tarefa criada linkada à proposta');
  assert.strictEqual(createdTask.status, code('tasks.status', 'A Fazer'));
  assert.strictEqual(createdTask.workflow_version_id, null, 'entra no workflow só com opt-in (FR-010)');
  assert.strictEqual(createdTask.contract_id, contractId);
  const plan = db.get('SELECT * FROM execution_plans WHERE task_id = ?', [createdTask.id]);
  assert.ok(plan, 'plano pendente para a tarefa nova (SC-006)');
  assert.strictEqual(plan.status, code('execution_plans.status', 'pendente'));
  const createEntry = db.get(
    `SELECT * FROM task_history WHERE task_id = ? AND action = 'create'`,
    [createdTask.id]
  );
  assert.ok(createEntry, 'criação registrada no histórico, como POST /tasks');
  // remoção/fechamento não existem: nenhum status além dos citados foi gravado
  assert.strictEqual(
    db.get(
      `SELECT COUNT(*) AS c FROM tasks WHERE status NOT IN (${[
        'A Fazer',
        'Em Progresso',
        'Revisão',
        'Concluída',
      ].map((name) => code('tasks.status', name)).join(', ')})`
    ).c,
    0
  );

  // revisão aprovada; conflitos persistem no recurso
  const after = await request(app)
    .get(`/api/contracts/${contractId}/review/${rid}`)
    .set(as(gestorToken));
  assert.strictEqual(after.body.review.status, 'aprovada');
  assert.strictEqual(after.body.review.conflicts.length, 3);

  // FR-017: aplicação registra autor + data da versão
  const hist = History.listVersions(db, 'suggestion', rid);
  assert.strictEqual(hist.length, 1, 'versão aprovada no histórico');
  assert.strictEqual(hist[0].version, 1);
  assert.strictEqual(hist[0].snapshot.status, 'aprovada');
  assert.deepStrictEqual(hist[0].snapshot.applied, { edited: 1, created: 1 });
  assert.strictEqual(hist[0].author_id, gestorId);

  // segunda aplicação → 409
  const again = await request(app)
    .post(`/api/contracts/${contractId}/review/${rid}/apply`)
    .set(as(gestorToken));
  assert.strictEqual(again.status, 409);
  assert.match(again.body.error, /sugerido/);

  // sem propostas → 400, linha intacta
  db.run(
    `INSERT INTO task_suggestions(contract_id, definitions_id, kind, status, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [
      contractId,
      defRow.id,
      code('task_suggestions.kind', 'revisao'),
      code('task_suggestions.status', 'sugerido'),
      gestorId,
    ]
  );
  const emptyRid = db.get('SELECT MAX(id) AS id FROM task_suggestions').id;
  const empty = await request(app)
    .post(`/api/contracts/${contractId}/review/${emptyRid}/apply`)
    .set(as(gestorToken));
  assert.strictEqual(empty.status, 400);
  assert.strictEqual(empty.body.error, 'Review has no proposals');
  assert.strictEqual(TaskSuggestion.find(db, emptyRid).status, 'sugerido');

  // autoridade (x-roles: gestor)
  for (const token of [adminToken, prestadorToken]) {
    const denied = await request(app)
      .post(`/api/contracts/${contractId}/review/${rid}/apply`)
      .set(as(token));
    assert.strictEqual(denied.status, 403);
  }
});

// FR-024: gatilho manual do gestor, sem reanálise automática; fila durante
// análise; retry manual após falha (mesma política de FR-018).
test('FR-024 gatilho manual sem reanálise', async () => {
  const analiseBefore = db.get(
    `SELECT COUNT(*) AS c FROM task_suggestions WHERE kind = ${code('task_suggestions.kind', 'analise')}`
  ).c;
  const defsBefore = db.get('SELECT COUNT(*) AS c FROM contract_definitions').c;

  // gatilho manual → proposta; nada de análise nova (sem reanálise)
  const started = await request(app)
    .post(`/api/contracts/${contractId}/review`)
    .set(as(gestorToken));
  assert.strictEqual(started.status, 202, JSON.stringify(started.body));
  const rid1 = started.body.review.id;
  const review = await waitForReview(rid1, 'sugerido');
  assert.strictEqual(review.proposals.length, 2, 'propostas do job manual');
  assert.strictEqual(
    db.get(
      `SELECT COUNT(*) AS c FROM task_suggestions WHERE kind = ${code(
        'task_suggestions.kind',
        'analise'
      )}`
    ).c,
    analiseBefore,
    'sem nova sugestão de análise'
  );
  assert.strictEqual(
    db.get('SELECT COUNT(*) AS c FROM contract_definitions').c,
    defsBefore,
    'sem nova versão de definições'
  );
  const promptText = fs.readFileSync(captureFile, 'utf8');
  assert.match(promptText, /Não reanalise/, 'instrução de não reanálise no prompt');

  // integração desabilitada → 400
  const disable = await request(app)
    .put('/api/opencode/config')
    .set(as(gestorToken))
    .send({ enabled: false });
  assert.strictEqual(disable.status, 200);
  const disabled = await request(app)
    .post(`/api/contracts/${contractId}/review`)
    .set(as(gestorToken));
  assert.strictEqual(disabled.status, 400);
  assert.strictEqual(disabled.body.error, 'OpenCode integration disabled');
  const enable = await request(app)
    .put('/api/opencode/config')
    .set(as(gestorToken))
    .send({ enabled: true });
  assert.strictEqual(enable.status, 200);

  // revisão em andamento → 409
  process.env.FAKE_OPENCODE_DELAY_MS = '700';
  const running = await request(app)
    .post(`/api/contracts/${contractId}/review`)
    .set(as(gestorToken));
  assert.strictEqual(running.status, 202, JSON.stringify(running.body));
  const rid2 = running.body.review.id;
  const duplicate = await request(app)
    .post(`/api/contracts/${contractId}/review`)
    .set(as(gestorToken));
  assert.strictEqual(duplicate.status, 409);
  assert.strictEqual(duplicate.body.error, 'Review already in progress');
  await waitForReview(rid2, 'sugerido');
  delete process.env.FAKE_OPENCODE_DELAY_MS;

  // fila: revisão durante análise fica pendente e inicia quando ela conclui
  process.env.FAKE_OPENCODE_OUTPUT = ANALYSIS_OUTPUT;
  process.env.FAKE_OPENCODE_DELAY_MS = '600';
  const analysis = await request(app)
    .post(`/api/contracts/${contractId}/analysis`)
    .set(as(gestorToken));
  assert.strictEqual(analysis.status, 202, JSON.stringify(analysis.body));
  const queued = await request(app)
    .post(`/api/contracts/${contractId}/review`)
    .set(as(gestorToken));
  assert.strictEqual(queued.status, 202, JSON.stringify(queued.body));
  assert.strictEqual(
    queued.body.review.status,
    'pendente',
    'revisão durante análise entra na fila'
  );
  const queuedRid = queued.body.review.id;
  // the analysis CLI already captured its env; the queued job must see the
  // review output when the sweep dispatches it after the analysis ends
  process.env.FAKE_OPENCODE_OUTPUT = reviewProposalOutput;
  delete process.env.FAKE_OPENCODE_DELAY_MS;
  await waitForAnalysis('sugerido');
  const queuedReview = await waitForReview(queuedRid, 'sugerido');
  assert.strictEqual(queuedReview.proposals.length, 2, 'fila iniciada após a análise');

  // falha → retry manual → sugestão; retry fora de falha → 409
  process.env.FAKE_OPENCODE_EXIT = '1';
  const failing = await request(app)
    .post(`/api/contracts/${contractId}/review`)
    .set(as(gestorToken));
  assert.strictEqual(failing.status, 202, JSON.stringify(failing.body));
  const rid3 = failing.body.review.id;
  const failed = await waitForReview(rid3, 'falha');
  assert.match(failed.error, /exploded/i, 'erro da CLI exposto em error');
  delete process.env.FAKE_OPENCODE_EXIT;

  const retried = await request(app)
    .post(`/api/contracts/${contractId}/review/${rid3}/retry`)
    .set(as(gestorToken));
  assert.strictEqual(retried.status, 202, JSON.stringify(retried.body));
  assert.strictEqual(retried.headers.location, `/api/contracts/${contractId}/review/${rid3}`);
  const recovered = await waitForReview(rid3, 'sugerido');
  assert.strictEqual(recovered.error, null, 'sucesso limpa a falha');
  assert.strictEqual(recovered.proposals.length, 2);

  const badRetry = await request(app)
    .post(`/api/contracts/${contractId}/review/${rid3}/retry`)
    .set(as(gestorToken));
  assert.strictEqual(badRetry.status, 409);
  assert.match(badRetry.body.error, /failure/i);
});
