'use strict';

// Acceptance stub per plan.md ## Acceptance Test Stubs (RED until T004).

const test = require('node:test');
const assert = require('node:assert');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir();

let db;

const countRows = (taskId) =>
  db.get('SELECT COUNT(*) AS c FROM task_classifications WHERE task_id = ?', [taskId]).c;

test.before(async () => {
  const database = await initTestDb();
  const platform = database.getPlatformDb();
  platform.run("INSERT INTO domains(name, slug) VALUES ('Modelo','modelo')");
  const domain = platform.get("SELECT id FROM domains WHERE slug = 'modelo'");
  db = database.createDomainDb(domain.id);
  db.run(
    "INSERT INTO contracts(name, start_date, forecast_date) VALUES ('C','2026-01-01','2026-12-31')"
  );
  db.run("INSERT INTO tasks(contract_id, title, status) VALUES (1, 'Executada', 'Concluída')");
});

test('FR-003 single current record', async () => {
  // requerido só quando o modelo existe — o stub falha até T004
  const TaskClassification = require('./TaskClassification');

  assert.strictEqual(TaskClassification.getByTask(db, 1), null, 'sem classificação antes da 1ª gravação');

  const first = TaskClassification.upsert(db, {
    task_id: 1,
    state: 'atendido plenamente',
    note: 'primeira leitura',
    classified_by: 10,
  });
  assert.ok(first, 'upsert devolve o registro');
  assert.strictEqual(first.state, 'atendido plenamente');
  assert.strictEqual(countRows(1), 1);

  // reclassificação substitui in place: uma única linha corrente (FR-003)
  const second = TaskClassification.upsert(db, {
    task_id: 1,
    state: 'deficiente (a corrigir)',
    note: 'retrabalho',
    classified_by: 20,
  });
  assert.strictEqual(second.state, 'deficiente (a corrigir)');
  assert.strictEqual(second.classified_by, 20, 'autor da última mudança vence');
  assert.strictEqual(second.note, 'retrabalho');
  assert.strictEqual(countRows(1), 1, 'uma linha por tarefa, sem versões');
  assert.strictEqual(second.id, first.id, 'mesma linha atualizada, não nova versão');
});
