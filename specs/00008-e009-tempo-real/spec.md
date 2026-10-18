---
spec_type: product
epic_id: E009
spec_maturity: "clarified"
epic_sources: "{PRD:CAP-008}"
---

# E009 — Comunicação em tempo real

## Problem Statement

O time trabalha o dia inteiro e a tela dos outros precisa acompanhar sem recarregar; sem isso, dois usuários veem estados diferentes da mesma tarefa. O Socket.io com salas por domínio já está entregue (`emitDomainEvent()` em `backend/src/server.js`, sala `domain_<id>`, injeção via `services/events.js`) e as telas de tarefa e detalhe de contrato já consomem `task:updated`. Falta provar que a mutação de um usuário chega às sessões dos demais do mesmo domínio, que nada vaza para outro domínio e que falha de emissão nunca quebra a resposta HTTP. Sem essa prova, a CAP-008 fica declarada mas não verificada.

## Scope

### Included
- Mutação de tarefa via HTTP publica `task:updated` na sala `domain_<id>` e a sessão de outro usuário do mesmo domínio o recebe (ponta a ponta HTTP → socket).
- Isolamento de sala: sessão de outro domínio não recebe o evento.
- Inércia da falha de emissão: exceção capturada em `services/events.js` retorna `false` e a resposta HTTP da mutação permanece a de sucesso.
- Entrega melhor esforço sem replay: sem emitter registrado a emissão retorna `false`; estado é relido do banco na reconexão, sem fila de eventos.
- Regressão das telas consumidoras (lista de tarefas e detalhe de contrato) que já ouvem `task:updated`.

### Excluded
- Evento persistido com replay ou barramento de mensagens — o SAD fixa entrega melhor esforço e estado sempre relido do banco.
- Tempo real entre domínios ou para usuários externos.
- Notificação desktop/push do navegador.
- Estado de alerta em tempo real do motor — E004 publica na sala; aqui só se verifica o transporte.
- Evento de mutação de contrato — `contracts.js` não emite domínio e as telas só ouvem `task:updated`.

### Edge Cases & Boundaries
- Emissor com erro: captura a própria exceção em `services/events.js` e devolve `false`; a resposta HTTP da mutação segue normalmente.
- Sessão de outro domínio na mesma rede: não recebe o evento (sala por domínio).
- Sessão reconectada: estado é relido do banco na reconexão, sem fila de eventos para reprocessar.
- Sem nenhuma sessão aberta além da origem: emissão não falha, apenas não há destinatário.
- Emissor não registrado (arranque parcial): `emitDomainEvent` retorna `false` sem lançar.

## User Scenarios & Testing

### User Story 1 - Tela acompanhando sem recarregar (Priority: P2)

Como gestor, vejo a tarefa atualizada pelo prestador aparecer na minha tela no mesmo dia de trabalho, sem precisar recarregar.

**Why this priority**: conveniência sobre a base sólida — o produto funciona sem tempo real, mas a experiência de time fica melhor com ele; CAP-008 é P2 no PRD.

**Independent Test**: mutação de tarefa via HTTP com duas sessões na sala do mesmo domínio; a segunda sessão recebe `task:updated` sem recarregar, e a sessão de outro domínio não recebe nada.

**Acceptance Scenarios**:

1. **Given** duas sessões na sala do mesmo domínio, **When** uma executa uma mutação de tarefa via HTTP, **Then** a outra recebe `task:updated` e atualiza sem recarregar.
2. **Given** sessão em outro domínio, **When** a mutação acontece no primeiro, **Then** a sessão externa não recebe o evento.

### User Story 2 - Falha de transporte invisível (Priority: P2)

Como usuário, sigo usando a aplicação normalmente mesmo se o canal de eventos cair — a resposta da minha ação chega do mesmo jeito, sem replay quando o canal volta.

**Why this priority**: o SAD fixa melhor esforço; depender de tempo real para confirmar ação quebraria a garantia de resposta.

**Independent Test**: emissão com falha (emitter lançando ou ausente) durante uma mutação de tarefa → resposta HTTP de sucesso e `emitDomainEvent` retornando `false`.

**Acceptance Scenarios**:

1. **Given** emitter que lança exceção, **When** o usuário executa uma mutação de tarefa, **Then** a resposta HTTP é a de sucesso e o estado é relido do banco na próxima carga, sem replay.
2. **Given** nenhum emitter registrado, **When** a emissão é tentada, **Then** retorna `false` sem lançar e a mutação segue normalmente.

## Requirements

- **FR-001** [US1]: Uma mutação de tarefa via HTTP publica `task:updated` na sala `domain_<id>` do domínio do token, e a sessão de outro usuário do mesmo domínio recebe o evento (ponta a ponta HTTP → socket).
- **FR-002** [US1]: Sessão de outro domínio não recebe o evento emitido para a sala de um domínio — isolamento por sala.
- **FR-003** [US2]: Falha de emissão (exceção em `emitDomainEvent`) é capturada e retorna `false`; a resposta HTTP da mutação que originou o evento permanece a de sucesso, sem propagação do erro.
- **FR-004** [US2]: Sem emitter registrado, `emitDomainEvent` retorna `false` sem lançar; entrega é melhor esforço sem replay — estado relido do banco na reconexão.

## Key Entities

- **Sessão**: WebSocket conectado à sala `domain_<id>` após handshake com token válido.
- **Evento de domínio**: `task:updated` publicado para a sala inteira do domínio na mutação.
- **Domínio**: dono da sala; o `domainId` do token define a sala à qual a sessão entra.

## Assumptions & Risks

### Assumptions
- As telas consumidoras já ligadas (lista de tarefas e detalhe de contrato) são os únicos pontos de consumo desta release; ambas ouvem `task:updated`.
- O domínio da sessão vem do mesmo `domainId` do token usado no restante da API.
- Instância única de API em todos os ambientes previstos.
- `contracts.js` não emitir domínio é aceito — as telas não ouvem mutação de contrato.

### Risks
- **Evento perdido sem replay** *(likelihood: medium, impact: low)*: sessão desconectada na hora da mutação não recupera o evento. Mitigação: estado sempre relido do banco na reconexão (FR-004).
- **Resposta HTTP dependendo da emissão** *(likelihood: low, impact: high)*: se a emissão lançasse exceção não capturada, a mutação falharia junto. Mitigação: `try/catch` em `services/events.js` retorna `false` (FR-003).

## Implementation Signals

- `MIGRATION`/`NEW-API`: nenhum — transporte entregue (`emitDomainEvent`, sala `domain_<id>`, injeção via `services/events.js`).
- Só sinal novo se a verificação mostrar evento publicado sem sala ou resposta HTTP dependendo da emissão — ambos já protegidos.

## Success Criteria

SC-001 [US1]: Uma mutação de tarefa via HTTP com duas sessões no mesmo domínio faz a segunda sessão receber `task:updated` e atualizar sem recarregar.
SC-002 [US1]: Sessão de outro domínio, com todas as sessões ativas, não recebe nenhum evento do domínio vizinho.
SC-003 [US2]: Emissão com falha (exceção ou ausência de emitter) devolve `false` e a resposta HTTP da mutação permanece a de sucesso; estado relido do banco, sem replay.
SC-004 [US2]: Bateria completa permanece verde após a verificação, sem regressão nas telas consumidoras de tarefa e detalhe de contrato.

## Glossary

| Term | Definition |
|------|-----------|
| Sala de domínio | Namespace Socket.io `domain_<id>` à qual as sessões do domínio entram após handshake com token válido. |
| Entrega melhor esforço | Evento emitido uma vez, sem confirmação, sem fila e sem replay; estado sempre relido do banco. |

## Clarifications

- **Q1 — Mutações de contrato precisam emitir domínio?** Não. `contracts.js` não emite e as telas consumidoras (lista de tarefas, detalhe de contrato) só ouvem `task:updated`; o cenário da demo e os cenários de aceitação são de mutação de tarefa. Evento de contrato fica fora do perímetro desta épica. (Recomendado; alinhado ao código e ao E009.md §Excluded.)
- **Q2 — Como provar o ponta a ponta HTTP → socket?** Teste `node --test` com supertest para a mutação HTTP e um cliente socket.io no mesmo processo; asserta que a sessão do mesmo domínio recebe `task:updated` e a de outro domínio não. (Recomendado; precedente em `server.socket.test.js`.)
- **Q3 — Como injetar falha de emissão?** `setEmitter(fn)` com uma função que lança exceção, executar uma mutação de tarefa, asserir resposta HTTP 2xx e que a emissão retornou `false`. Para emitter ausente, chamar `emitDomainEvent` sem emitter registrado e asserir `false` sem throw. (Recomendado; exercita o `try/catch` de `services/events.js`.)

## Stress-Test Findings

Nenhum finding — quatro passagens (contradições, impossibilidades, gatilho concorrente, fronteira/escala) sem achados. Melhor esforço sem replay + resposta HTTP insulada já implementados em `services/events.js`; a verificação confirma, não descobre.

## Compliance Check

- **PASS** — Convenções: `product`/E009/`{PRD:CAP-008}`/clarified; seções completas; FR-001..004 → US1/US2 (P2); SC-001..004; 0 marcadores; rastreável ao PRD.
