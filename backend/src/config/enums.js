'use strict';

// Fase 3 da convenção de nomenclatura (2026-10-12, docs/naming-conventions.md):
// os 6 enums de dado são persistidos como INTEGER — código estável, base 1 —
// e a API continua expondo exatamente o mesmo texto PT de antes (tradução na
// borda pelo backend; contrato JSON inalterado). Este módulo é a fonte única
// do par código↔label: SQL novo nunca embute literal de enum.
//
// `contracts.status` carrega o código 3 (atrasado) só para filtro e
// apresentação na borda: atrasado é derivado na leitura (models/Contract.js)
// e nunca é gravado.

const ENUMS = Object.freeze({
  'contracts.status': Object.freeze({ vigente: 1, encerrado: 2, atrasado: 3 }),
  'tasks.status': Object.freeze({
    'A Fazer': 1,
    'Em Progresso': 2,
    'Revisão': 3,
    'Concluída': 4,
  }),
  'task_suggestions.status': Object.freeze({
    pendente: 1,
    analisando: 2,
    sugerido: 3,
    falha: 4,
    aprovada: 5,
  }),
  'task_suggestions.kind': Object.freeze({ analise: 1, revisao: 2 }),
  'workflow_versions.status': Object.freeze({ ativo: 1, substituido: 2 }),
  'execution_plans.status': Object.freeze({ pendente: 1, gerado: 2, falha: 3 }),
});

function enumTable(enumName) {
  const entry = ENUMS[enumName];
  if (!entry) throw new Error(`Unknown enum: ${enumName}`);
  return entry;
}

// label PT → código (caminho de escrita). Rótulo desconhecido falha rápido.
function code(enumName, label) {
  const value = enumTable(enumName)[label];
  if (value === undefined) throw new Error(`Unknown ${enumName} label: ${String(label)}`);
  return value;
}

// código → label PT (caminho de leitura). Código desconhecido falha rápido —
// inclusive NULL, que em coluna NOT NULL indica linha fora do contrato.
function label(enumName, value) {
  for (const [name, codeValue] of Object.entries(enumTable(enumName))) {
    if (codeValue === value) return name;
  }
  throw new Error(`Unknown ${enumName} code: ${String(value)}`);
}

// Lista de códigos para CHECK/IN do DDL: sqlCodes('contracts.status',
// 'vigente', 'encerrado') → "(1, 2)".
function sqlCodes(enumName, ...labels) {
  return `(${labels.map((name) => code(enumName, name)).join(', ')})`;
}

// CASE de migração legado (texto) → código, para o INSERT ... SELECT do
// rebuild. Um literal legado fora da tabela vira NULL, que estoura o
// NOT NULL/CHECK da tabela nova: dado inesperado falha alto em vez de sumir.
function sqlLegacyCase(columnSql, enumName) {
  const whens = Object.entries(enumTable(enumName))
    .map(([name, codeValue]) => `WHEN '${name}' THEN ${codeValue}`)
    .join(' ');
  return `CASE ${columnSql} ${whens} END`;
}

module.exports = { ENUMS, code, label, sqlCodes, sqlLegacyCase };
