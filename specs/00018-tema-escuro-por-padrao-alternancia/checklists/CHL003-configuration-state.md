# Configuration/State Checklist: Tema escuro por padrão e alternância persistida (00018)
**Created**: 2026-10-28 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 A chave de preferência e os valores permitidos estão declarados? [Completeness, Spec §FR-067] <!-- Evaluator: Covered by plan.md AD-003 (theme_mode = light|dark) -->
- [X] CHK002 O default para chave ausente está declarado? [Completeness, Spec §FR-065] <!-- Evaluator: Covered by spec.md FR-065 + Edge Cases + plan.md AD-003 -->
- [X] CHK003 O fallback para valor corrompido ou desconhecido está declarado sem erro visível? [Completeness, Spec §FR-065] <!-- Evaluator: Covered by spec.md FR-065 + plan.md AD-003 (allowlist; todo o resto → dark) -->
- [X] CHK004 A precedência da escolha do usuário sobre o tema do SO está declarada? [Completeness, Spec §FR-067] <!-- Evaluator: Covered by spec.md FR-067 ("a escolha do usuário prevalecer sobre o tema do sistema operacional") -->
- [X] CHK005 O armazenamento está declarado como local ao dispositivo, sem sincronização com servidor? [Completeness, Spec §Scope] <!-- Evaluator: Covered by spec.md Scope Excluded + Key Entities ("guardada no dispositivo") + plan.md API Surface Summary (N/A) -->
- [X] CHK006 A leitura da preferência antes da primeira renderização está declarada? [Completeness, Spec §FR-065] <!-- Evaluator: Covered by plan.md AD-001 (load antes do runApp) -->
- [X] CHK007 A fonte única do tema corrente está declarada no estado da aplicação? [Completeness, Spec §FR-066] <!-- Evaluator: Covered by plan.md AD-002 (ProjectManagerApp stateful com ThemeMode) -->
- [X] CHK008 O comportamento em falha de gravação está declarado? [Completeness, Spec §FR-067] <!-- Evaluator: Covered by plan.md Error Handling (Gravação falha → tema muda em memória, erro silencioso) -->
- [X] CHK009 O comportamento sem callback de toggle na toolbar está declarado? [Completeness, Spec §FR-066] <!-- Evaluator: Covered by plan.md AD-004 + Error Handling (Toolbar sem callback) -->

## Clarity

- [X] CHK010 O modo sistema está explicitamente excluído dos valores graváveis? [Clarity, Spec §FR-067; Scope] <!-- Evaluator: Covered by spec.md FR-067 + Scope Excluded + plan.md AD-003 ("nunca grava system") -->
- [X] CHK011 O vocabulário da chave e dos valores está definido em inglês e sem ambiguidade? [Clarity, Spec §FR-067] <!-- Evaluator: Covered by plan.md Patterns to reuse/Naming (chave e valores EN) -->
- [X] CHK012 A atualização em memória está definida independentemente do sucesso da gravação? [Clarity, Spec §FR-066; FR-067] <!-- Evaluator: Covered by plan.md Technical Context (toggle só setState) + Error Handling (tema muda em memória) -->
- [X] CHK013 A preferência legada ou desconhecida tem tratamento declarado, sem migração implícita? [Clarity, Spec §Risks] <!-- Evaluator: Covered by spec.md Risks (preferência legada/inválida) + plan.md AD-003 -->

## Consistency

- [X] CHK014 O fallback escuro é o mesmo na spec, no plano e na estratégia de teste? [Consistency, Spec §FR-065; SC-002] <!-- Evaluator: Covered by spec.md FR-065 + SC-002 + plan.md AD-001/AD-003 + stub FR-065 -->
- [X] CHK015 O escopo da persistência é consistente com a restrição de zero dependência nova? [Consistency, Spec §FR-068; Scope] <!-- Evaluator: Covered by spec.md Scope ("mecanismo já adotado") + FR-068 + plan.md Primary Dependencies (0 nova) -->
- [X] CHK016 O default do construtor da aplicação é consistente com o fallback de boot? [Consistency, Spec §FR-064; FR-065] <!-- Evaluator: Covered by plan.md HINT-002 (initialThemeMode = ThemeMode.dark) + AD-001 -->
- [X] CHK017 A indisponibilidade da toolbar é tratada como pré-condição de escopo e não como estado de tema? [Consistency, Spec §Scope; Edge Cases] <!-- Evaluator: Covered by spec.md Edge Cases (toolbar indisponível é pré-condição) + Scope Excluded -->

## Testability

- [X] CHK018 Ausência, corrupção e valor desconhecido são exercitáveis com valores iniciais mockados? [Testability, Spec §FR-065] <!-- Evaluator: Covered by plan.md Testing Strategy (Mock Boundary) + stub FR-065 -->
- [X] CHK019 A precedência sobre o SO é verificável alterando o brilho da plataforma? [Testability, Spec §SC-004] <!-- Evaluator: Covered by spec.md SC-004 + plan.md AD-002/HINT-003 (themeMode vem do estado) -->
- [X] CHK020 A leitura única antes do `runApp` é observável no entrypoint de teste? [Testability, Spec §FR-065] <!-- Evaluator: Covered by plan.md AD-001 + Testing Strategy (entrypoint real) -->
