'use strict';

// FR-017: append-only version history (entity_history) across the three
// versioned entities — definitions, suggestions and execution plans. Every
// row carries author and date; versions increment per (entity_type,
// entity_id) and UNIQUE blocks overwrites: history is written, never
// rewritten (data-model: append-only).

const ENTITY_TYPES = ['definition', 'suggestion', 'execution_plan'];

function serialize(row) {
  if (!row) return null;
  let snapshot = null;
  if (row.snapshot != null) {
    try {
      snapshot = JSON.parse(row.snapshot);
    } catch {
      snapshot = null;
    }
  }
  return {
    id: row.id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    version: row.version,
    snapshot,
    author_id: row.author_id ?? null,
    author_name: row.author_name ?? null,
    created_at: row.created_at,
  };
}

// Append one version. `version` defaults to the entity's next number
// (MAX + 1); a duplicate version hits the UNIQUE constraint and throws —
// there is no update path.
function recordVersion(db, { entityType, entityId, snapshot = null, authorId = null, version = null }) {
  if (!ENTITY_TYPES.includes(entityType)) {
    throw new Error(`Unknown entity_type: ${entityType}`);
  }
  let next = version;
  if (next == null) {
    const max = db.get(
      'SELECT MAX(version) AS max FROM entity_history WHERE entity_type = ? AND entity_id = ?',
      [entityType, Number(entityId)]
    );
    next = (max && max.max ? Number(max.max) : 0) + 1;
  }
  db.run(
    `INSERT INTO entity_history(entity_type, entity_id, version, snapshot, author_id)
     VALUES (?, ?, ?, ?, ?)`,
    [
      entityType,
      Number(entityId),
      Number(next),
      snapshot == null ? null : JSON.stringify(snapshot),
      authorId,
    ]
  );
  const row = db.get(
    `SELECT h.*, u.name AS author_name
       FROM entity_history h LEFT JOIN users u ON u.id = h.author_id
      WHERE h.entity_type = ? AND h.entity_id = ? AND h.version = ?`,
    [entityType, Number(entityId), Number(next)]
  );
  return serialize(row);
}

// Versions of one entity, newest first, with the author name (FR-017:
// histórico de versões com autor e data).
function listVersions(db, entityType, entityId) {
  const rows = db.all(
    `SELECT h.*, u.name AS author_name
       FROM entity_history h LEFT JOIN users u ON u.id = h.author_id
      WHERE h.entity_type = ? AND h.entity_id = ?
      ORDER BY h.version DESC, h.id DESC`,
    [entityType, Number(entityId)]
  );
  return rows.map(serialize);
}

module.exports = { ENTITY_TYPES, serialize, recordVersion, listVersions };
