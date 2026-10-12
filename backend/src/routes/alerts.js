'use strict';

// E004 (FR-006/AD-004): manual sweep trigger for demos and ops. Domain admin
// only; optional domainId is constrained by scopeDomain (token domain must
// match); absent domainId sweeps the caller's own domain. One pass, partial
// counters — the worker never throws into the request path.
//
// E005 (AD-001): same router now also serves the próximos vencimentos panel
// (GET /panel), the per-domain alert-window read (GET /windows) and the
// window configuration write (PUT /windows). Admin and gestor only (FR-003):
// every route runs authenticateToken -> requireRole -> scopeDomain before any
// panel/window query, so a prestador or a divergent domainId gets 403 with
// zero data reads.

const express = require('express');
const { authenticateToken, requireRole, scopeDomain } = require('../middleware/auth');
const { runExpirySweep, readWindows, daysUntil, parseWindowsStrict } = require('../services/alerts');
const { getPlatformDb, getDomainDb } = require('../config/database');
const { code } = require('../config/enums');

const mountAlertsRouter = express.Router();

mountAlertsRouter.post(
  '/sweep',
  authenticateToken,
  requireRole('admin'),
  scopeDomain(),
  async (req, res, next) => {
    try {
      const requested = req.body?.domainId;
      const domainId = requested ?? req.user?.domainId;
      const result = await runExpirySweep({ domainId: domainId || undefined });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// FR-001/FR-004 (AD-002/AD-003): one SELECT per request over the vigentes of
// the caller's domain.
//   - window aggregates (COUNT/SUM OVER) give domain-wide totals even when a
//     page slices rows, computed once before LIMIT/OFFSET;
//   - a per-row scalar subquery GROUP_CONCATs the alert_events pairs
//     window_days=email_status (the alert_events rows come from the E004
//     sweep — read-only here; E010 FR-003 reads the pair of the attributed
//     window);
//   - ORDER BY puts incompletos (forecast NULL/'' — sem previsão) first, then
//     forecast ASC with id tiebreak (STF-003): blocks are derived afterwards
//     from the returned items, never from a second query (HINT-005);
//   - the days-left / window assignment is JS on top of the exported engine
//     daysUntil (HINT-001/STF-001: local-midnight arithmetic, inclusive
//     janela >= dias), never SQL date math.
// An empty page (offset past the end, or a domain with no vigentes) has no
// row to carry the aggregates, so it falls back to one COUNT — the hot path
// stays a single SELECT.
function listPanel(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const rows = db.all(
      `SELECT c.id, c.name, c.forecast_date,
              (CASE WHEN c.forecast_date IS NULL OR c.forecast_date = '' THEN 1 ELSE 0 END) AS incomplete,
              COUNT(*) OVER () AS total,
              SUM(CASE WHEN c.forecast_date IS NULL OR c.forecast_date = '' THEN 1 ELSE 0 END) OVER () AS incomplete_total,
              (SELECT GROUP_CONCAT(window_days || '=' || COALESCE(email_status, ''))
                 FROM alert_events ae
                WHERE ae.contract_id = c.id) AS event_pairs
         FROM contracts c
        WHERE c.status = ?
        ORDER BY incomplete DESC, c.forecast_date ASC, c.id ASC
        LIMIT ? OFFSET ?`,
      [code('contracts.status', 'vigente'), limit, offset]
    );

    let total;
    let incompleteTotal;
    if (rows.length > 0) {
      total = rows[0].total;
      incompleteTotal = rows[0].incomplete_total || 0;
    } else {
      const counts = db.get(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN forecast_date IS NULL OR forecast_date = '' THEN 1 ELSE 0 END) AS incomplete
           FROM contracts WHERE status = ?`,
        [code('contracts.status', 'vigente')]
      );
      total = counts?.total || 0;
      incompleteTotal = counts?.incomplete || 0;
    }

    const domain = getPlatformDb().get('SELECT alert_windows FROM domains WHERE id = ?', [
      Number(req.user.domainId),
    ]);
    const windows = readWindows(domain?.alert_windows ?? null);

    const complete = [];
    const incompleteItems = [];
    for (const row of rows) {
      if (row.incomplete) {
        // FR-001: sem previsão (NULL ou '') nunca some — sai como incompleto,
        // fora dos blocos, sem window/alertado (SC-005).
        incompleteItems.push({ id: row.id, name: row.name, forecast_date: null });
        continue;
      }
      const days = daysUntil(row.forecast_date);
      const applicable = windows.filter((window) => window >= days);
      const window = applicable.length > 0 ? Math.min(...applicable) : null;
      // E010 FR-003/STF-002: pares "janela=status" das linhas do contrato —
      // o email_status exposto é sempre o da janela ATUALMENTE atribuída
      // (mesma autoridade do alertado); sem linha nessa janela => null.
      const eventPairs = String(row.event_pairs ?? '')
        .split(',')
        .filter(Boolean)
        .map((pair) => {
          const sep = pair.indexOf('=');
          return [Number(pair.slice(0, sep)), pair.slice(sep + 1)];
        });
      const statusByWindow = new Map(eventPairs);
      complete.push({
        id: row.id,
        name: row.name,
        forecast_date: row.forecast_date,
        days_left: days,
        window,
        // FR-002: alertado só quando alert_events registra a janela exata que
        // o agrupamento atribuiu ao contrato (linha em outra janela => false).
        alertado: window !== null && statusByWindow.has(window),
        // E010 FR-003: sent/failed/skipped da janela atribuída; null sem linha.
        email_status: (window !== null && statusByWindow.get(window)) || null,
      });
    }

    res.json({
      items: [...incompleteItems, ...complete],
      incomplete: incompleteTotal,
      total,
      limit,
      offset,
      windows,
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// FR-005: admin/gestor read the domain's current windows; NULL (fresh domain)
// resolves to the built-in default through the shared readWindows.
function getWindows(req, res) {
  try {
    const platform = getPlatformDb();
    const domain = platform.get('SELECT alert_windows FROM domains WHERE id = ?', [
      Number(req.user.domainId),
    ]);
    res.json({ windows: readWindows(domain?.alert_windows ?? null) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

// FR-006/HINT-003: strict write path — invalid payload is 400 with no row
// touched (parseWindowsStrict returns null), {windows:null} writes NULL so
// the domain falls back to the default; there is no silent fallback on write.
function putWindows(req, res) {
  try {
    const parsed = parseWindowsStrict((req.body || {}).windows);
    if (parsed === null) {
      return res
        .status(400)
        .json({ error: 'windows must be a non-empty array of positive integers' });
    }
    const platform = getPlatformDb();
    platform.run('UPDATE domains SET alert_windows = ? WHERE id = ?', [
      parsed.reset ? null : JSON.stringify(parsed.windows),
      Number(req.user.domainId),
    ]);
    const row = platform.get('SELECT alert_windows FROM domains WHERE id = ?', [
      Number(req.user.domainId),
    ]);
    res.json({ windows: readWindows(row?.alert_windows ?? null) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}

mountAlertsRouter.get('/panel', authenticateToken, requireRole('admin', 'gestor'), scopeDomain(), listPanel);
mountAlertsRouter.get('/windows', authenticateToken, requireRole('admin', 'gestor'), scopeDomain(), getWindows);
mountAlertsRouter.put('/windows', authenticateToken, requireRole('admin', 'gestor'), scopeDomain(), putWindows);

module.exports = mountAlertsRouter;
// E010 T002: símbolo exportado exigido pelo contrato de importação de
// tasks.md (`← T002:listPanel`); consumidor HTTP continua sendo a rota acima.
module.exports.listPanel = listPanel;
