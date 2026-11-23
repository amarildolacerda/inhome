'use strict';

// 00020 (E018, FR-064/067): leitura financeira por contrato e agregado de
// domínio. Um SELECT agrupado por parcela alimenta o resumo, o painel e as
// exportações — os mesmos números em todos os destinos (SC-001/SC-003).
// Valores são centavos inteiros; nenhuma conversão de moeda acontece aqui.

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function asCents(value) {
  return Number(value || 0);
}

function paymentRows(db, installmentId) {
  return db
    .all(
      `SELECT p.id, p.amount_cents, p.paid_at,
              (SELECT a.path FROM attachments a
                WHERE a.payment_id = p.id AND a.category = 'payment'
                ORDER BY a.id LIMIT 1) AS receipt_path,
              (SELECT a.original_name FROM attachments a
                WHERE a.payment_id = p.id AND a.category = 'payment'
                ORDER BY a.id LIMIT 1) AS receipt_name
         FROM contract_payments p
        WHERE p.installment_id = ?
        ORDER BY p.id`,
      [installmentId]
    )
    .map((row) => ({
      id: row.id,
      amount_cents: asCents(row.amount_cents),
      paid_at: row.paid_at,
      receipt: row.receipt_path
        ? { path: row.receipt_path, original_name: row.receipt_name }
        : null,
    }));
}

// Linha agrupada → parcela decorada. `overdue` é derivado do vencimento e do
// saldo, independente do status do contrato: a parcela de um contrato
// encerrado continua consultável, apenas não gera alerta novo (FR-068).
function decorateInstallment(db, row, today) {
  const amountCents = asCents(row.amount_cents);
  const paidCents = asCents(row.paid_cents);
  const balanceCents = amountCents - paidCents;
  return {
    id: row.id,
    contract_id: row.contract_id,
    description: row.description,
    amount_cents: amountCents,
    due_date: row.due_date,
    paid_cents: paidCents,
    balance_cents: balanceCents,
    overdue: balanceCents > 0 && row.due_date < today,
    payments: paymentRows(db, row.id),
  };
}

function groupedInstallments(db, where = '', params = []) {
  return db.all(
    `SELECT i.id, i.contract_id, i.description, i.amount_cents, i.due_date,
            COALESCE(SUM(p.amount_cents), 0) AS paid_cents
       FROM contract_installments i
       LEFT JOIN contract_payments p ON p.installment_id = i.id
      ${where}
      GROUP BY i.id
      ORDER BY i.due_date, i.id`,
    params
  );
}

function getContractFinance(db, contractId) {
  const id = Number(contractId);
  const contract = db.get('SELECT id, name FROM contracts WHERE id = ?', [id]);
  if (!contract) return null;
  const today = todayIso();
  const installments = groupedInstallments(db, 'WHERE i.contract_id = ?', [id]).map((row) =>
    decorateInstallment(db, row, today)
  );
  const plannedCents = installments.reduce((sum, item) => sum + item.amount_cents, 0);
  const paidCents = installments.reduce((sum, item) => sum + item.paid_cents, 0);
  return {
    contract_id: contract.id,
    contract_name: contract.name,
    summary: {
      planned_cents: plannedCents,
      paid_cents: paidCents,
      balance_cents: plannedCents - paidCents,
      overdue_count: installments.filter((item) => item.overdue).length,
      installments_count: installments.length,
    },
    installments,
  };
}

// FR-067: chamado somente no ramo `scope: 'domain'` do dashboard; prestador
// e visitante nunca recebem a chave `finance` (STF-002).
function getDomainFinance(db) {
  const today = todayIso();
  const rows = groupedInstallments(db);
  const plannedCents = rows.reduce((sum, row) => sum + asCents(row.amount_cents), 0);
  const paidCents = rows.reduce((sum, row) => sum + asCents(row.paid_cents), 0);
  return {
    planned_cents: plannedCents,
    paid_cents: paidCents,
    balance_cents: plannedCents - paidCents,
    overdue_count: rows.filter(
      (row) => asCents(row.paid_cents) < asCents(row.amount_cents) && row.due_date < today
    ).length,
    installments_count: rows.length,
    contracts_count: new Set(rows.map((row) => row.contract_id)).size,
  };
}

module.exports = {
  getContractFinance,
  getDomainFinance,
  decorateInstallment,
  groupedInstallments,
};
