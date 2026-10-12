# Data Integrity Checklist: Motor de alertas de vigência (00009)
**Created**: 2026-10-11 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 O fato de dedup (contrato × janela) é persistido antes de qualquer efeito externo (e-mail, aviso)? [Completeness, Spec §FR-003] <!-- Evaluator: Covered by spec.md FR-003 ("gravada antes de qualquer envio") + SC-001; plan.md FR-003 row "INSERT guard antes do envio" -->
- [X] CHK002 A integridade da dedup é garantida por restrição UNIQUE no banco, não só por checagem da aplicação? [Completeness, Spec §Clarify Q3] <!-- Evaluator: Covered by spec.md Q3 (UNIQUE(contract_id, window_days)) + Key Entities; plan.md AD-001/AD-003 -->
- [X] CHK003 A migração de alert_events é declarada como aditiva, preguiçosa e idempotente (guarda de existência)? [Completeness, Spec §Included FR-001; Clarify Q5] <!-- Evaluator: Covered by spec.md Included ("migração aditiva preguiçosa… antes de applySchema") + plan.md AD-001 (tableExists + CREATE TABLE) -->
- [X] CHK004 A coluna de janelas por domínio tem default documentado exigindo zero configuração? [Completeness, Spec §FR-005] <!-- Evaluator: Covered by spec.md FR-005 ("NULL = [90,60,30,15]… sem setup") + Clarify Q2 + plan.md AD-002 -->
- [X] CHK005 Contrato sem data de previsão fica fora da varredura (caso de borda declarado)? [Completeness, Spec §Edge Cases] <!-- Evaluator: Covered by spec.md Edge Cases ("Contrato sem forecast_date: fora da varredura") + Key Entities (forecast_date NOT NULL na base) -->

## Clarity

- [X] CHK006 O gatilho da varredura (coluna de origem) é inequívoco e rastreável ao entregue por E002? [Clarity, Spec §Key Entities] <!-- Evaluator: Covered by spec.md Key Entities ("forecast_date (fonte, entregue por E002) — único gatilho") + grounding database.js:155 -->
- [X] CHK007 A semântica de "janela atingida" (dias até a previsão cair dentro de X) está definida sem ambiguidade? [Clarity, Spec §Success Criteria SC-001] <!-- Evaluator: Covered by spec.md FR-002 ("varrendo forecast_date contra as janelas") + SC-001 ("contrato com previsão a 20 dias → exatamente um evento da janela 30") -->
- [X] CHK008 O comportamento após prorrogação (nova previsão reabre a passagem) está claro? [Clarity, Spec §Edge Cases] <!-- Evaluator: Covered by spec.md Edge Cases ("prorrogado: a nova previsão reabre a passagem conforme a janela re-atingida") -->

## Consistency

- [X] CHK009 O nome do worker (runExpirySweep) é idêntico entre spec, plano e o existente runDueSweep permanece distinto? [Consistency, Spec §Clarify Q1; plan.md AD-003] <!-- Evaluator: Covered by spec.md Q1 + plan.md AD-003 (services/alerts.js; runDueSweep intacto) + naming decision logged in autopilot-log -->
- [X] CHK010 Identificadores do novo esquema seguem a convenção em inglês (alert_events, email_status, window_days)? [Consistency, Spec §Clarify Q3] <!-- Evaluator: Covered by spec.md Q3 (DDL em inglês) + sad.md:448 naming convention + grounding email_status CHECK values -->
- [X] CHK011 A fonte da varredura usa o nome real da coluna entregue por E002 (forecast_date), não o termo de produto? [Consistency, Spec §Problem Statement] <!-- Evaluator: Covered by spec.md (7 refs corrigidas para forecast_date; 10162 B) + grounding database.js:155, contracts.js:56 -->
