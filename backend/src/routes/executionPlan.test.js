'use strict';

// 00003 US5: plano de execução por tarefa (FR-014/FR-015/FR-019).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir();
const { app } = require('../server');
const { getDomainDb } = require('../config/database');
const ContractDefinition = require('../models/ContractDefinition');
const TaskSuggestion = require('../models/TaskSuggestion');

// Fake OpenCode CLI: plan payloads only (the analysis fake lives in the
// suggestion/service tests — this file drives generation through HTTP).
const fakeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-opencode-plan-'));
const fakeCli = path.join(fakeDir, 'fake.js');
fs.writeFileSync(
  fakeCli,
  `if (process.env.FAKE_OPENCODE_EXIT) {
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
process.env.FAKE_OPENCODE_OUTPUT = JSON.stringify({
  passos: ['Conferir medição', 'Emitir relatório'],
  criterios: ['Medição conferida pelo gestor', 'Relatório aprovado'],
  riscos: ['Atraso de fornecedor', 'Reprovacao da medição'],
});

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

let domainId;
let db;
let adminToken;
let gestorToken;
let prestadorToken;
let contractId;
let suggestionId;
let planTaskIds = [];
let manualTaskId = null;

function as(token) {
  return { Authorization: `Bearer ${token}` };
}

function futureDate(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

async function login(email, password, domId) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password, domainId: domId });
  assert.strictEqual(res.status, 200, `${email}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

// Poll GET /api/tasks/:id/execution-plan until the expected status (FR-021
// polling pattern applied to the plan resource).
async function waitForPlan(taskId, status, token, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    const res = await request(app)
      .get(`/api/tasks/${taskId}/execution-plan`)
      .set(as(token || gestorToken));
    if (res.status === 200) {
      last = res.body.plan;
      if (last && last.status === status) return last;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`plan never reached ${status}; last=${JSON.stringify(last)}`);
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
      name: 'Lambda Plano',
      adminName: 'Lia',
      adminEmail: 'lia@lambda.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201);
  domainId = enabled.body.domain.id;
  db = getDomainDb(domainId);
  adminToken = await login('lia@lambda.test', 'Secret1!', domainId);

  for (const [name, email, role] of [
    ['Milo', 'milo@lambda.test', 'gestor'],
    ['Nara', 'nara@lambda.test', 'prestador'],
  ]) {
    const res = await request(app)
      .post('/api/users')
      .set(as(adminToken))
      .send({ name, email, password: 'Secret1!', role, username: email.split('@')[0] });
    assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  }
  gestorToken = await login('milo@lambda.test', 'Secret1!', domainId);
  prestadorToken = await login('nara@lambda.test', 'Secret1!', domainId);

  const contract = await request(app)
    .post('/api/contracts')
    .set(as(gestorToken))
    .send({ name: 'Obra Plano', start_date: futureDate(-2), forecast_date: futureDate(45) });
  assert.strictEqual(contract.status, 201, JSON.stringify(contract.body));
  contractId = contract.body.contract.id;

  const definitions = await request(app)
    .put(`/api/contracts/${contractId}/definitions`)
    .set(as(gestorToken))
    .send({
      finalidade: 'Executar a reforma',
      limitacoes: 'Área restrita',
      alvo: 'Bloco B',
      escopo: 'Fachada',
      premissas: 'Projeto aprovado',
      entregaveis: 'Termo de aceite',
    });
  assert.strictEqual(definitions.status, 200, JSON.stringify(definitions.body));

  const linked = await request(app)
    .post(`/api/contracts/${contractId}/prestadores`)
    .set(as(gestorToken))
    .send({ user_id: db.get(`SELECT id FROM users WHERE email = 'nara@lambda.test'`).id });
  assert.strictEqual(linked.status, 201, JSON.stringify(linked.body));

  // seeded suggestion → approval creates the pendente plan shells (FR-015)
  const definitionsRow = ContractDefinition.latest(db, contractId);
  const seeded = TaskSuggestion.createSuggestion(db, {
    contractId,
    definitionsId: definitionsRow.id,
    kind: 'analise',
    userId: db.get(`SELECT id FROM users WHERE email = 'milo@lambda.test'`).id,
  });
  TaskSuggestion.markSuggested(db, seeded.id, [
    {
      title: 'Conferir medição da reforma',
      description: 'Comparar medido e projetado',
      justification: 'Evita pagamento indevido',
    },
    {
      title: 'Emitir relatório de obra',
      description: null,
      justification: 'Rastreabilidade da execução',
    },
  ]);
  suggestionId = seeded.id;

  const approved = await request(app)
    .post(`/api/suggestions/${suggestionId}/approve`)
    .set(as(gestorToken));
  assert.strictEqual(approved.status, 201, JSON.stringify(approved.body));
  planTaskIds = approved.body.tasks.map((task) => task.id);

  // FR-015: first task goes to the linked prestador (plan visibility rules)
  const assigned = await request(app)
    .put(`/api/tasks/${planTaskIds[0]}`)
    .set(as(gestorToken))
    .send({ assignee_id: db.get(`SELECT id FROM users WHERE email = 'nara@lambda.test'`).id });
  assert.strictEqual(assigned.status, 200, JSON.stringify(assigned.body));

  // manual task (no suggestion lineage) for the null/failure paths
  const manual = await request(app)
    .post(`/api/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Tarefa manual sem sugestão', description: 'Criada pelo gestor' });
  assert.strictEqual(manual.status, 201, JSON.stringify(manual.body));
  manualTaskId = manual.body.task.id;
});

test.after(() => {
  for (const key of [
    'OPENCODE_BIN',
    'OPENCODE_ARGS',
    'FAKE_OPENCODE_OUTPUT',
    'FAKE_OPENCODE_DELAY_MS',
    'FAKE_OPENCODE_EXIT',
  ]) {
    delete process.env[key];
  }
  fs.rmSync(fakeDir, { recursive: true, force: true });
});

// Acceptance test per plan.md ## Acceptance Test Stubs (T026).
test('FR-015 plano não bloqueia', async () => {
  // --- activation queued shells without running anything (FR-015) ---
  const activeRow = db.get('SELECT workflow_version_id FROM tasks WHERE id = ?', [planTaskIds[0]]);
  assert.ok(activeRow.workflow_version_id, 'ativação materializou a tarefa');
  for (const id of planTaskIds) {
    const row = db.get('SELECT status, error FROM execution_plans WHERE task_id = ?', [id]);
    assert.ok(row, `shell pendente criado na ativação para ${id}`);
    assert.strictEqual(row.status, 'pendente');
    assert.strictEqual(row.error, null);
  }

  const queued = await request(app)
    .get(`/api/tasks/${planTaskIds[1]}/execution-plan`)
    .set(as(gestorToken));
  assert.strictEqual(queued.status, 200);
  assert.strictEqual(queued.body.plan.status, 'pendente');
  assert.strictEqual(queued.body.plan.passos, undefined, 'sem passos antes da geração');
  assert.strictEqual(
    queued.body.plan.suggestion_version,
    suggestionId,
    'versão da sugestão materializadora (FR-014)'
  );

  const activatedTask = await request(app)
    .get(`/api/tasks/${planTaskIds[1]}`)
    .set(as(gestorToken));
  assert.strictEqual(activatedTask.body.task.status, 'A Fazer', 'ativação não avança status');

  // task without a plan yet → plan: null (openapi getExecutionPlan)
  const withoutPlan = await request(app)
    .get(`/api/tasks/${manualTaskId}/execution-plan`)
    .set(as(gestorToken));
  assert.strictEqual(withoutPlan.status, 200);
  assert.strictEqual(withoutPlan.body.plan, null);

  // --- visibility and authority (FR-019, openapi x-roles) ---
  assert.strictEqual(
    (await request(app).get(`/api/tasks/${planTaskIds[1]}/execution-plan`)).status,
    401,
    'sem token → 401'
  );
  assert.strictEqual(
    (await request(app).get(`/api/tasks/${planTaskIds[1]}/execution-plan`).set(as(adminToken)))
      .status,
    403,
    'admin fora do x-roles do GET → 403'
  );
  assert.strictEqual(
    (
      await request(app)
        .get(`/api/tasks/${planTaskIds[0]}/execution-plan`)
        .set(as(prestadorToken))
    ).status,
    200,
    'prestador vê a própria tarefa'
  );
  assert.strictEqual(
    (
      await request(app)
        .get(`/api/tasks/${planTaskIds[1]}/execution-plan`)
        .set(as(prestadorToken))
    ).status,
    404,
    'prestador em tarefa alheia → 404'
  );
  for (const token of [adminToken, prestadorToken]) {
    const post = await request(app)
      .post(`/api/tasks/${manualTaskId}/execution-plan`)
      .set(as(token));
    assert.strictEqual(post.status, 403, 'só gestor dispara geração (FR-019)');
  }
  assert.strictEqual(
    (
      await request(app)
        .post('/api/tasks/999999/execution-plan')
        .set(as(gestorToken))
    ).status,
    404,
    'tarefa fantasma → 404'
  );

  // --- generation: 202 + Location, poll → gerado, task untouched (FR-016) ---
  const accepted = await request(app)
    .post(`/api/tasks/${planTaskIds[1]}/execution-plan`)
    .set(as(gestorToken));
  assert.strictEqual(accepted.status, 202, JSON.stringify(accepted.body));
  assert.strictEqual(
    accepted.headers.location,
    `/api/tasks/${planTaskIds[1]}/execution-plan`
  );
  assert.strictEqual(accepted.body.plan.status, 'pendente');
  const generated = await waitForPlan(planTaskIds[1], 'gerado');
  assert.ok(generated.passos.length > 0, 'passos gerados');
  assert.ok(generated.criterios.length > 0, 'critérios gerados');
  assert.ok(generated.riscos.length > 0, 'riscos gerados');
  assert.strictEqual(generated.erro, null);
  const afterGeneration = await request(app)
    .get(`/api/tasks/${planTaskIds[1]}`)
    .set(as(gestorToken));
  assert.strictEqual(
    afterGeneration.body.task.status,
    'A Fazer',
    'geração não altera o status da tarefa (FR-016)'
  );

  // --- running job answers 409 on a repeat POST and on regenerate ---
  process.env.FAKE_OPENCODE_DELAY_MS = '1500';
  const running = await request(app)
    .post(`/api/tasks/${planTaskIds[0]}/execution-plan`)
    .set(as(gestorToken));
  assert.strictEqual(running.status, 202, JSON.stringify(running.body));
  const duplicate = await request(app)
    .post(`/api/tasks/${planTaskIds[0]}/execution-plan`)
    .set(as(gestorToken));
  assert.strictEqual(duplicate.status, 409, 'geração já em andamento → 409');
  const runningRegenerate = await request(app)
    .post(`/api/tasks/${planTaskIds[0]}/execution-plan/regenerate`)
    .set(as(gestorToken));
  assert.strictEqual(runningRegenerate.status, 409, 'regenerate durante execução → 409');
  await waitForPlan(planTaskIds[0], 'gerado');
  delete process.env.FAKE_OPENCODE_DELAY_MS;

  // regenerate on a healthy plan → 409 (only after falha)
  const regenerateHealthy = await request(app)
    .post(`/api/tasks/${planTaskIds[0]}/execution-plan/regenerate`)
    .set(as(gestorToken));
  assert.strictEqual(regenerateHealthy.status, 409);
  assert.match(regenerateHealthy.body.error, /failure/i);

  // --- disabled integration → 400, no job dispatched ---
  const disable = await request(app)
    .put('/api/opencode/config')
    .set(as(gestorToken))
    .send({ enabled: false });
  assert.strictEqual(disable.status, 200, JSON.stringify(disable.body));
  const disabledPost = await request(app)
    .post(`/api/tasks/${manualTaskId}/execution-plan`)
    .set(as(gestorToken));
  assert.strictEqual(disabledPost.status, 400);
  assert.strictEqual(disabledPost.body.error, 'OpenCode integration disabled');
  const disabledRegenerate = await request(app)
    .post(`/api/tasks/${planTaskIds[1]}/execution-plan/regenerate`)
    .set(as(gestorToken));
  assert.strictEqual(disabledRegenerate.status, 400, 'disabled checado antes do estado');
  const enable = await request(app)
    .put('/api/opencode/config')
    .set(as(gestorToken))
    .send({ enabled: true });
  assert.strictEqual(enable.status, 200);

  // --- failure on the manual task → falha → regenerate → gerado ---
  process.env.FAKE_OPENCODE_EXIT = '1';
  const failing = await request(app)
    .post(`/api/tasks/${manualTaskId}/execution-plan`)
    .set(as(gestorToken));
  assert.strictEqual(failing.status, 202);
  const failed = await waitForPlan(manualTaskId, 'falha');
  assert.match(failed.erro, /exploded/i, 'erro da CLI exposto em `erro`');
  delete process.env.FAKE_OPENCODE_EXIT;

  const regenerated = await request(app)
    .post(`/api/tasks/${manualTaskId}/execution-plan/regenerate`)
    .set(as(gestorToken));
  assert.strictEqual(regenerated.status, 202, JSON.stringify(regenerated.body));
  const recovered = await waitForPlan(manualTaskId, 'gerado');
  assert.strictEqual(recovered.erro, null, 'sucesso limpa a falha');
  assert.strictEqual(recovered.suggestion_version, null, 'tarefa manual sem sugestão');
});
