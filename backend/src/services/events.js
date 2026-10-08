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

// FR-012/SC-005: emitted only AFTER the approval transaction commits — the
// room learns about the new official workflow exactly when it exists.
function emitWorkflowActivated(domainId, payload = {}) {
  return emitDomainEvent('workflow_activated', domainId, payload);
}

module.exports = { setEmitter, emitDomainEvent, emitWorkflowActivated };
