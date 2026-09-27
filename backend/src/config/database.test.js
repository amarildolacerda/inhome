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
