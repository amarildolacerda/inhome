# Security Checklist: Comunicação em tempo real (00008)
**Created**: 2026-10-10 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 O isolamento de sala por domínio está declarado como requisito? [Completeness, Spec §Requirements FR-002] <!-- Evaluator: Covered by spec.md FR-002 ("Sessão de outro domínio não recebe o evento") + §Edge Cases -->
- [X] CHK002 O domínio da sala vem do `domainId` do token, declarado como decisão? [Completeness, Spec §Assumptions] <!-- Evaluator: Covered by spec.md §Assumptions ("domínio da sessão vem do mesmo domainId do token") + server.js join_domain usa token -->
- [X] CHK003 O handshake exige token válido antes de entrar na sala? [Completeness, Spec §Key Entities] <!-- Evaluator: Covered by spec.md §Key Entities ("Sessão: WebSocket conectado à sala após handshake com token válido") + server.js:95 io.use auth -->
- [X] CHK004 A recusa de sessão sem/ com token inválido está coberta pelos testes existentes? [Completeness, Spec §Success Criteria SC-002] <!-- Evaluator: Covered by server.socket.test.js (handshake recusado sem token / token inválido) -->
- [X] CHK005 Sessão de domínio suspenso não conecta, declarado? [Completeness, Spec §Key Entities] <!-- Evaluator: Covered by server.socket.test.js (sessão de domínio suspenso não conecta) -->

## Clarity

- [X] CHK006 A fronteira entre sala do domínio e domínio estrangeiro está definida sem ambiguidade? [Clarity, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases ("Sessão de outro domínio na mesma rede: não recebe o evento") + FR-002 -->
- [X] CHK007 A semântica de "entrega melhor esforço sem replay" está clara? [Clarity, Spec §Excluded] <!-- Evaluator: Covered by spec.md §Excluded ("Evento persistido com replay… o SAD fixa entrega melhor esforço") + SC-003 -->

## Consistency

- [X] CHK008 O nome da sala (`domain_<id>`) é idêntico entre spec, plano e código? [Consistency, Spec §Key Entities] <!-- Evaluator: Covered by spec.md §Key Entities, plan.md AD-001 e server.js:48 io.to(`domain_${domainId}`) -->
- [X] CHK009 O evento `task:updated` é nomeado igual entre spec, plano, código e consumidores? [Consistency, Spec §Requirements FR-001] <!-- Evaluator: Covered by spec.md FR-001, tasks.js emitDomainEvent('task:updated') e frontend api_service.dart on('task:updated') -->

## Measurability

- [X] CHK010 O isolamento de sala tem teste nomeado? [Measurability, Spec §Success Criteria SC-002] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-002 → server.socket.test.js) + teste existente SC-004 -->
- [X] CHK011 O ponta a ponta HTTP → socket tem teste nomeado? [Measurability, Spec §Success Criteria SC-001] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-001 → server.socket.test.js) -->
- [X] CHK012 O handshake com token tem teste nomeado? [Measurability, Spec §Key Entities] <!-- Evaluator: Covered by server.socket.test.js (handshake sem token / token inválido) -->

## Traceability

- [X] CHK013 Cada requisito de segurança da spec aponta para símbolo no mapa de cobertura? [Traceability, Spec §Requirements] <!-- Evaluator: Covered by plan.md §Requirement Coverage Map (FR-001 → emitDomainEvent/io.to; FR-002 → socket.join/io.to room scoping) -->
- [X] CHK014 O isolamento entre domínios é verificável por asserção de não-recebimento? [Traceability, Spec §Success Criteria SC-002] <!-- Evaluator: Covered by teste existente "domain B saw a domain A event" (leaked=false) + FR-002 stub -->
