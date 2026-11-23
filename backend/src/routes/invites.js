'use strict';

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const User = require('../models/User');
const Invite = require('../models/Invite');
const AccessHistory = require('../models/AccessHistory');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getPlatformDb, getDomainDb } = require('../config/database');
const { code } = require('../config/enums');
const { domainSession } = require('./auth');

// 00016 (FR-044/045/046): emissão, listagem, revogação e cadastro público.
// O token é credencial (≥128 bits, base64url): aparece SOMENTE no 201 da
// emissão. Nenhuma mensagem de erro, log ou listagem o contém ou o ecoa.

const VALIDITIES = { '24h': 1, '7d': 7, '30d': 30 };
const UNIFORM_REFUSAL = { error: 'Invalid or expired invite' };
const EMAIL_TAKEN = { error: 'Email already registered in this domain' };

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// ---- rate limit por IP (AD-003): janela fixa de 60 s, 10 tentativas --------
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const rateByIp = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateByIp.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateByIp.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count += 1;
  return true;
}

// Test-only helper: isolated suites share one process, so each suite clears
// its own window. Never exposed through the HTTP surface.
function resetRateLimit() {
  rateByIp.clear();
}

function requestIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

// ---- projeções sem token ---------------------------------------------------
function listItem(db, invite) {
  const contract = db.get('SELECT name FROM contracts WHERE id = ?', [invite.contract_id]);
  const issuer = db.get('SELECT name FROM users WHERE id = ?', [invite.issued_by]);
  const registrations = db.get(
    'SELECT COUNT(*) AS c FROM invite_emails WHERE invite_id = ?',
    [invite.id]
  ).c;
  return {
    id: invite.id,
    contract_id: invite.contract_id,
    contract_name: contract ? contract.name : null,
    issued_by: invite.issued_by,
    issued_by_name: issuer ? issuer.name : null,
    expires_at: invite.expires_at,
    state: Invite.deriveState(invite, new Date()),
    revoked_at: invite.revoked_at,
    revoked_by: invite.revoked_by,
    created_at: invite.created_at,
    registrations,
  };
}

// ---- POST /api/v2/invites --------------------------------------------------
function createInvite(req, res) {
  try {
    const { contract_id, validity } = req.body || {};
    const days = VALIDITIES[validity];
    if (!days) {
      return res.status(400).json({ error: 'validity must be 24h, 7d or 30d' });
    }
    const contractId = Number(contract_id);
    if (!Number.isInteger(contractId) || contractId <= 0) {
      return res.status(400).json({ error: 'contract_id is required' });
    }
    const db = getDomainDb(req.user.domainId);
    const contract = db.get('SELECT id, status FROM contracts WHERE id = ?', [contractId]);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    if (contract.status === code('contracts.status', 'encerrado')) {
      return res.status(409).json({ error: 'Contract is closed' });
    }

    const token = crypto.randomBytes(16).toString('base64url');
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');
    const authorId = req.user.id;

    const invite = db.transaction(() => {
      db.run(
        'INSERT INTO invites(token, contract_id, issued_by, expires_at) VALUES (?, ?, ?, ?)',
        [token, contractId, authorId, expiresAt]
      );
      const row = db.get('SELECT * FROM invites WHERE token = ?', [token]);
      AccessHistory.recordAccess(db, 'emission', {
        invite_id: row.id,
        author_id: authorId,
      });
      return row;
    });

    const projected = listItem(db, invite);
    // Token is disclosed here and nowhere else.
    res.status(201).json({
      ...projected,
      token,
      url: `/convite/${token}`,
    });
  } catch (error) {
    // Never echo the token in an error body or log line.
    res.status(error.status || 500).json({ error: 'Could not create invite' });
  }
}

// ---- GET /api/v2/invites ---------------------------------------------------
function listInvites(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const rows = db.all('SELECT * FROM invites ORDER BY id');
    // First observation of an expired invite suspends its unprotected
    // visitors (FR-045/STF-003); one transaction per invite, no job.
    for (const row of rows) {
      if (Invite.deriveState(row, new Date()) === 'expirado') {
        db.transaction(() => Invite.suspendInviteVisitors(db, row.id, 'expired', row.issued_by));
      }
    }
    const refreshed = db.all('SELECT * FROM invites ORDER BY id');
    res.json({ invites: refreshed.map((row) => listItem(db, row)) });
  } catch (error) {
    res.status(error.status || 500).json({ error: 'Could not list invites' });
  }
}

// ---- DELETE /api/v2/invites/:id -------------------------------------------
function revokeInvite(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const id = Number(req.params.id);
    const invite = db.get('SELECT * FROM invites WHERE id = ?', [id]);
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    const state = Invite.deriveState(invite, new Date());
    if (state === 'expirado') return res.status(409).json({ error: 'Invite already expired' });

    let suspended = 0;
    if (state === 'ativo') {
      const actorId = req.user.id;
      db.transaction(() => {
        db.run("UPDATE invites SET revoked_at = datetime('now'), revoked_by = ? WHERE id = ?", [
          actorId,
          id,
        ]);
        suspended = Invite.suspendInviteVisitors(db, id, 'revoked', actorId);
      });
    }
    const fresh = db.get('SELECT * FROM invites WHERE id = ?', [id]);
    res.json({ invite: listItem(db, fresh), suspended_users: suspended });
  } catch (error) {
    res.status(error.status || 500).json({ error: 'Could not revoke invite' });
  }
}

// ---- resolve a token across active domains (public register) --------------
// The invite URL carries no domainId; like login auto-identification, the
// token is looked up in the active domain databases. Tokens are 128-bit, so a
// cross-domain match is treated as ambiguous and refused uniformly.
function findInviteByToken(token) {
  const domains = getPlatformDb().all("SELECT id FROM domains WHERE status = 'active'");
  const matches = [];
  for (const domain of domains) {
    const db = getDomainDb(domain.id);
    const invite = db.get('SELECT * FROM invites WHERE token = ?', [token]);
    if (invite) matches.push({ domain, db, invite });
  }
  return matches;
}

// ---- POST /api/v2/invites/:token/register ---------------------------------
function registerByToken(req, res) {
  try {
    if (!checkRateLimit(requestIp(req))) {
      return res.status(429).json({ error: 'Too many attempts' });
    }
    const { name, email, password } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });
    if (!email || !String(email).includes('@')) return res.status(400).json({ error: 'email is invalid' });
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    const matches = findInviteByToken(req.params.token);
    // Same body for invalid, expired, revoked and ambiguous tokens.
    if (matches.length !== 1) return res.status(409).json(UNIFORM_REFUSAL);
    const { domain, db } = matches[0];

    const outcome = db.transaction(() => {
      // Re-read inside the transaction to close the TOCTOU window.
      const invite = db.get('SELECT * FROM invites WHERE token = ?', [req.params.token]);
      if (!invite || Invite.deriveState(invite, new Date()) !== 'ativo') return { refused: true };
      if (User.findAuth(db, normalizedEmail)) return { duplicate: true };
      const username = User.deriveUsername(normalizedEmail, db);
      const user = User.create(db, {
        name: String(name).trim(),
        email: normalizedEmail,
        password,
        role: 'visitante',
        username,
      });
      db.run('INSERT INTO invite_emails(invite_id, email, user_id) VALUES (?, ?, ?)', [
        invite.id,
        normalizedEmail,
        user.id,
      ]);
      AccessHistory.recordAccess(db, 'registration', {
        invite_id: invite.id,
        user_id: user.id,
        author_id: user.id,
        to_role: 'visitante',
        active_after: 1,
      });
      return { user };
    });

    if (outcome.refused) return res.status(409).json(UNIFORM_REFUSAL);
    if (outcome.duplicate) return res.status(409).json(EMAIL_TAKEN);
    res.status(201).json(domainSession(domain, outcome.user));
  } catch (error) {
    // Uniform refusal on any token-related failure; the token is never echoed.
    res.status(error.status || 409).json(UNIFORM_REFUSAL);
  }
}

// ---- rotas -----------------------------------------------------------------
router.post('/', authenticateToken, requireRole('admin', 'gestor'), createInvite);
router.get('/', authenticateToken, requireRole('admin', 'gestor'), listInvites);
router.delete('/:id', authenticateToken, requireRole('admin', 'gestor'), revokeInvite);
router.post('/:token/register', registerByToken);

router.createInvite = createInvite;
router.listInvites = listInvites;
router.revokeInvite = revokeInvite;
router.registerByToken = registerByToken;
router.resetRateLimit = resetRateLimit;
router.listItem = listItem;

module.exports = router;
