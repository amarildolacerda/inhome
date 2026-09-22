const express = require('express');
const router = express.Router();
const { getAll, count, getOne } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/dashboard/stats
router.get('/stats', (req, res) => {
  try {
    const userId = req.user.id;

    const myProjects = getAll('projects', p => p.owner_id === userId);
    const totalProjects = myProjects.length;
    const activeProjects = myProjects.filter(p => p.status === 'active').length;

    const myProjectIds = myProjects.map(p => p.id);
    const myTasks = getAll('tasks', t => myProjectIds.includes(t.project_id));

    const totalTasks = myTasks.length;
    const completedTasks = myTasks.filter(t => t.status === 'done').length;
    const inProgressTasks = myTasks.filter(t => t.status === 'in_progress').length;
    const urgentTasks = myTasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;

    // Tasks by priority
    const priorityMap = {};
    myTasks.filter(t => t.status !== 'done').forEach(t => {
      priorityMap[t.priority] = (priorityMap[t.priority] || 0) + 1;
    });
    const tasksByPriority = Object.entries(priorityMap).map(([priority, count]) => ({ priority, count }));

    // Tasks by status
    const statusMap = {};
    myTasks.forEach(t => {
      statusMap[t.status] = (statusMap[t.status] || 0) + 1;
    });
    const tasksByStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

    // Recent projects
    const recentProjects = myProjects
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 5)
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
      });

    res.json({
      stats: {
        totalProjects,
        activeProjects,
        totalTasks,
        completedTasks,
        inProgressTasks,
        urgentTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      },
      tasksByPriority,
      tasksByStatus,
      recentProjects
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
