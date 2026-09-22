const { getOne, getAll, insert, update, remove } = require('../config/database');

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

class Task {
  static findById(id) {
    const task = getOne('tasks', t => t.id === id);
    if (!task) return null;

    const assignee = task.assignee_id ? getOne('users', u => u.id === task.assignee_id) : null;
    const project = getOne('projects', p => p.id === task.project_id);

    return {
      ...task,
      assignee_name: assignee?.name || null,
      project_name: project?.name || null
    };
  }

  static create({ title, description, status = 'todo', priority = 'medium', project_id, assignee_id, due_date }) {
    const task = insert('tasks', {
      title,
      description,
      status,
      priority,
      project_id,
      assignee_id: assignee_id || null,
      due_date: due_date || null
    });
    return this.findById(task.id);
  }

  static updateById(id, fields) {
    const updated = update('tasks', id, fields);
    if (!updated) return null;
    return this.findById(id);
  }

  static delete(id) {
    remove('tasks', id);
  }

  static listByProject(project_id) {
    return getAll('tasks', t => t.project_id === project_id)
      .map(t => {
        const assignee = t.assignee_id ? getOne('users', u => u.id === t.assignee_id) : null;
        return { ...t, assignee_name: assignee?.name || null };
      })
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 2;
        const pb = PRIORITY_ORDER[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        return new Date(b.created_at) - new Date(a.created_at);
      });
  }

  static listByAssignee(assignee_id) {
    return getAll('tasks', t => t.assignee_id === assignee_id)
      .map(t => {
        const project = getOne('projects', p => p.id === t.project_id);
        return { ...t, project_name: project?.name || null };
      })
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }
}

module.exports = Task;
