const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbPath = path.resolve(__dirname, '..', '..', process.env.DATABASE_PATH || './database.json');

let data = {
  users: [],
  projects: [],
  tasks: []
};

let nextIds = { users: 1, projects: 1, tasks: 1 };

function loadDatabase() {
  if (fs.existsSync(dbPath)) {
    const raw = fs.readFileSync(dbPath, 'utf8');
    const parsed = JSON.parse(raw);
    data = parsed.data || data;
    nextIds = parsed.nextIds || nextIds;
  }
}

function saveDatabase() {
  fs.writeFileSync(dbPath, JSON.stringify({ data, nextIds }, null, 2));
}

function initDatabase() {
  loadDatabase();
  console.log('Database loaded from', dbPath);
  return Promise.resolve();
}

// Query helpers
function getOne(table, predicate) {
  return data[table].find(predicate);
}

function getAll(table, predicate) {
  if (predicate) return data[table].filter(predicate);
  return data[table];
}

function insert(table, record) {
  const id = nextIds[table]++;
  const now = new Date().toISOString();
  const newRecord = { id, ...record, created_at: now, updated_at: now };
  data[table].push(newRecord);
  saveDatabase();
  return newRecord;
}

function update(table, id, updates) {
  const index = data[table].findIndex(r => r.id === id);
  if (index === -1) return null;
  data[table][index] = {
    ...data[table][index],
    ...updates,
    updated_at: new Date().toISOString()
  };
  saveDatabase();
  return data[table][index];
}

function remove(table, id) {
  const index = data[table].findIndex(r => r.id === id);
  if (index !== -1) {
    data[table].splice(index, 1);
    saveDatabase();
  }
}

function count(table, predicate) {
  if (predicate) return data[table].filter(predicate).length;
  return data[table].length;
}

function query(sql) {
  // Simple query parser for aggregate queries used in dashboard
  // This is a minimal implementation for the specific queries we need
  return [];
}

module.exports = { initDatabase, saveDatabase, getOne, getAll, insert, update, remove, count };
