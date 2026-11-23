'use strict';

const bcrypt = require('bcryptjs');

// Domain-scoped user model. Every function takes the domain Sqlite wrapper so
// queries can never cross data/domains/<id>.db boundaries (FR-014).
class User {
  static findById(db, id) {
    const user = db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return null;
    const { password_hash, ...rest } = user;
    return rest;
  }

  static findAuth(db, email) {
    return db.get('SELECT * FROM users WHERE email = ?', [email]);
  }

  // Login identifier (routes/auth.js): exact match on email OR username.
  // Both columns are stored lowercase; the caller normalizes the input.
  static findAuthByIdentifier(db, identifier) {
    return db.get('SELECT * FROM users WHERE email = ? OR username = ?', [
      identifier,
      identifier,
    ]);
  }

  static findByUsername(db, username) {
    return db.get('SELECT * FROM users WHERE username = ?', [username]);
  }

  static findByEmail(db, email) {
    return User.findAuth(db, email);
  }

  // 00016 (AD-004, FR-046): login handle derived from the e-mail local part.
  // Lowercase, sanitized to [a-z0-9._-]; numeric suffix on collision; falls
  // back to `visitante` when the local part has no usable characters. The
  // collision loop honors users.username UNIQUE (fresh) / app-level (legacy).
  static deriveUsername(email, db) {
    const local = String(email)
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '');
    const base = local || 'visitante';
    let candidate = base;
    let suffix = 2;
    while (db && User.findByUsername(db, candidate)) {
      candidate = `${base}${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  static create(db, { name, email, password, role, username = null }) {
    const password_hash = bcrypt.hashSync(password, 10);
    db.run('INSERT INTO users(name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?)', [
      name,
      email,
      username,
      password_hash,
      role,
    ]);
    const row = db.get('SELECT * FROM users WHERE email = ?', [email]);
    const { password_hash: _hash, ...rest } = row;
    return rest;
  }

  static verifyPassword(plainPassword, passwordHash) {
    return bcrypt.compareSync(plainPassword, passwordHash);
  }

  static update(db, id, fields) {
    const allowed = ['name', 'email', 'username', 'role', 'active'];
    const sets = [];
    const params = [];
    for (const key of allowed) {
      if (Object.hasOwn(fields, key)) {
        sets.push(`${key} = ?`);
        params.push(fields[key]);
      }
    }
    if (!sets.length) return User.findById(db, id);
    sets.push("updated_at = datetime('now')");
    params.push(id);
    db.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
    return User.findById(db, id);
  }

  static delete(db, id) {
    db.run('DELETE FROM users WHERE id = ?', [id]);
  }

  static list(db) {
    return db
      .all('SELECT id, name, email, username, role, active, created_at, updated_at FROM users ORDER BY id')
      .map((row) => ({ ...row, active: row.active === undefined ? 1 : row.active }));
  }
}

// Named export so callers can `const { deriveUsername } = require('./User')`.
User.deriveUsername = User.deriveUsername.bind(User);
module.exports = User;
module.exports.deriveUsername = User.deriveUsername;
