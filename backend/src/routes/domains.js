'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { getPlatformDb, createDomainDb } = require('../config/database');
const { authenticateToken, requireSystemAdmin } = require('../middleware/auth');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function getDomainOr404(id) {
  const platform = getPlatformDb();
  const domain = platform.get('SELECT id, name, slug, status, created_at, updated_at FROM domains WHERE id = ?', [
    Number(id),
  ]);
  if (!domain) throw httpError(404, 'Domain not found');
  return domain;
}

// FR-001: system_admin enables a domain — creates data/domains/<id>.db plus
// the first admin account in that domain.
function enableDomain({ name, adminName, adminEmail, adminPassword }) {
  if (!name || !String(name).trim()) throw httpError(400, 'name is required');
  if (!adminName || !String(adminName).trim()) throw httpError(400, 'adminName is required');
  if (!adminEmail || !String(adminEmail).includes('@')) throw httpError(400, 'adminEmail is invalid');
  if (!adminPassword || String(adminPassword).length < 6) {
    throw httpError(400, 'adminPassword must be at least 6 characters');
  }

  const platform = getPlatformDb();
  const slug = slugify(name) || 'dominio';
  if (platform.get('SELECT id FROM domains WHERE slug = ?', [slug])) {
    throw httpError(409, 'Domain already exists');
  }

  platform.run('INSERT INTO domains(name, slug) VALUES (?, ?)', [String(name).trim(), slug]);
  const domain = platform.get('SELECT id, name, slug, status, created_at FROM domains WHERE slug = ?', [slug]);

  const db = createDomainDb(domain.id);
  db.run('INSERT INTO users(name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
    String(adminName).trim(),
    String(adminEmail).trim().toLowerCase(),
    bcrypt.hashSync(adminPassword, 10),
    'admin',
  ]);

  const admin = db.get("SELECT id, name, email, role FROM users WHERE role = 'admin' ORDER BY id LIMIT 1");
  return { ...domain, status: 'active', admin };
}

// FR-002: suspension flips status only — the database file and all rows are
// preserved (never deleted).
function suspendDomain(id) {
  const domain = getDomainOr404(id);
  const platform = getPlatformDb();
  platform.run("UPDATE domains SET status = 'suspended', updated_at = datetime('now') WHERE id = ?", [
    domain.id,
  ]);
  return platform.get(
    'SELECT id, name, slug, status, created_at, updated_at FROM domains WHERE id = ?',
    [domain.id]
  );
}

function reactivateDomain(id) {
  const domain = getDomainOr404(id);
  const platform = getPlatformDb();
  platform.run("UPDATE domains SET status = 'active', updated_at = datetime('now') WHERE id = ?", [
    domain.id,
  ]);
  return platform.get(
    'SELECT id, name, slug, status, created_at, updated_at FROM domains WHERE id = ?',
    [domain.id]
  );
}

function listDomains() {
  const platform = getPlatformDb();
  return platform.all(
    'SELECT id, name, slug, status, created_at, updated_at FROM domains ORDER BY id'
  );
}

// --- routes: platform cycle only (FR-003 — system_admin stays out of business data)
router.use(authenticateToken, requireSystemAdmin);

router.get('/', (req, res) => {
  res.json({ domains: listDomains() });
});

router.post('/enable', (req, res) => {
  try {
    const domain = enableDomain(req.body || {});
    res.status(201).json({ domain });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/:id/suspend', (req, res) => {
  try {
    res.json({ domain: suspendDomain(req.params.id) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/:id/reactivate', (req, res) => {
  try {
    res.json({ domain: reactivateDomain(req.params.id) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.enableDomain = enableDomain;
router.suspendDomain = suspendDomain;
router.reactivateDomain = reactivateDomain;
router.listDomains = listDomains;

module.exports = router;
