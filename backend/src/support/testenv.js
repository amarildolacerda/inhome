'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// Isolates DATA_DIR before any database.js require. Call at the top of each
// *.test.js file (node --test runs every test file in its own process).
function setupDataDir(prefix = 'contratos-test-') {
  if (!process.env.DATA_DIR) {
    process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  }
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-secret';
  }
  return process.env.DATA_DIR;
}

async function initTestDb() {
  const database = require('../config/database');
  await database.initSqlDriver();
  await database.initDatabase();
  return database;
}

module.exports = { setupDataDir, initTestDb };
