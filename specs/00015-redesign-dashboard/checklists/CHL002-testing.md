# Testing Checklist: Redesign visual do dashboard (00015)
**Created**: 2026-10-24 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK015 Cada requisito P1 tem alvo de aceitação com estado RED declarado? [Completeness, Spec §FR-038; FR-039; FR-040; FR-041] <!-- Evaluator: Covered by plan.md Acceptance Test Stubs (FR-038..041, RED pending/skip) -->
- [X] CHK016 A cobertura unitária de backend para os campos novos do payload (`contracts`, `responsavel`, `contractsAVencer`) está declarada? [Completeness, Spec §FR-040] <!-- Evaluator: Covered by plan.md Testing Strategy (unit `node --test`, escopo payload contracts/responsavel/contractsAVencer) + HINT-001 -->
- [X] CHK017 A regressão da suíte Flutter (`flutter analyze` limpo + testes existentes verdes) está declarada? [Completeness, Spec §SC-006] <!-- Evaluator: Covered by spec.md SC-006 + plan.md Testing Strategy (Unit flutter test/analyze) -->
- [X] CHK020 O caminho de smoke do dashboard stats em `backend/test.sh` está declarado? [Completeness, Spec §FR-038] <!-- Evaluator: Covered by plan.md Testing Strategy (Integration: backend/test.sh 3199, smoke dashboard stats) -->
- [X] CHK021 Os testes de regressão de acessibilidade (rótulos a11y + teclado no navegador) estão incluídos na estratégia? [Completeness, Spec §Risks] <!-- Evaluator: Covered by plan.md Risk Mitigation (a11y_labels_test + web_browsers_test estendidos) + Project Structure -->

## Testability

- [X] CHK018 O escopo por papel é verificável com prestador recebendo só vinculados e sem KPIs de domínio? [Testability, Spec §SC-004] <!-- Evaluator: Covered by spec.md SC-004 + plan.md AD-005 + stub FR-041 (test.todo prestador só vinculados) -->
- [X] CHK019 O comportamento nas bordas de janela (dentro vs fora da janela configurada) é verificável? [Testability, Spec §SC-002] <!-- Evaluator: Covered by spec.md SC-002 + plan.md stub FR-039 (contractsAVencer segue janelas do domínio) -->

## Consistency

- [X] CHK022 A exigência de bateria completa (unit + smoke + flutter + audit) antes do QC é explícita e consistente com a política do projeto? [Consistency, Spec §SC-006] <!-- Evaluator: Covered by plan.md Testing Strategy (4 tiers) + project-instructions.md §II (test-gated promotion) -->
