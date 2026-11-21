'use strict';

// 00016 (AD-007, FR-050): append-only access history. One row per invite
// lifecycle event (emission, registration, reevaluation, suspension). Every
// function takes the domain Sqlite wrapper so writes stay inside the domain.
// There is deliberately no update/delete path: history is audit evidence.

const EVENTS = ['emission', 'registration', 'reevaluation', 'suspension'];
const CAUSES = ['revoked', 'expired'];

function fail(message) {
  const err = new Error(message);
  err.status = 400;
  throw err;
}

// Insert a single event inside the current transaction (or autocommit). The
// caller wraps multi-row writes (e.g. invite + emission) in db.transaction().
function recordAccess(db, event, payload = {}) {
  if (!EVENTS.includes(event)) fail(`invalid access event: ${event}`);
  const inviteId = Number(payload.invite_id);
  const authorId = Number(payload.author_id);
  if (!Number.isInteger(inviteId) || inviteId <= 0) fail('invite_id is required');
  if (!Number.isInteger(authorId) || authorId <= 0) fail('author_id is required');
  if (event === 'suspension' && !CAUSES.includes(payload.cause)) {
    fail('suspension requires cause revoked|expired');
  }

  const cols = ['event', 'invite_id', 'author_id'];
  const vals = [event, inviteId, authorId];
  const optional = [
    'user_id',
    'from_role',
    'to_role',
    'active_before',
    'active_after',
    'cause',
  ];
  for (const key of optional) {
    if (payload[key] !== undefined && payload[key] !== null && payload[key] !== '') {
      cols.push(key);
      vals.push(payload[key]);
    }
  }
  const placeholders = cols.map(() => '?').join(', ');
  db.run(`INSERT INTO access_history(${cols.join(', ')}) VALUES (${placeholders})`, vals);
  const row = db.get('SELECT * FROM access_history WHERE id = last_insert_rowid()');
  return row;
}

// Read-only projection for the audit view (FR-050). Never exposes invite token.
function listForUser(db, userId) {
  return db.all(
    `SELECT id, event, invite_id, user_id, author_id, from_role, to_role,
            active_before, active_after, cause, created_at
       FROM access_history WHERE user_id = ? ORDER BY id`,
    [Number(userId)]
  );
}

function listForInvite(db, inviteId) {
  return db.all(
    `SELECT id, event, invite_id, user_id, author_id, from_role, to_role,
            active_before, active_after, cause, created_at
       FROM access_history WHERE invite_id = ? ORDER BY id`,
    [Number(inviteId)]
  );
}

module.exports = { recordAccess, listForUser, listForInvite, EVENTS, CAUSES };
