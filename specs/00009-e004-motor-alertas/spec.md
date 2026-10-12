---
spec_type: product
epic_id: E004
spec_maturity: "clarified"
epic_sources: "{PRD:CAP-004}"
---

# E004 — Motor de alertas de vigência

## Problem Statement

A pesquisa de set/2026 coloca o alerta de vigência como desejo número um: a planilha não avisa e o vencimento só aparece quando já é prejuízo. O produto controla — E002 deriva `vigente`/`atrasado`/`encerrado` de `contracts.forecast_date` — mas não avisa: sem tabela de alertas, varredura de vencimento ou janelas configuráveis. Sem o motor, CAP-004 e HYP-001 ficam sem como ser testadas e nenhum contrato entra em atraso com aviso prévio registrado.

## Scope

### Included
- Migração aditiva preguiçosa de `alert_events` por domínio (padrão Q5: abertura de `data/domains/<id>.db`, antes de `applySchema`, sem boot-scan).
- Janelas 90/60/30/15 configuráveis por domínio, padrão sem setup.
- `runExpirySweep`: subida + cada 60 min, fora do caminho de requisição, sobre `forecast_date` (fonte do `atrasado` de E002) contra janelas do domínio.
- Dedup: uma linha em `alert_events` por contrato e janela, gravada antes de qualquer envio.
- Aviso na sala `domain_<id>` via `emitDomainEvent()` (entregue por E009) na emissão.
- E-mail por `notify()` só com `SMTP_HOST`/`SMTP_PORT`; estado em `alert_events`.
- Falha de envio (timeout 5 s) registrada sem parar a varredura; erro engolido; domínio suspenso pulado.

### Excluded
- Painel de vencimentos e UI de janelas — E005 consome `alert_events` e janelas.
- Gatilhos de e-mail de atribuição/conclusão/reabertura — E010.
- E-mail obrigatório — SMTP opt-in.
- Frequência além de 60 min ou janelas fora de 90/60/30/15 — pendente de uso real.
- `runDueSweep` de tarefas (FR-017) — permanece; motor de contratos é separado.

### Edge Cases & Boundaries
- Varredura reiniciar no meio: a linha já gravada em `alert_events` impede reenvio.
- Contrato alertado e prorrogado: a nova previsão reabre a passagem conforme a janela re-atingida.
- SMTP sem resposta em 5 s: falha registrada, varredura segue.
- Sem `SMTP_HOST`/`SMTP_PORT`: envio pulado; aviso em aplicativo segue.
- Domínio suspenso: varredura não emite.
- Domínio antigo aberto depois da entrega: migração cria `alert_events` no primeiro acesso.
- Contrato sem `forecast_date`: fora da varredura.

## User Scenarios & Testing

### User Story 1 - Aviso antes do vencimento (Priority: P1)

Como gestor, recebo o aviso na tela quando um contrato entra na janela de 30 dias, com tempo para decidir prorrogar ou encerrar.

**Why this priority**: desejo nº 1 da pesquisa (EVD-002); HYP-001 só se testa com o motor.

**Independent Test**: contrato com previsão a 20 dias + varredura → um evento da janela 30 gravado e aviso na sala, repetido sem duplicar.

**Acceptance Scenarios**:

1. **Given** contrato com previsão dentro de 30 dias, **When** a varredura roda, **Then** existe exatamente um evento da janela 30 para aquele contrato.
2. **Given** evento já gravado, **When** a varredura roda de novo, **Then** nenhum evento novo é criado e nenhum aviso é reenviado.
3. **Given** contrato a 20 dias em domínio ativo, **When** a varredura emite, **Then** a sala do domínio recebe o aviso em aplicativo.

### User Story 2 - Janela configurável por domínio (Priority: P1)

Como admin, o domínio usa as janelas 90/60/30/15 por padrão, sem setup, e a configuração pode ser ajustada sem tocar em código.

**Why this priority**: PRD fixa 90/60/30/15 como hipótese inicial; precisa ajustar com o uso real.

**Independent Test**: domínio novo nasce com as quatro janelas ativas; alterar a janela do domínio muda o que a varredura observa.

**Acceptance Scenarios**:

1. **Given** domínio recém-habilitado, **When** a varredura roda, **Then** ela observa as quatro janelas padrão sem configuração prévia.
2. **Given** janelas alteradas, **When** a varredura roda, **Then** ela usa a configuração atual do domínio.

### User Story 3 - E-mail quando há envio configurado (Priority: P1)

Como gestor, com `SMTP_*` configurado, recebo também o e-mail do vencimento; sem configuração, recebo só o aviso em aplicativo e nada quebra.

**Why this priority**: o produto não depende de e-mail — canal opcional sobre o aviso em aplicativo.

**Independent Test**: varredura com e sem `SMTP_*`, conferindo envio e descarte controlado.

**Acceptance Scenarios**:

1. **Given** `SMTP_HOST` e `SMTP_PORT` definidos, **When** a varredura emite, **Then** o e-mail sai uma vez e o estado fica registrado.
2. **Given** SMTP ausente, **When** a varredura emite, **Then** o envio é pulado e o aviso em aplicativo acontece.
3. **Given** SMTP sem resposta em 5 s, **When** a varredura tenta o envio, **Then** a falha fica registrada e a varredura continua.

## Requirements

- **FR-001** [US1]: Migração aditiva preguiçosa cria `alert_events` (dedup contrato + janela, estado de envio) em cada `data/domains/<id>.db` na abertura, antes de `applySchema`, idempotente, sem varredura no boot.
- **FR-002** [US1]: `runExpirySweep` roda na subida e a cada 60 min fora do caminho de requisição, varrendo `forecast_date` contra as janelas do domínio; erro engolido; suspenso pulado.
- **FR-003** [US1]: Dedup idempotente — no máximo uma linha em `alert_events` por contrato e janela, gravada antes de qualquer envio; repetição não duplica nem reenvia.
- **FR-004** [US1]: Na emissão do alerta, aviso entregue à sala `domain_<id>` via `emitDomainEvent()`.
- **FR-005** [US2]: Janelas 90/60/30/15 configuráveis por domínio com padrão automático sem setup; a varredura usa a configuração atual do domínio.
- **FR-006** [US3]: E-mail por `notify()` somente com `SMTP_HOST` e `SMTP_PORT`; estado (enviado/falho/pulado) registrado em `alert_events`; timeout 5 s marca falho sem parar a varredura; sem SMTP o aviso em aplicativo permanece íntegro.

## Key Entities

- **Alerta de vigência (`alert_events`)**: linha por contrato e janela com estado de envio; chave de dedup gravada antes do envio.
- **Janela de alerta**: dias (90, 60, 30, 15) antes da previsão de finalização; configurável por domínio com padrão automático.
- **Contrato**: `forecast_date` (fonte, entregue por E002) — único gatilho da varredura.

## Assumptions & Risks

### Assumptions
- `runDueSweep` (tarefas, FR-017) e `notify()` entregues são ponto de partida; novo: esquema, janelas, varredura de contratos, dedup.
- Processo único por host, sem trava entre instâncias.
- Janela calculada sobre `forecast_date`, fonte do `atrasado` de E002.
- Janelas do domínio lidas do banco a cada passo da varredura.

### Risks
- **Janela padrão errada** *(likelihood: medium, impact: medium)*: 90/60/30/15 de pesquisa qualitativa. Mitigação: configurável por domínio (FR-005).
- **Host fora da janela** *(likelihood: low, impact: medium)*: aviso sai na subida seguinte. Mitigação: varredura na inicialização (FR-002).
- **Custo em domínio grande** *(likelihood: low, impact: medium)*: milhares de contratos. Mitigação: fora do caminho de requisição (FR-002); p95 < 2 s pela suíte.

## Implementation Signals

- [`NEW-ENTITY`] — tabela `alert_events` por domínio (contrato, janela, estado de envio) como chave de dedup.
- [`MIGRATION`] — criação aditiva preguiçosa na abertura de `data/domains/<id>.db`, antes de `applySchema`.
- [`NEW-WORKER`] — `runExpirySweep` agendada: subida + cada 60 min, erro engolido.
- [`NEW-CONFIG`] — janelas 90/60/30/15 configuráveis por domínio, padrão automático.

## Success Criteria

SC-001 [US1]: Contrato com previsão a 20 dias e varredura executada produz exatamente um evento da janela 30; segunda execução não cria evento novo nem reenvia.
SC-002 [US2]: Domínio novo é varrido nas quatro janelas padrão sem setup; janela alterada muda o que a varredura observa.
SC-003 [US3]: Com `SMTP_*` o e-mail sai uma vez com estado registrado; sem `SMTP_*` nenhum envio é tentado e o aviso em aplicativo acontece; timeout 5 s grava falho e a varredura continua.
SC-004 [US1]: Métrica "0 contratos em atraso sem aviso prévio registrado" observável em `alert_events`.
SC-005 [US1]: Varredura na subida e a cada 60 min fora do caminho de requisição; falha de um domínio não interrompe os demais.

## Glossary

| Term | Definition |
|------|-----------|
| Alerta de vigência | Aviso quando o contrato entra em janela antes da previsão; registrado em `alert_events`, entregue em aplicativo e, se configurado, por e-mail. |
| Janela de alerta | Dias antes da previsão (90, 60, 30 ou 15) que dispara o alerta; configurável por domínio com padrão automático. |
| Varredura de vencimento | `runExpirySweep`: subida + cada 60 min; varre `forecast_date` dos domínios ativos e emite as janelas atingidas. |
| Dedup de alerta | Chave idempotente (contrato + janela) gravada antes do envio; impede reenvio em varreduras repetidas. |

## Clarifications

- **Q1 — Colisão com `runDueSweep`?** Nova varredura = `runExpirySweep` (serviço separado); tarefas FR-017 intactas. (Recomendado; runDueSweep existente é SMTP-gated de tarefas.)
- **Q2 — Janelas por domínio onde?** Coluna nullable `alert_windows` (TEXT, JSON) em `domains` (banco de plataforma); NULL = `[90,60,30,15]`. (Recomendado; leitura única por passo; E005 lê via endpoint.)
- **Q3 — DDL de `alert_events`?** Inglês: `contract_id`, `window_days`, `email_status` ('sent','failed','skipped'), `created_at`; `UNIQUE(contract_id, window_days)`. (Recomendado; convenção + precedente purposes.)
- **Q4 — Disparo manual da varredura?** `POST /api/alerts/sweep` admin + `scopeDomain`, além do agendador; E005 faz os endpoints de leitura. (Recomendado; demo exige sob demanda.)

## Stress-Test Findings

Nenhum finding — quatro passagens sem achados. Migração preguiçosa consistente com o boot (sweep abre domain DB via `getDomainDb` → `migrateSchema`); processo único documentado; timeout 5 s e domínio suspenso cobertos.

## Compliance Check

- **PASS** — Convenções: `product`/E004/`{PRD:CAP-004}`/clarified; seções completas; FR-001..006 → US1/US2/US3 (P1); SC-001..005; 0 marcadores; rastreável ao PRD.
