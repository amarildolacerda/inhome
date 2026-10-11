# Regression Checklist: Comunicação em tempo real (00008)
**Created**: 2026-10-10 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 A regressão das telas consumidoras (lista de tarefas, detalhe de contrato) está declarada? [Completeness, Spec §Success Criteria SC-004] <!-- Evaluator: Covered by spec.md SC-004 ("sem regressão nas telas consumidoras") -->
- [X] CHK002 A bateria completa como prova está declarada? [Completeness, Spec §Success Criteria SC-004] <!-- Evaluator: Covered by spec.md SC-004 + plan.md §Testing Strategy (unit 111+, smoke 118+, flutter 16+) -->
- [X] CHK003 O baseline numérico de cada suíte está registrado no plano? [Completeness, Spec §Success Criteria SC-004] <!-- Evaluator: Covered by plan.md §Testing Strategy (111/118/16) + Technical Context -->
- [X] CHK004 A não-modificação das rotas de mutação está declarada (só verificação)? [Completeness, Spec §Implementation Signals] <!-- Evaluator: Covered by spec.md §Implementation Signals ("nenhum sinal novo — transporte entregue") -->
- [X] CHK005 A regressão de consumidores via flutter test está prevista? [Completeness, Spec §Success Criteria SC-004] <!-- Evaluator: Covered by plan.md §Testing Strategy (flutter test Docker, 16/16 baseline) -->

## Clarity

- [X] CHK006 O que conta como "regressão" está claro: qualquer queda abaixo do baseline? [Clarity, Spec §Success Criteria SC-004] <!-- Evaluator: Covered by spec.md SC-004 ("permanece verde") + plan.md §Risk Mitigation (bateria completa) -->
- [X] CHK007 A diferença entre verificar e reescrever está clara (transporte entregue)? [Clarity, Spec §Implementation Signals] <!-- Evaluator: Covered by spec.md §Implementation Signals + plan.md AD-004 ("confiar na bateria completa") -->

## Consistency

- [X] CHK008 Os baselines são idênticos entre plano e execução real? [Consistency, Spec §Success Criteria SC-004] <!-- Evaluator: Covered by plan.md §Testing Strategy e execução: unit 111/111, smoke 118/118, flutter 16/16 -->
- [X] CHK009 As telas consumidoras nomeadas são as mesmas entre spec e frontend? [Consistency, Spec §Success Criteria SC-004] <!-- Evaluator: Covered by spec.md SC-004 (tasks_screen, contract_detail_screen) e frontend on('task:updated') -->

## Measurability

- [X] CHK010 A regressão tem verificação nomeada por suíte? [Measurability, Spec §Success Criteria SC-004] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-004 → server.socket.test.js) + §Testing Strategy -->
- [X] CHK011 A smoke suite (118/118) é asserível? [Measurability, Spec §Success Criteria SC-004] <!-- Evaluator: Covered by plan.md §Testing Strategy + execução `bash backend/test.sh` -->
- [X] CHK012 A flutter suite (16/16 + analyze limpo) é asserível? [Measurability, Spec §Success Criteria SC-004] <!-- Evaluator: Covered by plan.md §Testing Strategy + execução flutter analyze/test -->

## Traceability

- [X] CHK013 Cada requisito de regressão da spec aponta para artefato de verificação? [Traceability, Spec §Requirements] <!-- Evaluator: Covered by plan.md §Requirement Coverage Map (FR-004 → AD-004 bateria) + §Project Structure (backend/test.sh) -->
- [X] CHK014 A prova de zero regressão em 00004–00007 é rastreável? [Traceability, Spec §Success Criteria SC-004] <!-- Evaluator: Covered por execução: smoke 118/118 inalterado, unit cresce só com testes E009, flutter 16/16 -->
