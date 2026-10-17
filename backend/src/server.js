'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { initDatabase, getDomainDb } = require('./config/database');
const { jwtSecret, assertDomainActive } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

const CORS_ORIGINS = ['http://localhost', 'http://localhost:80', 'http://localhost:8080', 'http://localhost:3000'];
const DEFAULT_PORT = 3001; // FR-029: backend binds 3001; frontend runs on 8080/3000

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

// Middleware
app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
app.use(express.json({ limit: '2mb' }),
  //debugging middleware to log incoming requests
  (req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    // se for uma requisição POST ou PUT, logar o corpo da requisição
    if (req.method === 'POST' || req.method === 'PUT') {
      console.log('Request body:', req.body);
    }
    console.log(`---------------------------------------------`);
    next();
  }

);

// Make io accessible to routes
app.set('io', io);

// FR-020: domain rooms. Clients join with {domainId}; mutations broadcast to
// the room so another tab reflects without reload (SC-012).
function emitDomainEvent(event, domainId, payload = {}) {
  io.to(`domain_${domainId}`).emit(event, payload);
}
require('./services/events').setEmitter(emitDomainEvent);

// FR-021: estado da geração para o polling de GET /api/v2/contracts/:id/analysis
// (recurso consultado pelo frontend sem recarregar; null = sem análise ainda).
function getAnalysisStatus(domainId, contractId) {
  if (!Number.isInteger(contractId) || contractId <= 0) return null;
  const db = getDomainDb(domainId);
  return require('./models/TaskSuggestion').analysisState(db, contractId);
}

// SC-005: completion photos stay on disk (FR-023) and are served by reference.
// E001 exception (spec Excluded): /uploads stays outside token and suspension
// checks — the accepted risk covers the API only.
app.use('/uploads', express.static(require('./middleware/upload').UPLOAD_DIR));

// Routes
const suggestionsRouter = require('./routes/suggestions'); // 00003: análise + sugestões
const tasksRouter = require('./routes/tasks');

// v1 removido em 2026-10-17 — superfície única /api/v2
// Exceção de nome: finalidades monta em /api/v2/purposes (segmento EN).
app.use('/api/v2/auth', require('./routes/auth'));
app.use('/api/v2/domains', require('./routes/domains'));
app.use('/api/v2/users', require('./routes/users'));
app.use('/api/v2/purposes', require('./routes/finalidades'));
app.use('/api/v2/contracts', require('./routes/contracts'));
app.use('/api/v2/contracts', require('./routes/definitions'));
app.use('/api/v2/contracts', require('./routes/workflow'));
app.use('/api/v2/contracts', require('./routes/review'));
app.use('/api/v2/contracts', suggestionsRouter.nested);
app.use('/api/v2/suggestions', suggestionsRouter);
app.use('/api/v2/opencode', require('./routes/opencodeConfig'));
app.use('/api/v2/contracts', tasksRouter.nested);
app.use('/api/v2/tasks', tasksRouter);
app.use('/api/v2/tasks', require('./routes/executionPlan'));
app.use('/api/v2/tasks', require('./routes/comments'));
app.use('/api/v2/tasks', require('./routes/attachments'));
app.use('/api/v2/search', require('./routes/search'));
app.use('/api/v2/dashboard', require('./routes/dashboard'));
app.use('/api/v2/alerts', require('./routes/alerts'));
app.use('/api/v2/audits', require('./routes/audits'));

// Health check
app.get('/api/v2/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket — domain rooms (FR-020). A sessão entra pelo handshake: sem JWT
// válido a conexão nem chega aqui, e o domínio da sala vem do token — nunca do
// cliente (FR-005/FR-014). O domínio suspenso cai junto, como na API.
io.use((socket, next) => {
  const { auth, query } = socket.handshake;
  const token = (auth && auth.token) || (query && query.token);
  if (!token || typeof token !== 'string') {
    return next(new Error('unauthorized'));
  }
  try {
    const user = jwt.verify(token, jwtSecret());
    if (user.domainId !== null && user.domainId !== undefined) {
      assertDomainActive(user.domainId);
    }
    socket.data.user = user;
    return next();
  } catch (err) {
    return next(new Error(err.code === 'DOMAIN_SUSPENDED' ? 'domain suspended' : 'unauthorized'));
  }
});

io.on('connection', (socket) => {
  const user = socket.data.user;

  // Só a sala que o token carrega — domainId divergente é recusado antes de
  // entrar na room.
  const bindable = (domainId) => {
    const own = user?.domainId;
    const id = Number(domainId);
    if (own === null || own === undefined) return 0;
    return Number.isInteger(id) && id > 0 && id === Number(own) ? id : 0;
  };

  socket.on('join_domain', (domainId, ack) => {
    const id = bindable(domainId);
    if (!id) {
      if (typeof ack === 'function') ack({ ok: false, error: 'Forbidden' });
      return;
    }
    socket.join(`domain_${id}`);
    if (typeof ack === 'function') ack({ ok: true });
  });

  socket.on('leave_domain', (domainId, ack) => {
    const id = bindable(domainId);
    if (id) socket.leave(`domain_${id}`);
    if (typeof ack === 'function') ack({ ok: id > 0 });
  });

  socket.on('disconnect', () => { });
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
  const sweep = () => runDueSweep().catch(() => { });
  sweep();
  setInterval(sweep, 60 * 60 * 1000).unref();
  // 00009 E004 FR-002: contract-expiry sweep — boot + hourly, off the request
  // path; always runs (unlike runDueSweep) and swallows errors per pass.
  const { runExpirySweep } = require('./services/alerts');
  const expirySweep = () => runExpirySweep().catch(() => { });
  expirySweep();
  setInterval(expirySweep, 60 * 60 * 1000).unref();
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

module.exports = { app, server, io, start, emitDomainEvent, getAnalysisStatus, DEFAULT_PORT, CORS_ORIGINS };
