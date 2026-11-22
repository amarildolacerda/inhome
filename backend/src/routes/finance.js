'use strict';

// 00020 (E018): parcelas, pagamentos e exportação financeira por contrato.
// Toda rota passa por authenticateToken -> scopeDomain -> requireRole — o
// mesmo par de guards das rotas de contrato/chat — e o accessor de contrato
// repetE a checagem de papel antes de qualquer leitura de valor (STF-002).
// Um pagamento acima do saldo é 400 dentro da transação, sem escrita
// parcial (STF-001); comprovante inválido é recusado antes de qualquer
// gravação em disco (FR-066).

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { authenticateToken, requireRole, scopeDomain } = require('../middleware/auth');
const { getDomainDb } = require('../config/database');
const { saveToUploads, decodeAndValidate, UPLOAD_DIR } = require('../middleware/upload');
const { getContractFinance } = require('../services/finance');
const { generateFinancePdf, exportFinanceCsv } = require('../services/financeReport');

const ROLES = ['admin', 'gestor'];
const MAX_INSTALLMENTS = 500;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function httpError(status, message, code) {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  return error;
}

function fail(res, error) {
  const status = error.status || 500;
  return res.status(status).json(error.code ? { error: error.message, code: error.code } : { error: error.message });
}

function validDate(value) {
  return typeof value === 'string' && DATE_RE.test(value) && !Number.isNaN(Date.parse(value));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// Defesa em profundidade: o router já filtra o papel, mas o accessor também
// recusa qualquer papel não financeiro antes de buscar o contrato.
function assertFinanceAccess(db, user, contractId) {
  if (!user || !ROLES.includes(user.role)) {
    throw httpError(403, 'Forbidden', 'FINANCE_FORBIDDEN');
  }
  const contract = db.get('SELECT id, name FROM contracts WHERE id = ?', [Number(contractId)]);
  if (!contract) throw httpError(404, 'Contract not found');
  return contract;
}

function assertInstallmentScope(db, contractId, installmentId) {
  const row = db.get(
    'SELECT * FROM contract_installments WHERE id = ? AND contract_id = ?',
    [Number(installmentId), Number(contractId)]
  );
  if (!row) throw httpError(404, 'Installment not found');
  return row;
}

function validateInstallment(body = {}) {
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (!description || description.length > 200) {
    throw httpError(400, 'description must be 1-200 characters', 'INSTALLMENT_DESCRIPTION_INVALID');
  }
  if (!Number.isInteger(body.amount_cents) || body.amount_cents <= 0) {
    throw httpError(400, 'amount_cents must be a positive integer', 'INSTALLMENT_AMOUNT_INVALID');
  }
  if (!validDate(body.due_date)) {
    throw httpError(400, 'due_date must be a valid YYYY-MM-DD date', 'INSTALLMENT_DATE_INVALID');
  }
  return { description, amountCents: body.amount_cents, dueDate: body.due_date };
}

function validatePayment(body = {}) {
  if (!Number.isInteger(body.amount_cents) || body.amount_cents <= 0) {
    throw httpError(400, 'amount_cents must be a positive integer', 'PAYMENT_AMOUNT_INVALID');
  }
  const paidAt = body.paid_at === undefined || body.paid_at === null || body.paid_at === ''
    ? todayIso()
    : body.paid_at;
  if (!validDate(paidAt)) {
    throw httpError(400, 'paid_at must be a valid YYYY-MM-DD date', 'PAYMENT_DATE_INVALID');
  }
  let receipt = null;
  if (body.receipt !== undefined && body.receipt !== null) {
    if (typeof body.receipt !== 'object' || Array.isArray(body.receipt)) {
      throw httpError(400, 'receipt must be an object', 'PAYMENT_RECEIPT_INVALID');
    }
    receipt = body.receipt;
  }
  return { amountCents: body.amount_cents, paidAt, receipt };
}

function paymentView(db, paymentId) {
  const row = db.get(
    `SELECT p.id, p.installment_id, p.contract_id, p.amount_cents, p.paid_at,
            (SELECT a.path FROM attachments a
              WHERE a.payment_id = p.id AND a.category = 'payment'
              ORDER BY a.id LIMIT 1) AS receipt_path,
            (SELECT a.original_name FROM attachments a
              WHERE a.payment_id = p.id AND a.category = 'payment'
              ORDER BY a.id LIMIT 1) AS receipt_name
       FROM contract_payments p WHERE p.id = ?`,
    [paymentId]
  );
  return {
    id: row.id,
    installment_id: row.installment_id,
    contract_id: row.contract_id,
    amount_cents: Number(row.amount_cents),
    paid_at: row.paid_at,
    receipt: row.receipt_path
      ? { path: row.receipt_path, original_name: row.receipt_name }
      : null,
  };
}

function getFinance(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    assertFinanceAccess(db, req.user, req.params.id);
    res.json(getContractFinance(db, req.params.id));
  } catch (error) {
    fail(res, error);
  }
}

function listInstallments(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    assertFinanceAccess(db, req.user, req.params.id);
    const finance = getContractFinance(db, req.params.id);
    res.json({ installments: finance.installments, summary: finance.summary });
  } catch (error) {
    fail(res, error);
  }
}

function createInstallment(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const contract = assertFinanceAccess(db, req.user, req.params.id);
    const input = validateInstallment(req.body || {});
    const count = db.get(
      'SELECT COUNT(*) AS c FROM contract_installments WHERE contract_id = ?',
      [contract.id]
    ).c;
    if (count >= MAX_INSTALLMENTS) {
      throw httpError(400, `contract already has ${MAX_INSTALLMENTS} installments`, 'INSTALLMENT_LIMIT_REACHED');
    }
    db.run(
      `INSERT INTO contract_installments(contract_id, description, amount_cents, due_date, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [contract.id, input.description, input.amountCents, input.dueDate, req.user.id]
    );
    // sql.js prepared statements não preservam last_insert_rowid() entre
    // chamadas; sqlite_sequence é a fonte estável com AUTOINCREMENT.
    const id = Number(
      db.get("SELECT seq AS id FROM sqlite_sequence WHERE name = 'contract_installments'").id
    );
    const finance = getContractFinance(db, contract.id);
    const created = finance.installments.find((item) => item.id === id);
    res.status(201).json({ installment: created });
  } catch (error) {
    fail(res, error);
  }
}

function deleteInstallment(req, res) {
  try {
    const db = getDomainDb(req.user.domainId);
    const contract = assertFinanceAccess(db, req.user, req.params.id);
    const installment = assertInstallmentScope(db, contract.id, req.params.iid);
    const payments = db.get(
      'SELECT COUNT(*) AS c FROM contract_payments WHERE installment_id = ?',
      [installment.id]
    ).c;
    if (payments > 0) {
      throw httpError(400, 'installment has payments', 'INSTALLMENT_HAS_PAYMENT');
    }
    db.run('DELETE FROM contract_installments WHERE id = ?', [installment.id]);
    res.status(204).end();
  } catch (error) {
    fail(res, error);
  }
}

function postPayment(req, res) {
  let writtenPath = null;
  try {
    const db = getDomainDb(req.user.domainId);
    const contract = assertFinanceAccess(db, req.user, req.params.id);
    const installment = assertInstallmentScope(db, contract.id, req.params.iid);
    const input = validatePayment(req.body || {});
    // Validação de disco antes de qualquer escrita: um arquivo inválido não
    // pode deixar pagamento parcial (FR-066 / SC-004).
    if (input.receipt) decodeAndValidate(input.receipt);

    const paymentId = db.transaction((tx) => {
      const current = tx.get(
        'SELECT amount_cents FROM contract_installments WHERE id = ?',
        [installment.id]
      );
      if (!current) throw httpError(404, 'Installment not found');
      const paid = Number(
        tx.get(
          'SELECT COALESCE(SUM(amount_cents), 0) AS c FROM contract_payments WHERE installment_id = ?',
          [installment.id]
        ).c
      );
      const balance = Number(current.amount_cents) - paid;
      if (input.amountCents > balance) {
        throw httpError(
          400,
          `amount exceeds remaining balance of ${balance} cents`,
          'PAYMENT_EXCEEDS_INSTALLMENT'
        );
      }
      tx.run(
        `INSERT INTO contract_payments(installment_id, contract_id, amount_cents, paid_at, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [installment.id, contract.id, input.amountCents, input.paidAt, req.user.id]
      );
      const id = Number(
        tx.get("SELECT seq AS id FROM sqlite_sequence WHERE name = 'contract_payments'").id
      );
      if (input.receipt) {
        writtenPath = saveToUploads(input.receipt);
        tx.run(
          `INSERT INTO attachments(task_id, message_id, payment_id, kind, path, original_name, uploaded_by, category)
           VALUES (NULL, NULL, ?, 'file', ?, ?, ?, 'payment')`,
          [id, writtenPath, input.receipt.filename || null, req.user.id]
        );
      }
      return id;
    });

    res.status(201).json({ payment: paymentView(db, paymentId) });
  } catch (error) {
    if (writtenPath) {
      try {
        fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(writtenPath)));
      } catch {
        // Arquivo já ausente: nada a limpar.
      }
    }
    fail(res, error);
  }
}

function exportFinance(req, res, format) {
  try {
    const db = getDomainDb(req.user.domainId);
    assertFinanceAccess(db, req.user, req.params.id);
    if (format === 'csv') {
      const csv = exportFinanceCsv(db, req.params.id);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="finance-${req.params.id}.csv"`);
      return res.send(csv);
    }
    const pdf = generateFinancePdf(db, req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="finance-${req.params.id}.pdf"`);
    return res.send(pdf);
  } catch (error) {
    fail(res, error);
  }
}

router.use(authenticateToken);
router.use(scopeDomain());
router.get('/:id/finance', requireRole(...ROLES), getFinance);
router.get('/:id/finance/installments', requireRole(...ROLES), listInstallments);
router.post('/:id/finance/installments', requireRole(...ROLES), createInstallment);
router.delete('/:id/finance/installments/:iid', requireRole(...ROLES), deleteInstallment);
router.post('/:id/finance/installments/:iid/payments', requireRole(...ROLES), postPayment);
router.get('/:id/finance/export.csv', requireRole(...ROLES), (req, res) => exportFinance(req, res, 'csv'));
router.get('/:id/finance/export.pdf', requireRole(...ROLES), (req, res) => exportFinance(req, res, 'pdf'));

Object.assign(router, {
  assertFinanceAccess,
  assertInstallmentScope,
  validateInstallment,
  validatePayment,
  getFinance,
  listInstallments,
  createInstallment,
  deleteInstallment,
  postPayment,
  exportFinance,
});

module.exports = router;
