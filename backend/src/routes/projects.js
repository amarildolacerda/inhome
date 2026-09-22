const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/projects
router.get('/', (req, res) => {
  try {
    const projects = Project.listByOwner(req.user.id);
    res.json({ projects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id
router.get('/:id', (req, res) => {
  try {
    const project = Project.findById(parseInt(req.params.id));
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ project });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects
router.post('/', (req, res) => {
  try {
    const { name, description, status } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = Project.create({
      name,
      description,
      owner_id: req.user.id,
      status
    });

    res.status(201).json({ project });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:id
router.put('/:id', (req, res) => {
  try {
    const project = Project.findById(parseInt(req.params.id));
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = Project.updateById(req.params.id, req.body);
    res.json({ project: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => {
  try {
    const project = Project.findById(parseInt(req.params.id));
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    Project.delete(req.params.id);
    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
