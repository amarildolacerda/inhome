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
**Status**: Draft
**Spec Type**: product
**Spec Maturity**: clarified
**Product Document**: specs/prd.md

## Problem Statement

O painel trata todo contrato sem previsão de finalização como "Incompleto", inclusive o perpétuo, que não tem término por natureza. O card não informa se o trabalho terminou nem se há tarefas vencidas. Sem esses sinais o gestor confunde cadastro faltando com vigência indefinida e só descobre atraso contrato a contrato.

## Scope

### Included

- Marcação de contrato perpétuo no cadastro e edição, com previsão de finalização opcional.
- Marcador "Perpétuo" no card e exclusão de perpétuos das listas de "sem previsão".
- Indicador de conclusão do contrato, derivado das tarefas concluídas.
- Sinal por contrato para tarefas abertas vencidas, com contagem e rótulo textual.
- Contagens por contrato no payload de `GET /api/v2/dashboard/stats`.

### Excluded

- Status novo persistido de contrato — o ciclo vigente/atrasado/encerrado de E002 permanece.
- Lista de tarefas no card — o detalhe do contrato segue sendo o lugar da execução (E003).
- Dados financeiros e tipo de contrato — fora do modelo (E013).
- Recorrência automática de tarefas — perpétuo descreve o contrato, não a tarefa.
- Limites de escala e orçamento de latência do payload do dashboard — fora do escopo desta feature.

### Edge Cases & Boundaries

- Perpétuo com previsão preenchida: o marcador manda; a data é ignorada.
- Sem tarefas: não exibe "Concluído" (exige ao menos uma, todas concluídas).
- Encerrado com tarefas abertas: mantém "Encerrado" e continua sinalizando atraso.
- Domínio sem contratos: estado vazio preservado, sem marcador quebrado.
- Tarefa concluída com `due_date` passado não conta como atrasada.

## User Scenarios & Testing

### User Story 1 - Identificar contrato perpétuo (Priority: P1)

Como gestor, marco o contrato como perpétuo sem término previsto e, no painel, vejo "Perpétuo" em vez de "Incompleto".

**Why this priority**: corrige leitura errada de dado existente: vigência indefinida não é cadastro incompleto.

**Independent Test**: perpétuo sem previsão mostra "Perpétuo", sem "Incompleto".

**Acceptance Scenarios**:

1. **Given** o formulário, **When** o gestor liga "Contrato perpétuo" e salva sem previsão, **Then** o contrato é aceito como perpétuo.
2. **Given** um perpétuo no domínio, **When** o painel renderiza, **Then** o card exibe "Perpétuo" e nenhum marcador de incompleto.

### User Story 2 - Ver conclusão do trabalho do contrato (Priority: P1)

Como gestor, vejo no card quando todas as tarefas do contrato foram concluídas, sem abri-lo.

**Why this priority**: responde "este contrato já terminou?" sem abrir o contrato.

**Independent Test**: 3 tarefas concluídas → "Concluído"; 2 de 3 → não.

**Acceptance Scenarios**:

1. **Given** contrato com todas as tarefas concluídas, **When** o painel renderiza, **Then** o card exibe "Concluído".
2. **Given** contrato encerrado com todas as tarefas concluídas, **When** o painel renderiza, **Then** "Concluído" e "Encerrado" coexistem.

### User Story 3 - Enxergar tarefas atrasadas por contrato (Priority: P2)

Como gestor, vejo no card quantas tarefas abertas passaram do prazo, com sinal além da cor.

**Why this priority**: P2 — aprofunda a priorização sem bloquear o MVP.

**Independent Test**: 2 vencidas → "2 tarefas atrasadas"; sem vencidas → nada.

**Acceptance Scenarios**:

1. **Given** contrato com tarefas abertas de `due_date` anterior a hoje, **When** o painel renderiza, **Then** o card exibe a contagem com ícone e texto.
2. **Given** contrato sem vencidas, **When** o painel renderiza, **Then** não há marcador de atraso.

## Requirements

### Functional Requirements

- **FR-069** [US1]: Sistema MUST permitir marcar/desmarcar perpétuo no cadastro e na edição; previsão só opcional com marcador ativo.
- **FR-070** [US1]: API MUST expor `perpetual` no contrato e em cada item de `contracts` de `GET /api/v2/dashboard/stats`, sem novo endpoint.
- **FR-071** [US1]: Painel MUST exibir marcador "Perpétuo" no card e MUST NOT exibir "Incompleto" nem "Sem previsão" para perpétuo.
- **FR-072** [US1]: Toda lista de "sem previsão" MUST excluir perpétuos, com predicado compartilhado em todo derivador de "incompleto" via `forecast_date`.
- **FR-073** [US1]: Contrato perpétuo MUST ser ignorado no cálculo de atraso e de "a vencer" (nível do contrato), mesmo com `forecast_date` preenchida; `tasks_overdue` segue contando suas tarefas vencidas.
- **FR-074** [US2]: Painel MUST exibir "Concluído" no card quando há ao menos uma tarefa e todas estão concluídas.
- **FR-075** [US2]: Indicador de conclusão MUST ser distinto de "Encerrado" e MUST NOT substituir o chip de status.
- **FR-076** [US3]: Cada item de `contracts` MUST expor `tasks_total`, `tasks_done` e `tasks_overdue` (por contrato, iguais para todo papel), contando atrasada só tarefa não concluída com `due_date` anterior a hoje, em UTC.
- **FR-077** [US3]: Card MUST exibir "N tarefa(s) atrasada(s)" com ícone e texto quando `tasks_overdue` > 0, e nada quando for 0.
- **FR-078** [US3]: Faixa de KPIs MUST exibir bloco de tarefas atrasadas com o `tasksOverdue` já servido (escopo por papel atual), oculto quando for 0; escopo próprio pode diferir da soma dos cards, sem reconciliação exigida.
- **FR-079** [US3]: Marcadores de perpétuo, conclusão e atraso MUST usar texto além de cor, com contraste nos dois temas.

### Key Entities

- **Contrato**: `perpetual` (novo), `forecast_date` (opcional quando perpétuo), `status` e `effective_status`.
- **Tarefa**: `status`, `due_date` e `contract_id`; base das contagens por contrato.
- **Painel**: `GET /api/v2/dashboard/stats` com `stats` agregados e `contracts` por linha.

## Assumptions & Risks

### Assumptions

- `forecast_date` continua `NOT NULL`; vazio grava '', data preenchida persiste e é ignorada pelos derivadores; o marcador é a autoridade.
- Contagens por contrato saem da tabela `tasks` existente, sem tabela nova.
- Card segue o conjunto servido (E013); excluir perpétuos na "sem previsão" de E005 cobre o caso.
- Formulário aceita controle booleano sem redesenho da tela.
- Migração não faz backfill de `perpetual`; marcação manual do gestor.

### Risks

- Perpétuo vazar para listas de incompletos e KPIs de vencimento *(likelihood: medium, impact: high)*: exclusão explícita em `isAVencer`, `isOverdue` e na consulta de "sem previsão".
- Excesso de marcadores no card *(likelihood: medium, impact: low)*: limitar a três sinais (status, perpétuo, atraso, conclusão).

## Implementation Signals

- `MIGRATION`: coluna `perpetual INTEGER NOT NULL DEFAULT 0` em `contracts` com guarda idempotente.
- `NEW-API`: campos `perpetual`, `tasks_total`, `tasks_done`, `tasks_overdue` no payload do dashboard.
- `NEW-UI`: marcadores no card, controle "Contrato perpétuo" no formulário e bloco de KPI de tarefas atrasadas.

## Success Criteria

SC-014 [US1]: Contrato perpétuo sem previsão é salvo; o card mostra "Perpétuo" sem "Incompleto" nem "Sem previsão".
SC-015 [US1]: Com dados dos dois tipos, nenhum perpétuo aparece em "Sem previsão" nem no KPI "A vencer".
SC-016 [US2]: Contrato com todas as tarefas concluídas exibe "Concluído"; com tarefa aberta, não exibe.
SC-017 [US3]: Contrato com duas tarefas abertas vencidas exibe "2 tarefas atrasadas"; sem vencidas, nenhum marcador.
SC-018 [US3]: Faixa de KPIs mostra tarefas atrasadas igual ao `tasksOverdue` do backend.
SC-019 [US2]: Contrato encerrado com todas as tarefas concluídas exibe "Concluído" e mantém o chip "Encerrado".
SC-020 [US3]: Marcadores de perpétuo, conclusão e atraso usam texto além de cor com contraste mínimo 4,5:1 nos dois temas.

## Glossary

| Termo | Significado |
|-------|-------------|
| Perpétuo | Contrato sem data de término por natureza, não por cadastro incompleto. |
| Concluído | Todas as tarefas no status "Concluída"; `tasks_done` conta só esse status. |
| Tarefa atrasada | Não concluída com `due_date` já passado. |

## Clarifications

### Session 2026-11-06

- Q: O que o "atraso" de FR-073 ignora? -> A: só o nível do contrato; `tasks_overdue` segue contando.
- Q: Contagens por contrato respeitam papel? -> A: não — mesmo valor para todo papel; KPI usa o servido.
- Q: Quem exclui perpétuo de "sem previsão"? -> A: todo derivador de "incompleto" via `forecast_date`, predicado compartilhado.
- Q: Migração preenche `perpetual`? -> A: não — marcação manual pelo gestor.
- Q: Qual "hoje" conta atraso? -> A: data em UTC, igual ao backend existente.

## Stress-Test Findings

### Session 2026-11-06

STF-001: [cross-requirement-contradiction] (HIGH) — Affected: FR-069, FR-073 — Persistência de forecast_date em perpétuo conflita: gravação vazia vs data preenchida ignorada.
STF-002: [boundary-scale-stress] (MEDIUM) — Affected: FR-074, FR-076, SC-016 — Glossário não enumera quais status de tarefa contam como concluída.
STF-003: [cross-requirement-contradiction] (MEDIUM) — Affected: FR-076, FR-078, SC-018 — KPI de atraso com escopo por papel diverge da soma dos cards sem regra de reconciliação.
STF-004: [boundary-scale-stress] (MEDIUM) — Affected: FR-078, SC-018 — Estado zero do bloco KPI de tarefas atrasadas indefinido.
STF-005: [boundary-scale-stress] (MEDIUM) — Affected: FR-070, FR-076 — Contagens por contrato sem teto de escala nem orçamento de latência.

## Compliance Check

### Instructions Check Report

**Target**: spec.md — **Status**: PASS

I `dev` PASS · II N/A · III N/A · IV style PASS · stack/layout/testing PASS · gate PASS · README/TECHNICAL N/A. **Violations**: none.
