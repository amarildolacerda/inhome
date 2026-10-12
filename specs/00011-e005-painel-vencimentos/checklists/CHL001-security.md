# Security Checklist: Painel de próximos vencimentos (00011)
**Created**: 2026-10-11 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 A recusa de prestador (403) na rota do painel está declarada como requisito antes de qualquer leitura? [Completeness, Spec §FR-003] <!-- Evaluator: Covered by spec.md FR-003 + US1 cenário 4 + Edge Cases ("Prestador: 403 na rota do painel e da configuração") -->
- [X] CHK002 A recusa de domínio divergente (403 via scopeDomain) está declarada na rota do painel? [Completeness, Spec §FR-003] <!-- Evaluator: Covered by spec.md FR-003 ("domínio divergente com 403… guards E001") + plan.md AD-001 (alerts.js:16-18) -->
- [X] CHK003 A validação de entrada da gravação de janelas (corpo inválido recusado com 400) está declarada sem fallback silencioso? [Completeness, Spec §FR-006] <!-- Evaluator: Covered by spec.md FR-006 ("gravação inválida é recusada com 400") + plan.md Error Handling (400 `{error}`) -->
- [X] CHK004 O privilégio de escrita está restrito a admin e gestor, com prestador 403 na configuração? [Completeness, Spec §FR-005; CLAR Q4] <!-- Evaluator: Covered by spec.md FR-005 + CLAR Q4 ("admin e gestor; prestador 403") + Edge Cases -->
- [X] CHK005 O alcance da escrita está limitado a `domains.alert_windows`, sem migração de coluna nem escrita em `contracts`/`alert_events`? [Completeness, Spec §FR-006] <!-- Evaluator: Covered by spec.md FR-006 ("persistido em domains.alert_windows sem migração de coluna") + plan.md AD-004 -->

## Clarity

- [X] CHK006 A distinção entre 403 (papel/domínio), 400 (corpo inválido) e 500 (falha de banco) é inequívoca? [Clarity, Spec §Edge Cases] <!-- Evaluator: Covered by spec.md Edge Cases (403) + FR-006 (400) + plan.md Error Handling Strategy (500) -->
- [X] CHK007 A restauração vazia devolvendo o default está definida como ação explícita do cliente, não como tratamento de erro? [Clarity, Spec §FR-006; SC-004] <!-- Evaluator: Covered by spec.md FR-006 ("restauração vazia devolve o default") + SC-004 + US2 cenário 3 -->

## Consistency

- [X] CHK008 Os guards citados no spec (E001) são exatamente os ligados no arquivo alvo `routes/alerts.js` (authenticateToken, requireRole, scopeDomain)? [Consistency, Spec §FR-003; plan.md AD-001] <!-- Evaluator: Covered by plan.md AD-001 (alerts.js:9,16-18) + grounding alerts.js guards entregues -->
- [X] CHK009 A superfície nova de endpoints declarada em Signals (NEW-API em `routes/alerts.js`) é idêntica à do plan.md API Surface Summary? [Consistency, Spec §CLAR Q5; plan.md API Surface] <!-- Evaluator: Covered by spec.md CLAR Q5 + Signals NEW-API; plan.md 3 rotas GET/GET/PUT /api/alerts/* -->
- [X] CHK010 O estado de alertado lido do painel não promete regra própria de emissão, evitando duplicar a autoridade de E004? [Consistency, Spec §FR-002; Excluded] <!-- Evaluator: Covered by spec.md FR-002 ("sem cálculo paralelo de emissão") + Excluded ("Emissão, dedup e agendamento — E004") -->
