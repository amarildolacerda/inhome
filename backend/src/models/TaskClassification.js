'use strict';

// E011 FR-002/FR-003 — classificação corrente de tarefa executada: exatamente
// uma linha por tarefa (UNIQUE(task_id)); reclassificação substitui in place
// (upsert ON CONFLICT), autor e data da última mudança vencem. Os três
// literais de estado são o mesmo domínio do CHECK em migrateSchema — a rota
// valida antes de escrever (400 sem escrita, FR-002).

function getByTask(db, taskId) {
  return db.get('SELECT * FROM task_classifications WHERE task_id = ?', [Number(taskId)]) || null;
}

function upsert(db, { task_id, state, note, classified_by }) {
  db.run(
    `INSERT INTO task_classifications(task_id, state, note, classified_by, classified_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(task_id) DO UPDATE SET
       state = excluded.state,
       note = excluded.note,
       classified_by = excluded.classified_by,
       classified_at = excluded.classified_at`,
    [Number(task_id), state, note ?? null, classified_by]
  );
  return getByTask(db, task_id);
}

module.exports = { upsert, getByTask };
