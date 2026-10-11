'use strict';

const test = require('node:test');
const assert = require('node:assert');
const Contract = require('./Contract');

// Acceptance stubs — plan.md §Acceptance Test Stubs (RED until T008/T009).
test('FR-005 status derivado na leitura', () => {
  const now = new Date('2026-06-15T12:00:00Z');

  // previsão futura → vigente
  assert.strictEqual(
    Contract.effectiveStatus({ status: 'vigente', forecast_date: '2026-06-20' }, now),
    'vigente'
  );
  // previsão estritamente anterior ao dia → atrasado
  assert.strictEqual(
    Contract.effectiveStatus({ status: 'vigente', forecast_date: '2026-06-14' }, now),
    'atrasado'
  );
  // no dia da previsão continua vigente (Clarifications Q3)
  assert.strictEqual(
    Contract.effectiveStatus({ status: 'vigente', forecast_date: '2026-06-15' }, now),
    'vigente'
  );
  // encerrado nunca deriva atrasado, mesmo com previsão antiga
  assert.strictEqual(
    Contract.effectiveStatus({ status: 'encerrado', forecast_date: '2020-01-01' }, now),
    'encerrado'
  );
  // previsão ausente/inválida não vira atrasado
  assert.strictEqual(Contract.effectiveStatus({ status: 'vigente', forecast_date: null }, now), 'vigente');
  assert.strictEqual(Contract.effectiveStatus(null, now), null);

  // isOverdue é a única porta de atraso e depende do status gravado
  assert.strictEqual(Contract.isOverdue({ status: 'vigente', forecast_date: '2026-06-14' }, now), true);
  assert.strictEqual(Contract.isOverdue({ status: 'vigente', forecast_date: '2026-06-15' }, now), false);
  assert.strictEqual(Contract.isOverdue({ status: 'encerrado', forecast_date: '2026-06-01' }, now), false);
});

test('FR-006 atrasado nunca é gravado', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.join(__dirname, '..');

  // Nenhum caminho de escrita (SQL, rotina ou job) persiste 'atrasado'.
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.js') || entry.name.endsWith('.test.js')) continue;
      const src = fs.readFileSync(full, 'utf8');
      const writeWithAtrasado = /(INSERT\s+INTO|UPDATE\b)[^;]*'atrasado'/i.test(src);
      if (writeWithAtrasado) offenders.push(path.relative(root, full));
    }
  };
  walk(root);
  assert.deepStrictEqual(offenders, [], `escrita de 'atrasado' em: ${offenders.join(', ')}`);

  // A derivação é pura: o model não executa escrita.
  const model = fs.readFileSync(path.join(__dirname, 'Contract.js'), 'utf8');
  assert.ok(!/db\.run|INSERT\s+INTO|UPDATE\b/i.test(model), 'Contract.js deriva sem escrita');
  // Os status gravados são apenas vigente/encerrado (o INSERT usa o default do esquema).
  const writers = ['routes/contracts.js'];
  for (const rel of writers) {
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    const statuses = [...src.matchAll(/status\s*=\s*'([a-z]+)'/gi)].map((m) => m[1]);
    for (const written of statuses) {
      assert.ok(
        ['vigente', 'encerrado'].includes(written),
        `status gravável inesperado em ${rel}: ${written}`
      );
    }
  }
});
