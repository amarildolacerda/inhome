'use strict';

// E004 (CAP-004): contract-expiry alert engine. Distinct from runDueSweep
// (task-due sweep, SMTP-gated in email.js): this sweep always runs, records
// exactly one alert_events row per contract x window BEFORE any send (FR-003),
// and treats email as an opt-in channel on top of the in-app room notice.
// Scheduled off the request path (boot + every 60 min, FR-002).

const DEFAULT_WINDOWS = [90, 60, 30, 15];
const EMAIL_TIMEOUT_MS = 5000;

// FR-005/AD-002: alert_windows is nullable TEXT (JSON array of positive
// integers) on the platform domains table; NULL (or garbage) falls back to
// the built-in default so a fresh domain needs zero setup.
function readWindows(rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === '') return [...DEFAULT_WINDOWS];
  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed) || parsed.length === 0) return [...DEFAULT_WINDOWS];
    const ints = parsed.map(Number);
    if (ints.some((value) => !Number.isInteger(value) || value <= 0)) return [...DEFAULT_WINDOWS];
    return [...new Set(ints)].sort((a, b) => b - a);
  } catch {
    return [...DEFAULT_WINDOWS];
  }
}

// E005 (FR-006): strict validator for PUT /api/alerts/windows.
//   - explicit null -> { reset: true }  (caller writes NULL = default)
//   - missing key, non-array, empty, or any element that is not a positive
//     integer -> null (caller answers 400; no row is touched)
//   - valid -> { windows: [...unique, sorted desc] } (canonical JSON form)
// Never throws; the caller maps null to 400 and reset to a NULL write, so an
// invalid payload can never fall back to silently keeping/re-writing defaults.
function parseWindowsStrict(value) {
  if (value === null) return { reset: true, windows: [...DEFAULT_WINDOWS] };
  if (value === undefined) return null;
  if (!Array.isArray(value) || value.length === 0) return null;
  if (value.some((entry) => typeof entry !== 'number' || !Number.isInteger(entry) || entry <= 0)) {
    return null;
  }
  return { windows: [...new Set(value)].sort((a, b) => b - a) };
}

// Whole days from today (local midnight) until the forecast date. The sweep
// only cares about contracts whose forecast is still ahead (days >= 0);
// already-late contracts belong to the E002 status partition, not the window
// logic here.
function daysUntil(forecastDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = String(forecastDate).split('-').map(Number);
  const target = new Date(year, month - 1, day);
  return Math.round((target - today) / 86400000);
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve({ sent: false, timedOut: true }), ms).unref?.()),
  ]);
}

// One pass over active domains (optionally a single domainId for the manual
// trigger). Never throws: per-domain try/catch keeps one bad database from
// stopping the rest (SC-005); the email result only updates the already
// persisted row.
async function runExpirySweep({ notifyFn, domainId, emailTimeoutMs } = {}) {
  const timeoutMs = emailTimeoutMs || EMAIL_TIMEOUT_MS;
  const notify = notifyFn || require('./email').notify;
  const { emitDomainEvent } = require('./events');
  const { getPlatformDb, getDomainDb } = require('../config/database');
  const platform = getPlatformDb();
  const domains = domainId
    ? platform.all("SELECT id, alert_windows FROM domains WHERE status = 'active' AND id = ?", [Number(domainId)])
    : platform.all("SELECT id, alert_windows FROM domains WHERE status = 'active'");

  let swept = 0;
  let emitted = 0;
  let emailed = 0;
  let failed = 0;

  for (const domain of domains) {
    try {
      const db = getDomainDb(domain.id);
      const windows = readWindows(domain.alert_windows);
      const contracts = db.all(
        `SELECT c.id, c.name, c.forecast_date, u.email AS creator_email
         FROM contracts c LEFT JOIN users u ON u.id = c.created_by`
      );
      for (const contract of contracts) {
        if (!contract.forecast_date) continue;
        const days = daysUntil(contract.forecast_date);
        if (days < 0) continue;
        // FR-005/SC-001: one alert per pass — the tightest window that still
        // contains the days left (20 days out -> the 30-day window, not 60/90
        // as well). Already-fired windows stay deduped by UNIQUE.
        const applicable = windows.filter((window) => window >= days);
        if (applicable.length === 0) continue;
        const window = Math.min(...applicable);
        // FR-003: persist the dedup fact BEFORE any side effect. UNIQUE
        // constraint does the idempotency; a duplicate means this window
        // was already alerted and nothing downstream runs again.
        try {
          db.run(
            "INSERT INTO alert_events(contract_id, window_days, email_status) VALUES (?, ?, 'skipped')",
            [contract.id, window]
          );
        } catch {
          continue;
        }
        swept += 1;
        emitDomainEvent('contract_alert', domain.id, {
          contractId: contract.id,
          name: contract.name,
          windowDays: window,
          forecastDate: contract.forecast_date,
        });
        emitted += 1;
        if (contract.creator_email) {
          const result = await withTimeout(
            notify('contract_alert', {
              to: [contract.creator_email],
              subject: `Contrato próximo do vencimento (${window} dias): ${contract.name}`,
              text: `Contrato: ${contract.name}\nPrevisão: ${contract.forecast_date}\nJanela: ${window} dias`,
            }),
            timeoutMs
          );
          if (result.sent) {
            db.run("UPDATE alert_events SET email_status = 'sent' WHERE contract_id = ? AND window_days = ?", [
              contract.id,
              window,
            ]);
            emailed += 1;
          } else if (!result.skipped) {
            // error or timeout — record and keep sweeping (SC-003)
            db.run("UPDATE alert_events SET email_status = 'failed' WHERE contract_id = ? AND window_days = ?", [
              contract.id,
              window,
            ]);
            failed += 1;
          }
        }
      }
    } catch {
      // FR-002/SC-005: swallow per-domain errors; the loop continues.
    }
  }
  return { swept, emitted, emailed, failed };
}

module.exports = {
  runExpirySweep,
  readWindows,
  DEFAULT_WINDOWS,
  EMAIL_TIMEOUT_MS,
  // E005: the panel reuses the engine's date arithmetic (STF-001) and its
  // strict window validator so grouping and sweep can never diverge.
  daysUntil,
  parseWindowsStrict,
};
