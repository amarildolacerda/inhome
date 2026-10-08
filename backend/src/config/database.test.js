'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { setupDataDir } = require('../support/testenv');

const dataDir = setupDataDir();
const database = require('../config/database');

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
    finalidade_id INTEGER REFERENCES finalidades(id),
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
    "INSERT INTO contracts(name, finalidade_id, start_date, forecast_date) VALUES ('C-legacy', 2, '2026-01-01', '2026-12-31')"
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
    finalidade_id INTEGER,
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
    "INSERT INTO task_suggestions(contract_id, definitions_id, kind, status) VALUES (1, 1, 'analise', 'analisando')"
  );
  assert.throws(
    () =>
      freshDb.run(
        "INSERT INTO task_suggestions(contract_id, definitions_id, kind, status) VALUES (1, 1, 'revisao', 'analisando')"
      ),
    /UNIQUE|constraint/i,
    'só 1 registro analisando por contrato'
  );
  freshDb.run(
    "INSERT INTO workflow_versions(contract_id, suggestion_id, status) VALUES (1, 1, 'ativo')"
  );
  assert.throws(
    () =>
      freshDb.run(
        "INSERT INTO workflow_versions(contract_id, suggestion_id, status) VALUES (1, 1, 'ativo')"
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
