'use strict';

// AD-002/AD-004/AD-008: in-process analysis job over the OpenCode CLI.
// The payload is assembled HERE from an allowlist (FR-004/FR-020) — the HTTP
// client never contributes context, and nothing outside the allowlist is
// sent. A rejected run becomes `falha` (FR-006) with manual retry only.

const config = require('../config/opencode');
const { getDomainDb } = require('../config/database');
const ContractDefinition = require('../models/ContractDefinition');
const TaskSuggestion = require('../models/TaskSuggestion');
const { emitDomainEvent } = require('./events');
// FR-005 symbols consumed here: the job parses stdout and persists versions.
const { parseSuggestion, createSuggestion } = TaskSuggestion;

// FR-004/FR-020: allowlist-only context. Exactly the 6 definitions plus the
// contract identification and validity window — no object, status, parties,
// CNPJ, values or contacts ever enter the payload.
function buildContext(db, contractId) {
  const contract = db.get(
    'SELECT id, name, start_date, forecast_date FROM contracts WHERE id = ?',
    [contractId]
  );
  if (!contract) return null;
  const definitions = ContractDefinition.latest(db, contractId);
  if (!definitions) return null;
  return {
    finalidade: definitions.finalidade,
    limitacoes: definitions.limitacoes,
    alvo: definitions.alvo,
    escopo: definitions.escopo,
    premissas: definitions.premissas,
    entregaveis: definitions.entregaveis,
    identificacao: { nome: contract.name },
    vigencia: { inicio: contract.start_date, previsao: contract.forecast_date },
  };
}

// Server-built prompt: context is JSON, instructions (refinement) come from a
// stored gestor field — never from the request body of the analysis call.
// FR-008: when refining, the previous kept items travel with the prompt so the
// model revises the list instead of restarting it.
function buildPrompt(context, instructions, previousItems = null) {
  const lines = [
    'Você assiste um gestor na montagem da lista de tarefas de um contrato.',
    'Responda SOMENTE com JSON válido no formato:',
    '{"tasks":[{"title":"...","description":"...","justificativa":"..."}]}',
    'Cada item deve trazer uma justificativa curta explicando por que existe.',
    `Contexto do contrato (allowlist do servidor): ${JSON.stringify(context)}`,
  ];
  if (previousItems && previousItems.length) {
    lines.push(`Itens da versão anterior: ${JSON.stringify(previousItems)}`);
  }
  if (instructions) lines.push(`Instruções do gestor: ${instructions}`);
  return lines.join('\n');
}

// FR-004: single CLI invocation with the server-assembled prompt. No retry.
async function requestAnalysis(db, contractId, { instructions = null, context = null } = {}) {
  const payload = context || buildContext(db, contractId);
  if (!payload) throw new Error('No definitions available for analysis');
  const prompt = buildPrompt(payload, instructions);
  return config.run({ prompt, timeoutMs: config.getTimeoutMs() });
}

// FR-008: refinement is a single CLI call carrying the previous kept items and
// the gestor's instructions; the caller parses stdout and persists a new
// version only after the run succeeds (failure leaves the old version alone).
async function requestRefinement(db, sourceRow, instructions) {
  const context = buildContext(db, sourceRow.contract_id);
  if (!context) throw new Error('No definitions available for analysis');
  const previousItems = db.all(
    `SELECT title, description, justification
       FROM suggestion_items
      WHERE suggestion_id = ? AND removed = 0
      ORDER BY ordem, id`,
    [sourceRow.id]
  );
  const prompt = buildPrompt(context, instructions, previousItems);
  return config.run({ prompt, timeoutMs: config.getTimeoutMs() });
}

// FR-014: execution plan prompt — task + contract allowlist context, answer
// shape fixed to passos/criterios/riscos (verified criteria + risks).
function buildPlanPrompt(task, context) {
  const lines = [
    'Elabore o plano de execução da tarefa abaixo deste contrato.',
    'Responda SOMENTE com JSON válido no formato:',
    '{"passos":["..."],"criterios":["..."],"riscos":["..."]}',
    'passos = sequência de ações verificáveis; criterios = como comprovar a conclusão; riscos = riscos da execução.',
    `Tarefa: ${JSON.stringify({ title: task.title, description: task.description ?? null })}`,
    `Contexto do contrato (allowlist do servidor): ${JSON.stringify(context)}`,
  ];
  return lines.join('\n');
}

// FR-014: strict plan parse. Anything that is not three non-empty arrays of
// strings is a failure — never a plan (same stance as parseSuggestion).
function parsePlan(stdout) {
  const text = typeof stdout === 'string' ? stdout.trim() : '';
  if (!text) throw new Error('Empty OpenCode response');
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('Unparseable OpenCode response (not JSON)');
  }
  const plan = {};
  for (const key of ['passos', 'criterios', 'riscos']) {
    const values = payload && payload[key];
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error(`Plan has no ${key}`);
    }
    const cleaned = values.map((value) => (typeof value === 'string' ? value.trim() : ''));
    if (cleaned.some((value) => !value)) {
      throw new Error(`Plan ${key} must be non-empty strings`);
    }
    plan[key] = cleaned;
  }
  return plan;
}

// FR-014: single CLI invocation for the plan prompt. No retry (FR-018).
async function requestExecutionPlan(db, task, context = null) {
  const payload = context || buildContext(db, task.contract_id);
  if (!payload) throw new Error('No definitions available for analysis');
  const prompt = buildPlanPrompt(task, payload);
  return config.run({ prompt, timeoutMs: config.getTimeoutMs() });
}

function emitState(domainId, contractId, suggestionId, status, error = null) {
  emitDomainEvent('analysis_state', domainId, { contractId, suggestionId, status, error });
}

// FR-006: record why the run failed. Definitions are never touched, the row
// stays for manual retry, and the state event reports `falha`.
function markFailed(db, domainId, row, error) {
  const message = (error && error.message) || String(error);
  TaskSuggestion.markFalha(db, row.id, message);
  emitState(domainId, row.contract_id, row.id, 'falha', message);
}

// FR-006/FR-018/FR-021: pendente → analisando → sugerido | falha. The prompt
// is sent once with the configured timeout; any failure (timeout, crash,
// empty or unparseable output) lands on `falha` — never on a suggestion.
async function runAnalysisJob(domainId, suggestionId) {
  const db = getDomainDb(domainId);
  const row = TaskSuggestion.find(db, suggestionId);
  if (!row || row.status !== 'pendente') return null;

  const context = buildContext(db, row.contract_id);
  const started = TaskSuggestion.markStarted(db, suggestionId, JSON.stringify(context));
  if (!started || started.status !== 'analisando') return null;
  emitState(domainId, row.contract_id, suggestionId, 'analisando');

  try {
    const { stdout } = await requestAnalysis(db, row.contract_id, {
      instructions: row.refine_instructions,
      context,
    });
    const items = parseSuggestion(stdout);
    TaskSuggestion.markSuggested(db, suggestionId, items);
    emitState(domainId, row.contract_id, suggestionId, 'sugerido');
    // US7 Edge Case: a review queued behind this analysis starts now (lazy
    // require — routes/review.js imports this module at the top).
    require('../routes/review').startQueuedReviews(domainId, row.contract_id);
    return TaskSuggestion.findSerialized(db, suggestionId, true);
  } catch (error) {
    markFailed(db, domainId, row, error);
    require('../routes/review').startQueuedReviews(domainId, row.contract_id);
    return null;
  }
}

module.exports = {
  buildContext,
  buildPrompt,
  buildPlanPrompt,
  parsePlan,
  requestAnalysis,
  requestRefinement,
  requestExecutionPlan,
  runAnalysisJob,
  markFailed,
};
