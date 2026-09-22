'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken, signJwt, assertDomainActive } = require('../middleware/auth');
const { getPlatformDb, getDomainDb } = require('../config/database');

// POST /api/auth/login — no domainId: platform system_admin session;
// with domainId: domain user session (FR-002: suspended domain refuses login,
// HINT-002: assertDomainActive runs on signIn).
router.post('/login', (req, res) => {
  try {
    const { email, password, domainId } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (domainId === undefined || domainId === null || domainId === '') {
      const platform = getPlatformDb();
      const user = platform.get('SELECT * FROM system_users WHERE email = ?', [email]);
      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = signJwt({ id: user.id, email: user.email, role: 'system_admin', domainId: null });
      return res.json({
        user: { id: user.id, name: user.name, email: user.email, role: 'system_admin' },
        token,
        domainId: null,
      });
    }

    const domain = assertDomainActive(Number(domainId));
    const db = getDomainDb(domain.id);
    const user = User.findAuth(db, email);
    if (!user || !user.active || !User.verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signJwt({ id: user.id, email: user.email, role: user.role, domainId: domain.id });
    const { password_hash, ...publicUser } = user;
    res.json({ user: publicUser, token, domainId: domain.id });
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
