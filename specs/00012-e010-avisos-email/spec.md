---
spec_type: product
epic_id: E010
epic_sources: "{PRD:CAP-009}"
spec_maturity: clarified
---

# Spec: Avisos por e-mail — envio opt-in por evento (00012)

## Problem Statement

O aviso em aplicativo é sempre disponível, mas quando o cliente tem infraestrutura de envio, atribuição, conclusão, reabertura e vencimento também deveriam sair por e-mail. O notificador SMTP já está entregue (gate `SMTP_HOST`/`SMTP_PORT`, timeout de 5 s, `notify()` sem exceção) e a varredura de E004 já chama `notify()` gravando `alert_events.email_status`. Falta provar o ciclo fim a fim com servidor SMTP real, modo inerte e falha sem quebrar resposta ou varredura, e expor o estado de envio no registro do alerta; sem isso a CAP-009 fica declarada mas não verificada.

## Scope

### Included
- Gatilhos de atribuição, conclusão e reabertura com `SMTP_*`: e-mail ao destinatário já definido (atribuído; gestão), resposta HTTP preservada.
- Vencimento: varredura de E004 dispara `notify('contract_alert')` no ponto de emissão para `creator_email`, registro gravado antes do envio.
- Dedup de e-mail: contrato × janela gera no máximo um envio (UNIQUE de `alert_events`), inclusive com varredura repetida.
- `email_status` (`sent`/`failed`/`skipped`) exposto na leitura do painel de alertas para admin e gestor.
- Modo inerte sem `SMTP_*`: zero tentativa, zero erro em API ou tela, aviso em aplicativo segue.
- Falha (host inoperante ou timeout de 5 s): `failed`, resposta HTTP e varredura intactas; `notify()` nunca propaga exceção.
- Sem `creator_email`: sem tentativa, registro `skipped`.

### Excluded
- E-mail obrigatório, fila de reenvio ou retry — o SAD fixa melhor esforço, sem retry.
- Modelos personalizados, marketing, push, preferência de canal por usuário.
- Verificação do motor em si (esquema, dedup, janelas — E004); aqui só o ponto de chamada e o desfecho.

### Edge Cases & Boundaries
- SMTP sem resposta em 5 s ou host inoperante: `failed`, varredura e resposta seguem.
- Sem `SMTP_*`: canal inerte, aviso em aplicativo ativo, nenhuma tela com erro.
- Sem `creator_email`: alerta gravado, estado `skipped`, zero tentativa.
- Dedup cobre e-mail: varredura repetida não reenvia; `notify()` nunca lança.

## User Scenarios & Testing

### User Story 1 - Aviso chega por e-mail também (Priority: P2)
Como gestor, com envio configurado no cliente, recebo e-mail na atribuição, na conclusão, na reabertura e no vencimento, com o conteúdo do aviso em aplicativo — e leio no registro do alerta se o envio saiu, falhou ou ficou inerte.

**Why this priority**: canal de conveniência opcional — sem ele o produto segue completo (P2 no PRD); depende só de E004, já entregue.

**Independent Test**: servidor SMTP de teste local → quatro eventos produzem suas mensagens; varredura duas vezes → um único e-mail; leitura do painel mostra o estado.

**Acceptance Scenarios**:

1. **Given** `SMTP_HOST`/`SMTP_PORT` em servidor de teste, **When** a tarefa é atribuída, concluída e reabrita, **Then** cada ação gera um e-mail ao destinatário do evento e a resposta permanece 200/201.
2. **Given** contrato entrando na janela de alerta, **When** a varredura de E004 emite duas vezes, **Then** o e-mail de vencimento sai uma vez só para `creator_email` e o registro fica `sent`.
3. **Given** envio concluído ou falho, **When** o gestor lê o painel, **Then** o estado da janela atribuída aparece como enviado, falho ou inerte.

### User Story 2 - Produto completo sem e-mail (Priority: P2)
Como cliente sem infraestrutura de envio, uso o sistema normalmente: avisos na tela, nenhuma tela com erro por falta de e-mail e nenhuma ação terminando em falha por causa do canal.

**Why this priority**: princípio de produto — "o produto funciona sem e-mail"; o canal só existe opcional por cima.

**Independent Test**: mesmos quatro eventos sem `SMTP_*` → zero tentativa e aviso em aplicativo visível; host inoperante → estado falho em até 5 s sem erro na ação.

**Acceptance Scenarios**:

1. **Given** variáveis SMTP ausentes, **When** os quatro eventos acontecem, **Then** nenhum envio é tentado, o aviso em aplicativo aparece e nenhuma resposta vira erro.
2. **Given** host SMTP inoperante, **When** o envio é tentado, **Then** o estado é marcado falho em até 5 s, a ação responde normalmente e a varredura completa.

## Requirements

- **FR-001** [US1]: com `SMTP_*` configurado, atribuição, conclusão e reabertura de tarefa MUST gerar um e-mail ao destinatário do evento (atribuído; gestão) preservando a resposta HTTP.
- **FR-002** [US1]: a varredura de vencimento de E004 MUST disparar `notify('contract_alert')` no ponto de emissão para `creator_email` com o registro gravado antes do envio — contrato × janela produz no máximo um e-mail mesmo com varredura repetida.
- **FR-003** [US1]: o estado de envio (`sent`/`failed`/`skipped`) MUST ser legível na leitura do painel de alertas para admin e gestor, na janela atualmente atribuída do contrato.
- **FR-004** [US2]: sem `SMTP_HOST`/`SMTP_PORT`, nenhum envio MUST ser tentado, nenhuma API ou tela MUST mostrar erro por isso e o aviso em aplicativo MUST seguir ativo.
- **FR-005** [US2]: falha de envio (host inoperante ou timeout de 5 s) MUST marcar `email_status='failed'` sem transformar a resposta HTTP em erro nem interromper a varredura; a latência adicional fica limitada ao timeout de 5 s (melhor esforço, sem retry).
- **FR-006** [US2]: `notify()` MUST continuar sem propagar exceção para nenhum dos quatro gatilhos — a falha do canal é engolida e registrada, nunca lançada.

## Key Entities

- **Aviso por e-mail**: evento (atribuição, conclusão, reabertura, vencimento) com destinatário e estado enviado/falho.
- **Alerta de vigência**: registro `alert_events` de E004; `email_status` (`sent`/`failed`/`skipped`) é a prova do desfecho do envio.
- **Sessão SMTP**: opt-in por variável de ambiente (`SMTP_HOST`/`SMTP_PORT`), sem preferência por usuário.

## Assumptions & Risks

### Assumptions

- O notificador entregue (T028) trata os gatilhos de tarefa; esta épica confirma, não reescreve.
- Destinatário = endereço já cadastrado: atribuído, gestão (`managementEmails`), `creator_email` no vencimento.
- Ordem gravação-do-alerta → envio herdada de E004; painel de E005 é a leitura natural (extensão de payload, sem endpoint novo).

### Risks

- **Canal indisponível silenciando aviso** *(likelihood: medium, impact: medium)*: estado por registro legível + aviso em aplicativo sempre ativo.
- **E-mail dependente do motor** *(likelihood: low, impact: medium)*: aresta E010 → E004 satisfeita (E004 `.qc-passed`).
- **Spam por reenvio** *(likelihood: low, impact: high)*: dedup gravada antes do envio.

## Implementation Signals

- [`EXTERNAL-SERVICE`] — sessão SMTP opt-in (`SMTP_HOST`/`SMTP_PORT`) no gatilho de vencimento da varredura de E004, destinatário `creator_email`.
- [`NEW-API`] — payload de `GET /api/alerts/panel` passa a expor o `email_status` da janela atribuída; nenhum endpoint novo, nenhuma migração.

## Success Criteria

SC-001 [US1]: Com servidor SMTP de teste local, os quatro eventos produzem exatamente suas mensagens e todas as respostas HTTP envolvidas permanecem 200/201.
SC-002 [US1]: A varredura executada duas vezes sobre o mesmo contrato na mesma janela produz no máximo um e-mail e um registro; o segundo passe não reenvia.
SC-003 [US1]: A leitura do painel expõe o estado da janela atribuída — `sent` após envio real, `failed` após falha, `skipped` sem configuração — sem mudar as demais seções do payload.
SC-004 [US2]: Sem `SMTP_*`, os quatro eventos rodam com zero tentativa de envio e zero erro visível em API ou tela; o aviso em aplicativo aparece. Exibir estado de envio é leitura informativa, não erro de ação ou de interface.
SC-005 [US2]: Host inoperante marca `failed` em até 5 s, nenhuma ação do usuário termina em erro (status preservado; latência adicional limitada ao timeout de 5 s do envio) e a varredura completa com contagens coerentes (`swept` ≥ `emailed` + `failed`).

## Glossary

| Term | Definition |
|------|------------|
| SMTP opt-in | Canal que só existe com `SMTP_HOST` e `SMTP_PORT` definidos; ausente, o sistema age como se o canal não existisse. |
| Modo inerte | Estado sem configuração: zero tentativa, zero erro, aviso em aplicativo ativo. |
| Estado de envio | `email_status` do registro de alerta: `sent`, `failed` ou `skipped` (inerte ou sem destinatário). |

## Clarifications

### Session 2026-10-11

- Q: Onde o estado de envio fica legível? -> A: payload de `GET /api/alerts/panel`, item da janela atribuída; sem endpoint novo.
- Q: Quem lê o estado? -> A: admin e gestor, os mesmos guards do painel.
- Q: Contrato sem `creator_email` fica como? -> A: `skipped` — registro gravado sem tentativa, nunca `failed`.
- Q: Qual `email_status` o painel mostra? -> A: só o da janela atualmente atribuída (a mesma que define `alertado`); sem linha, sem status.
- Q: Prioridade dos work items? -> A: US1 e US2 P2 — épicos P2, produto completo sem o canal (precedente E009).
- Q: Timeout de envio? -> A: fixo em 5 s (`EMAIL_TIMEOUT_MS`), herdado de E004, sem novo configurável.
- Q: Dedup de e-mail? -> A: mesma chave de `alert_events` (contrato × janela, UNIQUE); nenhum registro paralelo.
- Q: Conteúdo do e-mail de vencimento? -> A: manter o texto atual (assunto com janela e nome, corpo com previsão e janela).

## Stress-Test Findings

### Session 2026-10-11

STF-001: [boundary-scale-stress] (MEDIUM) — Affected: FR-005, SC-005 — rotas aguardam notify() com host morto: a resposta HTTP atrasa até 5 s e o spec não define a latência aceita.
STF-002: [cross-requirement-contradiction] (MEDIUM) — Affected: FR-003, SC-003 — contrato pode ter eventos em janelas antigas; "janela atribuída" não diz qual email_status o painel expõe.
STF-003: [cross-requirement-contradiction] (MEDIUM) — Affected: US2, SC-004 — US2 promete nenhuma tela com erro por falta de e-mail enquanto SC-003 expõe estado falho na tela; "erro" ambíguo.
