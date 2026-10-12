# Testing Checklist: Avisos por e-mail — envio opt-in por evento (00012)
**Created**: 2026-10-11 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 Os critérios de aceite são mensuráveis com dados concretos (4 eventos, 2 varreduras, 5 s, contagens)? [Completeness, Spec §SC-001..SC-005] <!-- Evaluator: Covered by spec.md SC-001 ("quatro eventos", 200/201), SC-002 ("duas vezes, no máximo um e-mail"), SC-005 ("5 s", `swept ≥ emailed + failed`) -->
- [X] CHK002 Cada FR tem caminho de teste mapeado no Requirement Coverage Map com arquivo e símbolo? [Completeness, Spec §FR-001..FR-006; plan.md RCM] <!-- Evaluator: Covered by plan.md RCM — FR-001..006 com File Path(s) e Function(s)/Symbol(s) preenchidos -->
- [X] CHK003 A estratégia declara servidor SMTP real de teste (fake `net.createServer`), não apenas mock injetado, para os quatro eventos? [Completeness, Spec §US1; plan.md AD-002] <!-- Evaluator: Covered by plan.md AD-002 (servidor fake nos 4 eventos + sweep) + Testing Strategy ("fake SMTP local") + AD-003 -->
- [X] CHK004 O caminho de falha é testável sem esperar o timeout de 5 s, com design de teste declarado? [Completeness, Spec §Edge Cases; plan.md HINT-005] <!-- Evaluator: Covered by plan.md HINT-005 (porta fechada, ECONNREFUSED) + AD-004 + HINT-005 (timeout já coberto por `emailTimeoutMs:100`) -->
- [X] CHK005 O modo inerte é testável sem vazamento de variável entre testes (setup/teardown declarado)? [Completeness, Spec §FR-004; plan.md HINT-002] <!-- Evaluator: Covered by plan.md HINT-002 (porta efêmera + remoção no teardown) + FR-004 (zero tentativa) -->

## Clarity

- [X] CHK006 O cenário de dedup está fechado com sequência explícita (varredura 2× → 1 e-mail, 2º passe não reenvia)? [Clarity, Spec §SC-002] <!-- Evaluator: Covered by spec.md SC-002 (sequência de dois passes) + FR-002 (UNIQUE antes do envio) -->
- [X] CHK007 A regressão da bateria tem limiar numérico declarado (smoke 118, Flutter 23, audit 0)? [Clarity, Spec §SC-004; plan.md Testing Strategy] <!-- Evaluator: Covered by plan.md Testing Strategy (118/118, 23/23, audit) + Instructions Check ("suíte verde") -->

## Consistency

- [X] CHK008 Os três estados de envio têm teste correspondente (`sent`, `failed`, `skipped`)? [Consistency, Spec §SC-003..SC-005; FR-003] <!-- Evaluator: Covered by spec.md SC-003 (três estados), SC-004 (inerte), SC-005 (falha) + plan.md Error Handling (todas as linhas) -->
- [X] CHK009 A seção Acceptance Test Stubs ("N/A — no P1 requirements") é consistente com as prioridades P2 da spec? [Consistency, Spec §US1/US2; plan.md Stubs] <!-- Evaluator: Covered by spec.md US1/US2 ambas Priority P2 + plan.md Acceptance Test Stubs (N/A) + specGate p1RequirementIds vazio -->
- [X] CHK010 O escopo de teste US2 (zero tentativa mensurável sem SMTP) é independente de US1 e não requer infraestrutura real? [Consistency, Spec §US2; SC-004] <!-- Evaluator: Covered by spec.md US2 Independent Test (sem `SMTP_*`) + SC-004 ("zero tentativa de envio") + FR-004 -->
