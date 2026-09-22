'use strict';

// FR-010 flow: A Fazer → Em Progresso → Revisão → Concluída.
const FLOW = ['A Fazer', 'Em Progresso', 'Revisão', 'Concluída'];

class Task {
  static FLOW = FLOW;

  static flowIndex(status) {
    return FLOW.indexOf(status);
  }

  static decorate(db, row) {
    const assignee = row.assignee_id
      ? db.get('SELECT id, name, email FROM users WHERE id = ?', [row.assignee_id])
      : null;
    const contract = db.get('SELECT id, name, status FROM contracts WHERE id = ?', [row.contract_id]);
    const photoCount = db.get('SELECT COUNT(*) AS c FROM task_photos WHERE task_id = ?', [row.id]).c;
    return {
      ...row,
      assignee_name: assignee ? assignee.name : null,
      assignee_email: assignee ? assignee.email : null,
      contract_name: contract ? contract.name : null,
      photo_count: photoCount,
    };
  }

  static findById(db, id) {
    const row = db.get('SELECT * FROM tasks WHERE id = ?', [Number(id)]);
    if (!row) return null;
    return Task.decorate(db, row);
  }

  static create(db, { contract_id, title, description, priority, assignee_id, due_date }) {
    db.run(
      `INSERT INTO tasks(contract_id, title, description, status, priority, assignee_id, due_date)
       VALUES (?, ?, ?, 'A Fazer', ?, ?, ?)`,
      [
        contract_id,
        title,
        description || null,
        priority || 'medium',
        assignee_id || null,
        due_date || null,
      ]
    );
    const id = db.get('SELECT MAX(id) AS id FROM tasks WHERE contract_id = ?', [contract_id]).id;
    return Task.findById(db, id);
  }

  static update(db, id, fields) {
    const allowed = ['title', 'description', 'priority', 'assignee_id', 'due_date'];
    const sets = [];
    const params = [];
    for (const key of allowed) {
      if (Object.hasOwn(fields, key)) {
        sets.push(`${key} = ?`);
        params.push(fields[key]);
      }
    }
    if (!sets.length) return Task.findById(db, id);
    sets.push("updated_at = datetime('now')");
    params.push(id);
    db.run(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, params);
    return Task.findById(db, id);
  }

  static addHistory(db, taskId, action, userId, note = null) {
    db.run('INSERT INTO task_history(task_id, user_id, action, note) VALUES (?, ?, ?, ?)', [
      taskId,
      userId,
      action,
      note,
    ]);
  }

  static history(db, taskId) {
    return db.all(
      `SELECT h.id, h.task_id, h.user_id, h.action, h.note, h.created_at, u.name AS user_name
       FROM task_history h LEFT JOIN users u ON u.id = h.user_id
       WHERE h.task_id = ? ORDER BY h.id`,
      [taskId]
    );
  }
}

module.exports = Task;
