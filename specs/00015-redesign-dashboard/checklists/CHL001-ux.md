# UX Checklist: Redesign visual do dashboard (00015)
**Created**: 2026-10-24 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 O mapeamento dos três status de contrato para tokens do `ColorScheme` está declarado para todos eles, com cor distinta por status? [Completeness, Spec §FR-038] <!-- Evaluator: Covered by spec.md FR-038 ("cor distinta restrita a tokens do ColorScheme") + SC-001 + plan.md AD-003 -->
- [X] CHK002 A definição de "a vencer" está amarrada às janelas configuradas do domínio, com exclusão explícita de vigente fora de toda janela? [Completeness, Spec §FR-039; SC-002] <!-- Evaluator: Covered by spec.md FR-039 ("janelas do domínio (E005)") + SC-002 ("vigente fora de toda janela, não") -->
- [X] CHK003 O conteúdo mínimo do card (vencimento, responsável, chip de status) está enumerado de forma completa? [Completeness, Spec §FR-040; SC-003] <!-- Evaluator: Covered by spec.md FR-040 ("previsão de finalização, responsável e chip de status") + SC-003 -->
- [X] CHK005 A visão reduzida do prestador está declarada (sem faixa de KPIs de domínio, apenas contratos vinculados)? [Completeness, Spec §FR-041; SC-004] <!-- Evaluator: Covered by spec.md FR-041 ("painel reduzido: sem a linha de KPIs de domínio e apenas contratos vinculados") + SC-004 -->
- [X] CHK006 As dimensões de filtro e busca estão enumeradas e aplicadas client-side sem nova requisição? [Completeness, Spec §FR-043; SC-005] <!-- Evaluator: Covered by spec.md FR-043 ("filtros por status e responsável e busca por nome ... client-side, sem nova requisição") + SC-005 -->
- [X] CHK009 O estado de domínio sem dados (KPIs zerados, sem cartões quebrados) está declarado? [Completeness, Spec §Edge Cases] <!-- Evaluator: Covered by spec.md Edge Cases ("Domínio sem dados: KPIs zerados e estado vazio, sem cartões quebrados") -->
- [X] CHK010 A regressão de acessibilidade de E006 (teclado e rótulos de T031) está declarada como requisito preservado? [Completeness, Spec §Risks] <!-- Evaluator: Covered by spec.md Risks (regressão de teclado/rótulos de T031) + plan.md Risk Mitigation (a11y_labels_test + web_browsers_test estendidos) -->

## Clarity

- [X] CHK004 A regra de ordenação por urgência é inequívoca (atrasados primeiro, depois previsão ascendente, incompleto presente)? [Clarity, Spec §FR-040] <!-- Evaluator: Covered by spec.md FR-040 ("atrasados primeiro, depois forecast_date ascendente; sem previsão marcado como incompleto e presente na lista") -->

## Consistency

- [X] CHK007 A persistência dos filtros sobre atualização de payload (E009) está declarada sem contradição com a filtragem client-side? [Consistency, Spec §FR-043] <!-- Evaluator: Covered by spec.md FR-043 ("filtros persistem quando o payload atualiza (E009)") + plan.md AD-004 -->
- [X] CHK011 A regra de nunca comunicar status só por cor (chip com rótulo textual) é consistente entre KPIs e cards? [Consistency, Spec §FR-040] <!-- Evaluator: Covered by spec.md FR-040 ("sempre com rótulo textual") + research.md (WCAG 1.4.1 cor+texto) -->
- [X] CHK012 A colocação dos filtros no corpo (sem AppBar extra) é consistente com a top toolbar do MainShell? [Consistency, Spec §Scope; FR-043] <!-- Evaluator: Covered by spec.md Scope Included ("sem AppBar extra, sem conflitar com a top toolbar do MainShell") + FR-043 -->

## Testability

- [X] CHK008 O critério de reflow sem overflow horizontal é mensurável em viewport estreito? [Testability, Spec §FR-042; SC-005] <!-- Evaluator: Covered by spec.md FR-042 + SC-005 ("Viewport estreito reorganiza as colunas sem overflow horizontal") -->
- [X] CHK013 Contratos sem previsão são verificáveis como visíveis e marcados incompletos, nunca omitidos? [Testability, Spec §SC-003; US2] <!-- Evaluator: Covered by spec.md SC-003 ("sem previsão aparece como incompleto e permanece visível") + US2 Acceptance Scenario 2 -->
- [X] CHK014 As contagens dos KPIs são verificáveis a partir do payload servido sem nova configuração de backend? [Testability, Spec §SC-001; FR-038] <!-- Evaluator: Covered by spec.md FR-038 ("sobre GET /api/v2/dashboard/stats") + SC-001 + plan.md API Surface Summary (0 rotas novas) -->
