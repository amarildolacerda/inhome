const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/tasks?project_id=1
router.get('/', (req, res) => {
  try {
    const { project_id, assignee_id } = req.query;

    let tasks;
    if (project_id) {
      tasks = Task.listByProject(parseInt(project_id));
    } else if (assignee_id) {
      tasks = Task.listByAssignee(parseInt(assignee_id));
    } else {
      tasks = Task.listByAssignee(req.user.id);
    }

    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', (req, res) => {
  try {
    const task = Task.findById(parseInt(req.params.id));
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tasks
router.post('/', (req, res) => {
  try {
    const { title, description, status, priority, project_id, assignee_id, due_date } = req.body;

    if (!title || !project_id) {
      return res.status(400).json({ error: 'Title and project_id are required' });
    }

    const task = Task.create({
      title,
      description,
      status,
      priority,
      project_id,
      assignee_id,
      due_date
    });

    res.status(201).json({ task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', (req, res) => {
  try {
    const task = Task.findById(parseInt(req.params.id));
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updated = Task.updateById(req.params.id, req.body);
    res.json({ task: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  try {
    const task = Task.findById(parseInt(req.params.id));
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    Task.delete(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
