---
feature_branch: "00017-chat-colaborativo-contrato"
created: "2026-10-24"
input: "chat/resource.MD + TODO V2 — chat por contrato com IA e menu de tarefas"
spec_type: "product"
spec_maturity: "draft"
epic_id: "E016"
epic_sources: "{TODO V2; reutiliza E003/E004/E005/E009/E012}"
---

# Spec: Chat colaborativo por contrato

**Feature Branch**: `00017-chat-colaborativo-contrato` · **Created**: 2026-10-24 · **Status**: Draft · **Epic ID**: E016

## Problem Statement

A coordenação entre gestor e prestador se dispersa entre telas de tarefa, e-mail e canais externos: o risco só é visto quando vira problema. Documentos chegam por fora e nada extrai prazos, multas ou seguros deles para virar alerta; E004 só lê datas do cadastro. Sem canal único por contrato, o custo de coordenação cresce com a carteira.

## Scope

### Included

- Canal de mensagens por contrato em tempo real, com histórico e anexos pelo upload existente.
- Menu no chat com opções pré-programadas (ver alertas, ver próximas execuções, ver executadas) e movimentação de tarefa no workflow atual.
- Análise de documentos por IA extraindo prazos, riscos, multas, seguros e local de execução para alimentar alertas.
- Interface mobile-first sobre o tema atual (tokens do ColorScheme).

### Excluded

- Push fora do app; recorte decidido no Clarify (FR-063).
- Sugestões de ação e resumo diário (resource.MD); adiados com o provedor de IA.
- Voz/vídeo, presença e edição ou exclusão de mensagem; histórico imutável.
- Acesso de visitante ao chat, negado por deny-by-default (00002 FR-005).

### Edge Cases & Boundaries

- Contrato encerrado: canal somente leitura, histórico preservado.
- Prestador desvinculado ou domínio suspenso perde o canal na hora (guards E001).
- Análise falha: anexo e mensagem intactos, retry manual; envio não espera a IA.
- Texto acima de 4.000 caracteres: 400 sem escrita.

## User Scenarios & Testing

### User Story 1 - Canal de mensagens e anexos por contrato (Priority: P1)

Gestor e prestador conversam e anexam no canal do contrato em tempo real, com autor, data e histórico ao abrir.

**Why this priority**: base de tudo; sem canal e anexos não há chat nem análise.

**Acceptance Scenarios**:

1. **Given** dois participantes do contrato logados, **When** um envia mensagem e um PDF válido, **Then** o outro recebe em tempo real, e mensagem e anexo persistem com autor e data.
2. **Given** arquivo de 3 MB ou tipo proibido, **When** envia, **Then** 400 sem mensagem parcial nem arquivo gravado; domínio divergente recebe 403.

### User Story 2 - Menu de tarefas e alertas no chat (Priority: P1)

O usuário abre o menu no chat e escolhe uma das três opções; o sistema responde com cards e, pelo card, movimenta a tarefa sem sair do chat.

**Why this priority**: entrega o pedido do V2: o chat vira cockpit do contrato.

**Acceptance Scenarios**:

1. **Given** prestador com tarefa atribuída, **When** escolhe ver próximas execuções, **Then** recebe cards só das próprias tarefas com prazo e status; gestor abre ver alertas.
2. **Given** card em A Fazer, **When** conclui pelo chat com texto, **Then** a tarefa segue o fluxo de 00005 com as mesmas validações e histórico.

### User Story 3 - Análise de documentos com IA alimentando alertas (Priority: P1)

Documento no canal dispara análise de IA que devolve no chat prazos, riscos, multas, seguros e local de execução; itens com data viram alertas consultáveis no chat e no painel.

**Why this priority**: transforma documento em alerta acionável, o diferencial do V2.

**Acceptance Scenarios**:

1. **Given** documento enviado, **When** a análise termina, **Then** os campos extraídos aparecem no chat ligados à mensagem de origem.
2. **Given** item com prazo extraído, **When** a análise confirma, **Then** o alerta fica em ver alertas e no painel E005 sem duplicar.

### User Story 4 - Threads, reações e avisos (Priority: P2)

Thread a partir de mensagem ou card, reações rápidas entre participantes e aviso na sessão aberta de mensagem nova e de alerta gerado.

**Why this priority**: o MVP funciona sem, mas conversa longa e alerta perdido custam caro.

**Acceptance Scenarios**:

1. **Given** card de tarefa, **When** o usuário responde em thread, **Then** as respostas ficam agrupadas sob a mensagem original e as reações contam para os participantes.

## Requirements

### Functional Requirements

- **FR-051** [US1]: Sistema DEVE manter um canal por contrato, criado sob demanda, com mensagens de autor, data e texto ≤ 4.000 caracteres, e histórico paginado em ordem.
- **FR-052** [US1]: Sistema DEVE entregar mensagem em tempo real às sessões do domínio pela sala socket.io existente (`domain_<id>`), em melhor esforço como E009; falha de emissão não falha o envio.
- **FR-053** [US1]: Sistema DEVE aplicar os guards E001 ao canal: gestor e admin do domínio, prestador só em contratos vinculados; 401/403 como no restante de `/api/v2/*`.
- **FR-054** [US1]: Sistema DEVE aceitar anexo (PDF, DOCX, imagem) pelo upload existente (multipart, 2 MB, validação de tipo), em categoria do chat distinta de `evidence`/`documentation`.
- **FR-055** [US1]: Sistema DEVE manter o anexo de mensagem fora do fluxo de tarefas: invisível em conclusões, evidências e relatórios (E003/E008 inalterados).
- **FR-056** [US2]: Sistema DEVE oferecer o menu com "ver alertas", "ver próximas execuções" e "ver executadas", respondendo com cards: alertas do contrato (E004) e tarefas do escopo com prazo e status.
- **FR-057** [US2]: Sistema DEVE permitir movimentar tarefa pelo card no workflow atual, nas mesmas validações e histórico das rotas atuais (prestador inicia e conclui como 00005).
- **FR-058** [US2]: Sistema DEVE restringir o menu por papel: prestador só tarefas próprias; gestor e admin a visão do contrato ou domínio das telas atuais.
- **FR-059** [US3]: Sistema DEVE, ao receber documento no canal, executar análise assíncrona extraindo prazos, riscos, multas, seguros e local de execução, exibida no chat ligada à mensagem.
- **FR-060** [US3]: Sistema DEVE alimentar o motor E004 com os itens com data extraídos, dedup por contrato e fonte, consultáveis em "ver alertas" e no painel E005.
- **FR-061** [US3]: Sistema DEVE marcar a análise falha (provedor indisponível, timeout, arquivo não suportável) com anexo e mensagem intactos, retry manual e sem bloquear mensagens. [NEEDS CLARIFICATION: qual provedor de IA, modelo, custo e limites de uso?]
- **FR-062** [US4]: Sistema DEVE abrir thread de mensagem ou card vinculada à tarefa quando aplicável, com reações rápidas visíveis aos participantes. [NEEDS CLARIFICATION: threads e reações entram no P1 do MVP ou permanecem P2?]
- **FR-063** [US4]: Sistema DEVE avisar na sessão aberta sobre nova mensagem do contrato que segue e alerta gerado; push fora do app só se aprovada, com padrão in-app. [NEEDS CLARIFICATION: push no MVP ou só notificação in-app? qual provedor?]

### Key Entities

- **Mensagem de chat**: linha do canal com autor, data, texto e vínculo opcional a tarefa ou cláusula; histórico imutável.
- **Análise de documento**: resultado assíncrono da IA sobre um anexo, com campos extraídos, estado e origem; itens com data viram alerta (E004).

## Assumptions & Risks

### Assumptions

- Socket.io (E009), upload multipart (00005/00014) e motor de alertas (E004) são reutilizados como estão.
- Provedor de IA externo configurado por ambiente; análise fora do caminho de requisição (decisão pendente no Clarify).
- API em `/api/v2/*` com valores em PT; frontend só com tokens do ColorScheme; admin herda gestor; system_admin e visitante ficam de fora.

### Risks

- **Custo e disponibilidade da IA** *(likelihood: high, impact: high)*: análise cara ou lenta inviabiliza o fluxo. Mitigação: assíncrona com retry manual e limites por domínio.
- **Documentos a serviço externo** *(likelihood: medium, impact: high)*: dado contratual sai do ambiente. Mitigação: opt-in configurado e aviso na tela.
- **Vazamento entre contratos** *(likelihood: low, impact: high)*: prestador lê canal alheio. Mitigação: deny-by-default de 00002 e casos negativos na suíte.

## Implementation Signals

- `NEW-ENTITY`: mensagens e análises no schema por domínio, migração preguiçosa como E004.
- `NEW-API`: `/api/v2/contracts/:id/chat` (mensagens, menu, análises) sob guards E001; anexos pelo upload existente.
- `NEW-UI`: tela de chat mobile-first com menu e cards, sobre `app_theme.dart`.
- `NEW-WORKER`: job de análise com retry manual e ponte para `backend/src/services/alerts.js`.
- `EXTERNAL-SERVICE` + `NEW-CONFIG`: provedor de IA (a definir no Clarify) com chave, limites e timeout.

## Success Criteria

SC-001 [US1]: Mensagens chegam em tempo real entre os dois papéis sem recarregar; zero entregues a outro domínio na suíte.
SC-002 [US1]: PDF de 1 MB visível na conversa; 3 MB recebe 400 com disco e banco limpos; anexo ausente de evidências e relatórios.
SC-003 [US2]: Prestador só enxerga tarefas próprias nas três opções e conclui pelo card com as validações atuais; gestor vê alertas atualizados.
SC-004 [US3]: Documento gera extração no chat e exatamente um alerta por item com data, também no painel E005; reprocessamento não duplica.
SC-005 [US3]: Provedor fora do ar: mensagens e anexos 100% funcionais e análise marcada falha com retry disponível.
SC-006 [US4]: Aviso de mensagem nova chega com o chat em outra aba sem recarregar; sem push, nada de erro visível por isso.

## Glossary

- **Canal**: conversa única de um contrato, com mensagens, anexos e cards.
- **Análise de documento**: extração por IA de prazos, riscos, multas, seguros e local de execução de um anexo.
