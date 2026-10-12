# API Quality Checklist: Avisos por e-mail — envio opt-in por evento (00012)
**Created**: 2026-10-11 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 O campo novo está declarado com tipo e valores exatos (`sent`/`failed`/`skipped`, ausente sem evento)? [Completeness, Spec §FR-003] <!-- Evaluator: Covered by spec.md FR-003 (estados listados) + CLAR Q4 ("sem linha, sem status") + plan.md API Surface (`sent\|failed\|skipped\|null`) -->
- [X] CHK002 A compatibilidade do payload está declarada: campo aditivo, demais seções do painel preservadas? [Completeness, Spec §SC-003] <!-- Evaluator: Covered by spec.md SC-003 ("sem mudar as demais seções do payload") + Signals NEW-API (extensão, não novo endpoint) -->
- [X] CHK003 A superfície HTTP está fechada — nenhum método, rota ou parâmetro novo além do campo no item existente? [Completeness, Spec §Signals; CLAR Q1] <!-- Evaluator: Covered by spec.md Signals ("nenhum endpoint novo, nenhuma migração") + CLAR Q1 ("mesma rota, sem endpoint novo") + plan.md API Surface (1 linha GET) -->
- [X] CHK004 O comportamento sem evento na janela (campo ausente/nulo) está declarado como resposta válida, não como erro? [Completeness, Spec §FR-003; plan.md Error Handling] <!-- Evaluator: Covered by spec.md CLAR Q4 + plan.md Error Handling ("Painel sem evento na janela → `null`, 200 inalterado") -->
- [X] CHK005 Os leitores autorizados da leitura estão declarados (admin e gestor, guards do painel) antes de qualquer dado exposto? [Completeness, Spec §FR-003; CLAR Q2] <!-- Evaluator: Covered by spec.md FR-003 + CLAR Q2 + plan.md API Surface (scopeDomain) -->

## Clarity

- [X] CHK006 A resposta HTTP preservada nos quatro eventos (200/201) está declarada com números mensuráveis? [Clarity, Spec §SC-001] <!-- Evaluator: Covered by spec.md SC-001 ("todas as respostas HTTP envolvidas permanecem 200/201") + FR-001 -->
- [X] CHK007 O tratamento de falha de downstream (SMTP) está declarado sem transformar a resposta do usuário em erro, com limite de latência? [Clarity, Spec §FR-005; plan.md Error Handling] <!-- Evaluator: Covered by spec.md FR-005 ("latência adicional limitada ao timeout de 5 s") + STF-001 resolution + plan.md Error Handling (200/201 preservadas) -->

## Consistency

- [X] CHK008 O campo exposto vem da janela atualmente atribuída, coerente com a regra STF-002 e não do histórico? [Consistency, Spec §STF-002; CLAR Q4] <!-- Evaluator: Covered by spec.md STF-002 (resolvido: "só o da janela atualmente atribuída") + FR-003 + plan.md HINT-001 -->
- [X] CHK009 Os estados de envio cobrem todos os terminais sem estado órfão: enviado, falho, inerte (e ausente sem evento)? [Consistency, Spec §Key Entities; FR-003] <!-- Evaluator: Covered by spec.md Key Entities (`sent`/`failed`/`skipped`) + FR-005 (`failed` ao tentar) + FR-004 (`skipped` inerte) + CLAR Q4 (ausente) -->
- [X] CHK010 A superfície declarada em Signals (NEW-API no payload do painel) é idêntica à do plan.md API Surface Summary? [Consistency, Spec §Signals; plan.md API Surface] <!-- Evaluator: Covered by spec.md Signals (`GET /api/alerts/panel` + `email_status`) = plan.md API Surface (1 linha, campo novo) -->
