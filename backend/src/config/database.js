'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// sql.js driver factory (AD-001)
// better-sqlite3 native build failed in this environment, so sql.js (WASM) is
// the driver for both the platform database and every per-domain database.
// Data layout (AD-002, FR-024): data/platform.db + data/domains/<id>.db.
// ---------------------------------------------------------------------------

let SQL = null;

function dataDir() {
  return process.env.DATA_DIR || path.resolve(__dirname, '..', '..', '..', 'data');
}

async function initSqlDriver() {
  if (SQL) return SQL;
  const initSqlJs = require('sql.js');
  const distDir = path.dirname(require.resolve('sql.js'));
  SQL = await initSqlJs({ locateFile: (file) => path.join(distDir, file) });
  return SQL;
}

function assertDriver() {
  if (!SQL) {
    throw new Error('initSqlDriver() must complete before any database access');
  }
}

// Thin wrapper around a sql.js Database: prepared reads, persist-on-write.
class Sqlite {
  constructor(db, filePath, kind) {
    this.db = db;
    this.filePath = filePath;
    this.kind = kind;
  }

  all(sql, params = []) {
    const stmt = this.db.prepare(sql);
    try {
      if (params.length) stmt.bind(normalize(params));
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      return rows;
    } finally {
      stmt.free();
    }
  }

  get(sql, params = []) {
    return this.all(sql, params)[0] ?? null;
  }

  run(sql, params = []) {
    if (params.length) this.db.run(sql, normalize(params));
    else this.db.run(sql);
    this.persist();
    return { changes: this.db.getRowsModified() };
  }

  // Single persist for bulk writes (used by perf seeding, FR-026).
  runBatch(items) {
    for (const item of items) {
      if (item.params && item.params.length) this.db.run(item.sql, normalize(item.params));
      else this.db.run(item.sql);
    }
    this.persist();
    return { changes: this.db.getRowsModified() };
  }

  persist() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, Buffer.from(this.db.export()));
  }
}

function normalize(params) {
  return params.map((value) => (value === undefined ? null : value));
}

const PLATFORM_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS domains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS system_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'system_admin',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

const DOMAIN_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','gestor','prestador')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS finalidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS contracts (
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
  )`,
  `CREATE TABLE IF NOT EXISTS contract_prestadores (
    contract_id INTEGER NOT NULL REFERENCES contracts(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    linked_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (contract_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL REFERENCES contracts(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'A Fazer' CHECK (status IN ('A Fazer','Em Progresso','Revisão','Concluída')),
    priority TEXT NOT NULL DEFAULT 'medium',
    assignee_id INTEGER REFERENCES users(id),
    due_date TEXT,
    completed_text TEXT,
    completed_at TEXT,
    completed_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS task_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    user_id INTEGER,
    action TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS task_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    path TEXT NOT NULL,
    uploaded_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    user_id INTEGER NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    comment_id INTEGER REFERENCES comments(id),
    kind TEXT NOT NULL DEFAULT 'file' CHECK (kind IN ('photo','file')),
    path TEXT NOT NULL,
    original_name TEXT,
    uploaded_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

// FR-026 / HINT-005: index hot paths before paged list queries.
const DOMAIN_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status)',
  'CREATE INDEX IF NOT EXISTS idx_contracts_finalidade ON contracts(finalidade_id)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_contract ON tasks(contract_id)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id)',
  'CREATE INDEX IF NOT EXISTS idx_cp_user ON contract_prestadores(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id)',
  'CREATE INDEX IF NOT EXISTS idx_attachments_task ON attachments(task_id)',
];

function ensureIndexes(wrapper) {
  const statements = wrapper.kind === 'platform'
    ? ['CREATE INDEX IF NOT EXISTS idx_domains_status ON domains(status)']
    : DOMAIN_INDEXES;
  for (const sql of statements) wrapper.db.run(sql);
}

function applySchema(wrapper, statements) {
  for (const sql of statements) wrapper.db.run(sql);
}

function openDb(file, kind, schema) {
  const exists = fs.existsSync(file);
  const db = exists ? new SQL.Database(fs.readFileSync(file)) : new SQL.Database();
  const wrapper = new Sqlite(db, file, kind);
  applySchema(wrapper, schema);
  ensureIndexes(wrapper);
  if (!exists) wrapper.persist();
  return wrapper;
}

function seedSystemAdmin(platform) {
  const row = platform.get('SELECT COUNT(*) AS c FROM system_users');
  if (row.c > 0) return;
  const bcrypt = require('bcryptjs');
  const email = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
  const password = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';
  platform.run(
    'INSERT INTO system_users(name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    ['Platform Admin', email, bcrypt.hashSync(password, 10), 'system_admin']
  );
}

let platformDb = null;
const domainCache = new Map();

function getPlatformDb() {
  assertDriver();
  if (!platformDb) {
    platformDb = openDb(path.join(dataDir(), 'platform.db'), 'platform', PLATFORM_SCHEMA);
    seedSystemAdmin(platformDb);
  }
  return platformDb;
}

function getDomainDb(domainId) {
  assertDriver();
  const id = Number(domainId);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`invalid domainId: ${domainId}`);
  if (domainCache.has(id)) return domainCache.get(id);
  const file = path.join(dataDir(), 'domains', `${id}.db`);
  const wrapper = openDb(file, 'domain', DOMAIN_SCHEMA);
  domainCache.set(id, wrapper);
  return wrapper;
}

// FR-001: enabling a domain physically creates its database file.
function createDomainDb(domainId) {
  const wrapper = getDomainDb(domainId);
  wrapper.persist();
  return wrapper;
}

// Test/support hook: drop cached handles (new DATA_DIR between suites).
function resetDatabaseCache() {
  platformDb = null;
  domainCache.clear();
  SQL = null;
}

async function initDatabase() {
  await initSqlDriver();
  getPlatformDb();
}

module.exports = {
  initSqlDriver,
  initDatabase,
  getPlatformDb,
  getDomainDb,
  createDomainDb,
  ensureIndexes,
  resetDatabaseCache,
};
