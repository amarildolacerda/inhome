const { getOne, getAll, insert, update, remove } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static findById(id) {
    const user = getOne('users', u => u.id === id);
    if (!user) return null;
    const { password_hash, ...rest } = user;
    return rest;
  }

  static findByEmail(email) {
    return getOne('users', u => u.email === email);
  }

  static create({ email, password, name, role = 'member' }) {
    const password_hash = bcrypt.hashSync(password, 10);
    const user = insert('users', { email, password_hash, name, role });
    const { password_hash: _, ...rest } = user;
    return rest;
  }

  static verifyPassword(plainPassword, passwordHash) {
    return bcrypt.compareSync(plainPassword, passwordHash);
  }

  static updateById(id, fields) {
    const updated = update('users', id, fields);
    if (!updated) return null;
    const { password_hash, ...rest } = updated;
    return rest;
  }

  static delete(id) {
    remove('users', id);
  }

  static listAll() {
    return getAll('users').map(({ password_hash, ...rest }) => rest);
  }
}

module.exports = User;
