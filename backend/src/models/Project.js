const { getOne, getAll, insert, update, remove, count } = require('../config/database');

class Project {
  static findById(id) {
    const project = getOne('projects', p => p.id === id);
    if (!project) return null;

    const owner = getOne('users', u => u.id === project.owner_id);
    const taskCount = count('tasks', t => t.project_id === id);
    const completedCount = count('tasks', t => t.project_id === id && t.status === 'done');

    return {
      ...project,
      owner_name: owner?.name || null,
      task_count: taskCount,
      completed_count: completedCount
    };
  }

  static create({ name, description, owner_id, status = 'active' }) {
    const project = insert('projects', { name, description, owner_id, status });
    return this.findById(project.id);
  }

  static updateById(id, fields) {
    const updated = update('projects', id, fields);
    if (!updated) return null;
    return this.findById(id);
  }

  static delete(id) {
    // Also delete associated tasks
    const tasks = getAll('tasks', t => t.project_id === id);
    tasks.forEach(t => remove('tasks', t.id));
    remove('projects', id);
  }

  static listByOwner(owner_id) {
    return getAll('projects', p => p.owner_id === owner_id)
      .map(p => {
        const taskCount = count('tasks', t => t.project_id === p.id);
        const completedCount = count('tasks', t => t.project_id === p.id && t.status === 'done');
        const owner = getOne('users', u => u.id === p.owner_id);
        return {
          ...p,
          owner_name: owner?.name || null,
          task_count: taskCount,
          completed_count: completedCount
        };
      })
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }

  static listAll() {
    return getAll('projects')
      .map(p => {
        const taskCount = count('tasks', t => t.project_id === p.id);
        const completedCount = count('tasks', t => t.project_id === p.id && t.status === 'done');
        const owner = getOne('users', u => u.id === p.owner_id);
        return {
          ...p,
          owner_name: owner?.name || null,
          task_count: taskCount,
          completed_count: completedCount
        };
      })
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }
}

module.exports = Project;
