# Security Checklist: Motor de alertas de vigência (00009)
**Created**: 2026-10-11 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 O novo endpoint de disparo manual exige papel admin declarado? [Completeness, Spec §Clarify Q4] <!-- Evaluator: Covered by spec.md Q4 ("admin + scopeDomain") + plan.md AD-004 (requireRole('admin')) -->
- [X] CHK002 O endpoint de disparo aplica o guarda de domínio (scopeDomain) — obrigação do SAD para toda rota nova com domainId? [Completeness, Spec §Clarify Q4; sad.md:447] <!-- Evaluator: Covered by spec.md Q4 + plan.md AD-004/FR-006 row + sad.md:447 obrigação + grounding auth.js:92 -->
- [X] CHK003 A recusa cross-domain (403) do novo endpoint está prevista? [Completeness, Spec §Edge Cases; plan.md Error Handling] <!-- Evaluator: Covered by plan.md Error Handling ("Endpoint sem escopo → scopeDomain() → 403 cross-domain") + FR-006 row -->
- [X] CHK004 O e-mail é opt-in por variáveis de ambiente, sem credenciais embutidas? [Completeness, Spec §FR-006] <!-- Evaluator: Covered by spec.md FR-006 ("somente com SMTP_HOST/SMTP_PORT") + plan.md AD-006 + research.md (opt-in fail-closed) -->

## Clarity

- [X] CHK005 A fronteira entre endpoint admin (escrita) e leitura de janelas (E005, IP-001) está explícita sem ambiguidade? [Clarity, Spec §Clarify Q4; plan.md API Surface] <!-- Evaluator: Covered by spec.md Q4 ("E005 faz endpoints de leitura") + plan.md API Surface ("Leitura/config de janelas fica fora") -->
- [X] CHK006 O estado sem SMTP (envio pulado, aviso em aplicativo segue) é inequívoco? [Clarity, Spec §SC-003] <!-- Evaluator: Covered by spec.md SC-003 ("sem SMTP_* nenhum envio é tentado e o aviso em aplicativo acontece") + FR-006 + Edge Cases -->

## Consistency

- [X] CHK007 A autorização segue o baseline do projeto (token → domainId; requireRole admin), sem esquema novo? [Consistency, Spec §FR-006; plan.md Technical Context] <!-- Evaluator: Covered by plan.md (requireRole + scopeDomain do middleware existente auth.js) + sad.md:447 superfície de autorização compartilhada -->
- [X] CHK008 O payload do aviso em aplicativo usa a sala domain_<id> entregue por E009, sem canal paralelo? [Consistency, Spec §FR-004; plan.md FR-004 row] <!-- Evaluator: Covered by spec.md FR-004 ("emitDomainEvent() (entregue por E009)") + plan.md architecture mermaid + FR-004 row -->
- [X] CHK009 A superfície nova não expõe o worker por rota GET (apenas POST admin)? [Consistency, Spec §Clarify Q4] <!-- Evaluator: Covered by spec.md Q4 (POST /api/alerts/sweep) + plan.md API Surface (POST only) -->
