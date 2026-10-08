'use strict';

// FR-014/FR-016: execution plans. One row per task (task_id UNIQUE); plan
// writes never touch tasks, task_history or task_photos (FR-016) — content
// lands in `execution_plans` and the previous content is archived to
// entity_history (data-model: conteúdo anterior). State: pendente → gerado |
// falha, falha → pendente on regeneration.

const History = require('./History');

// openapi ExecutionPlan: JSON columns become arrays, `error` serializes as
// `erro`, and `suggestion_version` resolves the suggestion version that
// materialized the task (null for manual tasks).
function safeParse(value) {
  if (value == null) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function serialize(db, row, task = null) {
  if (!row) return null;
  const parse = safeParse;
  let suggestionVersion = null;
  if (task && task.suggestion_item_id) {
    const item = db.get('SELECT suggestion_id FROM suggestion_items WHERE id = ?', [
      task.suggestion_item_id,
    ]);
    suggestionVersion = item ? item.suggestion_id : null;
  }
  const out = {
    id: row.id,
    task_id: row.task_id,
    suggestion_version: suggestionVersion,
    status: row.status,
    erro: row.error ?? null,
    created_at: row.created_at,
  };
  for (const key of ['passos', 'criterios', 'riscos']) {
    const parsed = parse(row[key]);
    if (parsed) out[key] = parsed;
  }
  return out;
}

function getForTask(db, taskId) {
  return db.get('SELECT * FROM execution_plans WHERE task_id = ?', [Number(taskId)]);
}

// The approval materialization creates shells; ensureRow covers tasks that
// reach the endpoint without one (created before the workflow, FR-015).
// INSERT OR IGNORE keeps task_id UNIQUE — an existing row is never reset.
function ensureRow(db, taskId, userId = null) {
  db.run(
    `INSERT OR IGNORE INTO execution_plans(task_id, status, requested_by) VALUES (?, 'pendente', ?)`,
    [Number(taskId), userId]
  );
  return getForTask(db, taskId);
}

// FR-014/FR-016: generation result lands only in execution_plans — content
// replaces the previous JSON, status flips to `gerado`, error clears. When a
// previous generation exists, its content is archived to entity_history first
// (FR-017 / data-model: conteúdo anterior vai para entity_history).
function upsertPlan(db, { taskId, plan, requestedBy = null }) {
  const previous = ensureRow(db, taskId, requestedBy);
  if (previous && previous.passos) {
    History.recordVersion(db, {
      entityType: 'execution_plan',
      entityId: previous.id,
      snapshot: {
        status: previous.status,
        passos: safeParse(previous.passos),
        criterios: safeParse(previous.criterios),
        riscos: safeParse(previous.riscos),
      },
      authorId: requestedBy ?? previous.requested_by ?? null,
    });
  }
  db.run(
    `UPDATE execution_plans
        SET status = 'gerado', passos = ?, criterios = ?, riscos = ?, error = NULL,
            requested_by = COALESCE(?, requested_by), updated_at = datetime('now')
      WHERE task_id = ?`,
    [
      JSON.stringify(plan.passos),
      JSON.stringify(plan.criterios),
      JSON.stringify(plan.riscos),
      requestedBy,
      Number(taskId),
    ]
  );
  return getForTask(db, taskId);
}

function markFalha(db, taskId, error) {
  db.run(
    `UPDATE execution_plans
        SET status = 'falha', error = ?, updated_at = datetime('now')
      WHERE task_id = ?`,
    [String(error).slice(0, 1000), Number(taskId)]
  );
  return getForTask(db, taskId);
}

// falha → pendente: regeneration re-queues the SAME row (FR-015).
function requeue(db, taskId) {
  db.run(
    `UPDATE execution_plans
        SET status = 'pendente', error = NULL, updated_at = datetime('now')
      WHERE task_id = ? AND status = 'falha'`,
    [Number(taskId)]
  );
  return getForTask(db, taskId);
}

module.exports = {
  serialize,
  getForTask,
  ensureRow,
  upsertPlan,
  markFalha,
  requeue,
};
