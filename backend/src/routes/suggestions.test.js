'use strict';

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
const { code } = require('../config/enums');
const suggestionsRouter = require('./suggestions');

// Fake OpenCode CLI: echoes a valid suggestion payload so the analysis job
// seeded by FR-003 lands on `sugerido` for the US3 tests (FR-007..FR-009).
const fakeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-opencode-sug-'));
const fakeCli = path.join(fakeDir, 'fake.js');
fs.writeFileSync(
  fakeCli,
  `const prompt = process.argv[3] || '';
if (process.env.FAKE_OPENCODE_CAPTURE) {
  require('fs').appendFileSync(process.env.FAKE_OPENCODE_CAPTURE, prompt + '\\n---\\n');
}
process.stdout.write(process.env.FAKE_OPENCODE_OUTPUT || '');
`
);
process.env.OPENCODE_BIN = 'node';
process.env.OPENCODE_ARGS = fakeCli;

const GOOD_OUTPUT = JSON.stringify({
  tasks: [
    {
      title: 'Conferir medição mensal',
      description: 'Comparar medido e projetado',
      justificativa: 'Evita pagamento indevido',
    },
    {
      title: 'Emitir relatório semanal',
      description: 'Relatório de progresso',
      justificativa: 'Rastreabilidade da execução',
    },
  ],
});
process.env.FAKE_OPENCODE_OUTPUT = GOOD_OUTPUT;

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

const DEFINITIONS = {
  finalidade: 'Executar a manutenção predial',
  limitacoes: 'Áreas comuns só após as 20h',
  alvo: 'Bloco 1',
  escopo: 'Pintura e elétrica',
  premissas: 'Acesso liberado pela administração',
  entregaveis: 'Laudo de execução',
};

let domainId;
let db;
let adminToken;
let gestorToken;
let prestadorToken;
let contractId;

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

// FR-021 state resource used as the fixture loader for US3: waits until the
// seeded analysis job settles on the expected status.
async function waitFor(status, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    const res = await request(app)
      .get(`/api/v2/contracts/${contractId}/analysis`)
      .set(as(gestorToken));
    if (res.status === 200) {
      last = res.body.analysis;
      if (last.status === status) return last;
      if (last.status === 'falha') {
        throw new Error(`analysis failed: ${last.error}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`analysis never reached ${status}; last=${JSON.stringify(last)}`);
}

test.after(() => {
  for (const key of [
    'OPENCODE_BIN',
    'OPENCODE_ARGS',
    'FAKE_OPENCODE_OUTPUT',
    'FAKE_OPENCODE_CAPTURE',
  ]) {
    delete process.env[key];
  }
  fs.rmSync(fakeDir, { recursive: true, force: true });
});

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
      name: 'Theta Sugestões',
      adminName: 'Tereza',
      adminEmail: 'tereza@theta.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(enabled.status, 201);
  domainId = enabled.body.domain.id;
  db = getDomainDb(domainId);
  adminToken = await login('tereza@theta.test', 'Secret1!', domainId);

  for (const [name, email, role] of [
    ['Rita', 'rita@theta.test', 'gestor'],
    ['Saulo', 'saulo@theta.test', 'prestador'],
  ]) {
    const res = await request(app)
      .post('/api/v2/users')
      .set(as(adminToken))
      .send({ name, email, password: 'Secret1!', role, username: email.split('@')[0] });
    assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  }
  gestorToken = await login('rita@theta.test', 'Secret1!', domainId);
  prestadorToken = await login('saulo@theta.test', 'Secret1!', domainId);

  const contract = await request(app)
    .post('/api/v2/contracts')
    .set(as(gestorToken))
    .send({ name: 'Obra Sugestões', start_date: futureDate(-3), forecast_date: futureDate(45) });
  assert.strictEqual(contract.status, 201, JSON.stringify(contract.body));
  contractId = contract.body.contract.id;
});

test('FR-003 bloqueia análise', async () => {
  // sem definições salvas: 400 com a lista completa do que falta (FR-003)
  const blocked = await request(app)
    .post(`/api/v2/contracts/${contractId}/analysis`)
    .set(as(gestorToken))
    .send({});
  assert.strictEqual(blocked.status, 400, JSON.stringify(blocked.body));
  assert.strictEqual(blocked.body.error, 'Missing required definitions');
  assert.deepStrictEqual(
    [...blocked.body.missing].sort(),
    ['alvo', 'entregaveis', 'escopo', 'finalidade', 'limitacoes', 'premissas'].sort()
  );

  // o contrato segue sem definições — nada foi gravado pela tentativa
  const stillMissing = await request(app)
    .get(`/api/v2/contracts/${contractId}/definitions`)
    .set(as(gestorToken));
  assert.strictEqual(stillMissing.status, 404);

  // só gestor dispara geração (FR-019: admin edita definições, não gera)
  const byAdmin = await request(app)
    .post(`/api/v2/contracts/${contractId}/analysis`)
    .set(as(adminToken))
    .send({});
  assert.strictEqual(byAdmin.status, 403);
  const byPrestador = await request(app)
    .post(`/api/v2/contracts/${contractId}/analysis`)
    .set(as(prestadorToken))
    .send({});
  assert.strictEqual(byPrestador.status, 403);
  const noToken = await request(app).post(`/api/v2/contracts/${contractId}/analysis`).send({});
  assert.strictEqual(noToken.status, 401);

  // contrato inexistente (ou de outro domínio) → 404 antes da checagem
  const ghost = await request(app)
    .post('/api/v2/contracts/999999/analysis')
    .set(as(gestorToken))
    .send({});
  assert.strictEqual(ghost.status, 404);

  // helper unitário: completo = lista vazia; ausente = as 6 definições
  assert.deepStrictEqual(suggestionsRouter.assertDefinitionsComplete(db, contractId), [
    'finalidade',
    'limitacoes',
    'alvo',
    'escopo',
    'premissas',
    'entregaveis',
  ]);

  // com definições salvas o gate libera (a partir daqui o pipeline assume)
  const saved = await request(app)
    .put(`/api/v2/contracts/${contractId}/definitions`)
    .set(as(gestorToken))
    .send(DEFINITIONS);
  assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));
  assert.deepStrictEqual(suggestionsRouter.assertDefinitionsComplete(db, contractId), []);

  const allowed = await request(app)
    .post(`/api/v2/contracts/${contractId}/analysis`)
    .set(as(gestorToken))
    .send({});
  assert.notStrictEqual(
    allowed.status,
    400,
    'com definições o 400 de FR-003 não dispara mais'
  );
  assert.strictEqual(allowed.status === 400 ? allowed.body.missing : undefined, undefined);
});

// Acceptance stub per plan.md ## Acceptance Test Stubs (RED until T016).
test('FR-007 edita/remove', async () => {
  const state = await waitFor('sugerido');
  const sid = state.suggestion_id;

  // detail carries the item ids that base every edit (FR-007)
  const detail = await request(app)
    .get(`/api/v2/suggestions/${sid}`)
    .set(as(gestorToken));
  assert.strictEqual(detail.status, 200, JSON.stringify(detail.body));
  assert.strictEqual(detail.body.suggestion.id, sid);
  assert.strictEqual(detail.body.suggestion.items.length, 2);
  const [first, second] = detail.body.suggestion.items;

  // edit title + justification
  const edited = await request(app)
    .patch(`/api/v2/suggestions/${sid}/items/${first.id}`)
    .set(as(gestorToken))
    .send({
      titulo: 'Conferir medição mensal conferida',
      justificativa: 'Evita pagamento indevido em dobro',
    });
  assert.strictEqual(edited.status, 200, JSON.stringify(edited.body));
  assert.strictEqual(edited.body.item.titulo, 'Conferir medição mensal conferida');
  assert.strictEqual(edited.body.item.justificativa, 'Evita pagamento indevido em dobro');
  assert.strictEqual(edited.body.item.id, first.id);
  assert.strictEqual(edited.body.item.ordem, first.ordem);

  // removal is item state — there is no DELETE (FR-007)
  const removed = await request(app)
    .patch(`/api/v2/suggestions/${sid}/items/${second.id}`)
    .set(as(gestorToken))
    .send({ removed: true });
  assert.strictEqual(removed.status, 200, JSON.stringify(removed.body));
  assert.strictEqual(removed.body.item.removed, true);

  // and the same boolean undoes it (state, not deletion)
  const undone = await request(app)
    .patch(`/api/v2/suggestions/${sid}/items/${second.id}`)
    .set(as(gestorToken))
    .send({ removed: false });
  assert.strictEqual(undone.status, 200);
  assert.strictEqual(undone.body.item.removed, false);

  // 409 while the suggestion is not `sugerido` (state forced for the check)
  db.run('UPDATE task_suggestions SET status = ? WHERE id = ?', [code('task_suggestions.status', 'pendente'), sid]);
  const notEditable = await request(app)
    .patch(`/api/v2/suggestions/${sid}/items/${first.id}`)
    .set(as(gestorToken))
    .send({ titulo: 'Não deve entrar' });
  assert.strictEqual(notEditable.status, 409, JSON.stringify(notEditable.body));
  db.run('UPDATE task_suggestions SET status = ? WHERE id = ?', [code('task_suggestions.status', 'sugerido'), sid]);

  // 400: empty body and blank title are validation failures
  const empty = await request(app)
    .patch(`/api/v2/suggestions/${sid}/items/${first.id}`)
    .set(as(gestorToken))
    .send({});
  assert.strictEqual(empty.status, 400, JSON.stringify(empty.body));
  assert.strictEqual(empty.body.error, 'Validation failed');
  const blank = await request(app)
    .patch(`/api/v2/suggestions/${sid}/items/${first.id}`)
    .set(as(gestorToken))
    .send({ titulo: '   ' });
  assert.strictEqual(blank.status, 400);
  assert.strictEqual(blank.body.error, 'Validation failed');

  // FR-007/FR-019: only gestor edits — admin and prestador are refused
  assert.strictEqual(
    (await request(app)
      .patch(`/api/v2/suggestions/${sid}/items/${first.id}`)
      .set(as(adminToken))
      .send({ titulo: 'Admin não edita' })).status,
    403
  );
  assert.strictEqual(
    (await request(app)
      .patch(`/api/v2/suggestions/${sid}/items/${first.id}`)
      .set(as(prestadorToken))
      .send({ titulo: 'Prestador não edita' })).status,
    403
  );
  assert.strictEqual(
    (await request(app)
      .patch(`/api/v2/suggestions/${sid}/items/${first.id}`)
      .send({ titulo: 'Sem token' })).status,
    401
  );

  // 404: suggestion or item outside the domain scope
  assert.strictEqual(
    (await request(app)
      .patch('/api/v2/suggestions/999999/items/1')
      .set(as(gestorToken))
      .send({ titulo: 'Fantasma' })).status,
    404
  );
  assert.strictEqual(
    (await request(app)
      .patch(`/api/v2/suggestions/${sid}/items/999999`)
      .set(as(gestorToken))
      .send({ titulo: 'Fantasma' })).status,
    404
  );
});

// Acceptance stub per plan.md ## Acceptance Test Stubs (RED until T017).
test('FR-008 refino versiona', async () => {
  const state = await waitFor('sugerido');
  const sid = state.suggestion_id;

  const before = await request(app)
    .get(`/api/v2/suggestions/${sid}`)
    .set(as(gestorToken));
  assert.strictEqual(before.status, 200, JSON.stringify(before.body));
  assert.strictEqual(before.body.suggestion.items.length, 2);

  // capture the CLI prompt: instructions must reach OpenCode (CHK008)
  const captureFile = path.join(fakeDir, 'refine-prompt.txt');
  process.env.FAKE_OPENCODE_CAPTURE = captureFile;

  const refined = await request(app)
    .post(`/api/v2/suggestions/${sid}/refine`)
    .set(as(gestorToken))
    .send({ instrucoes: 'Inclua inspeção de rachaduras no relatório' });
  delete process.env.FAKE_OPENCODE_CAPTURE;
  assert.strictEqual(refined.status, 201, JSON.stringify(refined.body));

  const created = refined.body.suggestion;
  assert.notStrictEqual(created.id, sid, 'refino cria nova versão');
  assert.strictEqual(created.refinamento_de, sid, 'refinamento_de aponta a anterior');
  assert.strictEqual(created.status, 'sugerido');
  assert.strictEqual(
    created.definition_version,
    before.body.suggestion.definition_version,
    'mesma versão de definições da origem'
  );
  assert.strictEqual(created.items.length, 2, 'itens vêm do run refinado');

  // the prompt carried the gestor instructions and the previous kept items
  const promptText = fs.readFileSync(captureFile, 'utf8');
  assert.match(promptText, /Inclua inspeção de rachaduras no relatório/);
  assert.match(promptText, /Itens da versão anterior/);

  // previous version survives untouched — same items, same edit from FR-007
  const old = await request(app)
    .get(`/api/v2/suggestions/${sid}`)
    .set(as(gestorToken));
  assert.strictEqual(old.status, 200, 'versão anterior segue consultável');
  assert.strictEqual(old.body.suggestion.items.length, 2);
  assert.strictEqual(
    old.body.suggestion.items[0].titulo,
    'Conferir medição mensal conferida',
    'a versão anterior nunca recebe UPDATE (FR-008)'
  );

  // 400: instructions are required and may not be blank
  const missing = await request(app)
    .post(`/api/v2/suggestions/${sid}/refine`)
    .set(as(gestorToken))
    .send({});
  assert.strictEqual(missing.status, 400, JSON.stringify(missing.body));
  assert.strictEqual(missing.body.error, 'Validation failed');
  const blank = await request(app)
    .post(`/api/v2/suggestions/${sid}/refine`)
    .set(as(gestorToken))
    .send({ instrucoes: '   ' });
  assert.strictEqual(blank.status, 400);

  // FR-019: only gestor refines; ghost sid is a 404
  assert.strictEqual(
    (await request(app)
      .post(`/api/v2/suggestions/${sid}/refine`)
      .set(as(adminToken))
      .send({ instrucoes: 'Admin não refina' })).status,
    403
  );
  assert.strictEqual(
    (await request(app)
      .post('/api/v2/suggestions/999999/refine')
      .set(as(gestorToken))
      .send({ instrucoes: 'Fantasma' })).status,
    404
  );

  // 409: only a `sugerido` version may be refined (state forced for the check)
  db.run('UPDATE task_suggestions SET status = ? WHERE id = ?', [
      code('task_suggestions.status', 'pendente'),
      created.id,
    ]);
  const notRefinable = await request(app)
    .post(`/api/v2/suggestions/${created.id}/refine`)
    .set(as(gestorToken))
    .send({ instrucoes: 'Não deve refinar' });
  assert.strictEqual(notRefinable.status, 409, JSON.stringify(notRefinable.body));
  db.run('UPDATE task_suggestions SET status = ? WHERE id = ?', [
      code('task_suggestions.status', 'sugerido'),
      created.id,
    ]);
});

// T040 (openapi listSuggestions, contracts/openapi.yaml:309): the contract
// declares GET /api/v2/contracts/:id/suggestions but no route served it (404).
test('FR-017 lista versões da sugestão', async () => {
  // 200: original + refined version, newest first, with their items so every
  // version's content stays consultable (FR-008/FR-017)
  const list = await request(app)
    .get(`/api/v2/contracts/${contractId}/suggestions`)
    .set(as(gestorToken));
  assert.strictEqual(list.status, 200, JSON.stringify(list.body));
  assert.ok(Array.isArray(list.body.suggestions), 'resposta traz a lista suggestions');
  assert.strictEqual(list.body.suggestions.length, 2, 'original + versão refinada');

  const [newest, oldest] = list.body.suggestions;
  assert.ok(newest.id > oldest.id, 'mais recente primeiro (CHK007)');
  assert.strictEqual(newest.refinamento_de, oldest.id, 'refino aponta a versão anterior');
  assert.strictEqual(newest.contract_id, contractId);
  assert.strictEqual(oldest.contract_id, contractId);
  assert.strictEqual(newest.status, 'sugerido');
  assert.strictEqual(oldest.status, 'sugerido');
  assert.strictEqual(newest.definition_version, 1, 'mesma versão de definições');
  assert.strictEqual(newest.erro, null);
  assert.strictEqual(typeof newest.created_at, 'string');
  assert.strictEqual(typeof oldest.created_by, 'number');

  // items ride along: the older version keeps the FR-007 edit untouched
  assert.strictEqual(newest.items.length, 2);
  assert.strictEqual(oldest.items.length, 2);
  assert.strictEqual(
    oldest.items[0].titulo,
    'Conferir medição mensal conferida',
    'a versão anterior preserva a edição (FR-008)'
  );
  assert.strictEqual(typeof oldest.items[0].ordem, 'number');
  assert.ok(
    oldest.items[0].ordem <= oldest.items[1].ordem,
    'itens vêm ordenados por ordem'
  );
  assert.strictEqual(typeof oldest.items[0].justificativa, 'string');

  // 200 with an empty list before any analysis (CHK005)
  const fresh = await request(app)
    .post('/api/v2/contracts')
    .set(as(gestorToken))
    .send({ name: 'Sem análise', start_date: futureDate(-1), forecast_date: futureDate(30) });
  assert.strictEqual(fresh.status, 201, JSON.stringify(fresh.body));
  const empty = await request(app)
    .get(`/api/v2/contracts/${fresh.body.contract.id}/suggestions`)
    .set(as(gestorToken));
  assert.strictEqual(empty.status, 200, JSON.stringify(empty.body));
  assert.deepStrictEqual(empty.body.suggestions, []);

  // FR-019: only gestor lists — admin and prestador get 403, no token 401
  assert.strictEqual(
    (await request(app).get(`/api/v2/contracts/${contractId}/suggestions`).set(as(adminToken))).status,
    403
  );
  assert.strictEqual(
    (await request(app).get(`/api/v2/contracts/${contractId}/suggestions`).set(as(prestadorToken)))
      .status,
    403
  );
  assert.strictEqual(
    (await request(app).get(`/api/v2/contracts/${contractId}/suggestions`)).status,
    401
  );

  // unknown contract → 404 before any listing
  const ghost = await request(app)
    .get('/api/v2/contracts/999999/suggestions')
    .set(as(gestorToken));
  assert.strictEqual(ghost.status, 404);
  assert.strictEqual(ghost.body.error, 'Contract not found');

  // domain isolation: contract ids are per-domain, so an id that exists only
  // in domain B answers 404 for domain A's gestor (positive control: B reads it)
  const sys = await request(app)
    .post('/api/v2/auth/login')
    .send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200);
  const zeta = await request(app)
    .post('/api/v2/domains/enable')
    .set(as(sys.body.token))
    .send({
      name: 'Zeta Sugestões',
      adminName: 'Zeca',
      adminEmail: 'zeca@zeta.test',
      adminPassword: 'Secret1!',
    });
  assert.strictEqual(zeta.status, 201, JSON.stringify(zeta.body));
  const zetaAdmin = await login('zeca@zeta.test', 'Secret1!', zeta.body.domain.id);

  // three contracts so domain B owns id 3 — above domain A's max id (2)
  for (let i = 0; i < 3; i += 1) {
    const created = await request(app)
      .post('/api/v2/contracts')
      .set(as(zetaAdmin))
      .send({ name: `Zeta ${i}`, start_date: futureDate(-1), forecast_date: futureDate(30) });
    assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  }
  const zetaUser = await request(app)
    .post('/api/v2/users')
    .set(as(zetaAdmin))
    .send({
      name: 'Gisela',
      email: 'gisela@zeta.test',
      password: 'Secret1!',
      role: 'gestor',
      username: 'gisela',
    });
  assert.strictEqual(zetaUser.status, 201, JSON.stringify(zetaUser.body));
  const zetaGestor = await login('gisela@zeta.test', 'Secret1!', zeta.body.domain.id);

  const foreign = await request(app)
    .get('/api/v2/contracts/3/suggestions')
    .set(as(gestorToken));
  assert.strictEqual(foreign.status, 404, 'domínio A não enxerga o id 3 do domínio B');
  const owned = await request(app)
    .get('/api/v2/contracts/3/suggestions')
    .set(as(zetaGestor));
  assert.strictEqual(owned.status, 200, JSON.stringify(owned.body));
  assert.deepStrictEqual(owned.body.suggestions, [], 'controle positivo: B lê o próprio id 3');
});

// Acceptance stub per plan.md ## Acceptance Test Stubs (RED until T018).
test('FR-009 exige ≥1 item', async () => {
  const state = await waitFor('sugerido');
  const sid = state.suggestion_id;

  const gestorId = db.get(`SELECT id FROM users WHERE email = 'rita@theta.test'`).id;

  // strip every kept item → approval must refuse the empty list (FR-009)
  const detail = await request(app)
    .get(`/api/v2/suggestions/${sid}`)
    .set(as(gestorToken));
  assert.strictEqual(detail.status, 200, JSON.stringify(detail.body));
  for (const item of detail.body.suggestion.items.filter((entry) => !entry.removed)) {
    const marked = await request(app)
      .patch(`/api/v2/suggestions/${sid}/items/${item.id}`)
      .set(as(gestorToken))
      .send({ removed: true });
    assert.strictEqual(marked.status, 200, JSON.stringify(marked.body));
  }

  const empty = await request(app)
    .post(`/api/v2/suggestions/${sid}/approve`)
    .set(as(gestorToken));
  assert.strictEqual(empty.status, 400, JSON.stringify(empty.body));
  assert.strictEqual(empty.body.error, 'Approval requires at least one kept item');
  // nothing was materialized by the refused approval
  assert.strictEqual(
    db.get('SELECT COUNT(*) AS c FROM workflow_versions').c,
    0,
    'nenhuma versão de workflow sem item'
  );
  assert.strictEqual(
    db.get(`SELECT status FROM task_suggestions WHERE id = ?`, [sid]).status,
    code('task_suggestions.status', 'sugerido'),
    'sugestão segue sugestível'
  );

  // keep one item → approval materializes the workflow (FR-010/AD-003)
  const restore = await request(app)
    .patch(`/api/v2/suggestions/${sid}/items/${detail.body.suggestion.items[0].id}`)
    .set(as(gestorToken))
    .send({ removed: false });
  assert.strictEqual(restore.status, 200, JSON.stringify(restore.body));

  const approved = await request(app)
    .post(`/api/v2/suggestions/${sid}/approve`)
    .set(as(gestorToken));
  assert.strictEqual(approved.status, 201, JSON.stringify(approved.body));
  assert.strictEqual(approved.body.workflow.status, 'ativo');
  assert.strictEqual(approved.body.workflow.contract_id, contractId);
  assert.strictEqual(approved.body.workflow.suggestion_id, sid);
  assert.strictEqual(approved.body.workflow.created_by, gestorId);
  assert.strictEqual(approved.body.tasks.length, 1, 'só os itens mantidos viram tarefas');
  const [materialized] = approved.body.tasks;
  assert.strictEqual(materialized.status, 'A Fazer');
  assert.strictEqual(materialized.in_workflow, true);
  assert.strictEqual(materialized.contract_id, contractId);

  // database invariants: version active, plans pending, suggestion approved
  assert.strictEqual(
    db.get(
      `SELECT COUNT(*) AS c FROM workflow_versions WHERE status = ${code(
        'workflow_versions.status',
        'ativo'
      )}`
    ).c,
    1
  );
  assert.strictEqual(
    db.get(`SELECT status FROM task_suggestions WHERE id = ?`, [sid]).status,
    code('task_suggestions.status', 'aprovada')
  );
  const linked = db.get(
    'SELECT COUNT(*) AS c FROM tasks WHERE workflow_version_id IS NOT NULL AND suggestion_item_id IS NOT NULL'
  );
  assert.strictEqual(linked.c, 1);
  const plans = db.get(
    `SELECT COUNT(*) AS c FROM execution_plans ep
       JOIN tasks t ON t.id = ep.task_id
      WHERE t.workflow_version_id IS NOT NULL AND ep.status = ${code(
        'execution_plans.status',
        'pendente'
      )}`
  );
  assert.strictEqual(plans.c, 1, 'FR-014: plano pendente nasce junto da tarefa');

  // 409: an approved suggestion cannot be approved again
  const again = await request(app)
    .post(`/api/v2/suggestions/${sid}/approve`)
    .set(as(gestorToken));
  assert.strictEqual(again.status, 409, JSON.stringify(again.body));

  // FR-007/FR-019: only gestor approves
  assert.strictEqual(
    (await request(app).post(`/api/v2/suggestions/${sid}/approve`).set(as(adminToken))).status,
    403
  );
  assert.strictEqual(
    (await request(app)
      .post(`/api/v2/suggestions/${sid}/approve`)
      .set(as(prestadorToken))).status,
    403
  );
  assert.strictEqual(
    (await request(app).post(`/api/v2/suggestions/${sid}/approve`)).status,
    401
  );
  assert.strictEqual(
    (await request(app).post('/api/v2/suggestions/999999/approve').set(as(gestorToken))).status,
    404
  );

  // FR-010: approving the ORIGINAL version replaces the active workflow
  const originalSid = db.get('SELECT refined_from FROM task_suggestions WHERE id = ?', [sid])
    .refined_from;
  const replaced = await request(app)
    .post(`/api/v2/suggestions/${originalSid}/approve`)
    .set(as(gestorToken));
  assert.strictEqual(replaced.status, 201, JSON.stringify(replaced.body));
  assert.strictEqual(replaced.body.workflow.status, 'ativo');
  assert.ok(replaced.body.workflow.id > approved.body.workflow.id, 'versão nova substitui a anterior');
  assert.strictEqual(replaced.body.tasks.length, 2, 'versão original tinha 2 itens mantidos');

  const versions = db.all('SELECT status FROM workflow_versions ORDER BY id');
  assert.deepStrictEqual(
    versions.map((row) => row.status),
    [code('workflow_versions.status', 'substituido'), code('workflow_versions.status', 'ativo')],
    'uma única versão ativa por contrato'
  );
  assert.strictEqual(
    db.get('SELECT COUNT(*) AS c FROM tasks WHERE workflow_version_id IS NOT NULL').c,
    3,
    'tarefas das versões anteriores mantêm o vínculo'
  );
});
