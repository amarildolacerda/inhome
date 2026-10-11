# Resilience Checklist: Comunicação em tempo real (00008)
**Created**: 2026-10-10 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 A inércia da falha de emissão sobre a resposta HTTP está declarada como requisito? [Completeness, Spec §Requirements FR-003] <!-- Evaluator: Covered by spec.md FR-003 ("resposta HTTP da mutação permanece a de sucesso") -->
- [X] CHK002 A captura da própria exceção em `emitDomainEvent` retornando `false` está declarada? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases ("captura a própria exceção… devolve false") + services/events.js try/catch -->
- [X] CHK003 O emitter ausente retornando `false` sem lançar está declarado? [Completeness, Spec §Requirements FR-004] <!-- Evaluator: Covered by spec.md FR-004 ("Sem emitter registrado… retorna false sem lançar") + services/events.js if (!emitter) -->
- [X] CHK004 A ausência de replay e o estado relido do banco estão declarados? [Completeness, Spec §Requirements FR-004] <!-- Evaluator: Covered by spec.md FR-004 ("entrega melhor esforço sem replay — estado relido do banco") -->
- [X] CHK005 A sessão reconectada relendo estado sem fila está declarada? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases ("Sessão reconectada: estado é relido do banco… sem fila de eventos") -->

## Clarity

- [X] CHK006 A fronteira entre "falha de emissão" e "falha da mutação" está clara? [Clarity, Spec §Requirements FR-003] <!-- Evaluator: Covered by spec.md FR-003 (emissão falha, mutação segue) + plan.md §Error Handling Strategy -->
- [X] CHK007 O método de injeção de falha (setEmitter que lança) está claro? [Clarity, Spec §Clarifications Q3] <!-- Evaluator: Covered by spec.md §Clarifications Q3 + plan.md AD-002 -->

## Consistency

- [X] CHK008 O padrão try/catch → false é coerente entre spec, plano e código? [Consistency, Spec §Requirements FR-003] <!-- Evaluator: Covered by spec.md FR-003, plan.md AD-002 e services/events.js:14-19 try/catch → false -->
- [X] CHK009 A guarda `if (!emitter)` é coerente entre spec e código? [Consistency, Spec §Requirements FR-004] <!-- Evaluator: Covered by spec.md FR-004 e services/events.js:12 if (!emitter) return false -->

## Measurability

- [X] CHK010 A inércia da falha tem teste nomeado? [Measurability, Spec §Success Criteria SC-003] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-003 → server.socket.test.js) -->
- [X] CHK011 O emitter ausente tem teste nomeado? [Measurability, Spec §Success Criteria SC-003] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-004 → server.socket.test.js) -->
- [X] CHK012 A resposta HTTP 2xx sob falha de emissão é asserível? [Measurability, Spec §Success Criteria SC-003] <!-- Evaluator: Covered by FR-003 stub (supertest HTTP + emitter lançando) -->

## Traceability

- [X] CHK013 Cada requisito de resiliência da spec aponta para símbolo no mapa de cobertura? [Traceability, Spec §Requirements] <!-- Evaluator: Covered by plan.md §Requirement Coverage Map (FR-003 → try/catch false/setEmitter; FR-004 → if (!emitter)) -->
- [X] CHK014 O melhor esforço sem replay é rastreável ao SAD? [Traceability, Spec §Assumptions & Risks] <!-- Evaluator: Covered by spec.md §Risks ("estado é sempre relido do banco") + plan.md §Error Handling Strategy -->
