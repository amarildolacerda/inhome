'use strict';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { setupDataDir, initTestDb } = require('../support/testenv');

setupDataDir();
const { app } = require('../server');
const { getDomainDb } = require('../config/database');
const User = require('../models/User');
const Invite = require('../models/Invite');
const AccessHistory = require('../models/AccessHistory');
const invites = require('./invites');

const SYS = { email: 'admin@platform.local', password: 'Admin@123' };
let sysToken;

async function login(body) {
  return request(app).post('/api/v2/auth/login').send(body);
}

async function enableDomain(name, email) {
  const res = await request(app)
    .post('/api/v2/domains/enable')
    .set('Authorization', `Bearer ${sysToken}`)
    .send({ name, adminName: `Admin ${name}`, adminEmail: email, adminPassword: 'Secret1!' });
  assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  return res.body.domain;
}

async function adminToken(email) {
  const res = await login({ email, password: 'Secret1!' });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  return res.body.token;
}

function addContract(db, name, status = 1) {
  db.run(
    'INSERT INTO contracts(name, start_date, forecast_date, status) VALUES (?, ?, ?, ?)',
    [name, '2026-01-01', '2026-12-31', status]
  );
  return db.get('SELECT id FROM contracts WHERE name = ?', [name]).id;
}

test.before(async () => {
  await initTestDb();
  const sys = await login(SYS);
  assert.strictEqual(sys.status, 200, JSON.stringify(sys.body));
  sysToken = sys.body.token;
});

test.beforeEach(() => invites.resetRateLimit());

test('FR-044 emite convite com validade e token apenas no 201', async () => {
  const domain = await enableDomain('E015 Emissao', 'emis@e015.test');
  const token = await adminToken('emis@e015.test');
  const db = getDomainDb(domain.id);
  const contractId = addContract(db, 'C-emissao');

  const res = await request(app)
    .post('/api/v2/invites')
    .set('Authorization', `Bearer ${token}`)
    .send({ contract_id: contractId, validity: '7d' });
  assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  assert.ok(res.body.token, 'token opaco presente');
  assert.ok(res.body.token.length >= 22, '>= 128 bits em base64url');
  assert.strictEqual(res.body.state, 'ativo');
  assert.strictEqual(res.body.contract_id, contractId);
  assert.ok(res.body.expires_at);

  // Validade inválida e contrato encerrado → recusa sem escrita.
  const bad = await request(app)
    .post('/api/v2/invites')
    .set('Authorization', `Bearer ${token}`)
    .send({ contract_id: contractId, validity: '1y' });
  assert.strictEqual(bad.status, 400);
  const closedId = addContract(db, 'C-fechado', 2);
  const closed = await request(app)
    .post('/api/v2/invites')
    .set('Authorization', `Bearer ${token}`)
    .send({ contract_id: closedId, validity: '7d' });
  assert.strictEqual(closed.status, 409);
  assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM invites').c, 1);

  // Evento emission na mesma transação, com author = emissor e user_id NULL.
  const history = db.get("SELECT * FROM access_history WHERE event = 'emission'");
  assert.ok(history);
  assert.strictEqual(history.user_id, null);
  assert.strictEqual(history.author_id, res.body.issued_by);
});

test('FR-045 lista com estado; revogar suspende visitante sem reavaliacao', async () => {
  const domain = await enableDomain('E015 Lista', 'lista@e015.test');
  const token = await adminToken('lista@e015.test');
  const db = getDomainDb(domain.id);
  const contractId = addContract(db, 'C-lista');

  const created = await request(app)
    .post('/api/v2/invites')
    .set('Authorization', `Bearer ${token}`)
    .send({ contract_id: contractId, validity: '7d' });
  const inviteToken = created.body.token;
  const reg = await request(app)
    .post(`/api/v2/invites/${inviteToken}/register`)
    .send({ name: 'Visitante Lista', email: 'vis@lista.test', password: 'Secret1!' });
  assert.strictEqual(reg.status, 201, JSON.stringify(reg.body));
  const visitorId = reg.body.user.id;

  const listed = await request(app)
    .get('/api/v2/invites')
    .set('Authorization', `Bearer ${token}`);
  assert.strictEqual(listed.status, 200);
  assert.strictEqual(listed.body.invites.length, 1);
  const item = listed.body.invites[0];
  assert.strictEqual(item.registrations, 1);
  assert.strictEqual(item.state, 'ativo');
  assert.strictEqual(item.token, undefined, 'token nunca na listagem');
  assert.ok(!JSON.stringify(listed.body).includes(inviteToken));

  const revoked = await request(app)
    .delete(`/api/v2/invites/${created.body.id}`)
    .set('Authorization', `Bearer ${token}`);
  assert.strictEqual(revoked.status, 200, JSON.stringify(revoked.body));
  assert.strictEqual(revoked.body.suspended_users, 1);
  assert.strictEqual(revoked.body.invite.state, 'revogado');
  assert.strictEqual(db.get('SELECT active FROM users WHERE id = ?', [visitorId]).active, 0);
  const suspension = db.get("SELECT * FROM access_history WHERE event = 'suspension'");
  assert.strictEqual(suspension.cause, 'revoked');
  assert.strictEqual(suspension.author_id, revoked.body.invite.revoked_by);

  // Idempotente: segunda revogação não suspende de novo nem grava mais linhas.
  const again = await request(app)
    .delete(`/api/v2/invites/${created.body.id}`)
    .set('Authorization', `Bearer ${token}`);
  assert.strictEqual(again.body.suspended_users, 0);
  assert.strictEqual(
    db.get("SELECT COUNT(*) AS c FROM access_history WHERE event = 'suspension'").c,
    1
  );
});

test('FR-046 registro cria visitante; token invalido/expirado/revogado e duplicata', async () => {
  const domain = await enableDomain('E015 Registro', 'reg@e015.test');
  const token = await adminToken('reg@e015.test');
  const db = getDomainDb(domain.id);
  const contractId = addContract(db, 'C-registro');

  const a = await request(app)
    .post('/api/v2/invites')
    .set('Authorization', `Bearer ${token}`)
    .send({ contract_id: contractId, validity: '7d' });
  const b = await request(app)
    .post('/api/v2/invites')
    .set('Authorization', `Bearer ${token}`)
    .send({ contract_id: contractId, validity: '24h' });

  // Recusa uniforme: inválido = expirado = revogado (mesmo corpo byte a byte).
  const invalid = await request(app)
    .post('/api/v2/invites/nao-existe/register')
    .send({ name: 'X', email: 'x@reg.test', password: 'Secret1!' });
  assert.strictEqual(invalid.status, 409);
  assert.deepStrictEqual(invalid.body, { error: 'Invalid or expired invite' });
  db.run("UPDATE invites SET expires_at = '2000-01-01 00:00:00' WHERE id = ?", [b.body.id]);
  const expired = await request(app)
    .post(`/api/v2/invites/${b.body.token}/register`)
    .send({ name: 'X', email: 'x@reg.test', password: 'Secret1!' });
  assert.strictEqual(expired.status, 409);
  assert.deepStrictEqual(expired.body, invalid.body);
  await request(app)
    .delete(`/api/v2/invites/${a.body.id}`)
    .set('Authorization', `Bearer ${token}`);
  const revoked = await request(app)
    .post(`/api/v2/invites/${a.body.token}/register`)
    .send({ name: 'X', email: 'x@reg.test', password: 'Secret1!' });
  assert.strictEqual(revoked.status, 409);
  assert.deepStrictEqual(revoked.body, invalid.body);

  // Cadastro válido em convite novo: username derivado, sem consumo em duplicata.
  const c = await request(app)
    .post('/api/v2/invites')
    .set('Authorization', `Bearer ${token}`)
    .send({ contract_id: contractId, validity: '30d' });
  invites.resetRateLimit();
  const ok = await request(app)
    .post(`/api/v2/invites/${c.body.token}/register`)
    .send({ name: 'Ana', email: 'Ana@Reg.Test', password: 'Secret1!' });
  assert.strictEqual(ok.status, 201, JSON.stringify(ok.body));
  assert.strictEqual(ok.body.user.role, 'visitante');
  assert.strictEqual(ok.body.user.username, 'ana');
  assert.ok(ok.body.token && ok.body.domainId === domain.id);

  invites.resetRateLimit();
  const dup = await request(app)
    .post(`/api/v2/invites/${c.body.token}/register`)
    .send({ name: 'Ana 2', email: 'ana@reg.test', password: 'Secret1!' });
  assert.strictEqual(dup.status, 409);
  assert.strictEqual(dup.body.error, 'Email already registered in this domain');
  assert.strictEqual(
    db.get('SELECT COUNT(*) AS c FROM invite_emails WHERE invite_id = ?', [c.body.id]).c,
    1,
    'convite não consumido na duplicata'
  );

  // Rate limit: 10 por IP/60 s, a 11ª → 429.
  invites.resetRateLimit();
  const codes = [];
  for (let i = 0; i < 11; i += 1) {
    const r = await request(app)
      .post('/api/v2/invites/token-inexistente/register')
      .send({ name: 'Limite', email: `limite${i}@reg.test`, password: 'Secret1!' });
    codes.push(r.status);
  }
  assert.ok(codes.slice(0, 10).every((s) => s === 409));
  assert.strictEqual(codes[10], 429);

  // Helpers do modelo (T011/T002).
  assert.strictEqual(User.deriveUsername('joao.silva@x.test', null), 'joao.silva');
  assert.strictEqual(User.deriveUsername('@@@', null), 'visitante');
  assert.strictEqual(User.deriveUsername('ana@reg.test', db), 'ana2');
});

test('FR-050 histórico registra emissao, cadastro e suspensao por expiracao', async () => {
  const domain = await enableDomain('E015 Historico', 'hist@e015.test');
  const token = await adminToken('hist@e015.test');
  const db = getDomainDb(domain.id);
  const contractId = addContract(db, 'C-historico');

  const created = await request(app)
    .post('/api/v2/invites')
    .set('Authorization', `Bearer ${token}`)
    .send({ contract_id: contractId, validity: '7d' });
  const reg = await request(app)
    .post(`/api/v2/invites/${created.body.token}/register`)
    .send({ name: 'Hist', email: 'hist-vis@e015.test', password: 'Secret1!' });

  // Expiração suspendem na 1ª observação (listagem), sem job.
  db.run("UPDATE invites SET expires_at = '2000-01-01 00:00:00' WHERE id = ?", [created.body.id]);
  const listed = await request(app)
    .get('/api/v2/invites')
    .set('Authorization', `Bearer ${token}`);
  assert.strictEqual(listed.body.invites[0].state, 'expirado');
  assert.strictEqual(db.get('SELECT active FROM users WHERE id = ?', [reg.body.user.id]).active, 0);

  const events = db
    .all('SELECT event FROM access_history WHERE invite_id = ? ORDER BY id', [created.body.id])
    .map((r) => r.event);
  assert.deepStrictEqual(events, ['emission', 'registration', 'suspension']);
  const suspension = db.get("SELECT * FROM access_history WHERE event = 'suspension'");
  assert.strictEqual(suspension.cause, 'expired');
  assert.strictEqual(suspension.author_id, created.body.issued_by);

  // append-only: PROJEÇÃO do histórico não expõe token do convite.
  const rows = AccessHistory.listForUser(db, reg.body.user.id);
  assert.ok(rows.length >= 2);
  assert.ok(rows.every((r) => r.token === undefined));

  // deriveState puro: revogado > expirado > ativo.
  const now = new Date('2026-06-01T00:00:00Z');
  assert.strictEqual(Invite.deriveState({ revoked_at: 'x', expires_at: '2000-01-01' }, now), 'revogado');
  assert.strictEqual(Invite.deriveState({ revoked_at: null, expires_at: '2000-01-01' }, now), 'expirado');
  assert.strictEqual(Invite.deriveState({ revoked_at: null, expires_at: '2030-01-01' }, now), 'ativo');
});
