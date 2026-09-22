'use strict';

// FR-020: decoupled domain event bus. server.js registers the Socket.io
// emitter at boot; route modules emit without requiring server.js (avoids
// a circular import).
let emitter = null;

function setEmitter(fn) {
  emitter = fn;
}

function emitDomainEvent(event, domainId, payload = {}) {
  if (!emitter) return false;
  try {
    emitter(event, domainId, payload);
    return true;
  } catch {
    return false;
  }
}

module.exports = { setEmitter, emitDomainEvent };
