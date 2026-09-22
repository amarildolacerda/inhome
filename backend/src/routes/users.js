'use strict';

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getDomainDb } = require('../config/database');

const ROLES = ['admin', 'gestor', 'prestador'];

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function createUser(db, { name, email, password, role }) {
  if (!name || !String(name).trim()) throw httpError(400, 'name is required');
  if (!email || !String(email).includes('@')) throw httpError(400, 'email is invalid');
  if (!password || String(password).length < 6) {
    throw httpError(400, 'password must be at least 6 characters');
  }
  if (!ROLES.includes(role)) throw httpError(400, `role must be one of ${ROLES.join(', ')}`);
  if (User.findAuth(db, String(email).trim().toLowerCase())) {
    throw httpError(409, 'Email already registered');
  }
  return User.create(db, {
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    password,
    role,
  });
}

// FR-004: admin creates users with role admin/gestor/prestador.
function create(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const user = createUser(db, req.body || {});
    res.status(201).json({ user });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// FR-004: list domain users (admin + gestor need the roster for assignment).
function listUser(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    res.json({ users: User.list(db) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

function update(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const id = Number(req.params.id);
    const target = db.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!target) return res.status(404).json({ error: 'User not found' });
    const fields = {};
    if (Object.hasOwn(req.body || {}, 'name')) fields.name = req.body.name;
    if (Object.hasOwn(req.body || {}, 'email')) fields.email = String(req.body.email).toLowerCase();
    if (Object.hasOwn(req.body || {}, 'role')) {
      if (!ROLES.includes(req.body.role)) {
        return res.status(400).json({ error: `role must be one of ${ROLES.join(', ')}` });
      }
      fields.role = req.body.role;
    }
    if (Object.hasOwn(req.body || {}, 'active')) fields.active = req.body.active ? 1 : 0;
    const user = User.update(db, id, fields);
    res.json({ user });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

function remove(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const id = Number(req.params.id);
    const target = db.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!target) return res.status(404).json({ error: 'User not found' });
    User.delete(db, id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// Writes: admin only. Reads: admin + gestor (FR-022 role matrix).
router.use(authenticateToken);
router.get('/', requireRole('admin', 'gestor'), listUser);
router.post('/', requireRole('admin'), create);
router.put('/:id', requireRole('admin'), update);
router.delete('/:id', requireRole('admin'), remove);

router.create = create;
router.listUser = listUser;

module.exports = router;
