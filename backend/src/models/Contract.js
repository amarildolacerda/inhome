'use strict';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

// FR-008: an expired contract is only signalled as atrasado — stored status
// stays 'vigente' until the gestor extends or closes it.
function isOverdue(row, now = new Date()) {
  if (!row || row.status !== 'vigente') return false;
  if (!row.forecast_date || !DATE_RE.test(row.forecast_date)) return false;
  return row.forecast_date < todayIso(now);
}

function effectiveStatus(row, now = new Date()) {
  if (!row) return null;
  if (row.status === 'encerrado') return 'encerrado';
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
    const finalidade = row.finalidade_id
      ? db.get('SELECT name FROM finalidades WHERE id = ?', [row.finalidade_id])
      : null;
    const prestadores = db.all(
      `SELECT u.id, u.name, u.email FROM contract_prestadores cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.contract_id = ? ORDER BY u.id`,
      [row.id]
    );
    const counts = db.get(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN status = 'Concluída' THEN 1 ELSE 0 END), 0) AS done
       FROM tasks WHERE contract_id = ?`,
      [row.id]
    );
    return {
      id: row.id,
      name: row.name,
      object: row.object,
      finalidade_id: row.finalidade_id,
      finalidade_name: finalidade ? finalidade.name : null,
      start_date: row.start_date,
      forecast_date: row.forecast_date,
      status: effectiveStatus(row),
      db_status: row.status,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      prestadores,
      task_count: counts.total,
      completed_count: counts.done,
    };
  }
}

module.exports = Contract;
