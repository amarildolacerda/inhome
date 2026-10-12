# API Quality Checklist: Painel de próximos vencimentos (00011)
**Created**: 2026-10-11 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 O contrato de resposta do painel está declarado (itens com janela e alertado, incompletos com contagem, total/limit/offset, janelas atuais)? [Completeness, Spec §FR-001; plan.md API Surface] <!-- Evaluator: Covered by spec.md FR-001/FR-004 + CLAR Q6; plan.md GET /api/alerts/panel → `{items, incomplete, total, limit, offset, windows}` -->
- [X] CHK002 O contrato de paginação (limit/offset no mesmo contrato de `GET /api/contracts`) está declarado com limites? [Completeness, Spec §FR-004] <!-- Evaluator: Covered by spec.md FR-004 ("limit/offset no mesmo contrato de GET /api/contracts") + plan.md HINT/Patterns (limit 1–200, offset ≥0) -->
- [X] CHK003 A ordem estável da listagem está declarada (incompletos primeiro, depois por previsão, desempate por id)? [Completeness, Spec §FR-004; STF-003] <!-- Evaluator: Covered by spec.md FR-004 + STF-003 resolvido (desempate por id) + plan.md AD-003 -->
- [X] CHK004 O contrato das janelas está declarado nos dois verbos (GET devolve default 90/60/30/15; PUT aceita gravação, restauração e recusa 400)? [Completeness, Spec §FR-005; FR-006] <!-- Evaluator: Covered by spec.md FR-005/FR-006 + plan.md API Surface (GET/PUT /api/alerts/windows) -->
- [X] CHK005 O contrato de escrita de janelas cobre o corpo nulo (reset para o default) além do corpo com lista? [Completeness, Spec §FR-006; SC-004] <!-- Evaluator: Covered by spec.md FR-006 ("restauração vazia devolve o default") + SC-004 + plan.md HINT-003 -->

## Clarity

- [X] CHK006 O campo de alertado na resposta tem semântica definida por item (linha em `alert_events` da janela atribuída), sem estado global? [Clarity, Spec §FR-002; CLAR Q7] <!-- Evaluator: Covered by spec.md FR-002 + CLAR Q7 + Key Entities ("registro em alert_events… define o estado de alertado") -->
- [X] CHK007 A frase "blocos derivados dos itens retornados" está clara quanto ao papel do servidor (devolve `window` por item) versus da tela (agrupa)? [Clarity, Spec §FR-004; CLAR Q1] <!-- Evaluator: Covered by spec.md FR-004 + CLAR Q1 ("página única… blocos derivados dos itens") + plan.md AD-003 (CASE de atribuição no SELECT) -->
- [X] CHK008 O comportamento para domínio sem contratos está definido (200 com lista vazia e janelas visíveis, não erro)? [Clarity, Spec §Edge Cases] <!-- Evaluator: Covered by spec.md Edge Cases ("Domínio sem contratos: vazio com as janelas atuais visíveis") + plan.md Error Handling -->

## Consistency

- [X] CHK009 Os status de erro (403, 400, 500) são consistentes entre spec, plan.md Error Handling e a suíte de aceitação? [Consistency, Spec §Edge Cases; plan.md Error Handling] <!-- Evaluator: Covered by spec.md FR-003/FR-006 + plan.md Error Handling + Acceptance Test Stubs FR-003/FR-006 -->
- [X] CHK010 A promessa de leitura única sem cache não colide com nenhuma outra seção que sugira cache ou etapa intermediária? [Consistency, Spec §FR-004; SC-003] <!-- Evaluator: Covered by spec.md FR-004 ("sem cache compartilhado") + Included ("leitura única por requisição") + plan.md HINT-005 -->
- [X] CHK011 Os três endpoints novos batem entre spec (CLAR Q5), plan.md (API Surface, Coverage Map) e Implementation Signals (NEW-API)? [Consistency, Spec §CLAR Q5; plan.md API Surface] <!-- Evaluator: Covered by spec.md CLAR Q5 + Signals; plan.md rows FR-001..007 apontam routes/alerts.js -->
