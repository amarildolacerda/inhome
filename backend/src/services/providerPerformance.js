'use strict';

// 00026 (E024): nota de desempenho derivada sob demanda. Nenhuma tabela nova:
// a fonte é o histórico de tarefas já gravado por E002/E003/E012/E017. O
// cálculo é puro para uma mesma data de referência e nunca cruza domínios —
// o db recebido já é o do domínio da sessão.

const PAGE_SIZE = 100;
const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;
const OCCURRENCE_ACTIONS = {
  reopen: 'reabertura',
  maintain: 'manutencao',
  reject: 'rejeicao',
};

function httpError(status, message, errorCode) {
  const error = new Error(message);
  error.status = status;
  error.code = errorCode;
  return error;
}

function isoDate(value) {
  const raw = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function shiftDate(referenceDate, amount) {
  const date = new Date(`${referenceDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

// FR-008/FR-010/FR-012/STF-001: uma única entrada define janela, filtro e
// página. Valores ausentes usam 30 dias e hoje; página é fixa de 100 itens.
function parsePerformanceQuery(query = {}) {
  const rawDays = query.days === undefined || query.days === '' ? DEFAULT_DAYS : Number(query.days);
  if (!Number.isInteger(rawDays) || rawDays < 1 || rawDays > MAX_DAYS) {
    throw httpError(400, `days must be an integer between 1 and ${MAX_DAYS}`, 'PERFORMANCE_DAYS_INVALID');
  }

  const referenceDate = query.referenceDate === undefined || query.referenceDate === ''
    ? new Date().toISOString().slice(0, 10)
    : isoDate(query.referenceDate);
  if (!referenceDate) {
    throw httpError(400, 'referenceDate must be YYYY-MM-DD', 'PERFORMANCE_REFERENCE_DATE_INVALID');
  }

  let providerId = null;
  if (query.providerId !== undefined && query.providerId !== '') {
    providerId = Number(query.providerId);
    if (!Number.isInteger(providerId) || providerId <= 0) {
      throw httpError(400, 'providerId must be a positive integer', 'PERFORMANCE_PROVIDER_INVALID');
    }
  }

  const page = query.page === undefined || query.page === '' ? 1 : Number(query.page);
  if (!Number.isInteger(page) || page < 1) {
    throw httpError(400, 'page must be a positive integer', 'PERFORMANCE_PAGE_INVALID');
  }

  return {
    days: rawDays,
    referenceDate,
    startDate: shiftDate(referenceDate, -(rawDays - 1)),
    providerId,
    page,
    pageSize: PAGE_SIZE,
  };
}

function performanceProviders(db, providerId) {
  return db.all(
    `SELECT u.id, u.name
       FROM users u
       JOIN contract_providers cp ON cp.user_id = u.id
       JOIN contracts c ON c.id = cp.contract_id
      WHERE u.role = 'prestador'
        AND (? IS NULL OR u.id = ?)
      GROUP BY u.id, u.name
      ORDER BY u.name COLLATE NOCASE, u.id`,
    [providerId, providerId]
  );
}

// FR-009: o filtro combina tarefas criadas, concluídas ou com histórico no
// período. Isso mantém uma reabertura recente ligada à tarefa de origem antiga
// sem trazer o histórico inteiro do domínio para a memória.
function performanceTasks(db, window) {
  return db.all(
    `SELECT t.id, t.contract_id, t.assignee_id, t.title, t.due_date, t.completed_at, t.created_at
       FROM tasks t
       JOIN contract_providers cp ON cp.contract_id = t.contract_id AND cp.user_id = t.assignee_id
      WHERE t.assignee_id IS NOT NULL
        AND (date(t.created_at) BETWEEN ? AND ?
             OR date(t.completed_at) BETWEEN ? AND ?
             OR EXISTS (SELECT 1 FROM task_history h
                         WHERE h.task_id = t.id AND date(h.created_at) BETWEEN ? AND ?))`,
    [window.startDate, window.referenceDate, window.startDate, window.referenceDate,
      window.startDate, window.referenceDate]
  );
}

function performanceHistory(db, window) {
  return db.all(
    `SELECT h.task_id, h.action, h.note, h.created_at, h.user_id
       FROM task_history h
       JOIN tasks t ON t.id = h.task_id
       JOIN contract_providers cp ON cp.contract_id = t.contract_id AND cp.user_id = t.assignee_id
      WHERE h.action IN ('reopen', 'maintain', 'reject')
        AND date(h.created_at) BETWEEN ? AND ?`,
    [window.startDate, window.referenceDate]
  );
}

function shortDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function occurrence(task, type, date, reason) {
  return {
    type,
    date: shortDate(date),
    taskId: task.id,
    ...(reason ? { reason: String(reason).trim() } : {}),
  };
}

// FR-005/FR-006: cada evento vira ocorrência ligada à tarefa e ao motivo
// registrado. Atraso vem de `completed_at > due_date`, inclusive quando a
// conclusão não gravou uma linha própria no histórico (PATCH de status).
function deriveProviderOccurrences(tasks = [], historyRows = [], providerId) {
  const taskMap = new Map(
    tasks.filter((task) => task.assignee_id === providerId).map((task) => [task.id, task])
  );
  const result = [];

  for (const task of taskMap.values()) {
    if (task.due_date && task.completed_at && shortDate(task.completed_at) > task.due_date) {
      result.push(occurrence(task, 'atraso', task.completed_at,
        `Conclusão em ${shortDate(task.completed_at)}; prazo ${task.due_date}`));
    }
  }

  for (const row of historyRows) {
    const task = taskMap.get(row.task_id);
    const type = OCCURRENCE_ACTIONS[row.action];
    if (!task || !type) continue;
    result.push(occurrence(task, type, row.created_at, row.note));
  }
  return result;
}

// FR-007/AD-003: a identidade estável é tarefa + tipo + data. Uma reabertura
// seguida de reconclusão não vira duas ocorrências; reaberturas em datas
// distintas continuam distintas.
function dedupeOccurrences(occurrences = []) {
  const seen = new Set();
  return occurrences.filter((item) => {
    const key = `${item.taskId}|${item.type}|${item.date ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isOnTime(task) {
  return Boolean(task.completed_at && task.due_date && shortDate(task.completed_at) <= task.due_date);
}

// FR-001/FR-002: pesos fixos de HINT-003. Tarefas sem prazo ficam fora da
// pontualidade, mas entram no denominador de conclusão no prazo (HINT-005).
function scoreComponents(tasks = [], occurrences = []) {
  const withDeadline = tasks.filter((task) => task.due_date);
  const pontualidade = withDeadline.length === 0
    ? 100
    : Math.round((withDeadline.filter(isOnTime).length / withDeadline.length) * 100);
  const conclusaoNoPrazo = tasks.length === 0
    ? 0
    : Math.round((tasks.filter(isOnTime).length / tasks.length) * 100);
  return {
    pontualidade,
    conclusaoNoPrazo,
    ocorrencias: occurrences.length,
  };
}

function scoreFromComponents(components) {
  const occurrencesComponent = Math.max(0, 100 - 20 * components.ocorrencias);
  const score = Math.round(
    0.4 * components.pontualidade +
    0.4 * components.conclusaoNoPrazo +
    0.2 * occurrencesComponent
  );
  return Math.min(100, Math.max(0, score));
}

// FR-011: nota descendente; "sem dados" ao final; nome desempata.
function sortProviders(items = []) {
  return [...items].sort((a, b) => {
    if (a.hasData !== b.hasData) return a.hasData ? -1 : 1;
    if (a.score !== b.score) {
      if (a.score === null || a.score === undefined) return 1;
      if (b.score === null || b.score === undefined) return -1;
      return b.score - a.score;
    }
    return String(a.name).localeCompare(String(b.name), 'pt-BR');
  });
}

// FR-001/FR-003/FR-008/FR-009: projeção completa do domínio, derivada no
// momento da leitura. Nenhuma nota é gravada.
function computeProviderPerformance(db, query = {}) {
  const window = query.startDate ? query : parsePerformanceQuery(query);
  const providers = performanceProviders(db, window.providerId);
  const tasks = performanceTasks(db, window);
  const history = performanceHistory(db, window);

  const allItems = providers.map((provider) => {
    const providerTasks = tasks.filter((task) => task.assignee_id === provider.id);
    const hasData = providerTasks.length > 0;
    if (!hasData) {
      return {
        providerId: provider.id,
        name: provider.name,
        hasData: false,
        score: null,
        components: null,
        occurrences: [],
      };
    }
    const occurrences = dedupeOccurrences(
      deriveProviderOccurrences(providerTasks, history, provider.id)
    );
    const components = scoreComponents(providerTasks, occurrences);
    return {
      providerId: provider.id,
      name: provider.name,
      hasData: true,
      score: scoreFromComponents(components),
      components,
      occurrences,
    };
  });

  const sorted = sortProviders(allItems);
  const start = (window.page - 1) * PAGE_SIZE;
  return {
    referenceDate: window.referenceDate,
    days: window.days,
    total: sorted.length,
    page: window.page,
    pageSize: PAGE_SIZE,
    items: sorted.slice(start, start + PAGE_SIZE),
  };
}

function listPerformance(db, query = {}) {
  return computeProviderPerformance(db, query);
}

module.exports = {
  parsePerformanceQuery,
  computeProviderPerformance,
  listPerformance,
  deriveProviderOccurrences,
  dedupeOccurrences,
  scoreComponents,
  scoreFromComponents,
  sortProviders,
  PAGE_SIZE,
  DEFAULT_DAYS,
};
