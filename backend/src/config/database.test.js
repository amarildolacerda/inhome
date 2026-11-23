'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { setupDataDir } = require('../support/testenv');

const dataDir = setupDataDir();
const database = require('../config/database');
const { code, label } = require('./enums');

test('FR-024 db/domain', async () => {
  await database.initSqlDriver();
  await database.initDatabase();

  // platform.db exists with platform schema + seeded system admin
  const platform = database.getPlatformDb();
  assert.ok(fs.existsSync(path.join(dataDir, 'platform.db')), 'platform.db created');
  const seed = platform.get("SELECT email FROM system_users WHERE role = 'system_admin'");
  assert.ok(seed && seed.email, 'system admin seeded');

  // enabling a domain creates data/domains/<id>.db with its own schema (AD-002)
  platform.run('INSERT INTO domains(name, slug) VALUES (?, ?)', ['Alpha', 'alpha']);
  const alpha = platform.get('SELECT id FROM domains WHERE slug = ?', ['alpha']);
  const dbAlpha = database.createDomainDb(alpha.id);
  assert.ok(fs.existsSync(path.join(dataDir, 'domains', `${alpha.id}.db`)), 'domain db file created');

  // second domain gets a separate physical file
  platform.run('INSERT INTO domains(name, slug) VALUES (?, ?)', ['Beta', 'beta']);
  const beta = platform.get('SELECT id FROM domains WHERE slug = ?', ['beta']);
  const dbBeta = database.getDomainDb(beta.id);
  assert.notStrictEqual(alpha.id, beta.id);
  assert.ok(fs.existsSync(path.join(dataDir, 'domains', `${beta.id}.db`)));

  // data written in alpha does not appear in beta (physical isolation)
  dbAlpha.run(
    "INSERT INTO contracts(name, object, start_date, forecast_date) VALUES ('C-alpha', 'obj', '2026-01-01', '2026-12-31')"
  );
  assert.strictEqual(dbAlpha.get('SELECT COUNT(*) AS c FROM contracts').c, 1);
  assert.strictEqual(dbBeta.get('SELECT COUNT(*) AS c FROM contracts').c, 0);

  // getDomainDb caches per domain id
  assert.strictEqual(database.getDomainDb(alpha.id), dbAlpha);
});

test('FR-025 sql.js', async () => {
  const SQL = await database.initSqlDriver();
  assert.ok(SQL && typeof SQL.Database === 'function', 'sql.js driver loaded');

  const platform = database.getPlatformDb();
  assert.ok(platform.db instanceof SQL.Database, 'platform db is a sql.js Database');
  assert.strictEqual(typeof platform.db.export, 'function', 'sql.js export available');

  // idempotent init; no native better-sqlite3 build required (AD-001)
  assert.strictEqual(await database.initSqlDriver(), SQL);
});

// Domain databases created before the username column gain it on open
// (nullable; the UNIQUE constraint only exists on fresh schemas).
test('username migration for legacy domain dbs', async () => {
  const SQL = await database.initSqlDriver();
  const platform = database.getPlatformDb();
  platform.run('INSERT INTO domains(name, slug) VALUES (?, ?)', ['Legacy', 'legacy']);
  const legacy = platform.get('SELECT id FROM domains WHERE slug = ?', ['legacy']);

  // pre-username users table written straight to disk
  const file = path.join(dataDir, 'domains', `${legacy.id}.db`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const raw = new SQL.Database();
  raw.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','gestor','prestador')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  fs.writeFileSync(file, Buffer.from(raw.export()));
  raw.close();

  // opening through getDomainDb migrates the column in
  const db = database.getDomainDb(legacy.id);
  const columns = db.all('PRAGMA table_info(users)').map((column) => column.name);
  assert.ok(columns.includes('username'), 'username column migrated');

  db.run(
    "INSERT INTO users(name, email, password_hash, role) VALUES ('Old', 'old@legacy.test', 'x', 'admin')"
  );
  const row = db.get('SELECT username FROM users WHERE email = ?', ['old@legacy.test']);
  assert.strictEqual(row.username, null, 'migrated column is nullable');
});

// E017 (FR-069): domains created before the perpetual marker gain it on
// open — PRAGMA table_info guard + single ALTER, same pattern as username.
// The reopen proves idempotency: a second migrateSchema pass must skip the
// ALTER instead of failing on "duplicate column name".
test('perpetual migration for legacy domain dbs', async () => {
  const SQL = await database.initSqlDriver();
  const platform = database.getPlatformDb();
  platform.run('INSERT INTO domains(name, slug) VALUES (?, ?)', ['LegacyPerpetual', 'legacy-perpetual']);
  const legacy = platform.get('SELECT id FROM domains WHERE slug = ?', ['legacy-perpetual']);

  // contracts table written straight to disk without the marker column
  const file = path.join(dataDir, 'domains', `${legacy.id}.db`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const raw = new SQL.Database();
  raw.run(`CREATE TABLE contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    object TEXT,
    purpose_id INTEGER REFERENCES purposes(id),
    start_date TEXT NOT NULL,
    forecast_date TEXT NOT NULL,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (1,2)),
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  fs.writeFileSync(file, Buffer.from(raw.export()));
  raw.close();

  const db = database.getDomainDb(legacy.id);
  let columns = db.all('PRAGMA table_info(contracts)').map((column) => column.name);
  assert.ok(columns.includes('perpetual'), 'perpetual column migrated');
  db.run("INSERT INTO contracts(name, start_date, forecast_date) VALUES ('Legado', '2026-01-01', '2026-12-31')");
  assert.strictEqual(db.get('SELECT perpetual FROM contracts').perpetual, 0, 'legacy row defaults to 0');

  // reopen: migrateSchema runs again and the guard must skip the ALTER
  database.resetDatabaseCache();
  await database.initSqlDriver();
  const reopened = database.getDomainDb(legacy.id);
  columns = reopened.all('PRAGMA table_info(contracts)').map((column) => column.name);
  assert.strictEqual(columns.filter((name) => name === 'perpetual').length, 1, 'migration idempotent on reopen');

  // restore the shared driver/platform for the tests that follow
  database.getPlatformDb();
});

// E011 (FR-005): domains created before the auditor role carry the old role
// CHECK — SQLite cannot ALTER it, so the users table is rebuilt in place on
// open: existing rows keep their ids, auditor becomes insertable.
test('E011 auditor role rebuild for legacy domain dbs', async () => {
  const SQL = await database.initSqlDriver();
  const platform = database.getPlatformDb();
  platform.run('INSERT INTO domains(name, slug) VALUES (?, ?)', ['LegacyRole', 'legacy-role']);
  const legacy = platform.get('SELECT id FROM domains WHERE slug = ?', ['legacy-role']);

  const file = path.join(dataDir, 'domains', `${legacy.id}.db`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const raw = new SQL.Database();
  raw.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    username TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','gestor','prestador')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  raw.run(
    "INSERT INTO users(name, email, password_hash, role) VALUES ('Old','old.role@legacy.test','x','gestor')"
  );
  fs.writeFileSync(file, Buffer.from(raw.export()));
  raw.close();

  const db = database.getDomainDb(legacy.id);
  const sql = db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").sql;
  assert.ok(sql.includes("'auditor'"), 'role CHECK rebuilt');

  // pre-E011 rows survive with the same id
  const old = db.get("SELECT id, role FROM users WHERE email = 'old.role@legacy.test'");
  assert.strictEqual(old.role, 'gestor');
  assert.strictEqual(old.id, 1);

  // auditor now passes the CHECK
  db.run(
    "INSERT INTO users(name, email, password_hash, role) VALUES ('Aud','aud@legacy.test','y','auditor')"
  );
  const aud = db.get("SELECT role FROM users WHERE email = 'aud@legacy.test'");
  assert.strictEqual(aud.role, 'auditor');
});

// English is the table-naming standard: legacy domain files carrying
// `finalidades`/`contract_prestadores` must migrate in place on open — rows
// kept, FKs rewritten, safe to run on every open.
test('rename migration: legacy Portuguese tables become purposes/contract_providers', async () => {
  const SQL = await database.initSqlDriver();
  const platform = database.getPlatformDb();
  platform.run('INSERT INTO domains(name, slug) VALUES (?, ?)', ['OldNames', 'old-names']);
  const legacy = platform.get('SELECT id FROM domains WHERE slug = ?', ['old-names']);

  // pre-rename schema written straight to disk, with rows and an FK chain
  const file = path.join(dataDir, 'domains', `${legacy.id}.db`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const raw = new SQL.Database();
  raw.run(`CREATE TABLE finalidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  raw.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','gestor','prestador')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  raw.run(`CREATE TABLE contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    object TEXT,
    purpose_id INTEGER REFERENCES finalidades(id),
    start_date TEXT NOT NULL,
    forecast_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'vigente' CHECK (status IN ('vigente','encerrado')),
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  raw.run(`CREATE TABLE contract_prestadores (
    contract_id INTEGER NOT NULL REFERENCES contracts(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    linked_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (contract_id, user_id)
  )`);
  raw.run("INSERT INTO finalidades(name) VALUES ('Obra Civil'), ('Suporte TI')");
  raw.run(
    "INSERT INTO users(name, email, password_hash, role) VALUES ('Paulo', 'paulo@old.test', 'x', 'prestador')"
  );
  raw.run(
    "INSERT INTO contracts(name, purpose_id, start_date, forecast_date) VALUES ('C-legacy', 2, '2026-01-01', '2026-12-31')"
  );
  raw.run('INSERT INTO contract_prestadores(contract_id, user_id) VALUES (1, 1)');
  fs.writeFileSync(file, Buffer.from(raw.export()));
  raw.close();

  // opening through the app path runs migrateSchema() ahead of the
  // CREATE TABLE IF NOT EXISTS statements, so no empty shadow table lands
  // beside the populated legacy one
  const db = database.getDomainDb(legacy.id);
  const tables = db
    .all("SELECT name FROM sqlite_master WHERE type = 'table'")
    .map((row) => row.name);
  assert.ok(tables.includes('purposes'), 'finalidades renamed to purposes');
  assert.ok(!tables.includes('finalidades'), 'legacy finalidades dropped by rename');
  assert.ok(tables.includes('contract_providers'), 'contract_prestadores renamed');
  assert.ok(!tables.includes('contract_prestadores'), 'legacy link table dropped by rename');

  // rows intact
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM purposes').c, 2);
  assert.strictEqual(db.get('SELECT name FROM purposes WHERE id = 2').name, 'Suporte TI');
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM contract_providers').c, 1);
  assert.strictEqual(
    db.get('SELECT name FROM purposes WHERE id = ?', [1]).name,
    'Obra Civil',
    'dictionary lookup by old row id still resolves'
  );

  // REFERENCES and index definitions follow the rename (SQLite schema rewrite)
  const contractsSql = db.get("SELECT sql FROM sqlite_master WHERE name = 'contracts'").sql;
  assert.match(contractsSql, /REFERENCES ["']?purposes["']?\(id\)/, contractsSql);
  const indexSql = db.get("SELECT sql FROM sqlite_master WHERE name = 'idx_cp_user'").sql;
  assert.match(indexSql, /contract_providers/, indexSql);

  // fresh database path: brand-new domain never saw the Portuguese names
  platform.run('INSERT INTO domains(name, slug) VALUES (?, ?)', ['FreshNames', 'fresh-names']);
  const fresh = platform.get('SELECT id FROM domains WHERE slug = ?', ['fresh-names']);
  const freshTables = database
    .createDomainDb(fresh.id)
    .all("SELECT name FROM sqlite_master WHERE type = 'table'")
    .map((row) => row.name);
  assert.ok(freshTables.includes('purposes') && freshTables.includes('contract_providers'));
  assert.ok(!freshTables.includes('finalidades') && !freshTables.includes('contract_prestadores'));

  // idempotent: reopening the migrated file is a no-op with data preserved
  database.resetDatabaseCache();
  await database.initSqlDriver();
  const again = database.getDomainDb(legacy.id);
  const againTables = again
    .all("SELECT name FROM sqlite_master WHERE type = 'table'")
    .map((row) => row.name);
  assert.ok(!againTables.includes('finalidades') && !againTables.includes('contract_prestadores'));
  assert.strictEqual(again.get('SELECT COUNT(*) AS c FROM purposes').c, 2);
  assert.strictEqual(again.get('SELECT COUNT(*) AS c FROM contract_providers').c, 1);
});

// Phase 2 of the naming standard: contracts.finalidade_id becomes purpose_id
// in place on open. ALTER TABLE ... RENAME COLUMN (sql.js / SQLite 3.49.1)
// rewrites the REFERENCES purposes(id) clause without touching rows; the index
// definition follows the column but keeps its legacy name, so the migration
// drops idx_contracts_finalidade and recreates idx_contracts_purpose.
test('rename migration: contracts.finalidade_id becomes purpose_id', async () => {
  const SQL = await database.initSqlDriver();
  const platform = database.getPlatformDb();
  platform.run('INSERT INTO domains(name, slug) VALUES (?, ?)', ['OldPurpose', 'old-purpose']);
  const legacy = platform.get('SELECT id FROM domains WHERE slug = ?', ['old-purpose']);

  // pre-phase-2 schema written straight to disk: English tables (phase 1
  // already ran), Portuguese column and index, with rows in both tables
  const file = path.join(dataDir, 'domains', `${legacy.id}.db`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const raw = new SQL.Database();
  raw.run(`CREATE TABLE purposes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  raw.run(`CREATE TABLE contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    object TEXT,
    finalidade_id INTEGER REFERENCES purposes(id),
    start_date TEXT NOT NULL,
    forecast_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'vigente' CHECK (status IN ('vigente','encerrado')),
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  raw.run("INSERT INTO purposes(name) VALUES ('Obra Civil'), ('Suporte TI')");
  raw.run(
    `INSERT INTO contracts(name, finalidade_id, start_date, forecast_date)
     VALUES ('C-legacy', 2, '2026-01-01', '2026-12-31'),
            ('C-legacy-2', 1, '2026-02-01', '2026-11-30')`
  );
  raw.run('CREATE INDEX idx_contracts_finalidade ON contracts(finalidade_id)');
  fs.writeFileSync(file, Buffer.from(raw.export()));
  raw.close();

  // opening through the app path (getDomainDb) runs migrateSchema ahead of
  // applySchema, so the rename lands on the legacy file itself
  const db = database.getDomainDb(legacy.id);
  const columns = db.all('PRAGMA table_info(contracts)').map((column) => column.name);
  assert.ok(columns.includes('purpose_id'), 'finalidade_id renamed to purpose_id');
  assert.ok(!columns.includes('finalidade_id'), 'legacy column gone');

  // FK rewritten in place by RENAME COLUMN
  const contractsSql = db.get(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'contracts'"
  ).sql;
  assert.match(contractsSql, /purpose_id\s+INTEGER REFERENCES purposes\(id\)/, contractsSql);

  // RENAME COLUMN updates the index definition but not its name, so the
  // migration swaps the index explicitly
  const indexRows = db
    .all("SELECT name, sql FROM sqlite_master WHERE type = 'index'")
    .filter((row) => row.sql);
  assert.ok(
    !indexRows.some((row) => row.name === 'idx_contracts_finalidade'),
    'legacy index dropped'
  );
  const newIdx = indexRows.find((row) => row.name === 'idx_contracts_purpose');
  assert.ok(newIdx, 'english index created');
  assert.match(newIdx.sql, /purpose_id/, newIdx.sql);

  // rows preserved and readable through the new column name
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM contracts').c, 2);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM purposes').c, 2);
  assert.strictEqual(
    db.get('SELECT purpose_id FROM contracts WHERE name = ?', ['C-legacy']).purpose_id,
    2
  );

  // idempotent: reopening the migrated file is a no-op with data preserved
  database.resetDatabaseCache();
  await database.initSqlDriver();
  const again = database.getDomainDb(legacy.id);
  const againColumns = again.all('PRAGMA table_info(contracts)').map((column) => column.name);
  assert.ok(againColumns.includes('purpose_id') && !againColumns.includes('finalidade_id'));
  const againIndexes = again
    .all("SELECT name FROM sqlite_master WHERE type = 'index'")
    .map((row) => row.name);
  assert.ok(!againIndexes.includes('idx_contracts_finalidade'), 'second open changes nothing');
  assert.strictEqual(again.get('SELECT COUNT(*) AS c FROM contracts').c, 2);
  assert.strictEqual(again.get('SELECT COUNT(*) AS c FROM purposes').c, 2);
});

// 00003 (T001): domain databases gain the 7 workflow tables, the 4 additive
// `tasks` columns and both partial UNIQUE invariants on open. Legacy files
// (pre-00003 tasks) are migrated in place; existing rows stay outside the
// workflow (workflow_version_id IS NULL).
test('00003 workflow schema: 7 tables + additive tasks columns + partial uniques', async () => {
  const SQL = await database.initSqlDriver();
  const platform = database.getPlatformDb();

  // legacy domain file with a populated `tasks` table that predates 00003
  platform.run('INSERT INTO domains(name, slug) VALUES (?, ?)', ['Legacy00003', 'legacy-00003']);
  const legacy = platform.get('SELECT id FROM domains WHERE slug = ?', ['legacy-00003']);
  const file = path.join(dataDir, 'domains', `${legacy.id}.db`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const raw = new SQL.Database();
  raw.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','gestor','prestador')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  raw.run(`CREATE TABLE contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    object TEXT,
    purpose_id INTEGER,
    start_date TEXT NOT NULL,
    forecast_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'vigente' CHECK (status IN ('vigente','encerrado')),
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  raw.run(`CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL REFERENCES contracts(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'A Fazer' CHECK (status IN ('A Fazer','Em Progresso','Revisão','Concluída')),
    priority TEXT NOT NULL DEFAULT 'medium',
    assignee_id INTEGER,
    due_date TEXT,
    completed_text TEXT,
    completed_at TEXT,
    completed_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  raw.run(
    "INSERT INTO contracts(name, start_date, forecast_date) VALUES ('C-antigo', '2026-01-01', '2026-12-31')"
  );
  // legado: gravado como texto (a migração da fase 3 converte na abertura)
  raw.run("INSERT INTO tasks(contract_id, title, status) VALUES (1, 'Tarefa legada', 'A Fazer')");
  fs.writeFileSync(file, Buffer.from(raw.export()));
  raw.close();

  const db = database.getDomainDb(legacy.id);
  const tables = db.all("SELECT name FROM sqlite_master WHERE type = 'table'").map((row) => row.name);
  for (const name of [
    'contract_definitions',
    'task_suggestions',
    'suggestion_items',
    'workflow_versions',
    'execution_plans',
    'revision_conflicts',
    'entity_history',
  ]) {
    assert.ok(tables.includes(name), `table ${name} created`);
  }

  const taskColumns = db.all('PRAGMA table_info(tasks)').map((column) => column.name);
  for (const name of ['workflow_version_id', 'suggestion_item_id', 'opt_in_by', 'opt_in_at']) {
    assert.ok(taskColumns.includes(name), `tasks.${name} migrated`);
  }

  // pre-00003 rows are kept, untouched, outside any workflow
  const legacyTask = db.get('SELECT workflow_version_id, suggestion_item_id FROM tasks WHERE id = 1');
  assert.strictEqual(legacyTask.workflow_version_id, null, 'legacy task outside workflow');
  assert.strictEqual(legacyTask.suggestion_item_id, null);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM tasks').c, 1, 'no row lost');

  // migration is idempotent: reopening does not fail on existing columns
  database.resetDatabaseCache();
  await database.initSqlDriver();
  const again = database.getDomainDb(legacy.id);
  const againColumns = again.all('PRAGMA table_info(tasks)').map((column) => column.name);
  assert.strictEqual(
    againColumns.filter((name) => name === 'workflow_version_id').length,
    1,
    'additive migration runs once'
  );

  // fresh domain: partial UNIQUE invariants are enforced
  platform.run('INSERT INTO domains(name, slug) VALUES (?, ?)', ['Fresh00003', 'fresh-00003']);
  const fresh = platform.get('SELECT id FROM domains WHERE slug = ?', ['fresh-00003']);
  const freshDb = database.createDomainDb(fresh.id);
  const indexRows = freshDb
    .all("SELECT name, sql FROM sqlite_master WHERE type = 'index'")
    .filter((row) => row.sql);
  const analisando = indexRows.find((row) => row.name === 'uq_task_suggestions_analisando');
  assert.ok(analisando && /UNIQUE/i.test(analisando.sql) && /WHERE/i.test(analisando.sql), 'partial unique analisando');
  const ativo = indexRows.find((row) => row.name === 'uq_workflow_versions_ativo');
  assert.ok(ativo && /UNIQUE/i.test(ativo.sql) && /WHERE/i.test(ativo.sql), 'partial unique ativo');

  // invariant proof: a second analisando row for the same contract is refused
  freshDb.run(
    "INSERT INTO contracts(name, start_date, forecast_date) VALUES ('C-fresh', '2026-01-01', '2026-12-31')"
  );
  freshDb.run(
    "INSERT INTO contract_definitions(contract_id, version, finalidade, limitacoes, alvo, escopo, premissas, entregaveis) VALUES (1, 1, 'f', 'l', 'a', 'e', 'p', 'ent')"
  );
  freshDb.run(
    `INSERT INTO task_suggestions(contract_id, definitions_id, kind, status) VALUES (1, 1, ?, ?)`,
    [code('task_suggestions.kind', 'analise'), code('task_suggestions.status', 'analisando')]
  );
  assert.throws(
    () =>
      freshDb.run(
        `INSERT INTO task_suggestions(contract_id, definitions_id, kind, status) VALUES (1, 1, ?, ?)`,
        [code('task_suggestions.kind', 'revisao'), code('task_suggestions.status', 'analisando')]
      ),
    /UNIQUE|constraint/i,
    'só 1 registro analisando por contrato'
  );
  freshDb.run(
    `INSERT INTO workflow_versions(contract_id, suggestion_id, status) VALUES (1, 1, ?)`,
    [code('workflow_versions.status', 'ativo')]
  );
  assert.throws(
    () =>
      freshDb.run(
        `INSERT INTO workflow_versions(contract_id, suggestion_id, status) VALUES (1, 1, ?)`,
        [code('workflow_versions.status', 'ativo')]
      ),
    /UNIQUE|constraint/i,
    'só 1 workflow ativo por contrato'
  );
});

// FR-008/FR-009/FR-010: transaction() is the atomicity primitive behind
// refinement and approval — commit once, roll back everything on error.
test('transaction(): commits atomically and rolls back on error', async () => {
  const platform = database.getPlatformDb();
  platform.run('INSERT INTO domains(name, slug) VALUES (?, ?)', ['Tx00003', 'tx-00003']);
  const domain = platform.get('SELECT id FROM domains WHERE slug = ?', ['tx-00003']);
  const db = database.createDomainDb(domain.id);

  // success: the callback result comes back and both writes are visible
  const written = db.transaction((tx) => {
    tx.run(
      `INSERT INTO contracts(name, start_date, forecast_date) VALUES ('Tx-ok', '2026-01-01', '2026-12-31')`
    );
    tx.run(
      `INSERT INTO contracts(name, start_date, forecast_date) VALUES ('Tx-ok-2', '2026-01-01', '2026-12-31')`
    );
    return tx.get('SELECT COUNT(*) AS c FROM contracts').c;
  });
  assert.strictEqual(written, 2);

  // failure: writes made before the error are rolled back together
  assert.throws(
    () =>
      db.transaction((tx) => {
        tx.run(
          `INSERT INTO contracts(name, start_date, forecast_date) VALUES ('Tx-ghost', '2026-01-01', '2026-12-31')`
        );
        throw new Error('boom');
      }),
    /boom/,
    'o erro do callback propaga'
  );
  assert.strictEqual(
    db.get(`SELECT COUNT(*) AS c FROM contracts WHERE name = 'Tx-ghost'`).c,
    0,
    'escrita parcial desfeita'
  );

  // disk matches memory after commit (once) and rollback (clean)
  database.resetDatabaseCache();
  await database.initSqlDriver();
  const reopened = database.getDomainDb(domain.id);
  assert.strictEqual(
    reopened.get(`SELECT COUNT(*) AS c FROM contracts WHERE name = 'Tx-ghost'`).c,
    0
  );
  assert.strictEqual(
    reopened.get(`SELECT COUNT(*) AS c FROM contracts WHERE name LIKE 'Tx-ok%'`).c,
    2
  );
});

// 00009 E004 (FR-001/FR-005): additive lazy migrations — alert_events on the
// domain side (Q5 pattern: guard fires before applySchema, exactly once per
// file) and domains.alert_windows on the platform side (PRAGMA guard, same
// shape as the username/tasks column precedents). Idempotent by construction.
test('00009 alert migrations: alert_events domain table + domains.alert_windows platform column', async () => {
  const SQL = await database.initSqlDriver();
  const platform = database.getPlatformDb();

  // platform side: a fresh open of an existing platform.db (created by an
  // earlier test) already ran migrateSchema once; the column is present and
  // every domain row defaults to NULL (-> [90,60,30,15] in readWindows).
  const platformColumns = platform.all('PRAGMA table_info(domains)').map((column) => column.name);
  assert.ok(platformColumns.includes('alert_windows'), 'platform domains gains alert_windows');
  const anyDomain = platform.get('SELECT alert_windows FROM domains LIMIT 1');
  assert.strictEqual(anyDomain.alert_windows, null, 'NULL means default windows, zero setup');

  // domain side: a legacy file without alert_events gains it on open, with
  // the UNIQUE(contract_id, window_days) dedup constraint intact.
  platform.run('INSERT INTO domains(name, slug) VALUES (?, ?)', ['Alertas', 'alertas-legacy']);
  const legacy = platform.get('SELECT id FROM domains WHERE slug = ?', ['alertas-legacy']);
  const file = path.join(dataDir, 'domains', `${legacy.id}.db`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const raw = new SQL.Database();
  raw.run(`CREATE TABLE contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    object TEXT NOT NULL,
    purpose_id INTEGER,
    start_date TEXT NOT NULL,
    forecast_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'vigente',
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  fs.writeFileSync(file, Buffer.from(raw.export()));
  raw.close();

  const db = database.getDomainDb(legacy.id);
  const tables = db.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'alert_events'");
  assert.ok(tables, 'alert_events created lazily on legacy open');
  const ddl = db.get("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'alert_events'");
  assert.ok(ddl.sql.includes('UNIQUE(contract_id, window_days)'), 'dedup constraint in DDL');

  // fresh insert works; the second identical (contract, window) is refused
  db.run("INSERT INTO alert_events(contract_id, window_days, email_status) VALUES (1, 30, 'skipped')");
  assert.throws(
    () => db.run("INSERT INTO alert_events(contract_id, window_days, email_status) VALUES (1, 30, 'sent')"),
    /UNIQUE/i
  );

  // re-open through the cache-clearing hook: migration must not fire twice
  database.resetDatabaseCache();
  await database.initSqlDriver();
  const reopened = database.getDomainDb(legacy.id);
  const rows = reopened.all('SELECT COUNT(*) AS c FROM alert_events');
  assert.strictEqual(rows[0].c, 1, 're-open is side-effect free');
});

// Fase 3 da convenção de nomenclatura (2026-10-12): os 6 enums de dado são
// gravados como INTEGER (código base 1, fonte única em config/enums.js) e a
// API continua expondo texto PT. Um domínio legado — as 6 colunas em TEXT com
// os literais antigos, índices parciais com predicado textual — é
// reconstruído no lugar na abertura: mapeamento correto, contagens e ids
// preservados, índices recriados em código e a segunda abertura é no-op.
test('fase 3: enums de dado TEXT → INTEGER (rebuild preguiçoso)', async () => {
  const SQL = await database.initSqlDriver();
  const platform = database.getPlatformDb();
  platform.run('INSERT INTO domains(name, slug) VALUES (?, ?)', ['LegacyEnums', 'legacy-enums']);
  const legacy = platform.get('SELECT id FROM domains WHERE slug = ?', ['legacy-enums']);

  // arquivo legado escrito direto no disco: DDL de antes da fase 3
  const file = path.join(dataDir, 'domains', `${legacy.id}.db`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const raw = new SQL.Database();
  raw.run(`CREATE TABLE contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    object TEXT,
    purpose_id INTEGER,
    start_date TEXT NOT NULL,
    forecast_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'vigente' CHECK (status IN ('vigente','encerrado')),
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  raw.run(`CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL REFERENCES contracts(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'A Fazer' CHECK (status IN ('A Fazer','Em Progresso','Revisão','Concluída')),
    priority TEXT NOT NULL DEFAULT 'medium',
    assignee_id INTEGER,
    due_date TEXT,
    completed_text TEXT,
    completed_at TEXT,
    completed_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  raw.run(`CREATE TABLE task_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL REFERENCES contracts(id),
    definitions_id INTEGER NOT NULL,
    kind TEXT NOT NULL DEFAULT 'analise' CHECK (kind IN ('analise','revisao')),
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','analisando','sugerido','falha','aprovada')),
    refined_from INTEGER,
    refine_instructions TEXT,
    error TEXT,
    context_json TEXT,
    started_at TEXT,
    finished_at TEXT,
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  raw.run(`CREATE TABLE workflow_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL REFERENCES contracts(id),
    suggestion_id INTEGER NOT NULL REFERENCES task_suggestions(id),
    status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','substituido')),
    activated_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  raw.run(`CREATE TABLE execution_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) UNIQUE,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','gerado','falha')),
    passos TEXT,
    criterios TEXT,
    riscos TEXT,
    error TEXT,
    requested_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  // índices parciais legados: predicado textual, o formato de antes
  raw.run(
    "CREATE UNIQUE INDEX uq_task_suggestions_analisando ON task_suggestions(contract_id) WHERE status = 'analisando'"
  );
  raw.run(
    "CREATE UNIQUE INDEX uq_workflow_versions_ativo ON workflow_versions(contract_id) WHERE status = 'ativo'"
  );
  raw.run(
    `INSERT INTO contracts(name, start_date, forecast_date, status) VALUES
      ('C-vigente', '2026-01-01', '2026-12-31', 'vigente'),
      ('C-encerrado', '2026-01-01', '2026-06-30', 'encerrado')`
  );
  raw.run(
    `INSERT INTO tasks(contract_id, title, status) VALUES
      (1, 'T1', 'A Fazer'), (1, 'T2', 'Em Progresso'), (1, 'T3', 'Revisão'), (2, 'T4', 'Concluída')`
  );
  raw.run(`CREATE TABLE contract_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    version INTEGER NOT NULL,
    finalidade TEXT NOT NULL,
    limitacoes TEXT NOT NULL,
    alvo TEXT NOT NULL,
    escopo TEXT NOT NULL,
    premissas TEXT NOT NULL,
    entregaveis TEXT NOT NULL,
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (contract_id, version)
  )`);
  raw.run(
    `INSERT INTO contract_definitions(contract_id, version, finalidade, limitacoes, alvo, escopo, premissas, entregaveis)
     VALUES (1, 1, 'f', 'l', 'a', 'e', 'p', 'ent')`
  );
  raw.run(
    `INSERT INTO task_suggestions(contract_id, definitions_id, kind, status) VALUES
      (1, 1, 'analise', 'sugerido'), (1, 1, 'revisao', 'analisando')`
  );
  raw.run(
    `INSERT INTO workflow_versions(contract_id, suggestion_id, status) VALUES
      (1, 1, 'substituido'), (1, 2, 'ativo')`
  );
  raw.run(
    `INSERT INTO execution_plans(task_id, status) VALUES (1, 'gerado'), (2, 'falha')`
  );
  fs.writeFileSync(file, Buffer.from(raw.export()));
  raw.close();

  // abertura pelo caminho da aplicação: migrateSchema antes de applySchema
  const db = database.getDomainDb(legacy.id);

  // as 6 colunas nascem INTEGER e o CHECK vira numérico
  const enumColumns = [
    ['contracts', 'status'],
    ['tasks', 'status'],
    ['task_suggestions', 'kind'],
    ['task_suggestions', 'status'],
    ['workflow_versions', 'status'],
    ['execution_plans', 'status'],
  ];
  for (const [table, column] of enumColumns) {
    const info = db.all(`PRAGMA table_info(${table})`).find((c) => c.name === column);
    assert.strictEqual(String(info.type).toUpperCase(), 'INTEGER', `${table}.${column} INTEGER`);
    const ddl = db.get(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
      [table]
    ).sql;
    assert.ok(ddl.includes(`${column} INTEGER`), `${table}.${column} declarado INTEGER`);
    assert.ok(!ddl.includes(`${column} TEXT`), `${table}.${column} sem tipo TEXT legado`);
  }
  const tasksDdl = db.get("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'tasks'").sql;
  assert.match(tasksDdl, /status INTEGER NOT NULL DEFAULT 1 CHECK \(status IN \(1, 2, 3, 4\)\)/, tasksDdl);

  // mapeamento correto: cada literal vira o seu código estável
  assert.strictEqual(db.get('SELECT status FROM contracts WHERE id = 1').status, 1, 'vigente → 1');
  assert.strictEqual(db.get('SELECT status FROM contracts WHERE id = 2').status, 2, 'encerrado → 2');
  const t3 = db.get("SELECT status FROM tasks WHERE title = 'T3'");
  assert.strictEqual(t3.status, 3, "'Revisão' → 3");
  assert.strictEqual(label('tasks.status', t3.status), 'Revisão', 'volta ao texto PT');
  assert.strictEqual(db.get("SELECT status FROM tasks WHERE title = 'T4'").status, 4, 'Concluída → 4');
  const analise = db.get('SELECT kind, status FROM task_suggestions WHERE id = 1');
  assert.strictEqual(analise.kind, 1, 'analise → 1');
  assert.strictEqual(analise.status, 3, 'sugerido → 3');
  assert.strictEqual(db.get('SELECT status FROM task_suggestions WHERE id = 2').status, 2, 'analisando → 2');
  assert.strictEqual(db.get('SELECT status FROM workflow_versions WHERE id = 2').status, 1, 'ativo → 1');
  assert.strictEqual(db.get('SELECT status FROM execution_plans WHERE task_id = 1').status, 2, 'gerado → 2');

  // contagens e ids preservados (nada é reescrito à mão)
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM contracts').c, 2);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM tasks').c, 4);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM task_suggestions').c, 2);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM workflow_versions').c, 2);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM execution_plans').c, 2);
  assert.strictEqual(db.get("SELECT title FROM tasks WHERE id = 3").title, 'T3', 'id seguido');

  // índices parciais recriados em código, não em texto
  const indexes = db
    .all("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL")
    .reduce((acc, row) => Object.assign(acc, { [row.name]: row.sql }), {});
  assert.match(indexes.uq_task_suggestions_analisando, /WHERE status = 2$/, indexes.uq_task_suggestions_analisando);
  assert.match(indexes.uq_workflow_versions_ativo, /WHERE status = 1$/, indexes.uq_workflow_versions_ativo);
  assert.match(indexes.idx_tasks_status, /status/, indexes.idx_tasks_status);

  // a invariante continua valendo depois do rebuild (UNIQUE numérico)
  assert.throws(
    () => db.run('INSERT INTO workflow_versions(contract_id, suggestion_id, status) VALUES (1, 1, 1)'),
    /UNIQUE|constraint/i,
    'só 1 workflow ativo por contrato'
  );

  // segunda abertura = no-op: mesmos códigos, mesmas contagens
  database.resetDatabaseCache();
  await database.initSqlDriver();
  const again = database.getDomainDb(legacy.id);
  assert.strictEqual(again.get('SELECT status FROM contracts WHERE id = 1').status, 1);
  assert.strictEqual(again.get("SELECT status FROM tasks WHERE title = 'T3'").status, 3);
  assert.strictEqual(again.get('SELECT COUNT(*) AS c FROM tasks').c, 4);
  assert.strictEqual(again.get('SELECT COUNT(*) AS c FROM task_suggestions').c, 2);
  const againIndexes = again
    .all("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL")
    .reduce((acc, row) => Object.assign(acc, { [row.name]: row.sql }), {});
  assert.match(againIndexes.uq_task_suggestions_analisando, /WHERE status = 2$/);
});

// 00014 (FR-036, AD-004, T011/T012): attachments.category arrives as a lazy
// additive column — legacy rows keep the 'evidence' default, counts survive,
// a reopen does not duplicate the column, and fresh DDL carries the CHECK.
test('00014 category migration: additive column, counts preserved, idempotent', async () => {
  const SQL = await database.initSqlDriver();
  const platform = database.getPlatformDb();

  // legacy domain file: attachments table frozen before the category column
  platform.run('INSERT INTO domains(name, slug) VALUES (?, ?)', ['LegacyAttach', 'legacy-attach']);
  const legacy = platform.get('SELECT id FROM domains WHERE slug = ?', ['legacy-attach']);
  const file = path.join(dataDir, 'domains', `${legacy.id}.db`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const raw = new SQL.Database();
  raw.run(`CREATE TABLE attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    comment_id INTEGER,
    kind TEXT NOT NULL DEFAULT 'file' CHECK (kind IN ('photo','file')),
    path TEXT NOT NULL,
    original_name TEXT,
    uploaded_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  raw.run(
    `INSERT INTO attachments(task_id, kind, path, original_name) VALUES
      (1, 'file', 'uploads/a.pdf', 'a.pdf'),
      (2, 'photo', 'uploads/b.png', 'b.png')`
  );
  fs.writeFileSync(file, Buffer.from(raw.export()));
  raw.close();

  // opening through the app path migrates the column in, once
  const db = database.getDomainDb(legacy.id);
  const columns = db.all('PRAGMA table_info(attachments)').map((column) => column.name);
  assert.strictEqual(
    columns.filter((name) => name === 'category').length,
    1,
    'category migrated exactly once'
  );
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM attachments').c, 2, 'contagens preservadas');
  const migrated = db.all('SELECT category FROM attachments ORDER BY id');
  assert.deepStrictEqual(
    migrated.map((row) => row.category),
    ['evidence', 'evidence'],
    'legacy rows default to evidence'
  );
  const ddl = db.get(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'attachments'"
  ).sql;
  // 00018 estende o CHECK com 'payment'; a migração 00014 só exige que as
  // categorias originais continuem aceitas (a reconstrução aditiva preserva
  // contagens e ids).
  for (const category of ['evidence', 'documentation', 'chat', 'payment']) {
    assert.ok(ddl.includes(`'${category}'`), `CHECK aceita '${category}' após a migração: ${ddl}`);
  }

  // reopen: no duplicate column, no data change
  database.resetDatabaseCache();
  await database.initSqlDriver();
  const again = database.getDomainDb(legacy.id);
  const againColumns = again.all('PRAGMA table_info(attachments)').map((column) => column.name);
  assert.strictEqual(
    againColumns.filter((name) => name === 'category').length,
    1,
    'reabertura não duplica a coluna'
  );
  assert.strictEqual(again.get('SELECT COUNT(*) AS c FROM attachments').c, 2, 'contagens na reabertura');
  assert.strictEqual(
    again.get('SELECT category FROM attachments WHERE id = 1').category,
    'evidence',
    'valor legado estável'
  );

  // the constraint holds on migrated files
  assert.throws(
    () =>
      again.run(
        `INSERT INTO attachments(task_id, path, category) VALUES (3, 'uploads/c.png', 'other')`
      ),
    /CHECK/i,
    'categoria fora da lista recusada'
  );

  // fresh domain: born with the column and the constraint
  platform.run('INSERT INTO domains(name, slug) VALUES (?, ?)', ['FreshAttach', 'fresh-attach']);
  const fresh = platform.get('SELECT id FROM domains WHERE slug = ?', ['fresh-attach']);
  const freshDb = database.createDomainDb(fresh.id);
  const freshColumns = freshDb.all('PRAGMA table_info(attachments)').map((column) => column.name);
  assert.ok(freshColumns.includes('category'), 'fresh DDL carrega category');
  freshDb.run(
    `INSERT INTO attachments(task_id, path, category) VALUES (1, 'uploads/d.pdf', 'documentation')`
  );
  assert.strictEqual(
    freshDb.get('SELECT category FROM attachments').category,
    'documentation',
    'documentação gravável no banco novo'
  );
  assert.throws(
    () => freshDb.run(`INSERT INTO attachments(task_id, path, category) VALUES (2, 'uploads/e.png', 'x')`),
    /CHECK/i,
    'fresh DDL também valida'
  );
});

// 00016 E015 (T001): 3 tabelas novas + CHECK de users alargado por rebuild
// in-place no padrão E011 (ids/REFERENCES preservados).
test('00016 migrateSchema convites e CHECK visitante', async () => {
  const SQL = await database.initSqlDriver();
  await database.initDatabase();

  const fresh = database.createDomainDb(991);
  for (const table of ['invites', 'invite_emails', 'access_history']) {
    assert.ok(
      fresh.get("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [table]),
      `${table} criada`
    );
  }
  const freshSql = fresh.get("SELECT sql FROM sqlite_master WHERE name='users'").sql;
  assert.match(freshSql, /visitante/);
  fresh.run("INSERT INTO users(name, email, password_hash, role) VALUES ('V','v@991.test','h','visitante')");

  // Domínio legado (CHECK sem visitante) é reconstruído na abertura.
  const legacyFile = path.join(dataDir, 'domains', '992.db');
  const legacy = new SQL.Database();
  legacy.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    username TEXT UNIQUE, password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','gestor','prestador','auditor')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  legacy.run("INSERT INTO users(id, name, email, password_hash, role) VALUES (7,'Legado','l@992.test','h','gestor')");
  fs.writeFileSync(legacyFile, Buffer.from(legacy.export()));

  const migrated = database.getDomainDb(992);
  const migratedSql = migrated.get("SELECT sql FROM sqlite_master WHERE name='users'").sql;
  assert.match(migratedSql, /visitante/, 'CHECK alargado no rebuild');
  assert.strictEqual(migrated.get('SELECT id FROM users WHERE email = ?', ['l@992.test']).id, 7, 'id preservado');
  migrated.run("INSERT INTO users(name, email, password_hash, role) VALUES ('V','v2@992.test','h','visitante')");
  assert.ok(migrated.get("SELECT id FROM users WHERE role = 'visitante'"));
  assert.ok(migrated.get("SELECT name FROM sqlite_master WHERE type='table' AND name='invites'"));
});

// 00016 E016 (T001): canal por contrato, análise de documento e alertas
// extraídos. Tabelas novas no banco fresco; rebuild legado de attachments
// preserva ids e adiciona message_id + categoria chat (FR-051/054/055/060).
test('00016 E016 chat tables + attachments rebuild', async () => {
  const SQL = await database.initSqlDriver();
  await database.initDatabase();

  const fresh = database.createDomainDb(993);
  for (const table of ['chat_messages', 'document_analyses', 'extracted_alerts']) {
    assert.ok(
      fresh.get("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [table]),
      `${table} criada`
    );
  }
  const chatSql = fresh.get("SELECT sql FROM sqlite_master WHERE name='chat_messages'").sql;
  assert.match(chatSql, /length\(body\) <= 4000/);
  const alertsSql = fresh.get("SELECT sql FROM sqlite_master WHERE name='extracted_alerts'").sql;
  assert.match(alertsSql, /UNIQUE \(contract_id, source_kind, source_id\)/);
  const attachColumns = fresh.all('PRAGMA table_info(attachments)').map((c) => c.name);
  assert.ok(attachColumns.includes('message_id'), 'message_id no banco fresco');
  const attachSql = fresh.get("SELECT sql FROM sqlite_master WHERE name='attachments'").sql;
  assert.match(attachSql, /'chat'/, 'categoria chat no CHECK');

  // Domínio legado: attachments sem message_id/categoria → rebuild aditivo.
  const legacyFile = path.join(dataDir, 'domains', '994.db');
  const legacy = new SQL.Database();
  legacy.run(`CREATE TABLE attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    comment_id INTEGER,
    kind TEXT NOT NULL DEFAULT 'file' CHECK (kind IN ('photo','file')),
    path TEXT NOT NULL,
    original_name TEXT,
    uploaded_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  legacy.run("INSERT INTO attachments(id, task_id, path) VALUES (42, 1, 'uploads/legado.png')");
  fs.writeFileSync(legacyFile, Buffer.from(legacy.export()));
  legacy.close();

  const migrated = database.getDomainDb(994);
  const cols = migrated.all('PRAGMA table_info(attachments)').map((c) => c.name);
  assert.ok(cols.includes('message_id'), 'message_id adicionado no rebuild');
  assert.strictEqual(migrated.get('SELECT id FROM attachments').id, 42, 'id preservado');
  assert.strictEqual(migrated.get('SELECT category FROM attachments').category, 'evidence');
  migrated.run(
    "INSERT INTO attachments(message_id, path, category) VALUES (1, 'uploads/chat.png', 'chat')",
    []
  );
  assert.strictEqual(migrated.get("SELECT COUNT(*) AS c FROM attachments WHERE category = 'chat'").c, 1);
});

// 00020 E018 (T001): parcelas, pagamentos e rebuild de attachments para
// payment_id/categoria payment, sem perder linhas nem ids do E016 (FR-064/065).
test('00020 E018 finance tables + payment attachments rebuild', async () => {
  const SQL = await database.initSqlDriver();
  await database.initDatabase();

  const fresh = database.createDomainDb(2000);
  for (const table of ['contract_installments', 'contract_payments']) {
    assert.ok(
      fresh.get("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [table]),
      `${table} criada`
    );
  }
  const cols = fresh.all('PRAGMA table_info(attachments)').map((c) => c.name);
  assert.ok(cols.includes('payment_id'), 'payment_id no banco fresco');
  assert.ok(cols.includes('message_id'), 'message_id do E016 preservado');
  const sql = fresh.get("SELECT sql FROM sqlite_master WHERE name='attachments'").sql;
  assert.match(sql, /'payment'/, 'categoria payment no CHECK');
  assert.match(sql, /'chat'/, 'categoria chat do E016 preservada');
  const idx = fresh.all("SELECT name FROM sqlite_master WHERE type='index'").map((r) => r.name);
  for (const name of ['idx_installments_contract', 'idx_payments_installment', 'idx_payments_contract', 'idx_attachments_payment']) {
    assert.ok(idx.includes(name), `índice ${name}`);
  }
  fresh.run("INSERT INTO contracts(id, name, start_date, forecast_date) VALUES (1, 'C', '2026-01-01', '2026-12-31')");
  fresh.run("INSERT INTO contract_installments(id, contract_id, description, amount_cents, due_date) VALUES (1, 1, 'P', 1000, '2026-11-01')");
  fresh.run("INSERT INTO contract_payments(id, installment_id, contract_id, amount_cents, paid_at) VALUES (7, 1, 1, 500, '2026-11-02')");
  fresh.run("INSERT INTO attachments(payment_id, path, category) VALUES (7, 'uploads/r.pdf', 'payment')");
  assert.strictEqual(fresh.get("SELECT COUNT(*) AS c FROM attachments WHERE category = 'payment'").c, 1);

  // Domínio legado: attachments do E016 (sem payment_id) → rebuild aditivo preserva
  // id, message_id e categoria chat.
  const legacyFile = path.join(dataDir, 'domains', '20000.db');
  const legacy = new SQL.Database();
  legacy.run(`CREATE TABLE attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    comment_id INTEGER,
    message_id INTEGER,
    kind TEXT NOT NULL DEFAULT 'file' CHECK (kind IN ('photo','file')),
    path TEXT NOT NULL,
    original_name TEXT,
    uploaded_by INTEGER,
    category TEXT NOT NULL DEFAULT 'evidence' CHECK (category IN ('evidence','documentation','chat')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (task_id IS NOT NULL OR message_id IS NOT NULL)
  )`);
  legacy.run("INSERT INTO attachments(id, message_id, path, category) VALUES (9, 3, 'uploads/chat.png', 'chat')");
  fs.writeFileSync(legacyFile, Buffer.from(legacy.export()));
  legacy.close();

  const migrated = database.getDomainDb(20000);
  const migratedCols = migrated.all('PRAGMA table_info(attachments)').map((c) => c.name);
  assert.ok(migratedCols.includes('payment_id'), 'payment_id adicionado no rebuild');
  const row = migrated.get('SELECT * FROM attachments WHERE id = 9');
  assert.strictEqual(row.message_id, 3, 'message_id preservado');
  assert.strictEqual(row.category, 'chat', 'categoria chat preservada');
  migrated.run("INSERT INTO attachments(payment_id, path, category) VALUES (1, 'uploads/recibo.pdf', 'payment')", []);
  assert.strictEqual(migrated.get("SELECT COUNT(*) AS c FROM attachments WHERE category = 'payment'").c, 1);
});

// 00021 E019 (T002): rebuild guardado de attachments para reviewed_by/at,
// preservando ids, categoria, message_id e payment_id dos rebuilds anteriores.
test('00021 E019 document review columns rebuild preserves rows and ids', async () => {
  const SQL = await database.initSqlDriver();
  await database.initDatabase();

  const fresh = database.createDomainDb(2100);
  const cols = fresh.all('PRAGMA table_info(attachments)').map((c) => c.name);
  assert.ok(cols.includes('reviewed_by'), 'reviewed_by no banco fresco');
  assert.ok(cols.includes('reviewed_at'), 'reviewed_at no banco fresco');
  assert.ok(cols.includes('message_id'), 'message_id do E016 preservado');
  assert.ok(cols.includes('payment_id'), 'payment_id do E018 preservado');

  // Banco no esquema E018: sem as colunas de conferência.
  const legacyFile = path.join(dataDir, 'domains', '21000.db');
  const legacy = new SQL.Database();
  legacy.run(`CREATE TABLE attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    comment_id INTEGER,
    message_id INTEGER,
    payment_id INTEGER,
    kind TEXT NOT NULL DEFAULT 'file' CHECK (kind IN ('photo','file')),
    path TEXT NOT NULL,
    original_name TEXT,
    uploaded_by INTEGER,
    category TEXT NOT NULL DEFAULT 'evidence' CHECK (category IN ('evidence','documentation','chat','payment')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (task_id IS NOT NULL OR message_id IS NOT NULL OR payment_id IS NOT NULL)
  )`);
  legacy.run("INSERT INTO attachments(id, message_id, path, category) VALUES (9, 3, 'uploads/chat.png', 'chat')");
  fs.writeFileSync(legacyFile, Buffer.from(legacy.export()));
  legacy.close();

  const migrated = database.getDomainDb(21000);
  const migratedCols = migrated.all('PRAGMA table_info(attachments)').map((c) => c.name);
  assert.ok(migratedCols.includes('reviewed_by'), 'reviewed_by adicionado no rebuild');
  assert.ok(migratedCols.includes('reviewed_at'), 'reviewed_at adicionado no rebuild');
  const row = migrated.get('SELECT * FROM attachments WHERE id = 9');
  assert.strictEqual(row.message_id, 3, 'message_id preservado');
  assert.strictEqual(row.category, 'chat', 'categoria preservada');
  assert.strictEqual(row.reviewed_by, null, 'sem conferência anterior');
  migrated.run("INSERT INTO attachments(payment_id, path, category) VALUES (1, 'uploads/recibo.pdf', 'payment')", []);
  assert.strictEqual(migrated.get("SELECT COUNT(*) AS c FROM attachments WHERE category = 'payment'").c, 1);

  const again = database.getDomainDb(21000);
  assert.strictEqual(again.all('PRAGMA table_info(attachments)').filter((c) => c.name === 'reviewed_by').length, 1, 'idempotente');
});
