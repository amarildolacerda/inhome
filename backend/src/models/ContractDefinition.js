'use strict';

// FR-001/FR-002/FR-017: versioned contract definitions. Every save inserts a
// new row (never UPDATE), so the rows themselves are the history: previous
// versions stay reachable through listVersions() for /definitions/history.

const FIELDS = ['finalidade', 'limitacoes', 'alvo', 'escopo', 'premissas', 'entregaveis'];

// openapi ContractDefinition: DB `version` serializes as `versao`, DB
// `created_by` as `autor_id` (Portuguese response keys per QA amendment).
function serialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    contract_id: row.contract_id,
    versao: row.version,
    finalidade: row.finalidade,
    limitacoes: row.limitacoes,
    alvo: row.alvo,
    escopo: row.escopo,
    premissas: row.premissas,
    entregaveis: row.entregaveis,
    autor_id: row.created_by ?? null,
    created_at: row.created_at,
  };
}

// FR-003 helper shared with routes: the 6 mandatory fields that are absent,
// not a string, or blank after trim. Empty list = definitions complete.
function missingFields(body) {
  const source = body || {};
  return FIELDS.filter((field) => typeof source[field] !== 'string' || !source[field].trim());
}

// Latest (active) version, serialized; null when the contract has none.
function latest(db, contractId) {
  return serialize(
    db.get(
      'SELECT * FROM contract_definitions WHERE contract_id = ? ORDER BY version DESC LIMIT 1',
      [contractId]
    )
  );
}

// FR-002: append a new version for the contract (UNIQUE(contract_id, version)).
function versionDefinitions(db, contractId, fields, userId) {
  const row = db.get(
    'SELECT MAX(version) AS max FROM contract_definitions WHERE contract_id = ?',
    [contractId]
  );
  const version = (row && row.max ? Number(row.max) : 0) + 1;
  db.run(
    `INSERT INTO contract_definitions
       (contract_id, version, finalidade, limitacoes, alvo, escopo, premissas, entregaveis, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      contractId,
      version,
      fields.finalidade.trim(),
      fields.limitacoes.trim(),
      fields.alvo.trim(),
      fields.escopo.trim(),
      fields.premissas.trim(),
      fields.entregaveis.trim(),
      userId ?? null,
    ]
  );
  return latest(db, contractId);
}

// FR-017: every version newest first, with author name (convenção user_name
// do histórico existente) and the full row as snapshot.
function listVersions(db, contractId) {
  return db
    .all(
      `SELECT d.*, u.name AS user_name
         FROM contract_definitions d
         LEFT JOIN users u ON u.id = d.created_by
        WHERE d.contract_id = ?
        ORDER BY d.version DESC`,
      [contractId]
    )
    .map((row) => ({
      versao: row.version,
      autor_id: row.created_by ?? null,
      user_name: row.user_name ?? null,
      created_at: row.created_at,
      snapshot: serialize(row),
    }));
}

module.exports = { FIELDS, serialize, missingFields, latest, versionDefinitions, listVersions };
