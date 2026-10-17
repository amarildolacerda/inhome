'use strict';

// 00003 US4: workflow ativo, opt-in e visibilidade por papel (FR-010..FR-013).

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir();
const { app } = require('../server');
const { getDomainDb } = require('../config/database');
const { code } = require('../config/enums');
const ContractDefinition = require('../models/ContractDefinition');
const TaskSuggestion = require('../models/TaskSuggestion');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

const DEFINITIONS = {
  finalidade: 'Executar a obra do galpão',
  limitacoes: 'Sem acesso à área técnica',
  alvo: 'Galpão 2',
  escopo: 'Estrutura e cobertura',
  premissas: 'Projeto aprovado',
  entregaveis: 'Relatório final',
};

let domainId;
let db;
let adminToken;
let gestorToken;
let prestadorToken;
let forasteiroToken;
let contractId;
let otherContractId;
let suggestionId;
let manualTaskId;
let materializedTaskIds = [];

function as(token) {
  return { Authorization: `Bearer ${token}` };
}

function futureDate(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

async function login(email, password, domId) {
  const res = await request(app)
    .post('/api/v2/auth/login')
    .send({ email, password, domainId: domId });
  assert.strictEqual(res.status, 200, `${email}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

// Fixture seeded through the model (no CLI here — the approval flow itself is
// covered in suggestions.test.js; US4 starts from an approved suggestion).
async function approveSeededSuggestion() {
  const approved = await request(app)
    .post(`/api/v2/suggestions/${suggestionId}/approve`)
    .set(as(gestorToken));
  assert.strictEqual(approved.status, 201, JSON.stringify(approved.body));
  materializedTaskIds = approved.body.tasks.map((task) => task.id);
  return approved.body;
}

test.before(async () => {
  await initTestDb();

  const sys = await request(app)
    .post('/api/v2/auth/login')
    .send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200);

  const enabled = await request(app)
    .post('/api/v2/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Iota Workflow',
      adminName: 'Ivo',
      adminEmail: 'ivo@iota.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201);
  domainId = enabled.body.domain.id;
  db = getDomainDb(domainId);
  adminToken = await login('ivo@iota.test', 'Secret1!', domainId);

  for (const [name, email, role] of [
    ['Gilda', 'gilda@iota.test', 'gestor'],
    ['Pedro', 'pedro@iota.test', 'prestador'],
    ['Fora', 'fora@iota.test', 'prestador'],
  ]) {
    const res = await request(app)
      .post('/api/v2/users')
      .set(as(adminToken))
      .send({ name, email, password: 'Secret1!', role, username: email.split('@')[0] });
    assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  }
  gestorToken = await login('gilda@iota.test', 'Secret1!', domainId);
  prestadorToken = await login('pedro@iota.test', 'Secret1!', domainId);
  forasteiroToken = await login('fora@iota.test', 'Secret1!', domainId);

  const contract = await request(app)
    .post('/api/v2/contracts')
    .set(as(gestorToken))
    .send({ name: 'Obra Workflow', start_date: futureDate(-3), forecast_date: futureDate(60) });
  assert.strictEqual(contract.status, 201, JSON.stringify(contract.body));
  contractId = contract.body.contract.id;

  const definitions = await request(app)
    .put(`/api/v2/contracts/${contractId}/definitions`)
    .set(as(gestorToken))
    .send(DEFINITIONS);
  assert.strictEqual(definitions.status, 200, JSON.stringify(definitions.body));

  const linked = await request(app)
    .post(`/api/v2/contracts/${contractId}/providers`)
    .set(as(gestorToken))
    .send({ user_id: db.get(`SELECT id FROM users WHERE email = 'pedro@iota.test'`).id });
  assert.strictEqual(linked.status, 201, JSON.stringify(linked.body));

  // seeded suggestion in `sugerido` (model path, no OpenCode in this file)
  const definitionsRow = ContractDefinition.latest(db, contractId);
  const seeded = TaskSuggestion.createSuggestion(db, {
    contractId,
    definitionsId: definitionsRow.id,
    kind: 'analise',
    userId: db.get(`SELECT id FROM users WHERE email = 'gilda@iota.test'`).id,
  });
  TaskSuggestion.markSuggested(db, seeded.id, [
    {
      title: 'Conferir medição da obra',
      description: 'Comparar medido e projetado',
      justification: 'Evita pagamento indevido',
    },
    {
      title: 'Emitir relatório semanal',
      description: null,
      justification: 'Rastreabilidade da execução',
    },
  ]);
  suggestionId = seeded.id;

  // manual task created OUTSIDE any list (FR-010 opt-in target)
  const manual = await request(app)
    .post(`/api/v2/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Tarefa manual fora da lista' });
  assert.strictEqual(manual.status, 201, JSON.stringify(manual.body));
  manualTaskId = manual.body.task.id;
});

test('FR-010 vira workflow', async () => {
  // approval turns the kept items into the official list (AD-003)
  const approved = await approveSeededSuggestion();
  assert.strictEqual(approved.workflow.status, 'ativo');
  assert.strictEqual(approved.tasks.length, 2);

  // materialized tasks carry the workflow links; the manual task stays out
  const materialized = db.get(
    'SELECT COUNT(*) AS c FROM tasks WHERE contract_id = ? AND workflow_version_id IS NOT NULL',
    [contractId]
  );
  assert.strictEqual(materialized.c, 2);
  const manual = db.get('SELECT * FROM tasks WHERE id = ?', [manualTaskId]);
  assert.strictEqual(manual.workflow_version_id, null, 'tarefa manual fora da lista');
  assert.strictEqual(manual.opt_in_at, null);

  // opt-in joins the list and records who confirmed and when (FR-010)
  const active = db.get(
    `SELECT id FROM workflow_versions WHERE contract_id = ? AND status = ${code(
      'workflow_versions.status',
      'ativo'
    )}`,
    [contractId]
  );
  const gestorId = db.get(`SELECT id FROM users WHERE email = 'gilda@iota.test'`).id;
  const opted = await request(app)
    .post(`/api/v2/contracts/${contractId}/workflow/tasks/${manualTaskId}/opt-in`)
    .set(as(gestorToken));
  assert.strictEqual(opted.status, 200, JSON.stringify(opted.body));
  assert.strictEqual(opted.body.task.id, manualTaskId);
  assert.strictEqual(opted.body.task.in_workflow, true);
  const afterOpt = db.get('SELECT * FROM tasks WHERE id = ?', [manualTaskId]);
  assert.strictEqual(afterOpt.workflow_version_id, active.id, 'vinculada à versão ativa');
  assert.strictEqual(afterOpt.opt_in_by, gestorId);
  assert.ok(afterOpt.opt_in_at, 'opt_in_at registrado');

  // already opted → 409; already materialized → 409
  const repeat = await request(app)
    .post(`/api/v2/contracts/${contractId}/workflow/tasks/${manualTaskId}/opt-in`)
    .set(as(gestorToken));
  assert.strictEqual(repeat.status, 409, JSON.stringify(repeat.body));
  const materializedOpt = await request(app)
    .post(
      `/api/v2/contracts/${contractId}/workflow/tasks/${materializedTaskIds[0]}/opt-in`
    )
    .set(as(gestorToken));
  assert.strictEqual(materializedOpt.status, 409, JSON.stringify(materializedOpt.body));

  // another contract: task outside the path contract → 400
  const other = await request(app)
    .post('/api/v2/contracts')
    .set(as(gestorToken))
    .send({ name: 'Obra Sem Workflow', start_date: futureDate(-1), forecast_date: futureDate(30) });
  assert.strictEqual(other.status, 201, JSON.stringify(other.body));
  otherContractId = other.body.contract.id;
  const otherTask = await request(app)
    .post(`/api/v2/contracts/${otherContractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Tarefa de outra obra' });
  assert.strictEqual(otherTask.status, 201, JSON.stringify(otherTask.body));

  const wrongContract = await request(app)
    .post(
      `/api/v2/contracts/${other.body.contract.id}/workflow/tasks/${manualTaskId}/opt-in`
    )
    .set(as(gestorToken));
  assert.strictEqual(wrongContract.status, 400, JSON.stringify(wrongContract.body));
  assert.strictEqual(wrongContract.body.error, 'Task does not belong to this contract');

  // contract never approved → nothing to join (FR-010)
  const noWorkflow = await request(app)
    .post(
      `/api/v2/contracts/${other.body.contract.id}/workflow/tasks/${otherTask.body.task.id}/opt-in`
    )
    .set(as(gestorToken));
  assert.strictEqual(noWorkflow.status, 400, JSON.stringify(noWorkflow.body));
  assert.strictEqual(noWorkflow.body.error, 'No active workflow for this contract');

  // FR-019/FR-007: only gestor confirms the opt-in
  assert.strictEqual(
    (await request(app)
      .post(`/api/v2/contracts/${contractId}/workflow/tasks/${otherTask.body.task.id}/opt-in`)
      .set(as(adminToken))).status,
    403
  );
  assert.strictEqual(
    (await request(app)
      .post(`/api/v2/contracts/${contractId}/workflow/tasks/${otherTask.body.task.id}/opt-in`)
      .set(as(prestadorToken))).status,
    403
  );
  assert.strictEqual(
    (await request(app)
      .post(`/api/v2/contracts/${contractId}/workflow/tasks/${otherTask.body.task.id}/opt-in`)).status,
    401
  );

  // 404: ghost contract and ghost task
  assert.strictEqual(
    (await request(app)
      .post('/api/v2/contracts/999999/workflow/tasks/1/opt-in')
      .set(as(gestorToken))).status,
    404
  );
  assert.strictEqual(
    (await request(app)
      .post(`/api/v2/contracts/${contractId}/workflow/tasks/999999/opt-in`)
      .set(as(gestorToken))).status,
    404
  );
});

test('FR-011 fluxo preservado', async () => {
  const pedroId = db.get(`SELECT id FROM users WHERE email = 'pedro@iota.test'`).id;

  // a manual task created AFTER the approval stays outside the list flag
  const manual2 = await request(app)
    .post(`/api/v2/contracts/${contractId}/tasks`)
    .set(as(gestorToken))
    .send({ title: 'Nova manual sem opt-in' });
  assert.strictEqual(manual2.status, 201, JSON.stringify(manual2.body));

  // list carries the real task flow plus `in_workflow` (FR-011/FR-010)
  const list = await request(app)
    .get('/api/v2/tasks')
    .query({ contract_id: contractId })
    .set(as(gestorToken));
  assert.strictEqual(list.status, 200, JSON.stringify(list.body));
  const byId = new Map(list.body.tasks.map((task) => [task.id, task]));
  for (const id of materializedTaskIds) {
    const task = byId.get(id);
    assert.ok(task, `tarefa materializada ${id} aparece na lista`);
    assert.strictEqual(task.in_workflow, true);
    assert.ok(task.workflow_version_id, 'vínculo com a versão preservado');
    assert.ok(task.suggestion_item_id, 'origem na sugestão preservada');
    assert.strictEqual(task.status, 'A Fazer', 'fluxo começa no estado padrão');
  }
  assert.strictEqual(byId.get(manualTaskId).in_workflow, true, 'manual já optada conta como lista');
  assert.strictEqual(byId.get(manual2.body.task.id).in_workflow, false, 'manual sem opt-in fora');

  // status flow over a materialized task: assign → prestador moves it
  const task = materializedTaskIds[0];
  const assigned = await request(app)
    .put(`/api/v2/tasks/${task}`)
    .set(as(gestorToken))
    .send({ assignee_id: pedroId });
  assert.strictEqual(assigned.status, 200, JSON.stringify(assigned.body));

  const moved = await request(app)
    .patch(`/api/v2/tasks/${task}/status`)
    .set(as(prestadorToken))
    .send({ status: 'Em Progresso' });
  assert.strictEqual(moved.status, 200, JSON.stringify(moved.body));
  assert.strictEqual(moved.body.task.status, 'Em Progresso');

  // FR-011 invariants: the move touched ONLY status/history — links, plan
  // and photos stay exactly as materialized (FR-016 cross-check)
  const row = db.get('SELECT * FROM tasks WHERE id = ?', [task]);
  assert.strictEqual(row.status, code('tasks.status', 'Em Progresso'));
  assert.ok(row.workflow_version_id, 'status update não derruba o vínculo');
  assert.ok(row.suggestion_item_id, 'status update não derruba a origem');
  const history = db.get(
    `SELECT COUNT(*) AS c FROM task_history WHERE task_id = ? AND action = 'status'`,
    [task]
  );
  assert.ok(history.c >= 1, 'transição registrada no histórico');
  const plan = db.get('SELECT status FROM execution_plans WHERE task_id = ?', [task]);
  assert.strictEqual(plan.status, code('execution_plans.status', 'pendente'), 'plano intocado pelo fluxo de status');
  const photos = db.get('SELECT COUNT(*) AS c FROM task_photos WHERE task_id = ?', [task]);
  assert.strictEqual(photos.c, 0);

  // the existing invalid-flow refusal still applies to materialized tasks
  const skipped = await request(app)
    .patch(`/api/v2/tasks/${task}/status`)
    .set(as(prestadorToken))
    .send({ status: 'Concluída' });
  assert.strictEqual(skipped.status, 400, JSON.stringify(skipped.body));
});

test('FR-013 só aprovadas', async () => {
  // gestor: active version + every contract task with the in_workflow flag
  const gestorView = await request(app)
    .get(`/api/v2/contracts/${contractId}/workflow`)
    .set(as(gestorToken));
  assert.strictEqual(gestorView.status, 200, JSON.stringify(gestorView.body));
  assert.strictEqual(gestorView.body.workflow.status, 'ativo');
  assert.strictEqual(gestorView.body.workflow.suggestion_id, suggestionId);
  const flags = new Map(gestorView.body.tasks.map((task) => [task.id, task.in_workflow]));
  for (const id of materializedTaskIds) assert.strictEqual(flags.get(id), true);
  assert.strictEqual(flags.get(manualTaskId), true, 'manual optada conta como lista');
  const unlisted = gestorView.body.tasks.find((task) => task.title === 'Nova manual sem opt-in');
  assert.ok(unlisted, 'gestor vê também tarefas fora da lista');
  assert.strictEqual(unlisted.in_workflow, false);

  // admin: same full view (FR-011/FR-013 — nunca sugestões, só tarefas)
  const adminView = await request(app)
    .get(`/api/v2/contracts/${contractId}/workflow`)
    .set(as(adminToken));
  assert.strictEqual(adminView.status, 200);
  assert.strictEqual(adminView.body.tasks.length, gestorView.body.tasks.length);

  // prestador vinculado: ONLY the approved list — no unlisted task, no suggestions
  const prestadorView = await request(app)
    .get(`/api/v2/contracts/${contractId}/workflow`)
    .set(as(prestadorToken));
  assert.strictEqual(prestadorView.status, 200, JSON.stringify(prestadorView.body));
  assert.strictEqual(prestadorView.body.workflow.status, 'ativo');
  assert.ok(prestadorView.body.tasks.length >= 3, 'materializadas + manual optada');
  assert.ok(
    prestadorView.body.tasks.every((task) => task.in_workflow === true),
    'prestador vê só tarefas da lista aprovada'
  );
  assert.ok(
    !prestadorView.body.tasks.some((task) => task.id === unlisted.id),
    'tarefa fora da lista não aparece para o prestador'
  );

  // prestador NÃO vinculado ao contrato → 404 (FR-013)
  const forasteiro = await request(app)
    .get(`/api/v2/contracts/${contractId}/workflow`)
    .set(as(forasteiroToken));
  assert.strictEqual(forasteiro.status, 404, JSON.stringify(forasteiro.body));

  // contrato nunca aprovado: workflow null, tasks still listed for gestor
  const neverApproved = await request(app)
    .get(`/api/v2/contracts/${otherContractId}/workflow`)
    .set(as(gestorToken));
  assert.strictEqual(neverApproved.status, 200, JSON.stringify(neverApproved.body));
  assert.strictEqual(neverApproved.body.workflow, null);
  assert.strictEqual(neverApproved.body.tasks.length, 1);
  assert.strictEqual(neverApproved.body.tasks[0].in_workflow, false);

  // 401 sem token; contrato inexistente → 404
  assert.strictEqual(
    (await request(app).get(`/api/v2/contracts/${contractId}/workflow`)).status,
    401
  );
  assert.strictEqual(
    (await request(app).get('/api/v2/contracts/999999/workflow').set(as(gestorToken))).status,
    404
  );
});
