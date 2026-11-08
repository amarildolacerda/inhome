'use strict';

const { code, label } = require('../config/enums');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

// FR-008: an expired contract is only signalled as atrasado — stored status
// stays vigente until the gestor extends or closes it. Status aqui é sempre o
// texto PT (a borda traduz o código gravado em decorate).
function isPerpetual(row) {
  if (!row) return false;
  if (typeof row.perpetual === 'boolean') return row.perpetual;
  if (typeof row.perpetual === 'number') return row.perpetual === 1;
  if (typeof row.perpetual === 'string') return ['1', 'true', 'yes', 'on'].includes(row.perpetual.toLowerCase());
  return false;
}

function isOverdue(row, now = new Date()) {
  if (!row || row.status !== 'vigente') return false;
  if (isPerpetual(row)) return false;
  if (!row.forecast_date || !DATE_RE.test(row.forecast_date)) return false;
  return row.forecast_date < todayIso(now);
}

function effectiveStatus(row, now = new Date()) {
  if (!row) return null;
  if (row.status === 'encerrado') return 'encerrado';
  if (isPerpetual(row)) return 'vigente';
  return isOverdue(row, now) ? 'atrasado' : 'vigente';
}

class Contract {
  static isOverdue = isOverdue;
  static effectiveStatus = effectiveStatus;

  static findById(db, id) {
    const row = db.get('SELECT * FROM contracts WHERE id = ?', [Number(id)]);
    if (!row) return null;
    return Contract.decorate(db, row);
  }

  static decorate(db, row) {
    const purpose = row.purpose_id
      ? db.get('SELECT name FROM purposes WHERE id = ?', [row.purpose_id])
      : null;
    const prestadores = db.all(
      `SELECT u.id, u.name, u.email FROM contract_providers cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.contract_id = ? ORDER BY u.id`,
      [row.id]
    );
    const counts = db.get(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS done,
              COALESCE(SUM(CASE WHEN status != ? AND due_date IS NOT NULL AND due_date < date('now') THEN 1 ELSE 0 END), 0) AS overdue
       FROM tasks WHERE contract_id = ?`,
      [code('tasks.status', 'Concluída'), code('tasks.status', 'Concluída'), row.id]
    );
    // Fase 3: o banco guarda o código; `status` (derivado) e `db_status`
    // (persistido) seguem saindo em texto PT, byte a byte como antes.
    const storedStatus = label('contracts.status', row.status);
    return {
      id: row.id,
      name: row.name,
      object: row.object,
      purpose_id: row.purpose_id,
      purpose_name: purpose ? purpose.name : null,
      start_date: row.start_date,
      forecast_date: row.forecast_date ?? '',
      perpetual: Boolean(row.perpetual),
      status: effectiveStatus({ ...row, status: storedStatus, perpetual: row.perpetual }),
      db_status: storedStatus,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      prestadores,
      task_count: counts.total,
      completed_count: counts.done,
      tasks_total: counts.total,
      tasks_done: counts.done,
      tasks_overdue: counts.overdue,
    };
  }
}

module.exports = Contract;
