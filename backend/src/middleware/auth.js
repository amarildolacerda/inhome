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
  next();
}

// FR-022 role guard: deny by default. system_admin is excluded from every
// business role list, which is what keeps FR-003 (cycle-only access) intact.
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
  requireRole,
  requireSystemAdmin,
  scopeDomain,
  assertDomainActive,
};
