'use strict';

// 00020 (E018, FR-068): parcela vencida e não paga vira linha em
// `extracted_alerts`, a mesma tabela do E016 com UNIQUE(contract_id,
// source_kind, source_id). O dedup é por parcela, não por varredura: repetir
// a passada atualiza o título/vencimento em vez de criar alerta novo.
// Contrato encerrado nunca recebe alerta novo; o histórico existente fica.

const { code } = require('../config/enums');

const SOURCE_KIND = 'installment_overdue';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function runInstallmentSweep(db, today = todayIso()) {
  if (!db) throw new Error('db is required');
  const vigente = code('contracts.status', 'vigente');
  const rows = db.all(
    `SELECT i.id AS installment_id, i.contract_id, i.description, i.due_date,
            i.amount_cents, COALESCE(SUM(p.amount_cents), 0) AS paid_cents,
            c.status AS contract_status
       FROM contract_installments i
       JOIN contracts c ON c.id = i.contract_id
       LEFT JOIN contract_payments p ON p.installment_id = i.id
      WHERE i.due_date < ?
      GROUP BY i.id
      ORDER BY i.id`,
    [today]
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const row of rows) {
    // Contrato encerrado: nenhum alerta novo e nenhuma reescrita de alerta
    // antigo — o histórico consultável permanece intacto.
    if (Number(row.contract_status) !== vigente) {
      skipped += 1;
      continue;
    }
    if (Number(row.paid_cents) >= Number(row.amount_cents)) {
      skipped += 1;
      continue;
    }
    const title = `Parcela vencida: ${row.description}`;
    const existing = db.get(
      'SELECT id FROM extracted_alerts WHERE contract_id = ? AND source_kind = ? AND source_id = ?',
      [row.contract_id, SOURCE_KIND, String(row.installment_id)]
    );
    if (existing) {
      db.run(
        "UPDATE extracted_alerts SET title = ?, due_date = ?, updated_at = datetime('now') WHERE id = ?",
        [title, row.due_date, existing.id]
      );
      updated += 1;
      continue;
    }
    try {
      db.run(
        `INSERT INTO extracted_alerts(contract_id, source_kind, source_id, title, due_date, status)
         VALUES (?, ?, ?, ?, ?, 'open')`,
        [row.contract_id, SOURCE_KIND, String(row.installment_id), title, row.due_date]
      );
      created += 1;
    } catch {
      // Concorrência entre varreduras: a UNIQUE tripla já resolveu o dedup.
      skipped += 1;
    }
  }
  return { created, updated, skipped, scanned: rows.length };
}

module.exports = { runInstallmentSweep, SOURCE_KIND };
