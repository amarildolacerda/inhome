---
feature_branch: "00019-dashboard-indicadores-de-contrato-perpetuo"
created: "2026-11-04"
input: "Dashboard indicadores de contrato perpetuo concluido e tarefas atrasadas"
spec_type: "product"
spec_maturity: "clarified"
epic_id: "E017"
epic_sources: "{PRD:CAP-002,CAP-004,CAP-005}"
---

# Feature Specification: Indicadores de perpétuo, conclusão e tarefas atrasadas no painel de contratos

**Feature Branch**: `00019-dashboard-indicadores-de-contrato-perpetuo`
**Created**: 2026-11-04
**Status**: Clarified
**Spec Type**: product
**Spec Maturity**: clarified
**Product Document**: specs/prd.md

## Problem Statement

O painel trata contrato sem previsão como "Incompleto", inclusive o perpétuo, sem fim previsto. O card não mostra se o trabalho terminou nem se há tarefas vencidas; sem isso o gestor confunde cadastro incompleto com vigência indefinida e só descobre atraso contrato a contrato.

## Scope

### Included

- Marcação de perpétuo no cadastro/edição, com previsão opcional.
- Marcador "Perpétuo" no card e exclusão de perpétuos de "sem previsão".
- Indicador de conclusão pelas tarefas concluídas.
- Contagem textual de tarefas vencidas e contagens por contrato no payload de `GET /api/v2/dashboard/stats`.

### Excluded

- Status novo de contrato — o ciclo de E002 permanece.
- Lista de tarefas no card — o detalhe do contrato é a execução (E003).
- Dados financeiros e tipo de contrato — fora do modelo (E013).
- Recorrência de tarefas — perpétuo descreve o contrato.
- Escala e latência do payload do dashboard — fora do escopo.

### Edge Cases & Boundaries

- Perpétuo com previsão preenchida: o marcador manda; a data é ignorada.
- Sem tarefas: não exibe "Concluído" (exige ao menos uma e todas concluídas).
- Encerrado com tarefas abertas vencidas: mantém "Encerrado" e sinaliza atraso; sem vencidas, nenhum marcador.
- Domínio sem contratos: estado vazio preservado; o painel não exibe cards nem marcadores.
- Tarefa concluída com `due_date` passado não conta como atrasada.

## User Scenarios & Testing

### User Story 1 - Identificar contrato perpétuo (Priority: P1)

Como gestor, marco o contrato como perpétuo sem término previsto e no painel vejo "Perpétuo" em vez de "Incompleto".

**Why this priority**: vigência indefinida não é cadastro incompleto.

**Independent Test**: perpétuo sem previsão mostra "Perpétuo", sem "Incompleto".

**Acceptance Scenarios**:

1. **Given** o formulário, **When** o gestor liga "Contrato perpétuo" e salva sem previsão, **Then** o contrato é aceito como perpétuo.
2. **Given** um perpétuo no domínio, **When** o painel renderiza, **Then** o card exibe "Perpétuo" e nenhum marcador de incompleto.

### User Story 2 - Ver conclusão do trabalho do contrato (Priority: P1)

Como gestor, vejo no card quando todas as tarefas do contrato foram concluídas, sem abri-lo.

**Why this priority**: responde "o contrato já terminou?" sem abri-lo.

**Independent Test**: 3 tarefas concluídas → "Concluído"; 2 de 3 → não.

**Acceptance Scenarios**:

1. **Given** contrato com todas as tarefas concluídas, **When** o painel renderiza, **Then** o card exibe "Concluído".
2. **Given** contrato encerrado com todas as tarefas concluídas, **When** o painel renderiza, **Then** "Concluído" e "Encerrado" coexistem.

### User Story 3 - Enxergar tarefas atrasadas por contrato (Priority: P2)

Como gestor, vejo no card quantas tarefas abertas passaram do prazo, com sinal além da cor.

**Why this priority**: aprofunda o MVP sem bloqueá-lo.

**Independent Test**: 2 vencidas → "2 tarefas atrasadas"; sem vencidas → nada.

**Acceptance Scenarios**:

1. **Given** tarefas abertas com `due_date` anterior a hoje, **When** o painel renderiza, **Then** o card exibe a contagem com ícone e texto.
2. **Given** contrato sem vencidas, **When** o painel renderiza, **Then** não há marcador de atraso.

## Requirements

### Functional Requirements

- **FR-069** [US1]: Sistema MUST permitir marcar/desmarcar perpétuo no cadastro e edição; previsão opcional só com marcador ativo.
- **FR-070** [US1]: API MUST expor `perpetual` no contrato e em cada item de `contracts` de `GET /api/v2/dashboard/stats`; sem endpoint novo: os endpoints existentes absorvem a feature (`GET /api/v2/dashboard/stats`, `POST`/`PUT /api/v2/contracts`, `GET /api/v2/contracts?status=`, `GET /api/v2/alerts/panel`).
- **FR-071** [US1]: Painel MUST exibir "Perpétuo" no card.
- **FR-072** [US1]: Todos os derivadores de "incompleto", incluindo (card, lista "Sem previsão", KPI "A vencer", E005) MUST excluir perpétuos.
- **FR-073** [US1]: Contrato perpétuo MUST ser ignorado em atraso e "a vencer", mesmo com `forecast_date` preenchida; `tasks_overdue` segue contando suas tarefas vencidas.
- **FR-074** [US2]: Painel MUST exibir "Concluído" no card quando há ao menos uma tarefa e todas estão concluídas.
- **FR-075** [US2]: Indicador de conclusão MUST ser distinto de "Encerrado" e MUST NOT substituir o chip de status.
- **FR-076** [US3]: Cada item de `contracts` MUST expor `tasks_total`, `tasks_done` e `tasks_overdue` (iguais para todo papel); atrasada é não concluída com `due_date` anterior a hoje, em UTC.
- **FR-077** [US3]: Card MUST exibir "N tarefa(s) atrasada(s)" com ícone, texto e rótulo acessível (nome acessível igual ao texto visível) quando `tasks_overdue` > 0, e nada quando for 0.
- **FR-078** [US3]: Faixa de KPIs MUST exibir bloco de tarefas atrasadas com o `tasksOverdue` servido no escopo do papel, oculto quando for 0; escopo próprio pode diferir da soma dos cards, sem reconciliação exigida.
- **FR-079** [US3]: Marcadores de perpétuo, conclusão e atraso MUST usar texto além de cor, com contraste nos dois temas.

### Key Entities

- **Contrato**: `perpetual` (novo), `forecast_date` (opcional quando perpétuo), `status`.
- **Tarefa**: `status`, `due_date`, `contract_id` — base das contagens.
- **Painel**: `GET /api/v2/dashboard/stats` (`stats` e `contracts`).

## Assumptions & Risks

### Assumptions

- O marcador perpétuo é a autoridade sobre `forecast_date`; data preenchida persiste e é ignorada.
- Contagens por contrato saem da tabela `tasks` existente.
- Card segue o conjunto de E013; excluir perpétuos de "sem previsão" (E005) cobre o caso.
- Formulário aceita controle booleano sem redesenho.
- Migração aditiva sem backfill: linhas pré-existentes ficam com `perpetual = 0` até a marcação manual do gestor.

### Risks

- Perpétuo vazar para listas de incompletos e KPIs de vencimento *(likelihood: medium, impact: high)*: excluir perpétuos do cálculo de vencimento e de incompletos no nível do contrato; `tasks_overdue` por contrato permanece.
- Excesso de marcadores no card *(likelihood: medium, impact: low)*: limitar os sinais novos a perpétuo, atraso e conclusão, preservando os já existentes.

## Implementation Signals

- `MIGRATION`: campo booleano de perpétuo em `contracts`, com guarda idempotente.
- `NEW-API`: campos novos no payload do dashboard.
- `NEW-UI`: marcadores no card, controle "Contrato perpétuo" e bloco de KPI.

## Success Criteria

SC-014 [US1]: Perpétuo sem previsão é salvo; o card mostra "Perpétuo" sem "Incompleto"/"Sem previsão" e o payload traz `perpetual` por contrato.
SC-015 [US1]: Com dados dos dois tipos, nenhum perpétuo aparece em "Sem previsão", no KPI "A vencer" nem em outro derivador de incompleto.
SC-016 [US2]: Contrato com todas as tarefas concluídas exibe "Concluído"; com tarefa aberta, não exibe.
SC-017 [US3]: Duas tarefas abertas vencidas → "2 tarefas atrasadas"; sem vencidas, nenhum marcador; `tasks_total`/`tasks_done` refletem o contrato e perpétuo mantém `tasks_overdue` > 0.
SC-018 [US3]: Com `tasksOverdue` > 0 a faixa mostra o mesmo valor do backend; com 0, o bloco de tarefas atrasadas não aparece.
SC-019 [US2]: Contrato encerrado com todas as tarefas concluídas exibe "Concluído" e mantém o chip "Encerrado".
SC-020 [US3]: Marcadores usam texto além de cor com contraste mínimo 4,5:1 nos dois temas.

## Glossary

| Termo | Significado |
|-------|-------------|
| Perpétuo | Contrato sem término previsto por natureza. |
| Concluído | Todas as tarefas no status "Concluída"; `tasks_done` conta só esse status. |
| Tarefa atrasada | Não concluída com `due_date` já passado. |
| Incompleto / Sem previsão | Contrato não perpétuo sem `forecast_date` (FR-072). |
| A vencer | Janela de alerta do domínio (E005) sobre `forecast_date` futura (definição inalterada); perpétuo fica de fora (FR-072/FR-073). |

## Clarifications

### Session 2026-11-06

- Q: Atraso de FR-073 ignora o quê? -> A: só o nível do contrato; `tasks_overdue` segue contando.
- Q: Contagens por contrato mudam por papel? -> A: não — mesmo valor; o KPI usa o servido.
- Q: Quem exclui perpétuo de "sem previsão"? -> A: qualquer derivador de "incompleto".
- Q: Migração preenche `perpetual`? -> A: não — marcação manual do gestor.
- Q: Qual "hoje" conta atraso? -> A: data em UTC, como o backend.

## Stress-Test Findings

### Session 2026-11-06

STF-001: [cross-requirement-contradiction] (HIGH) — Affected: FR-069, FR-073 — Persistência de forecast_date em perpétuo conflita: gravação vazia vs data preenchida ignorada.
STF-002: [boundary-scale-stress] (MEDIUM) — Affected: FR-074, FR-076, SC-016 — Glossário não enumera quais status de tarefa contam como concluída.
STF-003: [cross-requirement-contradiction] (MEDIUM) — Affected: FR-076, FR-078, SC-018 — KPI de atraso com escopo por papel diverge da soma dos cards sem regra de reconciliação.
STF-004: [boundary-scale-stress] (MEDIUM) — Affected: FR-078, SC-018 — Estado zero do bloco KPI de tarefas atrasadas indefinido.
STF-005: [boundary-scale-stress] (MEDIUM) — Affected: FR-070, FR-076 — Contagens por contrato sem teto de escala nem orçamento de latência.

## Compliance Check

**Instructions Check (2026-11-07): PASS** — I `dev` PASS · II/III N/A · IV style · stack/layout/testing/gate PASS · README/TECHNICAL N/A · FR-069..079 / SC-014..020 / STF-001..005 únicos · toda história P1 tem SC · 0 markers · 5/5 STFs resolvidos. **Violations**: none.
