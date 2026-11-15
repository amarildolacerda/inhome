# Analysis Report — E017 Indicadores de perpétuo

**Date**: 2026-11-09 | **Mode**: Analysis (autopilot A1 → remediation)
**Artifacts**: `spec.md` 10222 B · `plan.md` 10234 B · `tasks.md` 6043 B (24 tasks)

## Findings Table

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| F-001 | duplication | LOW | spec.md FR-071, FR-072 | Exclusão de perpétuo do card declarada nos dois FRs | Escopar FR-071 ao marcador positivo; exclusão fica só em FR-072 |
| F-002 | ambiguity | LOW | spec.md FR-070 | "os quatro existentes" com POST/PUT contados como um item | Reescrever como "os quatro rotos (com POST e PUT)" |
| F-003 | ambiguity | LOW | spec.md FR-072 | Parêntese de derivadores lê-se exaustivo vs. "qualquer derivador" (Clarifications) | Trocar por "incluindo (card, …)" |
| F-004 | underspecification | LOW | spec.md FR-077 | "rótulo acessível" sem padrão decidível (qual atributo/valor) | Nomear mecanismo: accessible name igual ao texto visível |
| F-005 | testability | LOW | tasks.md T003–T007, T016 | 6 stubs de aceitação sem anotação `[VERIFY:]` | Aceitável (stub RED é o estado inicial); sem alteração |
| F-006 | scope | LOW | spec.md FR-070, Key Entities | Detalhe de endpoint/campos em spec `product` | Mantido como Integration Signal; mover detalhe futuro para `plan.md` |

Nenhum CRITICAL/HIGH/MEDIUM. Violações de `project-instructions.md`: nenhuma.

## Quality Summaries

- **Spec Quality**: PASS 32/32 (`evaluateSpecGate` valid=true, 0 markers, P1 FR-069..075; STF-001..005 todos `resolved`, highestFindingNumber=5) — 6 achados LOW acima.
- **Compliance**: PASS — Policy Auditor executado inline (toolset read-only sem shell): I `dev` (branch atual `dev`), II gate de testes (T024 `npm test`/`test.sh`/`flutter test`), III TODO intake, IV estilo; stack/layout/QC (`flutter analyze`, `npm audit`) conforme.

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-069 | yes | T003, T008, T014 | COMPLETES T014 |
| FR-070 | yes | T004, T011, T013 | COMPLETES T013 |
| FR-071 | yes | T007, T015 | chain 2 tasks |
| FR-072 | yes | T005, T009, T010 | COMPLETES T010 |
| FR-073 | yes | T006, T009, T011, T012 | COMPLETES T012 |
| FR-074 | yes | T016, T017, T018 | COMPLETES T018 |
| FR-075 | yes | T016, T018 | chain 2 tasks |
| FR-076 | yes | T019, T020 | P2 |
| FR-077 | yes | T021 | P2 |
| FR-078 | yes | T022 | P2 |
| FR-079 | yes | T023 | P2 (Polish) |

## Cross-Artifact Checks

- Req→task: 11/11; Task→req: 0 gold-plating (T001/T002 Foundational, T024 Polish isfasent).
- `← T###:Symbol` × `→ exports:`: 0 mismatches (T010←T009, T011←T009, T013←T011, T018←T017).
- Fases 5 × plan (Foundational → US1 → US2 → US3 → Polish); paralelos T003..T007.
- Caminhos das tasks: todos existem no repo / batem com Source Code.
- `[VERIFY:]`: 0 malformados; 15 comandos reais.

## Instructions Alignment Issues

Nenhuma.

## Unmapped Tasks

Nenhuma.

## Metrics

| Metric | Value |
|--------|-------|
| Total Requirements | 11 FR (7 P1) |
| Total Tasks | 24 |
| Coverage | 11/11 = 100% |
| CRITICAL Issues | 0 |
| Findings | 6 LOW |

## Remediation (A1)

- F-001 aplicado: FR-071 restrita ao marcador positivo; exclusão canônica só em FR-072 (evidência CHK001/CHL003 atualizada).
- F-002 aplicado: FR-070 "os endpoints existentes" (numeral ambíguo removido).
- F-003 aplicado: FR-072 lista marcada como não exaustiva ("incluindo").
- F-004 aplicado: FR-077 mecanismo decidível (nome acessível = texto visível).
- F-005/F-006 sem alteração (por design / orientação de escopo).
- Pós-remediação: spec 10216 B ≤ 10240; `evaluateSpecGate` valid=true; ownership valid, P1 FR-069..075; STF 5/5; checklists PASS/COMPLETE.

## Next Actions

- Remediation automática (A1) dos F-001..F-004 (spec.md); F-005/F-006 registrados sem alteração.
- Próximo: `/sddp-implement` (Phase 7).
