'use strict';

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const AccessHistory = require('../models/AccessHistory');
const { authenticateToken, requireRole, visitorScope } = require('../middleware/auth');
const { getDomainDb } = require('../config/database');

const ROLES = ['admin', 'gestor', 'prestador', 'auditor'];
// 00016 (FR-049): papel alvo na reavaliação de visitantes. Gestor só promove
// a prestador/auditor; alvo admin/gestor é exclusivo de admin.
const REEVALUATION_ROLES = ['visitante', 'prestador', 'auditor'];

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function createUser(db, { name, username, email, password, role }) {
  if (!name || !String(name).trim()) throw httpError(400, 'name is required');
  if (!username || !String(username).trim()) throw httpError(400, 'username is required');
  if (!email || !String(email).includes('@')) throw httpError(400, 'email is invalid');
  if (!password || String(password).length < 6) {
    throw httpError(400, 'password must be at least 6 characters');
  }
  if (!ROLES.includes(role)) throw httpError(400, `role must be one of ${ROLES.join(', ')}`);
  if (User.findAuth(db, String(email).trim().toLowerCase())) {
    throw httpError(409, 'Email already registered');
  }
  const handle = String(username).trim().toLowerCase();
  if (User.findByUsername(db, handle)) {
    throw httpError(409, 'Username already registered');
  }
  return User.create(db, {
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    username: handle,
    password,
    role,
  });
}

// 00016 (FR-049, AD-009): só um visitante ativo pode ser promovido/suspenso;
// a reativação de suspenso passa pela mesma rota com `active: true`.
function assertActiveVisitor(db, userId) {
  const user = db.get('SELECT * FROM users WHERE id = ?', [Number(userId)]);
  if (!user) throw httpError(404, 'User not found');
  if (user.role !== 'visitante') {
    throw httpError(403, 'Reevaluation applies only to visitors');
  }
  return user;
}

// Reevaluate a visitor: change role, suspend or reactivate, with an audit row.
// Promotion revalidates the invite/reevaluation at commit (STF-001/006/008):
// an expired/revoked invite without a prior reevaluation is refused.
function reevaluateVisitor(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const id = Number(req.params.id);
    const target = assertActiveVisitor(db, id);
    const body = req.body || {};
    const actor = req.user;

    const wantsActive = Object.hasOwn(body, 'active') ? Boolean(body.active) : true;
    const requestedRole = Object.hasOwn(body, 'role') ? body.role : target.role;
    const roleChanged = requestedRole !== target.role;
    const suspending = !wantsActive;
    const reactivating = wantsActive && !target.active;

    if (!suspending && !REEVALUATION_ROLES.includes(requestedRole)) {
      throw httpError(403, 'Role not allowed for visitor reevaluation');
    }
    if (actor.role === 'gestor' && ['admin', 'gestor'].includes(requestedRole)) {
      throw httpError(403, 'Only admin can assign admin or gestor');
    }
    if (roleChanged && !target.active) {
      throw httpError(409, 'Reactivate the visitor before changing its role');
    }
    if (reactivating || (roleChanged && !suspending)) {
      // Convite vigente OU reavaliação registrada (FR-049).
      const scope = visitorScope(db, id);
      if (!scope || !scope.valid) {
        throw httpError(409, 'Invite expired or revoked; reevaluation required');
      }
    }

    const before = { role: target.role, active: target.active ? 1 : 0 };
    const after = {
      role: suspending ? target.role : requestedRole,
      active: suspending ? 0 : 1,
    };

    const user = db.transaction(() => {
      AccessHistory.recordAccess(db, 'reevaluation', {
        invite_id: visitorScope(db, id).inviteId,
        user_id: id,
        author_id: actor.id,
        from_role: before.role,
        to_role: after.role,
        active_before: before.active,
        active_after: after.active,
      });
      return User.update(db, id, { role: after.role, active: after.active });
    });
    res.json({ user });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// 00016 (FR-050): leitura somente para a visão de auditoria do gestor/admin.
// A projeção não expõe token de convite — só eventos, autor, papéis e data.
function accessHistory(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const id = Number(req.params.id);
    if (!db.get('SELECT id FROM users WHERE id = ?', [id])) {
      throw httpError(404, 'User not found');
    }
    res.json({ history: AccessHistory.listForUser(db, id) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// FR-004: admin creates users with role admin/gestor/prestador. username is
// required and unique per domain (case-insensitive after normalization).
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
    const target = db.get('SELECT id, role FROM users WHERE id = ?', [id]);
    if (!target) return res.status(404).json({ error: 'User not found' });
    // 00016: visitantes passam pela reavaliação (gestor permitido); os demais
    // papéis seguem sob gestão exclusiva de admin (FR-049).
    if (target.role === 'visitante') return reevaluateVisitor(req, res);
    if (req.user.role === 'gestor') return res.status(403).json({ error: 'Forbidden' });
    const fields = {};
    if (Object.hasOwn(req.body || {}, 'name')) fields.name = req.body.name;
    if (Object.hasOwn(req.body || {}, 'email')) fields.email = String(req.body.email).toLowerCase();
    if (Object.hasOwn(req.body || {}, 'username')) {
      const handle = String(req.body.username ?? '').trim().toLowerCase();
      if (!handle) return res.status(400).json({ error: 'username is required' });
      const clash = db.get('SELECT id FROM users WHERE username = ? AND id != ?', [handle, id]);
      if (clash) return res.status(409).json({ error: 'Username already registered' });
      fields.username = handle;
    }
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

// Writes: admin only (gestor also reevaluates visitors). Reads: admin + gestor.
router.use(authenticateToken);
router.get('/', requireRole('admin', 'gestor'), listUser);
router.post('/', requireRole('admin'), create);
router.put('/:id', requireRole('admin', 'gestor'), update);
router.delete('/:id', requireRole('admin'), remove);
router.put('/:id/reevaluate', requireRole('admin', 'gestor'), reevaluateVisitor);
router.get('/:id/access-history', requireRole('admin', 'gestor'), accessHistory);

router.create = create;
router.listUser = listUser;
router.createUser = createUser;
router.reevaluateVisitor = reevaluateVisitor;
router.assertActiveVisitor = assertActiveVisitor;
router.accessHistory = accessHistory;

module.exports = router;
