'use strict';

// 00020 (E018, FR-069): exportação financeira reutiliza o writer PDF e o
// escape CSV de `report.js` (AD-006). Nenhum anexo genérico entra na saída:
// os dados vêm de `getContractFinance`, que só lê parcelas/pagamentos —
// STF-005 (chat nunca aparece no relatório financeiro).

const { buildPdf, csvCell } = require('./report');
const { getContractFinance } = require('./finance');

// BRL sem dependência: centavos → "R$ 1.234,56".
function brl(cents) {
  const value = Number(cents || 0);
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const reais = Math.floor(abs / 100);
  const centavos = String(abs % 100).padStart(2, '0');
  return `${sign}R$ ${String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${centavos}`;
}

function statusText(item) {
  if (item.balance_cents <= 0) return 'paga';
  return item.overdue ? 'atrasada' : 'aberta';
}

function lines(finance) {
  const { contract_name, summary, installments } = finance;
  const out = [
    `Resumo financeiro - contrato ${finance.contract_id}: ${contract_name}`,
    `Previsto: ${brl(summary.planned_cents)}`,
    `Pago: ${brl(summary.paid_cents)}`,
    `Saldo: ${brl(summary.balance_cents)}`,
    `Parcelas: ${summary.installments_count} (atrasadas: ${summary.overdue_count})`,
    '',
  ];
  for (const item of installments) {
    out.push(
      `${item.id} | ${item.description} | venc.: ${item.due_date} | ` +
        `previsto ${brl(item.amount_cents)} | pago ${brl(item.paid_cents)} | ` +
        `saldo ${brl(item.balance_cents)} | ${statusText(item)}`
    );
  }
  return out;
}

function generateFinancePdf(db, contractId) {
  const finance = getContractFinance(db, contractId);
  if (!finance) return null;
  return buildPdf(lines(finance));
}

function exportFinanceCsv(db, contractId) {
  const finance = getContractFinance(db, contractId);
  if (!finance) return null;
  const header = [
    'contract_id',
    'contract_name',
    'installment_id',
    'description',
    'due_date',
    'amount_cents',
    'paid_cents',
    'balance_cents',
    'status',
    'planned_cents',
    'total_paid_cents',
    'total_balance_cents',
    'overdue_count',
  ];
  const rows = finance.installments.map((item) =>
    [
      finance.contract_id,
      finance.contract_name,
      item.id,
      item.description,
      item.due_date,
      item.amount_cents,
      item.paid_cents,
      item.balance_cents,
      statusText(item),
      finance.summary.planned_cents,
      finance.summary.paid_cents,
      finance.summary.balance_cents,
      finance.summary.overdue_count,
    ]
      .map(csvCell)
      .join(',')
  );
  return [header.join(','), ...rows].join('\n') + '\n';
}

module.exports = { generateFinancePdf, exportFinanceCsv, brl, statusText };
