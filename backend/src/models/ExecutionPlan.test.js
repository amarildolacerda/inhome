'use strict';

// 00003 US5: modelo do plano de execução — escrita isolada (FR-016).

const test = require('node:test');
const assert = require('node:assert');
const { setupDataDir, initTestDb } = require('../support/testenv');

const dataDir = setupDataDir();
const database = require('../config/database');
const ExecutionPlan = require('./ExecutionPlan');
const { code } = require('../config/enums');

let db;
let taskId;

test.before(async () => {
  await initTestDb();
  const platform = database.getPlatformDb();
  platform.run('INSERT INTO domains(name, slug) VALUES (?, ?)', ['ExecPlan', 'exec-plan']);
  const domain = platform.get('SELECT id FROM domains WHERE slug = ?', ['exec-plan']);
  db = database.createDomainDb(domain.id);

  db.run(
    `INSERT INTO contracts(name, start_date, forecast_date) VALUES ('Obra Exec', '2026-01-01', '2026-12-31')`
  );
  db.run(`INSERT INTO tasks(contract_id, title, status) VALUES (1, 'Tarefa do plano', ?)`, [
    code('tasks.status', 'A Fazer'),
  ]);
  taskId = db.get('SELECT id FROM tasks WHERE title = ?', ['Tarefa do plano']).id;
});

// Acceptance test per plan.md ## Acceptance Test Stubs (T027).
test('FR-016 não altera status', async () => {
  // everything FR-016 protects: status flow, completion, photos, history
  const snapshot = () => ({
    task: db.get(
      'SELECT status, completed_text, completed_at, completed_by, assignee_id, priority, updated_at FROM tasks WHERE id = ?',
      [taskId]
    ),
    history: db.get('SELECT COUNT(*) AS c FROM task_history').c,
    photos: db.get('SELECT COUNT(*) AS c FROM task_photos').c,
  });
  const before = snapshot();
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM execution_plans').c, 0);

  // shell creation touches only execution_plans
  const shell = ExecutionPlan.ensureRow(db, taskId, null);
  assert.strictEqual(shell.status, 'pendente');
  assert.strictEqual(shell.task_id, taskId);
  assert.deepStrictEqual(snapshot(), before, 'shell pendente não toca a tarefa');

  // upsert: one row per task, content replaced, still no task writes
  const first = ExecutionPlan.upsertPlan(db, {
    taskId,
    plan: { passos: ['Passo um'], criterios: ['Critério um'], riscos: ['Risco um'] },
    requestedBy: null,
  });
  assert.strictEqual(first.status, 'gerado');
  const second = ExecutionPlan.upsertPlan(db, {
    taskId,
    plan: {
      passos: ['Passo um', 'Passo dois'],
      criterios: ['Critério renovado'],
      riscos: ['Risco renovado'],
    },
    requestedBy: null,
  });
  assert.strictEqual(second.status, 'gerado');
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM execution_plans').c, 1, 'task_id UNIQUE');
  const stored = db.get('SELECT passos FROM execution_plans WHERE task_id = ?', [taskId]);
  assert.deepStrictEqual(JSON.parse(stored.passos), ['Passo um', 'Passo dois']);
  assert.deepStrictEqual(snapshot(), before, 'geração não altera status/conclusão/fotos/histórico');

  // failure and requeue stay inside execution_plans as well
  ExecutionPlan.markFalha(db, taskId, 'CLI exploded');
  const failed = ExecutionPlan.getForTask(db, taskId);
  assert.strictEqual(failed.status, 'falha');
  assert.strictEqual(failed.error, 'CLI exploded');
  assert.deepStrictEqual(snapshot(), before);

  ExecutionPlan.requeue(db, taskId);
  const requeued = ExecutionPlan.getForTask(db, taskId);
  assert.strictEqual(requeued.status, 'pendente');
  assert.strictEqual(requeued.error, null);
  assert.deepStrictEqual(snapshot(), before, 'requeue devolve só o plano a pendente');

  // wire shape: arrays parsed, `erro` mapping, null suggestion_version (manual task)
  const taskRow = db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  const wire = ExecutionPlan.serialize(db, requeued, taskRow);
  assert.strictEqual(wire.id, requeued.id);
  assert.strictEqual(wire.task_id, taskId);
  assert.strictEqual(wire.status, 'pendente');
  assert.strictEqual(wire.erro, null);
  assert.strictEqual(wire.suggestion_version, null, 'tarefa manual sem versão de sugestão');
  assert.ok(wire.created_at);
  assert.strictEqual(wire.error, undefined, 'campo do wire é erro, não error');
  assert.deepStrictEqual(wire.passos, ['Passo um', 'Passo dois']);
  assert.deepStrictEqual(wire.criterios, ['Critério renovado']);
  assert.deepStrictEqual(wire.riscos, ['Risco renovado']);
  assert.strictEqual(ExecutionPlan.serialize(db, null), null);
});
