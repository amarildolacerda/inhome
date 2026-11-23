'use strict';

const AccessHistory = require('./AccessHistory');

// 00016 (AD-001, FR-045): invite state is ALWAYS derived on read — there is no
// persisted state column. Precedence: revoked > expired > active. Expiration is
// enforced at T+0 on the first observation (list or guard), with no background
// job (STF-003).

// Normalize a timestamp to SQLite's `YYYY-MM-DD HH:MM:SS` (UTC) so string
// comparison against expires_at is well-defined for Date and TEXT inputs.
function ts(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 19).replace('T', ' ');
  if (typeof value === 'string') return value.slice(0, 19).replace('T', ' ');
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function deriveState(row, now) {
  if (!row) return null;
  if (row.revoked_at) return 'revogado';
  return ts(row.expires_at) <= ts(now) ? 'expirado' : 'ativo';
}

// A visitor is protected from invite revocation/expiration when a reevaluation
// was already registered for them (AD-009, FR-049 reactivation rule). Promoted
// users no longer have role='visitante' and are skipped by the query below.
function hasActiveReevaluation(db, userId) {
  return Boolean(
    db.get(
      `SELECT 1 AS ok FROM access_history
        WHERE user_id = ? AND event = 'reevaluation' AND active_after = 1 LIMIT 1`,
      [Number(userId)]
    )
  );
}

// Suspend every visitor linked to this invite that has no active reevaluation.
// Idempotent: a user already inactive is left untouched (no duplicate history).
// The caller wraps revoke + suspensions in one db.transaction() for atomicity.
// Returns the number of users suspended in this call.
function suspendInviteVisitors(db, inviteId, cause, authorId) {
  const visitors = db.all(
    `SELECT u.id, u.role, u.active
       FROM invite_emails ie
       JOIN users u ON u.id = ie.user_id
      WHERE ie.invite_id = ? AND u.role = 'visitante' AND u.active = 1`,
    [Number(inviteId)]
  );
  let suspended = 0;
  for (const user of visitors) {
    if (hasActiveReevaluation(db, user.id)) continue;
    db.run('UPDATE users SET active = 0, updated_at = datetime(\'now\') WHERE id = ?', [user.id]);
    AccessHistory.recordAccess(db, 'suspension', {
      invite_id: inviteId,
      user_id: user.id,
      author_id: authorId,
      from_role: user.role,
      to_role: user.role,
      active_before: 1,
      active_after: 0,
      cause,
    });
    suspended += 1;
  }
  return suspended;
}

module.exports = { deriveState, suspendInviteVisitors, hasActiveReevaluation, ts };
