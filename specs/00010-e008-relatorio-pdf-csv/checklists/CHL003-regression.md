# Regression Checklist: Relatório de serviços executados (00010)
**Created**: 2026-10-11 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 A cobertura de regressão dos blocos de teste legados (401/403/404, PDF container/EOF, CSV header/rows) está declarada como inalterada? [Completeness, Spec §FR-002; plan.md Testing Strategy] <!-- Evaluator: Covered by plan.md Testing Strategy ("suíte 118/118 baseline") + report.test.js FR-018 existente -->
- [X] CHK002 A suíte base de unidade (123/123) está declarada como gate de regressão zero? [Completeness, Spec §FR-002] <!-- Evaluator: Covered by plan.md Testing Strategy (Unit: `node --test` + baseline) -->
- [X] CHK003 As provas de renderização (container `%PDF`, `%%EOF`, paridade de linhas PDF↔CSV) estão declaradas? [Completeness, Spec §SC-004; plan.md Testing Strategy] <!-- Evaluator: Covered by spec.md SC-004 + plan.md FR-004 coverage row -->
- [X] CHK004 O gate de lint/sintaxe (node --check + flutter analyze Docker) está declarado? [Completeness, Spec §FR-002] <!-- Evaluator: Covered por plan.md Testing Strategy (Lint) + Instructions Check (QC) -->

## Clarity

- [X] CHK005 A meta de regressão zero sobre os epics base (00001, 00004–00009) é inequívoca? [Clarity, Spec §Assumptions & Risks] <!-- Evaluator: Covered por plan.md (zero regression baseline counts) + AGENTS.md phase gates -->
- [X] CHK006 A ordem de verificação (RED stub → implement → GREEN) está clara para os testes novos FR-001..006? [Clarity, Spec §Success Criteria] <!-- Evaluator: Covered por plan.md Acceptance Test Stubs (RED `pending`, test.todo) -->

## Consistency

- [X] CHK007 Os stubs de aceitação cobrem exatamente os 6 FRs P1, sem órfão? [Consistency, Spec §Requirements] <!-- Evaluator: Covered por plan.md 6 stubs ↔ FR-001..006 -->
- [X] CHK008 A estrutura de comando de smoke (PORT=3199) do plano casa com a do repositório (backend/test.sh)? [Consistency, Spec §User Scenarios & Testing] <!-- Evaluator: Covered por plan.md Integration row (backend/test.sh 3199) vs baseline conhecida -->
- [X] CHK009 A regra de reconstrução do backend (sem bind mount → rebuild obrigatório) está coerente entre plano e estrutura do projeto? [Consistency, Spec §Implementation Signals] <!-- Evaluator: Covered por plan.md Source Code (report.js alterado) + AGENTS.md stack note -->
