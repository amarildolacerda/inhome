'use strict';

const fs = require('fs');
const path = require('path');
const { code, sqlCodes, sqlLegacyCase } = require('./enums');

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
    this._inTx = false;
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
    if (!this._inTx) this.persist();
    return { changes: this.db.getRowsModified() };
  }

  // Single persist for bulk writes (used by perf seeding, FR-026).
  runBatch(items) {
    for (const item of items) {
      if (item.params && item.params.length) this.db.run(item.sql, normalize(item.params));
      else this.db.run(item.sql);
    }
    if (!this._inTx) this.persist();
    return { changes: this.db.getRowsModified() };
  }

  // FR-009/FR-010 (and FR-008 refinement): all-or-nothing writes. Statements
  // inside the callback skip persist(); the result reaches disk once, on
  // COMMIT. An error rolls everything back — no half-materialized workflow,
  // no orphan suggestion row — and the callback's error propagates.
  transaction(fn) {
    if (this._inTx) return fn(this); // nested call joins the open transaction
    this.db.run('BEGIN');
    this._inTx = true;
    try {
      const out = fn(this);
      this.db.run('COMMIT');
      this._inTx = false;
      this.persist();
      return out;
    } catch (err) {
      try {
        this.db.run('ROLLBACK');
      } catch {
        // ROLLBACK can only fail if the transaction was already gone
      }
      this._inTx = false;
      this.persist();
      throw err;
    }
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
    alert_windows TEXT,
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

// E011 (FR-005): single source for the users DDL — used by fresh domain
// creation (DOMAIN_SCHEMA) and by the legacy role-CHECK rebuild in
// migrateSchema: SQLite cannot ALTER a CHECK constraint, so domains created
// before the auditor role rebuild the table in place, same rows and ids.
const USERS_DDL = `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    username TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','gestor','prestador','auditor')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`;

// Fase 3 da convenção de nomenclatura (2026-10-12): os 6 enums de dado são
// INTEGER no banco (código estável base 1, fonte única em config/enums.js) e a
// API segue expondo texto PT. Cada DDL abaixo é single source — usado pelo
// CREATE TABLE fresh E pelo rebuild de migração preguiçosa (enumRebuild), do
// mesmo jeito que USERS_DDL amarra o rebuild do role CHECK (E011).
const CONTRACTS_DDL = `CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    object TEXT,
    purpose_id INTEGER REFERENCES purposes(id),
    start_date TEXT NOT NULL,
    forecast_date TEXT NOT NULL,
    status INTEGER NOT NULL DEFAULT ${code('contracts.status', 'vigente')} CHECK (status IN ${sqlCodes('contracts.status', 'vigente', 'encerrado')}),
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`;

const TASKS_DDL = `CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL REFERENCES contracts(id),
    title TEXT NOT NULL,
    description TEXT,
    status INTEGER NOT NULL DEFAULT ${code('tasks.status', 'A Fazer')} CHECK (status IN ${sqlCodes('tasks.status', 'A Fazer', 'Em Progresso', 'Revisão', 'Concluída')}),
    priority TEXT NOT NULL DEFAULT 'medium',
    assignee_id INTEGER REFERENCES users(id),
    due_date TEXT,
    completed_text TEXT,
    completed_at TEXT,
    completed_by INTEGER,
    workflow_version_id INTEGER REFERENCES workflow_versions(id),
    suggestion_item_id INTEGER REFERENCES suggestion_items(id),
    opt_in_by INTEGER REFERENCES users(id),
    opt_in_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`;

const TASK_SUGGESTIONS_DDL = `CREATE TABLE IF NOT EXISTS task_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL REFERENCES contracts(id),
    definitions_id INTEGER NOT NULL REFERENCES contract_definitions(id),
    kind INTEGER NOT NULL DEFAULT ${code('task_suggestions.kind', 'analise')} CHECK (kind IN ${sqlCodes('task_suggestions.kind', 'analise', 'revisao')}),
    status INTEGER NOT NULL DEFAULT ${code('task_suggestions.status', 'pendente')} CHECK (status IN ${sqlCodes('task_suggestions.status', 'pendente', 'analisando', 'sugerido', 'falha', 'aprovada')}),
    refined_from INTEGER REFERENCES task_suggestions(id),
    refine_instructions TEXT,
    error TEXT,
    context_json TEXT,
    started_at TEXT,
    finished_at TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`;

const WORKFLOW_VERSIONS_DDL = `CREATE TABLE IF NOT EXISTS workflow_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL REFERENCES contracts(id),
    suggestion_id INTEGER NOT NULL REFERENCES task_suggestions(id),
    status INTEGER NOT NULL DEFAULT ${code('workflow_versions.status', 'ativo')} CHECK (status IN ${sqlCodes('workflow_versions.status', 'ativo', 'substituido')}),
    activated_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`;

const EXECUTION_PLANS_DDL = `CREATE TABLE IF NOT EXISTS execution_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) UNIQUE,
    status INTEGER NOT NULL DEFAULT ${code('execution_plans.status', 'pendente')} CHECK (status IN ${sqlCodes('execution_plans.status', 'pendente', 'gerado', 'falha')}),
    passos TEXT,
    criterios TEXT,
    riscos TEXT,
    error TEXT,
    requested_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`;

const DOMAIN_SCHEMA = [
  USERS_DDL,
  `CREATE TABLE IF NOT EXISTS purposes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  CONTRACTS_DDL,
  `CREATE TABLE IF NOT EXISTS contract_providers (
    contract_id INTEGER NOT NULL REFERENCES contracts(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    linked_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (contract_id, user_id)
  )`,
  TASKS_DDL,
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
  // --- 00003: Workflow Assistido OpenCode (7 tabelas novas) ---
  `CREATE TABLE IF NOT EXISTS contract_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL REFERENCES contracts(id),
    version INTEGER NOT NULL,
    finalidade TEXT NOT NULL,
    limitacoes TEXT NOT NULL,
    alvo TEXT NOT NULL,
    escopo TEXT NOT NULL,
    premissas TEXT NOT NULL,
    entregaveis TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (contract_id, version)
  )`,
  TASK_SUGGESTIONS_DDL,
  `CREATE TABLE IF NOT EXISTS suggestion_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suggestion_id INTEGER NOT NULL REFERENCES task_suggestions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    justification TEXT NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    removed INTEGER NOT NULL DEFAULT 0,
    target_task_id INTEGER REFERENCES tasks(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  WORKFLOW_VERSIONS_DDL,
  EXECUTION_PLANS_DDL,
  `CREATE TABLE IF NOT EXISTS revision_conflicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suggestion_id INTEGER NOT NULL REFERENCES task_suggestions(id),
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    status_alvo TEXT NOT NULL,
    motivo TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS entity_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('definition','suggestion','execution_plan')),
    entity_id INTEGER NOT NULL,
    version INTEGER NOT NULL,
    snapshot TEXT,
    author_id INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (entity_type, entity_id, version)
  )`,
];

// FR-026 / HINT-005: index hot paths before paged list queries.
const DOMAIN_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status)',
  'CREATE INDEX IF NOT EXISTS idx_contracts_purpose ON contracts(purpose_id)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_contract ON tasks(contract_id)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id)',
  // --- 00007 E007: filtered columns without index (p95 / FR-003) ---
  'CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)',
  'CREATE INDEX IF NOT EXISTS idx_cp_user ON contract_providers(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id)',
  'CREATE INDEX IF NOT EXISTS idx_attachments_task ON attachments(task_id)',
  // --- 00003: hot paths + as duas invariantes de workflow ---
  'CREATE INDEX IF NOT EXISTS idx_contract_definitions_contract ON contract_definitions(contract_id)',
  'CREATE INDEX IF NOT EXISTS idx_task_suggestions_contract ON task_suggestions(contract_id)',
  'CREATE INDEX IF NOT EXISTS idx_task_suggestions_definitions ON task_suggestions(definitions_id)',
  // Só 1 análise em andamento por contrato: revisão durante análise aguarda
  // a anterior (edge case do spec; kind compartilha o mesmo contrato).
  "CREATE UNIQUE INDEX IF NOT EXISTS uq_task_suggestions_analisando ON task_suggestions(contract_id) WHERE status = " +
    code('task_suggestions.status', 'analisando'),
  'CREATE INDEX IF NOT EXISTS idx_suggestion_items_suggestion ON suggestion_items(suggestion_id)',
  'CREATE INDEX IF NOT EXISTS idx_workflow_versions_contract ON workflow_versions(contract_id)',
  // 1 workflow oficial (ativo) por contrato; substituição via UPDATE de status.
  "CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_versions_ativo ON workflow_versions(contract_id) WHERE status = " +
    code('workflow_versions.status', 'ativo'),
  'CREATE INDEX IF NOT EXISTS idx_tasks_workflow_version ON tasks(workflow_version_id)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_suggestion_item ON tasks(suggestion_item_id)',
  'CREATE INDEX IF NOT EXISTS idx_revision_conflicts_suggestion ON revision_conflicts(suggestion_id)',
  'CREATE INDEX IF NOT EXISTS idx_revision_conflicts_task ON revision_conflicts(task_id)',
  // --- 00011 E005: hot sort da página do painel (AD-005) ---
  'CREATE INDEX IF NOT EXISTS idx_contracts_forecast ON contracts(forecast_date)',
  'CREATE INDEX IF NOT EXISTS idx_entity_history_entity ON entity_history(entity_type, entity_id)',
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

function tableExists(wrapper, name) {
  return Boolean(
    wrapper.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", [name])
  );
}

// Lazy migration hook, run on every open of a domain database. It must run
// BEFORE applySchema: the table renames below need the legacy Portuguese table
// to be the only dictionary/link table present, otherwise CREATE TABLE IF NOT
// EXISTS would land an empty `purposes` beside a populated `finalidades` and
// the rename guard would never fire.
function migrateSchema(wrapper) {
  // 00009 (FR-005): additive lazy migration on the platform side — per-domain
  // alert windows as nullable TEXT (JSON array); NULL means the built-in
  // [90,60,30,15] default, so fresh domains need zero setup. Same guard
  // pattern as `username` on users: PRAGMA table_info + single ALTER.
  if (wrapper.kind === 'platform') {
    if (tableExists(wrapper, 'domains')) {
      const domainColumns = wrapper.all('PRAGMA table_info(domains)').map((column) => column.name);
      if (!domainColumns.includes('alert_windows')) {
        wrapper.run('ALTER TABLE domains ADD COLUMN alert_windows TEXT');
      }
    }
    return;
  }

  if (wrapper.kind !== 'domain') return;

  // 00009 (FR-001): additive lazy creation of alert_events (Q5 pattern from
  // the purposes/contract_providers renames): runs on every open of a domain
  // database BEFORE applySchema, guarded so it fires exactly once per file.
  // UNIQUE(contract_id, window_days) is the dedup backbone of E004: the row
  // is written BEFORE any email/room side effect (FR-003).
  if (!tableExists(wrapper, 'alert_events')) {
    wrapper.run(
      `CREATE TABLE alert_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contract_id INTEGER NOT NULL,
        window_days INTEGER NOT NULL,
        email_status TEXT NOT NULL CHECK (email_status IN ('sent','failed','skipped')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(contract_id, window_days)
      )`
    );
  }

  // E011 (FR-002/FR-003): classificação corrente de tarefa executada —
  // mesmo padrão do alert_events acima: CREATE TABLE IF NOT EXISTS guardado
  // por tableExists em migrateSchema, antes de applySchema. Dispara uma vez
  // por arquivo; bancos antigos abrem sem linhas (visão vazia, 200) e bancos
  // novos recebem a tabela na abertura de criação.
  if (!tableExists(wrapper, 'task_classifications')) {
    wrapper.run(
      `CREATE TABLE task_classifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL UNIQUE REFERENCES tasks(id),
        state TEXT NOT NULL CHECK (state IN ('atendido plenamente','atendido com resalva','deficiente (a corrigir)')),
        note TEXT,
        classified_by INTEGER NOT NULL REFERENCES users(id),
        classified_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    );
  }

  // English is the table-naming standard: rename the two legacy Portuguese
  // tables in place, preserving every row. ALTER TABLE ... RENAME TO rewrites
  // the REFERENCES clause of dependent tables (contracts -> purposes) and of
  // indexes (idx_cp_user -> contract_providers) to the new name, verified
  // against sql.js / SQLite 3.49.1, so foreign keys keep resolving without
  // touching stored data. Idempotent and side-effect free for databases that
  // are fresh (legacy table never existed) or already migrated (new table
  // exists): each rename fires only when the old name exists and the new one
  // does not.
  const legacyRenames = [
    ['finalidades', 'purposes'],
    ['contract_prestadores', 'contract_providers'],
  ];
  for (const [legacyTable, englishTable] of legacyRenames) {
    if (tableExists(wrapper, legacyTable) && !tableExists(wrapper, englishTable)) {
      wrapper.run(`ALTER TABLE ${legacyTable} RENAME TO ${englishTable}`);
    }
  }

  // English is the column-naming standard: contracts.finalidade_id becomes
  // purpose_id. ALTER TABLE ... RENAME COLUMN (sql.js / SQLite 3.49.1) rewrites
  // the REFERENCES purposes(id) clause in place, so the FK keeps resolving
  // without touching stored data. RENAME COLUMN also rewrites the definition
  // of every dependent index but keeps the index NAME, so the legacy
  // idx_contracts_finalidade is dropped and recreated as idx_contracts_purpose.
  // Guarded by the legacy column itself: fresh files are born with purpose_id
  // and a migrated file skips the block entirely (second open is a no-op).
  if (tableExists(wrapper, 'contracts')) {
    const contractColumns = wrapper.all('PRAGMA table_info(contracts)').map((column) => column.name);
    if (contractColumns.includes('finalidade_id')) {
      wrapper.run('ALTER TABLE contracts RENAME COLUMN finalidade_id TO purpose_id');
      wrapper.run('DROP INDEX IF EXISTS idx_contracts_finalidade');
      wrapper.run('CREATE INDEX IF NOT EXISTS idx_contracts_purpose ON contracts(purpose_id)');
    }
  }

  // Domain databases created before the username column: SQLite cannot add a
  // UNIQUE constraint through ALTER, so the column lands nullable and
  // uniqueness is enforced app-level in routes/users.js (plus the UNIQUE
  // constraint in DOMAIN_SCHEMA for freshly created databases).
  if (tableExists(wrapper, 'users')) {
    const columns = wrapper.all('PRAGMA table_info(users)').map((column) => column.name);
    if (!columns.includes('username')) {
      wrapper.run('ALTER TABLE users ADD COLUMN username TEXT');
    }

    // E011 (FR-005): widen the role CHECK to accept `auditor`. SQLite cannot
    // ALTER a CHECK constraint, so the table is rebuilt in place: copy rows
    // (ids preserved) into a table with the current DDL, drop the old one,
    // rename the copy. The copy → drop → rename order never rewrites the
    // REFERENCES clauses other tables hold on `users`, with foreign_keys on
    // or off. Runs after the username ALTER above; the guard fires only on
    // schemas frozen before E011 (checked on sqlite_master, so fresh files
    // created by applySchema skip it entirely).
    const usersSql = wrapper.get(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'"
    )?.sql;
    if (usersSql && usersSql.includes("'prestador'") && !usersSql.includes("'auditor'")) {
      wrapper.run(
        USERS_DDL.replace('CREATE TABLE IF NOT EXISTS users', 'CREATE TABLE users_e011')
      );
      wrapper.run(
        `INSERT INTO users_e011(id, name, email, username, password_hash, role, active, created_at, updated_at)
         SELECT id, name, email, username, password_hash, role, active, created_at, updated_at FROM users`
      );
      wrapper.run('DROP TABLE users');
      wrapper.run('ALTER TABLE users_e011 RENAME TO users');
    }
  }

  // 00003 (FR-010/FR-001): additive lazy migration of the 4 workflow columns
  // on `tasks`, same guard pattern as `username`. Pre-00003 tasks keep
  // workflow_version_id IS NULL (outside the workflow); nothing is rewritten
  // or deleted. Runs before applySchema, so on legacy files the new parent
  // tables (workflow_versions, suggestion_items) do not exist yet — SQLite
  // resolves REFERENCES at DML time and sql.js leaves foreign_keys OFF.
  if (tableExists(wrapper, 'tasks')) {
    const taskColumns = wrapper.all('PRAGMA table_info(tasks)').map((column) => column.name);
    const additiveColumns = [
      ['workflow_version_id', 'INTEGER REFERENCES workflow_versions(id)'],
      ['suggestion_item_id', 'INTEGER REFERENCES suggestion_items(id)'],
      ['opt_in_by', 'INTEGER REFERENCES users(id)'],
      ['opt_in_at', 'TEXT'],
    ];
    for (const [name, type] of additiveColumns) {
      if (!taskColumns.includes(name)) {
        wrapper.run(`ALTER TABLE tasks ADD COLUMN ${name} ${type}`);
      }
    }
  }

  // Fase 3 da convenção de nomenclatura (2026-10-12): os 6 enums de dado
  // passam a ser INTEGER no banco (código base 1, fonte única em enums.js) e a
  // API continua expondo texto PT (tradução na borda pelo backend). SQLite
  // não altera tipo nem CHECK de coluna, então cada tabela é reconstruída no
  // lugar pelo precedente do rebuild do role CHECK em `users` (E011): CREATE
  // temporário com o DDL atual, INSERT ... SELECT com CASE mapeando cada
  // literal antigo para o seu código, drop + rename. A guarda é o tipo
  // declarado da coluna (PRAGMA table_info): TEXT = legado, INTEGER = já
  // migrado — dispara uma vez por arquivo e a segunda abertura é no-op. O
  // rebuild roda em transação: literal legado fora da tabela (dado corrompido)
  // estoura NOT NULL/CHECK e desfaz tudo, sem deixar tabela pela metade.
  for (const enumTableSpec of ENUM_TABLE_MIGRATIONS) {
    rebuildEnumTable(wrapper, enumTableSpec);
  }
}

// Fase 3: tabela × colunas de enum a migrar (as 6 colunas do escopo).
const ENUM_TABLE_MIGRATIONS = [
  { table: 'contracts', ddl: CONTRACTS_DDL, enums: { status: 'contracts.status' } },
  { table: 'tasks', ddl: TASKS_DDL, enums: { status: 'tasks.status' } },
  {
    table: 'task_suggestions',
    ddl: TASK_SUGGESTIONS_DDL,
    enums: { kind: 'task_suggestions.kind', status: 'task_suggestions.status' },
  },
  { table: 'workflow_versions', ddl: WORKFLOW_VERSIONS_DDL, enums: { status: 'workflow_versions.status' } },
  { table: 'execution_plans', ddl: EXECUTION_PLANS_DDL, enums: { status: 'execution_plans.status' } },
];

function rebuildEnumTable(wrapper, { table, ddl, enums }) {
  if (!tableExists(wrapper, table)) return;
  const info = wrapper.all(`PRAGMA table_info(${table})`);
  const needsRebuild = info.some(
    (column) => Object.hasOwn(enums, column.name) && String(column.type).toUpperCase() === 'TEXT'
  );
  if (!needsRebuild) return; // fresh file (born INTEGER) or already migrated

  // Colunas presentes no arquivo legado: um tasks pré-00003 não tem as 4
  // colunas do workflow, então a lista vem do PRAGMA e as ausentes caem no
  // DEFAULT da tabela nova (NULL).
  const present = info.map((column) => column.name);
  const selectList = present
    .map((column) =>
      Object.hasOwn(enums, column)
        ? `${sqlLegacyCase(column, enums[column])} AS ${column}`
        : column
    )
    .join(', ');
  const temp = `${table}_enum_tmp`;
  wrapper.transaction((tx) => {
    tx.run(ddl.replace(`CREATE TABLE IF NOT EXISTS ${table}`, `CREATE TABLE ${temp}`));
    tx.run(`INSERT INTO ${temp}(${present.join(', ')}) SELECT ${selectList} FROM ${table}`);
    tx.run(`DROP TABLE ${table}`);
    tx.run(`ALTER TABLE ${temp} RENAME TO ${table}`);
  });
}

function openDb(file, kind, schema) {
  const exists = fs.existsSync(file);
  const db = exists ? new SQL.Database(fs.readFileSync(file)) : new SQL.Database();
  const wrapper = new Sqlite(db, file, kind);
  migrateSchema(wrapper);
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
