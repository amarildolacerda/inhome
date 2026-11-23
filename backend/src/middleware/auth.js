'use strict';

const jwt = require('jsonwebtoken');

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
}

// Sign a JWT carrying role + domainId (platform sessions use domainId null).
function signJwt(payload, options = {}) {
  return jwt.sign(payload, jwtSecret(), { expiresIn: '24h', ...options });
}

// FR-002: a suspended domain invalidates existing sessions on revalidation
// (HINT-002 — called from signIn and every JWT-protected route).
function assertDomainActive(domainId) {
  const { getPlatformDb } = require('../config/database');
  const platform = getPlatformDb();
  const id = Number(domainId);
  const domain = platform.get('SELECT id, name, slug, status FROM domains WHERE id = ?', [id]);
  if (!domain) {
    const err = new Error('Domain not found');
    err.code = 'DOMAIN_NOT_FOUND';
    throw err;
  }
  if (domain.status !== 'active') {
    const err = new Error('Domain suspended');
    err.code = 'DOMAIN_SUSPENDED';
    throw err;
  }
  return domain;
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, jwtSecret());
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  if (decoded.domainId !== null && decoded.domainId !== undefined) {
    try {
      assertDomainActive(decoded.domainId);
    } catch (error) {
      if (error.code === 'DOMAIN_SUSPENDED') {
        return res.status(403).json({ error: 'Domain suspended' });
      }
      return res.status(403).json({ error: 'Invalid session' });
    }
  }

  req.user = decoded;

  // 00016 (FR-047, STF-003): a visitante session is revalidated on EVERY
  // request — invite state or a registered reevaluation — and the contract
  // scope is derived here, never cached in the JWT. Expired/revoked invites
  // without reevaluation suspend the visitor at T+0, then get the standard
  // 403 (same body as any other forbidden request).
  if (req.user.role === 'visitante' && req.user.domainId !== null && req.user.domainId !== undefined) {
    try {
      const { getDomainDb } = require('../config/database');
      const db = getDomainDb(req.user.domainId);
      const scope = visitorScope(db, req.user.id);
      if (!scope || !scope.valid) {
        if (scope) {
          const Invite = require('../models/Invite');
          db.transaction(() =>
            Invite.suspendInviteVisitors(db, scope.inviteId, scope.cause, scope.authorId)
          );
        }
        return res.status(403).json({ error: 'Forbidden' });
      }
      req.user.scope = scope;
    } catch (error) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  next();
}

// 00016 (AD-005, FR-047): scope of a visitor = invite_emails(user_id UNIQUE)
// -> invites.contract_id, plus the invite state derived at request time. A
// registered active reevaluation keeps the session valid even after the
// invite expires (FR-049 reactivation rule).
function visitorScope(db, userId) {
  const row = db.get(
    `SELECT i.id AS invite_id, i.contract_id, i.expires_at, i.revoked_at,
            i.issued_by, i.revoked_by
       FROM invite_emails ie
       JOIN invites i ON i.id = ie.invite_id
      WHERE ie.user_id = ?`,
    [Number(userId)]
  );
  if (!row) return null;
  const Invite = require('../models/Invite');
  const state = Invite.deriveState(row, new Date());
  const valid = state === 'ativo' || Invite.hasActiveReevaluation(db, Number(userId));
  return {
    inviteId: row.invite_id,
    contractId: row.contract_id,
    state,
    valid,
    cause: state === 'revogado' ? 'revoked' : 'expired',
    authorId: state === 'revogado' ? row.revoked_by : row.issued_by,
  };
}

// FR-022 role guard: deny by default. system_admin is excluded from every
// business role list, which is what keeps FR-003 (cycle-only access) intact.
// 00016 (FR-048): `visitante` is accepted only by routes that explicitly list
// it (tasks list/detail) — every other route stays forbidden by default.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Access token required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

function requireSystemAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Access token required' });
  }
  if (req.user.role !== 'system_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// FR-014: explicit domain-scoped params — a token for domain A targeting
// domain B is refused with 403 before any query runs.
function scopeDomain(param = 'domainId') {
  return (req, res, next) => {
    const raw = req.params?.[param] ?? req.query?.[param] ?? req.body?.[param];
    if (raw === undefined || raw === null || raw === '') return next();
    const own = req.user?.domainId;
    if (own === null || own === undefined) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (Number(raw) !== Number(own)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  signJwt,
  // Também consumido pela camada Socket.io (server.js) — mesmo segredo,
  // mesma verificação do handshake.
  jwtSecret,
  requireRole,
  requireSystemAdmin,
  scopeDomain,
  assertDomainActive,
  visitorScope,
};
