# API Quality Checklist: Importação de acervo (00022)
**Created**: 2026-11-23 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 Os tres endpoints estao declarados com metodo, caminho e resposta? [Completeness, Spec §Scope] <!-- Evaluator: Covered by plan.md §API Surface Summary -->
- [X] CHK002 Cabecalhos detectados e mapeamento sao devolvidos na previa? [Completeness, Spec §FR-072] <!-- Evaluator: Covered by spec §FR-072 -->
- [X] CHK003 Erros por campo aparecem linha a linha na previa? [Completeness, Spec §FR-074] <!-- Evaluator: Covered by spec §FR-074 -->
- [X] CHK004 Erros de validacao e autorizacao tem codigo explicito? [Completeness, Spec §FR-079] <!-- Evaluator: Covered by plan.md §Error Handling Strategy -->

## Clarity

- [X] CHK005 A diferenca entre previa e confirmacao esta clara para o usuario? [Clarity, Spec §US1] <!-- Evaluator: Covered by spec §US1 e §US2 -->
- [X] CHK006 O comportamento do arquivo sem coluna obrigatoria esta definido? [Clarity, Spec §FR-073] <!-- Evaluator: Covered by spec §FR-073 -->

## Consistency

- [X] CHK007 Os endpoints seguem o prefixo /api/v2/contracts de finance.js? [Consistency, Spec §Implementation Signals] <!-- Evaluator: Covered by plan.md §Implementation Hints -->
- [X] CHK008 O relatorio usa os mesmos motivos de pulo da previa? [Consistency, Spec §FR-078] <!-- Evaluator: Covered by plan.md §AD-002 -->
