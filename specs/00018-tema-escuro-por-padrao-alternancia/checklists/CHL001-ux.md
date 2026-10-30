# UX Checklist: Tema escuro por padrão e alternância persistida (00018)
**Created**: 2026-10-28 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 O tema escuro como default da primeira execução está declarado sem depender do tema do SO? [Completeness, Spec §FR-064; SC-001] <!-- Evaluator: Covered by spec.md FR-064 ("independentemente do tema configurado no sistema operacional") + SC-001 -->
- [X] CHK002 O estado de primeira execução está definido como ausência de preferência salva, e não como ausência de escolha explícita? [Completeness, Spec §FR-064; Edge Cases] <!-- Evaluator: Covered by spec.md Edge Cases ("Primeira execução sem preferência salva") + FR-064 -->
- [X] CHK003 Todos os papéis autenticados estão cobertos sem variação de tema por papel? [Completeness, Spec §Problem Statement; Key Entities] <!-- Evaluator: Covered by spec.md Problem Statement ("Afeta todos os papéis autenticados") + Key Entities ("não distingue papel") -->
- [X] CHK004 O local do toggle está restrito à top toolbar existente, com a construção da toolbar fora do escopo? [Completeness, Spec §FR-066; Scope] <!-- Evaluator: Covered by spec.md FR-066 + Scope Included/Excluded (toggle na toolbar; construção excluída) -->
- [X] CHK005 O reflexo imediato está declarado para todas as telas abertas, incluindo o dashboard de E013? [Completeness, Spec §FR-066; US2] <!-- Evaluator: Covered by spec.md FR-066 + US2 cenário 1 + Edge Cases (dashboard de E013) -->
- [X] CHK006 Os dois sentidos da alternância estão cobertos, de escuro para claro e de claro para escuro? [Completeness, Spec §US2; SC-004] <!-- Evaluator: Covered by spec.md US2 cenários 1..3 + SC-004 ("nos dois sentidos") -->
- [X] CHK007 O tema claro utilizável de ponta a ponta inclui widgets com tokens antigos de E006? [Completeness, Spec §FR-068; Edge Cases] <!-- Evaluator: Covered by spec.md FR-068 + Edge Cases ("Tema claro sobre widgets com tokens antigos") -->

## Clarity

- [X] CHK008 O requisito de boot sem flash está expresso como resultado observável, sem exibir o tema claro antes do tema resolvido? [Clarity, Spec §FR-065; SC-002] <!-- Evaluator: Covered by spec.md FR-065 + SC-002 ("sem exibição intermitente do tema claro no boot") + plan.md AD-001 -->
- [X] CHK009 A troca imediata está inequívoca quanto a não exigir recarga da página? [Clarity, Spec §FR-066; SC-003] <!-- Evaluator: Covered by spec.md FR-066 ("sem recarregar a página") + SC-003 -->
- [X] CHK010 A escolha do usuário está declarada como prevalecendo sobre o tema do SO depois da primeira decisão? [Clarity, Spec §FR-067; Scope] <!-- Evaluator: Covered by spec.md FR-067 + Scope Excluded ("a decisão do usuário vence o sistema") -->

## Consistency

- [X] CHK011 O toggle é aditivo à toolbar, preservando usuário, papel e Sair? [Consistency, Spec §Scope; FR-066] <!-- Evaluator: Covered by spec.md Scope Excluded ("não altera usuário, papel, domínio nem o botão Sair") + plan.md AD-004 -->
- [X] CHK012 O default escuro é consistente com a regra de não reintroduzir o modo sistema após a escolha? [Consistency, Spec §FR-064; FR-067] <!-- Evaluator: Covered by spec.md FR-064 + FR-067 + plan.md AD-003 ("nunca grava system") -->
- [X] CHK013 O requisito de tema claro é consistente com a base de acessibilidade de E006 nos dois modos? [Consistency, Spec §FR-068; Dependencies] <!-- Evaluator: Covered by spec.md FR-068 + Dependencies E006 + plan.md Constraints ("a11y de E006 intacta") -->

## Testability

- [X] CHK014 O default escuro é verificável com SO claro e sem preferência salva? [Testability, Spec §SC-001; US1] <!-- Evaluator: Covered by spec.md US1 Independent Test + SC-001 -->
- [X] CHK015 O fallback é observável como tema escuro sem crash para preferência ausente e inválida? [Testability, Spec §SC-002; FR-065] <!-- Evaluator: Covered by spec.md SC-002 + FR-065 -->
- [X] CHK016 A troca global é verificável sem recarregar a página? [Testability, Spec §SC-003; FR-066] <!-- Evaluator: Covered by spec.md SC-003 + FR-066 -->
- [X] CHK017 A legibilidade nos dois modos tem uma base de contraste verificável? [Testability, Spec §SC-005; FR-068] <!-- Evaluator: Covered by spec.md SC-005 + plan.md Testing Strategy (contraste AA nos dois modos) -->
