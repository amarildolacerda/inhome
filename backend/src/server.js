'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { initDatabase } = require('./config/database');

const app = express();
const server = http.createServer(app);

const CORS_ORIGINS = ['http://localhost:8080', 'http://localhost:3000'];
const DEFAULT_PORT = 3001; // FR-029: backend binds 3001; frontend runs on 8080/3000

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

// Middleware
app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Make io accessible to routes
app.set('io', io);

// FR-020: domain rooms. Clients join with {domainId}; mutations broadcast to
// the room so another tab reflects without reload (SC-012).
function emitDomainEvent(event, domainId, payload = {}) {
  io.to(`domain_${domainId}`).emit(event, payload);
}
require('./services/events').setEmitter(emitDomainEvent);

// SC-005: completion photos stay on disk (FR-023) and are served by reference.
app.use('/uploads', express.static(require('./middleware/upload').UPLOAD_DIR));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/domains', require('./routes/domains'));
app.use('/api/users', require('./routes/users'));
app.use('/api/finalidades', require('./routes/finalidades'));
app.use('/api/contracts', require('./routes/contracts')); // AD-003: projects remodeled to contratos
const tasksRouter = require('./routes/tasks');
app.use('/api/contracts', tasksRouter.nested); // POST /api/contracts/:contractId/tasks
app.use('/api/tasks', tasksRouter);
app.use('/api/tasks', require('./routes/comments')); // FR-015: /:id/comments
app.use('/api/tasks', require('./routes/attachments')); // FR-015: /:id/attachments
app.use('/api/search', require('./routes/search')); // FR-016: combined filters
app.use('/api/dashboard', require('./routes/dashboard'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket — domain rooms (FR-020). join_domain binds a socket to a tenant
// room; mutations from routes emit into the same room.
io.on('connection', (socket) => {
  socket.on('join_domain', (domainId) => {
    socket.join(`domain_${domainId}`);
  });

  socket.on('leave_domain', (domainId) => {
    socket.leave(`domain_${domainId}`);
  });

  socket.on('disconnect', () => {});
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Listen only when executed directly so supertest can mount `app` without
// binding port 3001.
async function start(port = Number(process.env.PORT) || DEFAULT_PORT) {
  await initDatabase();
  // FR-017 trigger 4/4: due-task sweep — hourly; inert without SMTP_* (AD-004).
  const { runDueSweep } = require('./services/email');
  const sweep = () => runDueSweep().catch(() => {});
  sweep();
  setInterval(sweep, 60 * 60 * 1000).unref();
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => resolve(server));
  });
}

if (require.main === module) {
  start()
    .then((srv) => {
      console.log(`Server running on http://localhost:${srv.address().port}`);
    })
    .catch((err) => {
      console.error('Failed to initialize database:', err);
      process.exit(1);
    });
}

module.exports = { app, server, io, start, emitDomainEvent, DEFAULT_PORT, CORS_ORIGINS };
