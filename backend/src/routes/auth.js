'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken, signJwt, assertDomainActive } = require('../middleware/auth');
const { getPlatformDb, getDomainDb } = require('../config/database');

// Domain session response shape — one source of truth for both login paths:
// same JWT payload and public user (password_hash never leaves the server).
function domainSession(domain, user) {
  const token = signJwt({ id: user.id, email: user.email, role: user.role, domainId: domain.id });
  const { password_hash, ...publicUser } = user;
  return { user: publicUser, token, domainId: domain.id };
}

// POST /api/auth/login — the `email` field carries an identifier: email or
// username (both columns stored lowercase). Auto profile identification
// without domainId runs the platform system_admin first (email-only —
// system_users has no username), then resolves the identifier across the
// active domains, answering 409 when the same credentials exist in more than
// one of them (FR-002: a suspended domain is never searched). With domainId
// the identifier resolves inside that domain only (HINT-002:
// assertDomainActive runs on signIn).
router.post('/login', (req, res) => {
  try {
    const { email, password, domainId } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const identifier = String(email).trim().toLowerCase();

    if (domainId === undefined || domainId === null || domainId === '') {
      const platform = getPlatformDb();
      const platformUser = platform.get('SELECT * FROM system_users WHERE email = ?', [email]);
      if (platformUser && bcrypt.compareSync(password, platformUser.password_hash)) {
        const token = signJwt({
          id: platformUser.id,
          email: platformUser.email,
          role: 'system_admin',
          domainId: null,
        });
        return res.json({
          user: {
            id: platformUser.id,
            name: platformUser.name,
            email: platformUser.email,
            role: 'system_admin',
          },
          token,
          domainId: null,
        });
      }

      // Platform miss (unknown email or wrong password): every failure below
      // answers the same 401 body, so the response never reveals which step
      // failed.
      const activeDomains = platform.all(
        "SELECT id, name, slug, status FROM domains WHERE status = 'active'"
      );
      const matches = [];
      for (const domain of activeDomains) {
        const user = User.findAuthByIdentifier(getDomainDb(domain.id), identifier);
        if (user) matches.push({ domain, user });
      }
      const passwordMatches = matches.filter(({ user }) =>
        User.verifyPassword(password, user.password_hash)
      );
      if (passwordMatches.length > 1) {
        return res.status(409).json({ error: 'Email registered in more than one domain' });
      }
      if (passwordMatches.length === 1) {
        const [{ domain, user }] = passwordMatches;
        if (user.active) return res.json(domainSession(domain, user));
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const domain = assertDomainActive(Number(domainId));
    const db = getDomainDb(domain.id);
    const user = User.findAuthByIdentifier(db, identifier);
    if (!user || !user.active || !User.verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json(domainSession(domain, user));
  } catch (error) {
    if (error.code === 'DOMAIN_SUSPENDED') {
      return res.status(403).json({ error: 'Domain suspended' });
    }
    if (error.code === 'DOMAIN_NOT_FOUND') {
      return res.status(404).json({ error: 'Domain not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me — current session user (platform or domain scope).
router.get('/me', authenticateToken, (req, res) => {
  try {
    if (req.user.domainId === null || req.user.domainId === undefined) {
      const platform = getPlatformDb();
      const user = platform.get(
        'SELECT id, name, email, role FROM system_users WHERE id = ?',
        [req.user.id]
      );
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ user });
    }
    const user = User.findById(getDomainDb(req.user.domainId), req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
