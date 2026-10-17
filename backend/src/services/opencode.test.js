'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir();

// Fake OpenCode CLI (AD-001 boundary): `node fake.js run <prompt>` echoes a
// canned payload, honours FAKE_OPENCODE_DELAY_MS (timeout tests) and can
// crash (FAKE_OPENCODE_EXIT). The prompt is captured for allowlist checks.
const fakeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-opencode-'));
const fakeCli = path.join(fakeDir, 'fake.js');
const captureFile = path.join(fakeDir, 'prompt.txt');
fs.writeFileSync(
  fakeCli,
  `const fs = require('fs');
if (process.env.FAKE_OPENCODE_CAPTURE) {
  fs.writeFileSync(process.env.FAKE_OPENCODE_CAPTURE, process.argv.slice(3).join(' '));
}
const delay = Number(process.env.FAKE_OPENCODE_DELAY_MS || 0);
setTimeout(() => {
  if (process.env.FAKE_OPENCODE_EXIT) {
    process.stderr.write('opencode exploded');
    process.exit(Number(process.env.FAKE_OPENCODE_EXIT));
  }
  process.stdout.write(process.env.FAKE_OPENCODE_OUTPUT || '');
}, delay);
`
);
process.env.OPENCODE_BIN = 'node';
process.env.OPENCODE_ARGS = fakeCli;

const { app } = require('../server');
const { getDomainDb } = require('../config/database');
const opencode = require('./opencode');
const TaskSuggestion = require('../models/TaskSuggestion');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';

const DEFINITIONS = {
  finalidade: 'Executar a reforma da cobertura',
  limitacoes: 'Sem acesso ao telhado durante chuva',
  alvo: 'Cobertura do bloco B',
  escopo: 'Impermeabilização e calhas',
  premissas: 'Material em estoque na obra',
  entregaveis: 'RGA assinada e fotos finais',
};

const GOOD_OUTPUT = JSON.stringify({
  tasks: [
    {
      title: 'Inspecionar telhado',
      description: 'Vistoria completa antes da impermeabilização',
      justificativa: 'Base precisa estar ímpar para aderência',
    },
    {
      title: 'Aplicar impermeabilizante',
      description: 'Duas demãos cruzadas',
      justificativa: 'Cobertura exposta a chuva forte',
    },
  ],
});

let domainId;
let db;
let gestorToken;
let adminToken;
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

function setFake(env) {
  for (const key of [
    'FAKE_OPENCODE_OUTPUT',
    'FAKE_OPENCODE_DELAY_MS',
    'FAKE_OPENCODE_EXIT',
    'FAKE_OPENCODE_CAPTURE',
  ]) {
    delete process.env[key];
  }
  Object.assign(process.env, env);
}

async function postAnalysis(extra = {}) {
  return request(app)
    .post(`/api/v2/contracts/${contractId}/analysis`)
    .set(as(gestorToken))
    .send(extra.body ?? {});
}

// FR-021: poll the state resource until the job settles (or throw).
async function waitFor(accept, label, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    const res = await request(app)
      .get(`/api/v2/contracts/${contractId}/analysis`)
      .set(as(gestorToken));
    if (res.status === 200) {
      last = res.body.analysis;
      if (accept(last)) return last;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`${label} never reached; last=${JSON.stringify(last)}`);
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
      name: 'Iota OpenCode',
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
    ['Paulo', 'paulo@iota.test', 'prestador'],
  ]) {
    const res = await request(app)
      .post('/api/v2/users')
      .set(as(adminToken))
      .send({ name, email, password: 'Secret1!', role, username: email.split('@')[0] });
    assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  }
  gestorToken = await login('gilda@iota.test', 'Secret1!', domainId);
  prestadorToken = await login('paulo@iota.test', 'Secret1!', domainId);

  const contract = await request(app)
    .post('/api/v2/contracts')
    .set(as(gestorToken))
    .send({
      name: 'Contrato Cobertura',
      object: 'Objeto confidencial nao deve vazar',
      start_date: futureDate(-10),
      forecast_date: futureDate(90),
    });
  assert.strictEqual(contract.status, 201, JSON.stringify(contract.body));
  contractId = contract.body.contract.id;

  const saved = await request(app)
    .put(`/api/v2/contracts/${contractId}/definitions`)
    .set(as(gestorToken))
    .send(DEFINITIONS);
  assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));
});

test.after(() => {
  delete process.env.OPENCODE_BIN;
  delete process.env.OPENCODE_ARGS;
  for (const key of [
    'FAKE_OPENCODE_OUTPUT',
    'FAKE_OPENCODE_DELAY_MS',
    'FAKE_OPENCODE_EXIT',
    'FAKE_OPENCODE_CAPTURE',
  ]) {
    delete process.env[key];
  }
  fs.rmSync(fakeDir, { recursive: true, force: true });
});

test('FR-004 só allowlist', async () => {
  setFake({ FAKE_OPENCODE_OUTPUT: GOOD_OUTPUT, FAKE_OPENCODE_CAPTURE: captureFile });

  const started = await postAnalysis();
  assert.strictEqual(started.status, 202, JSON.stringify(started.body));
  assert.ok(
    ['pendente', 'analisando'].includes(started.body.analysis.status),
    started.body.analysis.status
  );
  assert.strictEqual(started.body.analysis.contract_id, contractId);
  assert.strictEqual(started.body.analysis.definition_version, 1);
  assert.strictEqual(started.body.analysis.items, undefined, 'items só em sugerido/aprovada');

  // client fields are refused — payload is server-built only (FR-004)
  const withFields = await request(app)
    .post(`/api/v2/contracts/${contractId}/analysis`)
    .set(as(gestorToken))
    .send({ instrucoes: 'fazer rápido' });
  assert.strictEqual(withFields.status, 400);
  assert.strictEqual(withFields.body.error, 'Validation failed');

  const settled = await waitFor(
    (state) => state.status === 'sugerido' || state.status === 'falha',
    'sugerido/falha'
  );
  assert.strictEqual(settled.status, 'sugerido', settled.error || '');

  // what actually reached the CLI: allowlist in, everything else out
  const prompt = fs.readFileSync(captureFile, 'utf8');
  assert.ok(prompt.includes(DEFINITIONS.finalidade), 'finalidade enviada');
  assert.ok(prompt.includes(DEFINITIONS.limitacoes), 'limitações enviadas');
  assert.ok(prompt.includes(DEFINITIONS.alvo), 'alvo enviado');
  assert.ok(prompt.includes(DEFINITIONS.escopo), 'escopo enviado');
  assert.ok(prompt.includes(DEFINITIONS.premissas), 'premissas enviadas');
  assert.ok(prompt.includes(DEFINITIONS.entregaveis), 'entregáveis enviados');
  assert.ok(prompt.includes('Contrato Cobertura'), 'identificação enviada');
  assert.ok(prompt.includes('identificacao') && prompt.includes('vigencia'));
  assert.ok(!prompt.includes('Objeto confidencial'), 'objeto fora do payload');
  assert.ok(!prompt.includes('não deve vazar'), 'nada além da allowlist');
});

test('FR-020 sem partes/CNPJ', async () => {
  const context = opencode.buildContext(db, contractId);

  // exactly the 8 allowlist fields — nothing else may exist on the payload
  assert.deepStrictEqual(Object.keys(context).sort(), [
    'alvo',
    'entregaveis',
    'escopo',
    'finalidade',
    'identificacao',
    'limitacoes',
    'premissas',
    'vigencia',
  ]);
  assert.deepStrictEqual(context.identificacao, { nome: 'Contrato Cobertura' });
  assert.deepStrictEqual(context.vigencia, {
    inicio: db.get('SELECT start_date FROM contracts WHERE id = ?', [contractId]).start_date,
    previsao: db.get('SELECT forecast_date FROM contracts WHERE id = ?', [contractId]).forecast_date,
  });
  const serialized = JSON.stringify(context);
  assert.ok(!serialized.includes('object'), 'objeto fora');
  assert.ok(!/cnpj|parte|valor|contato/i.test(serialized), 'nada de partes/CNPJ/valores/contatos');
  assert.ok(!serialized.includes('status'), 'status fora');

  // the server refuses a contract without definitions rather than guessing
  const bare = await request(app)
    .post('/api/v2/contracts')
    .set(as(gestorToken))
    .send({ name: 'Sem definições', start_date: futureDate(1), forecast_date: futureDate(2) });
  assert.strictEqual(bare.status, 201);
  assert.strictEqual(opencode.buildContext(db, bare.body.contract.id), null);
});

test('FR-005 justifica itens', async () => {
  const state = await waitFor((s) => s.status === 'sugerido', 'sugerido');
  assert.strictEqual(state.items.length, 2, JSON.stringify(state.items));
  for (const item of state.items) {
    assert.ok(Number.isInteger(item.id), 'id base para edição');
    assert.ok(item.titulo, 'título por item');
    assert.ok(item.justificativa, 'justificativa por item');
    assert.strictEqual(item.removed, false);
    assert.strictEqual(typeof item.ordem, 'number');
  }
  assert.strictEqual(state.status, 'sugerido');

  // parser: valid payload maps title/description/justificativa
  const parsed = TaskSuggestion.parseSuggestion(GOOD_OUTPUT);
  assert.strictEqual(parsed.length, 2);
  assert.strictEqual(parsed[0].title, 'Inspecionar telhado');
  assert.strictEqual(parsed[0].justification, 'Base precisa estar ímpar para aderência');
  assert.ok(parsed[1].description, 'descrição preservada');

  // parser: anything else is a failure, never a suggestion (FR-006)
  const badCases = [
    ['empty', ''],
    ['whitespace', '   '],
    ['non-json', '<html>erro</html>'],
    ['no tasks', '{"result":[]}'],
    ['empty tasks', '{"tasks":[]}'],
    ['missing justification', '{"tasks":[{"title":"Sem motivo"}]}'],
    ['missing title', '{"tasks":[{"justificativa":"Sem alvo"}]}'],
  ];
  for (const [label, stdout] of badCases) {
    assert.throws(() => TaskSuggestion.parseSuggestion(stdout), undefined, `parse aceitou ${label}`);
  }
  assert.throws(() => TaskSuggestion.parseSuggestion(undefined), undefined);
});

test('FR-006 falha preserva', async () => {
  // crash: non-zero exit → falha with the reason recorded
  setFake({ FAKE_OPENCODE_EXIT: '1' });
  const crashed = await postAnalysis();
  assert.strictEqual(crashed.status, 202, JSON.stringify(crashed.body));
  let state = await waitFor((s) => s.status === 'falha' || s.status === 'sugerido', 'falha');
  assert.strictEqual(state.status, 'falha', 'exit 1 vira falha');
  assert.match(state.error, /exploded|code/i);

  // definitions survive every failure (SC-003)
  const definitions = await request(app)
    .get(`/api/v2/contracts/${contractId}/definitions`)
    .set(as(gestorToken));
  assert.strictEqual(definitions.status, 200, 'falha não apaga definições');
  assert.strictEqual(definitions.body.definitions.finalidade, DEFINITIONS.finalidade);

  // no auto-retry: the state stays `falha` until a manual retry
  await new Promise((resolve) => setTimeout(resolve, 250));
  const still = await request(app)
    .get(`/api/v2/contracts/${contractId}/analysis`)
    .set(as(gestorToken));
  assert.strictEqual(still.body.analysis.status, 'falha');

  // empty response → falha (manual retry re-runs the same row)
  setFake({ FAKE_OPENCODE_OUTPUT: '' });
  const retryEmpty = await request(app)
    .post(`/api/v2/contracts/${contractId}/analysis/retry`)
    .set(as(gestorToken))
    .send();
  assert.strictEqual(retryEmpty.status, 202, JSON.stringify(retryEmpty.body));
  state = await waitFor((s) => s.status === 'falha' || s.status === 'sugerido', 'retry vazio');
  assert.strictEqual(state.status, 'falha', 'resposta vazia vira falha');
  assert.match(state.error, /empty/i);

  // unparseable response → falha
  setFake({ FAKE_OPENCODE_OUTPUT: '{"oops": true' });
  const retryBad = await request(app)
    .post(`/api/v2/contracts/${contractId}/analysis/retry`)
    .set(as(gestorToken))
    .send();
  assert.strictEqual(retryBad.status, 202);
  state = await waitFor((s) => s.status === 'falha' || s.status === 'sugerido', 'retry inválido');
  assert.strictEqual(state.status, 'falha', 'resposta não interpretável vira falha');
  assert.match(state.error, /unparseable/i);

  // items never existed for a failed run
  assert.strictEqual(state.items, undefined);

  // successful manual retry settles on sugerido with items
  setFake({ FAKE_OPENCODE_OUTPUT: GOOD_OUTPUT });
  const retryGood = await request(app)
    .post(`/api/v2/contracts/${contractId}/analysis/retry`)
    .set(as(gestorToken))
    .send();
  assert.strictEqual(retryGood.status, 202, JSON.stringify(retryGood.body));
  state = await waitFor((s) => s.status === 'sugerido' || s.status === 'falha', 'retry bom');
  assert.strictEqual(state.status, 'sugerido', state.error || '');
  assert.strictEqual(state.items.length, 2);

  // retry outside `falha` → 409 (manual-only policy)
  const retrySugerido = await request(app)
    .post(`/api/v2/contracts/${contractId}/analysis/retry`)
    .set(as(gestorToken))
    .send();
  assert.strictEqual(retrySugerido.status, 409);
});

test('FR-018 timeout 60s', async () => {
  // config defaults and read-only allowlist snapshot
  const initial = await request(app).get('/api/v2/opencode/config').set(as(gestorToken));
  assert.strictEqual(initial.status, 200, JSON.stringify(initial.body));
  assert.strictEqual(initial.body.config.enabled, true);
  assert.strictEqual(initial.body.config.timeout_ms, 60000, 'padrão 60000 ms');
  assert.deepStrictEqual(initial.body.config.context_allowlist, [
    'finalidade',
    'limitacoes',
    'alvo',
    'escopo',
    'premissas',
    'entregaveis',
    'identificacao',
    'vigencia',
  ]);

  // só gestor configura; admin edita definições, nunca a integração
  const byAdmin = await request(app)
    .put('/api/v2/opencode/config')
    .set(as(adminToken))
    .send({ enabled: false });
  assert.strictEqual(byAdmin.status, 403);
  const byPrestador = await request(app)
    .put('/api/v2/opencode/config')
    .set(as(prestadorToken))
    .send({ enabled: false });
  assert.strictEqual(byPrestador.status, 403);
  const adminRead = await request(app).get('/api/v2/opencode/config').set(as(adminToken));
  assert.strictEqual(adminRead.status, 200, 'admin lê a configuração');

  // validation: mínimo 1000 ms, ajuste parcial obrigatório
  const tooSmall = await request(app)
    .put('/api/v2/opencode/config')
    .set(as(gestorToken))
    .send({ timeout_ms: 500 });
  assert.strictEqual(tooSmall.status, 400);
  assert.strictEqual(tooSmall.body.error, 'Validation failed');
  const empty = await request(app)
    .put('/api/v2/opencode/config')
    .set(as(gestorToken))
    .send({});
  assert.strictEqual(empty.status, 400);

  // disabled integration refuses to start (FR-018 flag)
  const disabled = await request(app)
    .put('/api/v2/opencode/config')
    .set(as(gestorToken))
    .send({ enabled: false });
  assert.strictEqual(disabled.status, 200);
  assert.strictEqual(disabled.body.config.enabled, false);
  const refused = await postAnalysis();
  assert.strictEqual(refused.status, 400);
  assert.match(refused.body.error, /disabled/i);
  const reenabled = await request(app)
    .put('/api/v2/opencode/config')
    .set(as(gestorToken))
    .send({ enabled: true });
  assert.strictEqual(reenabled.status, 200);

  // configurable timeout: 1000 ms + a 2500 ms CLI → falha by timeout
  const lowered = await request(app)
    .put('/api/v2/opencode/config')
    .set(as(gestorToken))
    .send({ timeout_ms: 1000 });
  assert.strictEqual(lowered.status, 200);
  assert.strictEqual(lowered.body.config.timeout_ms, 1000);

  setFake({ FAKE_OPENCODE_OUTPUT: GOOD_OUTPUT, FAKE_OPENCODE_DELAY_MS: '2500' });
  const slow = await postAnalysis();
  assert.strictEqual(slow.status, 202, JSON.stringify(slow.body));

  // a second request while the job runs answers 409 (one job at a time)
  const concurrent = await postAnalysis();
  assert.strictEqual(concurrent.status, 409);

  const state = await waitFor((s) => s.status === 'falha' || s.status === 'sugerido', 'timeout');
  assert.strictEqual(state.status, 'falha', 'timeout vira falha');
  assert.match(state.error, /timeout/i, state.error);

  // restore defaults for the remaining suite
  setFake({});
  const restored = await request(app)
    .put('/api/v2/opencode/config')
    .set(as(gestorToken))
    .send({ timeout_ms: 60000 });
  assert.strictEqual(restored.status, 200);
  assert.strictEqual(restored.body.config.timeout_ms, 60000);
});

// Acceptance test per plan.md ## Acceptance Test Stubs (T025).
test('FR-014 plano completo', async () => {
  // strict parse: only three non-empty string arrays become a plan
  const plan = opencode.parsePlan(
    JSON.stringify({
      passos: ['Conferir medição', 'Emitir relatório'],
      criterios: ['Gestor confere', 'Relatório aprovado'],
      riscos: ['Atraso', 'Reprovação'],
    })
  );
  assert.deepStrictEqual(plan, {
    passos: ['Conferir medição', 'Emitir relatório'],
    criterios: ['Gestor confere', 'Relatório aprovado'],
    riscos: ['Atraso', 'Reprovação'],
  });

  for (const bad of [
    '',
    'not json',
    '{}',
    JSON.stringify({ passos: [], criterios: ['c'], riscos: ['r'] }),
    JSON.stringify({ passos: ['ok'], criterios: [], riscos: ['r'] }),
    JSON.stringify({ passos: ['ok'], criterios: ['c'], riscos: [] }),
    JSON.stringify({ passos: 'string', criterios: ['c'], riscos: ['r'] }),
    JSON.stringify({ passos: ['ok'], criterios: ['c'], riscos: [42] }),
    JSON.stringify({ passos: ['  '], criterios: ['c'], riscos: ['r'] }),
  ]) {
    assert.throws(() => opencode.parsePlan(bad), /Plan|JSON|Empty/, `rejeita: ${bad}`);
  }

  // requestExecutionPlan: plan payload only, task + allowlist context
  const captureFile = path.join(fakeDir, 'plan-prompt.txt');
  process.env.FAKE_OPENCODE_CAPTURE = captureFile;
  process.env.FAKE_OPENCODE_OUTPUT = JSON.stringify({
    passos: ['Conferir medição', 'Emitir relatório'],
    criterios: ['Gestor confere', 'Relatório aprovado'],
    riscos: ['Atraso', 'Reprovação'],
  });
  const context = opencode.buildContext(db, contractId);
  const task = { title: 'Conferir medição da cobertura', description: 'Comparar medido e projetado', contract_id: contractId };
  const { stdout } = await opencode.requestExecutionPlan(db, task, context);
  delete process.env.FAKE_OPENCODE_CAPTURE;
  assert.deepStrictEqual(opencode.parsePlan(stdout), plan, 'round-trip do plano');

  const promptText = fs.readFileSync(captureFile, 'utf8');
  assert.match(promptText, /Conferir medição da cobertura/, 'tarefa no prompt');
  assert.match(promptText, /"passos"/, 'formato de plano no prompt');
  const contextMatch = promptText.match(/Contexto do contrato \(allowlist do servidor\): (\{.*\})/);
  assert.ok(contextMatch, 'contexto no prompt');
  assert.deepStrictEqual(
    Object.keys(JSON.parse(contextMatch[1])).sort(),
    [
      'alvo',
      'entregaveis',
      'escopo',
      'finalidade',
      'identificacao',
      'limitacoes',
      'premissas',
      'vigencia',
    ],
    'só campos da allowlist (FR-004/FR-020)'
  );

  // contract without definitions cannot produce a plan prompt
  assert.strictEqual(opencode.buildContext(db, 999999), null);
});
