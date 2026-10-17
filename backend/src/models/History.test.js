'use strict';

// 00003 US6: entity_history — FR-017 "Histórico de versões com autor e data".
// Covers the model (append-only, UNIQUE, autor+data) and the writers: save
// definitions, refine, approve/activation, plan regeneration (content archive).

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir();
const { app } = require('../server');
const { getDomainDb } = require('../config/database');
const History = require('./History');
const TaskSuggestion = require('./TaskSuggestion');
const ContractDefinition = require('./ContractDefinition');
const ExecutionPlan = require('./ExecutionPlan');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

const DEFS_A = {
  finalidade: 'Executar a fachada',
  limitacoes: 'Sem andaime depois das 18h',
  alvo: 'Fachada da rua A',
  escopo: 'Pintura e reparos',
  premissas: 'Tinta em estoque',
  entregaveis: 'Relatório fotográfico',
};

let domainId;
let db;
let adminToken;
let gestorToken;
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
      name: 'Teta Histórico',
      adminName: 'Tina',
      adminEmail: 'tina@teta.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201);
  domainId = enabled.body.domain.id;
  db = getDomainDb(domainId);
  adminToken = await login('tina@teta.test', 'Secret1!', domainId);

  const gestor = await request(app)
    .post('/api/v2/users')
    .set(as(adminToken))
    .send({
      name: 'Gil',
      email: 'gil@teta.test',
      password: 'Secret1!',
      role: 'gestor',
      username: 'gil',
    });
  assert.strictEqual(gestor.status, 201, JSON.stringify(gestor.body));
  gestorToken = await login('gil@teta.test', 'Secret1!', domainId);

  const contract = await request(app)
    .post('/api/v2/contracts')
    .set(as(gestorToken))
    .send({ name: 'Obra Histórico', start_date: '2026-01-01', forecast_date: '2026-12-31' });
  assert.strictEqual(contract.status, 201, JSON.stringify(contract.body));
  contractId = contract.body.contract.id;
});

test('FR-017 histórico de versões com autor e data', async () => {
  // --- definitions: each saved version appends author + date -------------
  const put = (body) =>
    request(app)
      .put(`/api/v2/contracts/${contractId}/definitions`)
      .set(as(gestorToken))
      .send(body);
  const first = await put(DEFS_A);
  assert.strictEqual(first.status, 200, JSON.stringify(first.body));
  const second = await put({ ...DEFS_A, finalidade: 'Revisada pela gestão' });
  assert.strictEqual(second.status, 200, JSON.stringify(second.body));

  const v1 = first.body.definitions;
  const v2 = second.body.definitions;
  const defHistV1 = History.listVersions(db, 'definition', v1.id);
  assert.strictEqual(defHistV1.length, 1, 'uma entrada por versão salva');
  assert.strictEqual(defHistV1[0].version, 1);
  assert.strictEqual(defHistV1[0].snapshot.finalidade, DEFS_A.finalidade);
  assert.ok(defHistV1[0].author_id, 'autor registrado');
  assert.strictEqual(defHistV1[0].author_name, 'Gil', 'autor resolvido (FR-017)');
  assert.ok(defHistV1[0].created_at, 'data registrada (FR-017)');

  const defHistV2 = History.listVersions(db, 'definition', v2.id);
  assert.strictEqual(defHistV2.length, 1);
  assert.strictEqual(defHistV2[0].version, 2, 'versão espelha a do contrato');
  assert.strictEqual(defHistV2[0].snapshot.finalidade, 'Revisada pela gestão');

  // --- refine: the new suggestion version gets its author row ------------
  const gestorId = db.get(`SELECT id FROM users WHERE email = 'gil@teta.test'`).id;
  const seeded = TaskSuggestion.createSuggestion(db, {
    contractId,
    definitionsId: v2.id,
    kind: 'analise',
    userId: gestorId,
  });
  TaskSuggestion.markSuggested(db, seeded.id, [
    {
      title: 'Conferir fachada',
      description: 'Vistoria antes da pintura',
      justification: 'Evitar retrabalho',
    },
  ]);
  const refined = TaskSuggestion.refineSuggestion(db, {
    sourceId: seeded.id,
    items: [
      {
        title: 'Conferir fachada com prazo',
        description: 'Vistoria antes da pintura',
        justification: 'Evitar retrabalho',
      },
    ],
    instructions: 'destaque o prazo',
    userId: gestorId,
  });
  assert.ok(refined, 'refino criou a nova versão');
  const refineHist = History.listVersions(db, 'suggestion', refined.id);
  assert.strictEqual(refineHist.length, 1);
  assert.strictEqual(refineHist[0].version, 1);
  assert.strictEqual(refineHist[0].snapshot.status, 'sugerido');
  assert.strictEqual(refineHist[0].snapshot.refined_from, seeded.id);
  assert.strictEqual(refineHist[0].snapshot.instructions, 'destaque o prazo');
  assert.strictEqual(refineHist[0].author_id, gestorId);

  // --- approve/activation appends version 2 of the same suggestion -------
  const approved = await request(app)
    .post(`/api/v2/suggestions/${refined.id}/approve`)
    .set(as(gestorToken));
  assert.strictEqual(approved.status, 201, JSON.stringify(approved.body));
  const approveHist = History.listVersions(db, 'suggestion', refined.id);
  assert.strictEqual(approveHist.length, 2, 'aprovação é a segunda versão (1—N)');
  assert.strictEqual(approveHist[0].version, 2, 'mais recente primeiro');
  assert.strictEqual(approveHist[0].snapshot.status, 'aprovada');
  assert.strictEqual(
    approveHist[0].snapshot.workflow_version_id,
    approved.body.workflow.id
  );
  assert.strictEqual(approveHist[0].author_name, 'Gil');
  assert.strictEqual(approveHist[1].version, 1, 'entrada anterior preservada');

  // --- plan regeneration archives the previous content -------------------
  const planTaskId = approved.body.tasks[0].id;
  ExecutionPlan.upsertPlan(db, {
    taskId: planTaskId,
    plan: { passos: ['Passo A'], criterios: ['Critério A'], riscos: ['Risco A'] },
    requestedBy: gestorId,
  });
  const planRow = ExecutionPlan.getForTask(db, planTaskId);
  assert.strictEqual(
    History.listVersions(db, 'execution_plan', planRow.id).length,
    0,
    'primeira geração não tem conteúdo anterior'
  );
  ExecutionPlan.upsertPlan(db, {
    taskId: planTaskId,
    plan: {
      passos: ['Passo A', 'Passo B'],
      criterios: ['Critério A'],
      riscos: ['Risco A'],
    },
    requestedBy: gestorId,
  });
  const planHist = History.listVersions(db, 'execution_plan', planRow.id);
  assert.strictEqual(planHist.length, 1, 'conteúdo anterior arquivado');
  assert.strictEqual(planHist[0].version, 1);
  assert.deepStrictEqual(planHist[0].snapshot.passos, ['Passo A'], 'versão antiga preservada');
  assert.strictEqual(planHist[0].snapshot.status, 'gerado');
  assert.strictEqual(planHist[0].author_id, gestorId);

  // --- append-only: duplicate version and unknown type are refused -------
  assert.throws(
    () =>
      History.recordVersion(db, {
        entityType: 'definition',
        entityId: v1.id,
        version: 1,
        snapshot: { hacked: true },
        authorId: gestorId,
      }),
    /UNIQUE|constraint/i,
    'versão duplicada bloqueada pelo UNIQUE'
  );
  assert.throws(
    () =>
      History.recordVersion(db, {
        entityType: 'workflow',
        entityId: 1,
        snapshot: {},
        authorId: gestorId,
      }),
    /Unknown entity_type/,
    'entity_type fora do CHECK'
  );
  assert.strictEqual(
    History.listVersions(db, 'definition', 999999).length,
    0,
    'entidade sem histórico → lista vazia'
  );
});
