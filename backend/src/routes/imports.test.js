'use strict';

let uploadDir;
process.env.UPLOAD_DIR = require('path').join(
  require('os').tmpdir(),
  `sddp-uploads-imports-${process.pid}`
);
uploadDir = process.env.UPLOAD_DIR;

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir('sddp-import-routes-');
const { app } = require('../server');
const { getDomainDb } = require('../config/database');
const { signJwt } = require('../middleware/auth');

const SYS_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const SYS_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123';
const HEADERS = ['name', 'start_date', 'forecast_date', 'object', 'purpose', 'provider', 'perpetual'];
const MAPPING = Object.fromEntries(HEADERS.map((header) => [header, header]));
const PDF_B64 = Buffer.from('%PDF-1.4 importado', 'utf8').toString('base64');

let domainId;
let otherDomainId;
let adminToken;
let gestorToken;
let prestadorToken;
let systemToken;
let contractCountBefore;

function as(token) {
  return { Authorization: `Bearer ${token}` };
}

function iso(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

function encode(rows) {
  return Buffer.from([HEADERS, ...rows].map((row) => row.join(';')).join('\n'), 'utf8').toString('base64');
}

function payload(rows, extra = {}) {
  return { fileName: 'acervo.csv', dataBase64: encode(rows), mapping: MAPPING, ...extra };
}

function countContracts() {
  return getDomainDb(domainId).get('SELECT COUNT(*) AS c FROM contracts').c;
}

async function login(email, password, domId) {
  const res = await request(app)
    .post('/api/v2/auth/login')
    .send({ email, password, domainId: domId });
  assert.strictEqual(res.status, 200, `${email}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

test.before(async () => {
  await initTestDb();
  const sys = await request(app)
    .post('/api/v2/auth/login')
    .send({ email: SYS_EMAIL, password: SYS_PASSWORD });
  assert.strictEqual(sys.status, 200, JSON.stringify(sys.body));
  systemToken = sys.body.token;

  const enabled = await request(app)
    .post('/api/v2/domains/enable')
    .set(as(systemToken))
    .send({ name: 'Acervo', adminName: 'Ana', adminEmail: 'ana@acervo.test', adminPassword: 'Secret1!' });
  assert.strictEqual(enabled.status, 201, JSON.stringify(enabled.body));
  domainId = enabled.body.domain.id;
  adminToken = await login('ana@acervo.test', 'Secret1!', domainId);

  const gestor = await request(app)
    .post('/api/v2/users')
    .set(as(adminToken))
    .send({ name: 'Guto', email: 'guto@acervo.test', password: 'Secret1!', role: 'gestor', username: 'guto' });
  assert.strictEqual(gestor.status, 201, JSON.stringify(gestor.body));
  gestorToken = await login('guto@acervo.test', 'Secret1!', domainId);

  const prestador = await request(app)
    .post('/api/v2/users')
    .set(as(adminToken))
    .send({ name: 'Mila', email: 'mila@acervo.test', password: 'Secret1!', role: 'prestador', username: 'mila' });
  assert.strictEqual(prestador.status, 201, JSON.stringify(prestador.body));
  prestadorToken = await login('mila@acervo.test', 'Secret1!', domainId);

  const other = await request(app)
    .post('/api/v2/domains/enable')
    .set(as(systemToken))
    .send({ name: 'Outro', adminName: 'Bia', adminEmail: 'bia@outro.test', adminPassword: 'Secret1!' });
  assert.strictEqual(other.status, 201, JSON.stringify(other.body));
  otherDomainId = other.body.domain.id;
  contractCountBefore = countContracts();
});

test('FR-071 template versionado e autenticado', async () => {
  const res = await request(app)
    .get('/api/v2/contracts/import/template')
    .set(as(gestorToken));
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.match(res.headers['content-type'], /text\/csv/);
  for (const header of HEADERS) assert.ok(res.text.includes(header), `missing ${header}`);
});

test('FR-079 papeis e dominio sao recusados antes da leitura', async () => {
  const anonymous = await request(app).get('/api/v2/contracts/import/template');
  assert.strictEqual(anonymous.status, 401);

  for (const token of [prestadorToken, systemToken]) {
    const denied = await request(app)
      .get('/api/v2/contracts/import/template')
      .set(as(token));
    assert.strictEqual(denied.status, 403);
  }
  const crossed = await request(app)
    .get(`/api/v2/contracts/import/template?domainId=${otherDomainId}`)
    .set(as(adminToken));
  assert.strictEqual(crossed.status, 403);
});

test('FR-072 FR-073 FR-074 FR-075 previa classifica linhas sem gravar', async () => {
  const res = await request(app)
    .post('/api/v2/contracts/import/preview')
    .set(as(adminToken))
    .send(payload([
      ['Contrato A', iso(-10), iso(60), 'Servico', '', 'mila', ''],
      ['Contrato B', 'data-invalida', iso(60), 'Servico', '', '', ''],
      ['Contrato C', iso(-10), iso(-20), 'Servico', '', '', ''],
    ]));
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(res.body.total, 3);
  assert.strictEqual(res.body.valid, 1);
  assert.strictEqual(res.body.invalid, 2);
  assert.deepStrictEqual(res.body.headers, HEADERS);
  assert.strictEqual(res.body.rows[1].errors[0].field, 'start_date');
  assert.strictEqual(res.body.rows[2].errors[0].field, 'forecast_date');
  assert.strictEqual(countContracts(), contractCountBefore, 'preview must not write');
});

test('FR-073 deteccao de cabecalhos antes do mapeamento', async () => {
  const res = await request(app)
    .post('/api/v2/contracts/import/preview')
    .set(as(gestorToken))
    .send({ fileName: 'acervo.csv', dataBase64: encode([]), detectHeaders: true });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.deepStrictEqual(res.body.headers, HEADERS);
  assert.strictEqual(res.body.valid, 0);
  assert.strictEqual(res.body.invalid, 0);
  assert.deepStrictEqual(res.body.rows, []);
  assert.strictEqual(countContracts(), contractCountBefore);
});

test('FR-073 mapeamento sem coluna obrigatoria e 400', async () => {
  const res = await request(app)
    .post('/api/v2/contracts/import/preview')
    .set(as(gestorToken))
    .send({ ...payload([['Contrato A', iso(-10), iso(60)]]), mapping: { name: 'name' } });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.code, 'IMPORT_MAPPING_REQUIRED');
  assert.strictEqual(countContracts(), contractCountBefore);
});

test('STF-001 limite de linhas antes da transacao', async () => {
  const rows = Array.from({ length: 501 }, (_, index) => [`C${index}`, iso(-1), iso(30), '', '', '', '']);
  const res = await request(app)
    .post('/api/v2/contracts/import/preview')
    .set(as(adminToken))
    .send(payload(rows));
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.code, 'IMPORT_TOO_MANY_ROWS');
});

test('FR-076 FR-077 FR-078 confirmacao cria contratos e anexa PDFs', async () => {
  const before = countContracts();
  const body = payload(
    [
      ['PDF Ok', iso(-10), iso(60), 'Servico', '', 'mila', ''],
      ['Sem PDF', iso(-10), iso(60), 'Servico', '', '', ''],
    ],
    {
      pdfs: [
        { name: 'PDF Ok.pdf', dataBase64: PDF_B64 },
        { name: 'Inexistente.pdf', dataBase64: PDF_B64 },
      ],
    }
  );
  const res = await request(app)
    .post('/api/v2/contracts/import/confirm')
    .set(as(adminToken))
    .send(body);
  assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  assert.strictEqual(res.body.created.length, 2);
  assert.strictEqual(res.body.attached.length, 1);
  assert.strictEqual(res.body.skippedPdfs[0].reason, 'no matching imported row');
  assert.strictEqual(countContracts(), before + 2);

  const db = getDomainDb(domainId);
  const contract = db.get("SELECT id FROM contracts WHERE name = 'PDF Ok'");
  const attachment = db.get('SELECT contract_id, category FROM attachments WHERE original_name = ?', ['PDF Ok.pdf']);
  assert.strictEqual(attachment.contract_id, contract.id);
  assert.strictEqual(attachment.category, 'documentation');
  assert.ok(
    db.get('SELECT user_id FROM contract_providers WHERE contract_id = ?', [contract.id]).user_id > 0
  );
});

test('FR-076 falha na confirmacao reverte contratos e arquivos', () => {
  const db = getDomainDb(domainId);
  const userId = db.get("SELECT id FROM users WHERE email = 'ana@acervo.test'").id;
  const before = countContracts();
  const beforeFiles = require('node:fs').readdirSync(uploadDir).length;
  let writes = 0;
  const failingDb = {
    get: db.get.bind(db),
    transaction: (fn) => db.transaction((tx) => fn({
      get: tx.get.bind(tx),
      run: (...args) => {
        writes += 1;
        if (writes === 2) throw new Error('forced attachment failure');
        return tx.run(...args);
      },
    })),
  };
  const body = payload([['Rollback', iso(-10), iso(60), '', '', '', '']], {
    pdfs: [{ name: 'Rollback.pdf', dataBase64: PDF_B64 }],
  });
  const { confirmImport } = require('./imports');
  assert.throws(() => confirmImport(failingDb, body, { id: userId }), /forced attachment failure/);
  assert.strictEqual(countContracts(), before, 'transaction must roll back');
  assert.strictEqual(require('node:fs').readdirSync(uploadDir).length, beforeFiles, 'written PDF must be removed');
});

test('FR-079 confirmacao tambem recusa prestador', async () => {
  const res = await request(app)
    .post('/api/v2/contracts/import/confirm')
    .set(as(prestadorToken))
    .send(payload([['Negado', iso(-10), iso(60), '', '', '', '']]));
  assert.strictEqual(res.status, 403);
});
