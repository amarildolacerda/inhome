---
feature_branch: "00024-agenda-de-manutencao-preventiva-recorrente"
created: "2026-11-24"
input: "Wave 13 — E022 (agenda de manutenção preventiva recorrente; P2 da pesquisa nov/2026)"
spec_type: "product"
spec_maturity: "clarified"
epic_id: "E022"
epic_sources: "{specs/plan/E022.md; CAP-003; CAP-004; pesquisa nov/2026}"
---

# Spec: Agenda de manutenção preventiva recorrente

**Feature Branch**: `00024-agenda-de-manutencao-preventiva-recorrente` · **Created**: 2026-11-24 · **Spec Type**: product · **Spec Maturity**: clarified · **Epic ID**: E022

## Problem Statement

E012 registra a execução da manutenção, mas não guarda recorrência nem avisa a próxima visita: a preventiva depende da memória de quem coordena o contrato. Vencida a data, vira corretiva e o atraso só aparece no relatório. O sistema deve gerar a próxima tarefa na data certa, com responsável e aviso.

## Scope

### Included

- Regra por contrato: título, intervalo, início, responsável e antecedência.
- Cadastro, edição, consulta e inativação por admin e gestor.
- Uma tarefa por ocorrência em grade fixa ancorada no início.
- Chave estável por regra e data; varredura idempotente no backend.
- Alerta no painel de E004 com dedup por contrato, origem e janela.
- Auditoria da regra; tarefas geradas sobrevivem ao cancelamento.
- Lista de regras e tarefas no detalhe do contrato.

### Excluded

- WhatsApp, reajuste e mobile — dependem de `PDD-008`.
- Ativos, horímetro, sensores e ordens externas — fora de escopo.
- Checklist (R10), nota (R9) e reagendamento por conclusão — fora da épica.
- Gerar o ano inteiro — a janela de 90 dias limita a fila.

### Edge Cases & Boundaries

- Só ocorrências de hoje a 90 dias à frente entram na varredura.
- Intervalo 1–365 dias, antecedência 0–90, data ISO `YYYY-MM-DD`.
- Varreduras repetidas ou concorrentes geram uma tarefa por data.
- Sem responsável, tarefa sem atribuição; depois segue E003.
- Editar ou inativar não apaga tarefa, histórico ou alerta.
- Contrato encerrado não gera ocorrência; alertas saem na varredura.
- Tarefa concluída remove alerta e mantém a ocorrência.
- Prestador vê só as próprias tarefas via E003.

## User Scenarios & Testing

### User Story 1 - Configurar agenda de manutenção (Priority: P1)

Como gestor, quero cadastrar e ajustar a recorrência com responsável padrão, sem depender de anotação pessoal.

**Why this priority**: Sem a regra não existe ocorrência a gerar.

**Independent Test**: Cadastrar regra, editar, inativar e conferir autor e data.

**Acceptance Scenarios**:

1. **Given** gestor em contrato vigente, **When** cadastra título, intervalo, início e responsável, **Then** a regra fica ativa.
2. **Given** regra ativa, **When** o gestor altera intervalo ou responsável, **Then** registra autor e data sem apagar tarefas.
3. **Given** regra ativa, **When** inativada, **Then** sai das ativas e não gera novas ocorrências.
4. **Given** prestador ou visitante, **When** tenta criar ou editar, **Then** a API responde 403 sem gravar.

### User Story 2 - Gerar tarefas recorrentes sem duplicata (Priority: P1)

Como gestor, quero cada data da agenda virar uma tarefa única no contrato, com antecedência para executar.

**Why this priority**: A geração automática é a promessa da épica; duplicatas destroem a confiança no painel.

**Independent Test**: Rodar a varredura duas vezes e confirmar uma tarefa com responsável e vencimento corretos.

**Acceptance Scenarios**:

1. **Given** ocorrência a 15 dias, **When** a varredura roda, **Then** nasce tarefa `A Fazer` com responsável e data.
2. **Given** tarefa já gerada, **When** a varredura roda de novo, **Then** não há tarefa nova e o contador de ignoradas sobe.
3. **Given** ocorrência a 91 dias ou passada, **When** a varredura roda, **Then** ela é ignorada sem tarefa.
4. **Given** regra inativada após a geração, **When** a varredura roda, **Then** tarefa e histórico permanecem.

### User Story 3 - Alertar o vencimento da manutenção gerada (Priority: P1)

Como gestor, quero ver no painel a manutenção perto de vencer, sem repetição, para agir antes da visita.

**Why this priority**: O aviso antecedente torna a tarefa prevenção efetiva no painel já usado.

**Independent Test**: Rodar a varredura duas vezes, conferir um alerta `maintenance_schedule` e sua remoção após conclusão.

**Acceptance Scenarios**:

1. **Given** tarefa dentro de janela do domínio, **When** a varredura roda, **Then** o painel mostra alerta com título e data.
2. **Given** varredura repetida, **When** o painel é consultado, **Then** não há alerta duplicado.
3. **Given** tarefa concluída, **When** a varredura seguinte roda, **Then** o alerta é removido e a ocorrência permanece.

### User Story 4 - Acompanhar a agenda no contrato (Priority: P2)

Como gestor, quero ver regras e tarefas geradas no detalhe do contrato.

**Why this priority**: Reduz conferência; valor principal está nas P1.

**Independent Test**: Abrir detalhe e conferir as duas listas.

**Acceptance Scenarios**:

1. **Given** contrato com regras, **When** o gestor abre o detalhe, **Then** vê ativas e inativas com intervalo e responsável.
2. **Given** ocorrências geradas, **When** o detalhe é aberto, **Then** as tarefas aparecem com data, status e responsável.

## Requirements

### Functional Requirements

- **FR-092** [US1]: o domínio MUST criar, listar, editar e inativar regras por contrato; escrita só para admin/gestor.
- **FR-093** [US1]: o cadastro MUST exigir contrato vigente, título, intervalo 1–365, início ISO e antecedência 0–90; responsável opcional.
- **FR-094** [US1]: alterações MUST registrar autor e data sem mudar tarefas geradas.
- **FR-095** [US2]: a varredura MUST criar uma tarefa por ocorrência, com chave regra/data.
- **FR-096** [US2]: a varredura MUST ser idempotente, inclusive concorrente, sem segunda tarefa por chave.
- **FR-097** [US2]: a tarefa gerada MUST usar E003 com status `A Fazer`, título, descrição, responsável e data da ocorrência.
- **FR-098** [US2]: a varredura MUST ignorar ocorrências passadas ou além de 90 dias, informando criadas e ignoradas.
- **FR-099** [US2]: editar ou inativar MUST preservar tarefas, histórico e ocorrências.
- **FR-100** [US3]: a varredura MUST inserir alertas `maintenance_schedule` em `extracted_alerts` com janelas do domínio e da regra e dedup tripla.
- **FR-101** [US3]: a varredura MUST remover alertas de tarefa concluída, regra inativada ou contrato encerrado, na transação da geração.
- **FR-102** [US4]: o detalhe do contrato MUST listar regras e tarefas geradas, com escrita apenas para admin e gestor.
- **FR-103** [US1]: rotas MUST exigir auth, escopo `domainId` e papel, com 400 antes de gravar.
- **FR-104** [US2]: acionamento manual para admin/gestor MUST usar o mesmo serviço e transação do sweep.

### Key Entities

- **Regra/Ocorrência**: recorrência por contrato com título do serviço, intervalo, início, responsável, antecedência e auditoria; cada data da grade fixa é uma ocorrência com chave regra/data.
- **Tarefa/Alerta gerados**: tarefa de E003 com origem na agenda, responsável e vencimento, e alerta correspondente no painel de E004.

## Clarifications

### Session 2026-11-24

- Q: contrato ou serviço -> A: regra por contrato com título do serviço.
- Q: ocorrências passadas -> A: ignoradas; apenas hoje a 90 dias.
- Q: conclusão reancora -> A: não; grade fixa.
- Q: responsável obrigatório -> A: opcional; tarefa nasce sem atribuição.
- Q: janelas do alerta -> A: janelas do domínio mais a antecedência da regra.

## Assumptions & Risks

### Assumptions

- Datas ISO `YYYY-MM-DD` usam o mesmo fuso de E004.
- O backend segue executando varreduras no boot e a cada hora.

### Risks

- **Varreduras concorrentes** *(likelihood: medium, impact: high)*: chave única por regra/data evita duplicata.
- **Volume de regras curtas** *(likelihood: medium, impact: medium)*: janela de 90 dias limita a fila.
- **Alerta desatualizado após conclusão** *(likelihood: low, impact: medium)*: sync no mesmo serviço reduz a janela.

## Implementation Signals

- `NEW-ENTITY` — regra e ocorrência com chave estável por domínio.
- `NEW-API` — rotas de regras e acionamento manual da varredura.
- `NEW-UI` — seção de agenda no detalhe do contrato.
- `MIGRATION` — novas tabelas por domínio, sem alterar E003 ou E004.

## Success Criteria

SC-001 [US1]: Gestor cadastra, ajusta e inativa uma agenda mensal em menos de dois minutos, com autor e data registrados.

SC-002 [US2]: Após duas varreduras, cada data tem exatamente uma tarefa com responsável e vencimento corretos, sem duplicata em 30 ocorrências.

SC-003 [US3]: Com aviso de 15 dias, o alerta aparece uma única vez e desaparece após a conclusão da tarefa.

SC-004 [US4]: Gestor confere regras e tarefas geradas do contrato na mesma tela.

## Glossary

| Term | Definition |
|------|------------|
| Regra | Recorrência do contrato: intervalo, início, responsável e antecedência. |
| Ocorrência | Data prevista pela grade fixa, identificada pela par regra/data. |

## Stress-Test Findings

### Session 2026-11-24

STF-001: [concurrent-trigger-ambiguity] (HIGH) — Affected: FR-100, FR-101, FR-104 — Varredura automática e manual podem competir na mesma ocorrência

STF-002: [constraint-impossibility] (HIGH) — Affected: FR-100, SC-003 — Janela customizada sem 15 dias pode impedir o aviso prometido

## Compliance Check

### Instructions Check Report

**Target**: spec.md · **Status**: PASS

| Principle | Verdict | Notes |
|-----------|---------|-------|
| I. Development On `dev` | N/A | sem código nesta fase |
| II. Test-Gated Promotion | PASS | cenários e testes independentes |
| III. Session TODO Intake | N/A | TODO.md lido |
| IV. Agent Output Style | PASS | seções e limites preservados |
| Technology Stack | PASS | stack existente |
| Testing & Quality Policy | PASS | critérios verificáveis |
| Source Code Layout | PASS | sem caminhos novos |
| Development Workflow | PASS | sem commit |
| Governance | PASS | sem alteração de docs de release |

**Violations**: nenhuma.
