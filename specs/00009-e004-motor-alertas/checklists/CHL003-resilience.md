# Resilience Checklist: Motor de alertas de vigência (00009)
**Created**: 2026-10-11 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 O timeout do e-mail (5 s) está declarado com comportamento pós-falha (falho registrado, varredura segue)? [Completeness, Spec §FR-006; SC-003] <!-- Evaluator: Covered by spec.md FR-006 ("timeout 5 s grava falho e a varredura continua") + SC-003 + plan.md Error Handling (Promise.race 5 s) -->
- [X] CHK002 O engolimento de erro da varredura (agendador nunca derruba o processo) está declarado? [Completeness, Spec §FR-002; plan.md Error Handling] <!-- Evaluator: Covered by spec.md FR-002 ("erro engolido") + plan.md Error Handling (sweep().catch, precedente server.js:156) -->
- [X] CHK003 A contenção por domínio (falha em um domínio não interrompe os demais) está declarada? [Completeness, Spec §SC-005] <!-- Evaluator: Covered by spec.md SC-005 ("falha de um domínio não interrompe os demais") + plan.md Error Handling (try/catch por domínio) + FR-002 -->
- [X] CHK004 O pulo de domínio suspenso está declarado (nenhum alerta emitido)? [Completeness, Spec §FR-002; Edge Cases] <!-- Evaluator: Covered by spec.md FR-002 ("suspenso pulado") + Edge Cases ("Domínio suspenso: varredura não emite") -->
- [X] CHK005 A frequência (subida + 60 min) fora do caminho de requisição está declarada, e nenhum trigger excede 60 min? [Completeness, Spec §FR-002; SC-005; Excluded] <!-- Evaluator: Covered by spec.md FR-002 + SC-005 + Excluded ("Frequência além de 60 min… pendente") + plan.md FR-002 row (setInterval 60 min) -->

## Clarity

- [X] CHK006 O caminho de falha SMTP (sent/failed/skipped) é semântico e mapeável para email_status? [Clarity, Spec §Clarify Q3; SC-003] <!-- Evaluator: Covered by spec.md Q3 (email_status IN 'sent','failed','skipped') + SC-003 + Key Entities -->
- [X] CHK007 O endpoint manual reporta contadores parciais em vez de falhar o request inteiro? [Clarity, Spec §Clarify Q4] <!-- Evaluator: Covered by plan.md API Surface ({ swept, emitted, emailed, failed }) + Error Handling Notes ("nunca propaga exceção… contadores parciais") -->

## Consistency

- [X] CHK008 A nova varredura segue o padrão de agendamento do worker existente (start() + catch), sem mecanismo paralelo? [Consistency, Spec §FR-002] <!-- Evaluator: Covered by plan.md AD-003 ("agendada em server.js start()") + grounding runDueSweep setInterval precedent server.js:155-157 -->
- [X] CHK009 A injeção de notifyFn nos testes mantém o default igual ao notify() de produção? [Consistency, Spec §FR-006] <!-- Evaluator: Covered by plan.md AD-006 ("default require('./email').notify") + Testing Strategy mock boundary -->
- [X] CHK010 O escopo do sweep manual (uma passagem, não re-agendamento) está consistente entre spec e plano? [Consistency, Spec §Clarify Q4; plan.md API Surface] <!-- Evaluator: Covered by spec.md Q4 ("dispara… uma vez") + plan.md API Surface ("dispara runExpirySweep() uma vez") -->
