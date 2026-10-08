'use strict';

// AD-002/AD-006: task suggestion versions. Rows are append-only — refinements
// create a new version pointing at the previous one through refined_from, and
// the previous row is never updated (FR-008).

const History = require('./History');

const SELECT_SUGGESTION = `
  SELECT s.*, d.version AS definition_version
    FROM task_suggestions s
    LEFT JOIN contract_definitions d ON d.id = s.definitions_id`;

// openapi TaskSuggestion: DB `error` serializes as `erro`, `refined_from` as
// `refinamento_de`, `definitions_id` resolves to `definition_version`.
function serialize(row, items) {
  if (!row) return null;
  const out = {
    id: row.id,
    contract_id: row.contract_id,
    definition_version: row.definition_version ?? null,
    status: row.status,
    erro: row.error ?? null,
    refinamento_de: row.refined_from ?? null,
    created_by: row.created_by ?? null,
    created_at: row.created_at,
  };
  if (items) out.items = items;
  return out;
}

// openapi SuggestionItem: `title/description/justification` columns surface as
// `titulo/descricao/justificativa`, `removed` as boolean.
function serializeItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    suggestion_id: row.suggestion_id,
    titulo: row.title,
    descricao: row.description ?? null,
    justificativa: row.justification,
    removed: Boolean(row.removed),
    ordem: row.ordem,
  };
}

// FR-005: parse the OpenCode stdout. Anything empty, non-JSON or shaped
// differently is a failure (FR-006) — never a suggestion. Each item must
// carry a justification.
function parseSuggestion(stdout) {
  const text = typeof stdout === 'string' ? stdout.trim() : '';
  if (!text) throw new Error('Empty OpenCode response');
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('Unparseable OpenCode response (not JSON)');
  }
  const tasks = payload && Array.isArray(payload.tasks) ? payload.tasks : null;
  if (!tasks || tasks.length === 0) throw new Error('OpenCode response has no tasks');

  return tasks.map((task, index) => {
    const title = task && typeof task.title === 'string' ? task.title.trim() : '';
    const justification =
      task && typeof task.justificativa === 'string' && task.justificativa.trim()
        ? task.justificativa.trim()
        : task && typeof task.justification === 'string' && task.justification.trim()
          ? task.justification.trim()
          : '';
    if (!title) throw new Error(`Item ${index + 1} has no title`);
    if (!justification) throw new Error(`Item ${index + 1} has no justification`);
    const description =
      task && typeof task.description === 'string' && task.description.trim()
        ? task.description.trim()
        : null;
    return { title, description, justification };
  });
}

// Creates a new suggestion version (pendente) for the contract. definitionsId
// pins which definition version fed the generation (definition_version).
function createSuggestion(db, { contractId, definitionsId, kind = 'analise', userId = null, refineFrom = null, instructions = null }) {
  db.run(
    `INSERT INTO task_suggestions(contract_id, definitions_id, kind, refined_from, refine_instructions, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [contractId, definitionsId, kind, refineFrom, instructions, userId]
  );
  // sql.js: persist() (db.export) resets last_insert_rowid() to 0, so the new
  // row is read back through MAX(id) — safe here: JS is single-threaded and
  // no other write can interleave between the INSERT and this SELECT.
  const row = db.get(
    `${SELECT_SUGGESTION} WHERE s.id = (SELECT MAX(id) FROM task_suggestions)`
  );
  return serialize(row);
}

function find(db, suggestionId) {
  return db.get(`${SELECT_SUGGESTION} WHERE s.id = ?`, [suggestionId]);
}

function findSerialized(db, suggestionId, includeItems) {
  const row = find(db, suggestionId);
  if (!row) return null;
  return serialize(row, includeItems ? listItems(db, suggestionId) : undefined);
}

// Latest version of a kind for the contract (analysis/review state, listing).
function latestForContract(db, contractId, kind = 'analise') {
  return db.get(
    `${SELECT_SUGGESTION} WHERE s.contract_id = ? AND s.kind = ? ORDER BY s.id DESC LIMIT 1`,
    [contractId, kind]
  );
}

function listByContract(db, contractId, kind = 'analise') {
  return db.all(
    `${SELECT_SUGGESTION} WHERE s.contract_id = ? AND s.kind = ? ORDER BY s.id DESC`,
    [contractId, kind]
  );
}

// FR-018: a running or queued job blocks a new analysis (409). This also backs
// the partial UNIQUE index on (contract_id) WHERE status='analisando'.
function activeJob(db, contractId, kind = 'analise') {
  return db.get(
    `${SELECT_SUGGESTION}
      WHERE s.contract_id = ? AND s.kind = ? AND s.status IN ('pendente','analisando')
      ORDER BY s.id DESC LIMIT 1`,
    [contractId, kind]
  );
}

function listItems(db, suggestionId) {
  return db
    .all('SELECT * FROM suggestion_items WHERE suggestion_id = ? ORDER BY ordem, id', [suggestionId])
    .map(serializeItem);
}

// Kept items only (removed = 0) — the approval gate counts these (FR-009).
function countKeptItems(db, suggestionId) {
  const row = db.get(
    'SELECT COUNT(*) AS c FROM suggestion_items WHERE suggestion_id = ? AND removed = 0',
    [suggestionId]
  );
  return row ? Number(row.c) : 0;
}

// analisando: record the server-built context snapshot and start time.
function markStarted(db, suggestionId, contextJson) {
  db.run(
    `UPDATE task_suggestions
        SET status = 'analisando', context_json = ?, started_at = datetime('now'),
            updated_at = datetime('now')
      WHERE id = ? AND status = 'pendente'`,
    [contextJson, suggestionId]
  );
  return db.get('SELECT status FROM task_suggestions WHERE id = ?', [suggestionId]);
}

// analisando → sugerido: items land in the same write as the transition.
function markSuggested(db, suggestionId, items) {
  items.forEach((item, index) => {
    db.run(
      `INSERT INTO suggestion_items(suggestion_id, title, description, justification, ordem)
       VALUES (?, ?, ?, ?, ?)`,
      [suggestionId, item.title, item.description, item.justification, index]
    );
  });
  db.run(
    `UPDATE task_suggestions
        SET status = 'sugerido', error = NULL, finished_at = datetime('now'),
            updated_at = datetime('now')
      WHERE id = ?`,
    [suggestionId]
  );
  return db.get('SELECT status FROM task_suggestions WHERE id = ?', [suggestionId]);
}

// analisando/pendente → falha: definitions are never touched (FR-006).
function markFalha(db, suggestionId, error) {
  db.run(
    `UPDATE task_suggestions
        SET status = 'falha', error = ?, finished_at = datetime('now'),
            updated_at = datetime('now')
      WHERE id = ?`,
    [String(error).slice(0, 1000), suggestionId]
  );
  return db.get('SELECT status FROM task_suggestions WHERE id = ?', [suggestionId]);
}

// falha → pendente: manual retry re-queues the SAME row (no auto retry).
function requeue(db, suggestionId) {
  db.run(
    `UPDATE task_suggestions
        SET status = 'pendente', error = NULL, started_at = NULL, finished_at = NULL,
            updated_at = datetime('now')
      WHERE id = ? AND status = 'falha'`,
    [suggestionId]
  );
  return db.get('SELECT status FROM task_suggestions WHERE id = ?', [suggestionId]);
}

function markAprovada(db, suggestionId) {
  db.run(
    `UPDATE task_suggestions SET status = 'aprovada', updated_at = datetime('now')
      WHERE id = ?`,
    [suggestionId]
  );
  return db.get('SELECT status FROM task_suggestions WHERE id = ?', [suggestionId]);
}

// FR-008/AD-006: refinement creates a NEW version (refined_from → previous)
// and never updates the previous row. The items come from the refined
// OpenCode run; the new row lands directly on `sugerido` because it is born
// complete (synchronous refinement).
function refineSuggestion(db, { sourceId, items, instructions, userId }) {
  const source = find(db, sourceId);
  if (!source) return null;
  const created = createSuggestion(db, {
    contractId: source.contract_id,
    definitionsId: source.definitions_id,
    kind: source.kind,
    refineFrom: source.id,
    instructions,
    userId,
  });
  items.forEach((item, index) => {
    db.run(
      `INSERT INTO suggestion_items(suggestion_id, title, description, justification, ordem)
       VALUES (?, ?, ?, ?, ?)`,
      [created.id, item.title, item.description, item.justification, index]
    );
  });
  db.run(
    `UPDATE task_suggestions
        SET status = 'sugerido', finished_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?`,
    [created.id]
  );
  // FR-017: the new version lands in entity_history with its author (runs
  // inside the caller's transaction — the audit row commits with the version).
  History.recordVersion(db, {
    entityType: 'suggestion',
    entityId: created.id,
    snapshot: { status: 'sugerido', refined_from: source.id, instructions },
    authorId: userId,
  });
  return find(db, created.id);
}

// items array carried by the analysis state resource (sugerido/aprovada only).
function statusItems(db, row) {
  if (!row || (row.status !== 'sugerido' && row.status !== 'aprovada')) return undefined;
  return listItems(db, row.id);
}

function analysisState(db, contractId) {
  const row = latestForContract(db, contractId, 'analise');
  if (!row) return null;
  return {
    contract_id: row.contract_id,
    suggestion_id: row.id,
    definition_version: row.definition_version ?? null,
    status: row.status,
    error: row.error ?? null,
    items: statusItems(db, row),
    updated_at: row.updated_at,
  };
}

module.exports = {
  serialize,
  serializeItem,
  parseSuggestion,
  createSuggestion,
  find,
  findSerialized,
  latestForContract,
  listByContract,
  activeJob,
  listItems,
  countKeptItems,
  markStarted,
  markSuggested,
  markFalha,
  requeue,
  markAprovada,
  refineSuggestion,
  statusItems,
  analysisState,
};
