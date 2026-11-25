---
feature_branch: "00025-regua-de-notificacao-configuravel"
created: "2026-11-24"
input: "Wave 14 — E023 (régua de notificação configurável; P2 da pesquisa nov/2026)"
spec_type: "product"
spec_maturity: "clarified"
epic_id: "E023"
epic_sources: "specs/plan/E023.md; CAP-004; pesquisa nov/2026"
---

# Feature Specification: Régua de notificação configurável

**Feature Branch**: `00025-regua-de-notificacao-configuravel` · **Created**: 2026-11-24 · **Status**: Draft · **Spec Type**: product · **Spec Maturity**: clarified · **Epic ID**: E023 · **Product Document**: specs/prd.md

## Problem Statement

E004 entrega um alerta por janela fixa e E010 acrescenta e-mail opt-in, mas nenhum domínio define quantos lembretes um evento recebe nem em quais momentos. Administradores e gestores ficam presos ao padrão 90/60/30/15, sem ajuste por tipo de evento. O time recebe avisos em excesso ou tarde demais e perde prazo de renovação.

## Scope

### Included

- Régua por domínio/tipo de evento com limite, intervalo e janelas derivadas de E004.
- Criação, ajuste, ativação e desativação por admin e gestor.
- Evento deduplicado por alerta, etapa e canal; canais existentes: aplicativo e e-mail opt-in de E010.
- Leitura no painel com histórico preservado e autor/data da alteração.

### Excluded

- WhatsApp, SMS e push externo — `PDD-008`.
- Novo motor ou substituição das janelas de E004 — régua consome o motor atual.
- Novos tipos de evento, reajuste por índice, app mobile e escopo regulado — fora do E023.
- Desempenho por prestador, checklist e itens P3 — outras waves.

### Edge Cases & Boundaries

- Sem régua ativa, valem E004 e E010.
- Janela 7 exige janela ativa no domínio; a régua não cria janela.
- Etapas além das janelas são recusadas sem gravação parcial.
- Verificação repetida não duplica evento nem e-mail.
- Ajuste ou desativação afeta só lembretes não emitidos.
- Sem `SMTP_*`, o aviso interno segue ativo.

## User Scenarios & Testing

### User Story 1 - Configurar a régua de lembretes (Priority: P1)

Admin ou gestor define até cinco lembretes, intervalo em dias e ativação por domínio e tipo de evento, a partir das janelas de E004.

**Why this priority**: Sem configuração, a frequência fica fixa.

**Independent Test**: Configurar 30, 15 e 7 dias e reler no painel.

**Acceptance Scenarios**:

1. **Given** janelas 30, 15 e 7 ativas, **When** admin salva três lembretes com intervalo 7, **Then** a régua fica ativa e mostra as três janelas.
2. **Given** limite, intervalo, tipo ou janela inválidos, **When** admin salva, **Then** a gravação é recusada sem gravação parcial.

### User Story 2 - Emitir lembretes deduplicados (Priority: P1)

Cada etapa chega uma vez no aplicativo e, se habilitado, por e-mail.

**Why this priority**: Evita ruído e garante os canais suportados.

**Independent Test**: Rodar duas verificações com três etapas e conferir os eventos.

**Acceptance Scenarios**:

1. **Given** três etapas e e-mail habilitado, **When** a verificação atinge as janelas, **Then** há um aviso e um e-mail por etapa, com identidades distintas.
2. **Given** verificação repetida, **When** o motor roda de novo, **Then** não há aviso ou e-mail extra.
3. **Given** e-mail ausente ou falho, **When** a etapa é atingida, **Then** o aviso interno continua e nada falha por isso.

### User Story 3 - Acompanhar e preservar eventos (Priority: P1)

Admin ou gestor vê os lembretes emitidos e os mantém após ajuste ou desativação.

**Why this priority**: A trilha do que foi comunicado não pode ser apagada.

**Independent Test**: Desativar após duas etapas e conferir os eventos originais.

**Acceptance Scenarios**:

1. **Given** dois lembretes emitidos, **When** admin altera o limite, **Then** os eventos mantêm dados originais.
2. **Given** régua desativada, **When** gestor abre o painel, **Then** eventos antigos aparecem e nenhum novo é gerado.

### User Story 4 - Registrar autoria da régua (Priority: P2)

Admin vê quem alterou a régua e quando.

**Why this priority**: Dá rastreabilidade; o MVP funciona sem isso.

**Independent Test**: Criar, ajustar e desativar; verificar autor e data.

**Acceptance Scenarios**:

1. **Given** gestor autenticado, **When** cria, ajusta ou desativa, **Then** autor e data são registrados.
2. **Given** admin abre a configuração, **When** consulta o histórico, **Then** vê autor e data das alterações.

## Requirements

- **FR-105** [US1]: Admin e gestor MUST criar e atualizar uma régua ativa por domínio e tipo de evento, com limite de lembretes, intervalo em dias e ativação.
- **FR-106** [US1]: O sistema MUST derivar janelas efetivas das janelas ativas de E004, começando pela menor e somando janelas maiores só quando o intervalo é respeitado.
- **FR-107** [US1]: O sistema MUST recusar sem lembretes, mais de cinco lembretes, intervalo não positivo, tipo desconhecido ou janelas insuficientes, sem gravação parcial.
- **FR-108** [US2]: Cada lembrete MUST ser evento distinto por alerta, etapa e canal, com dedup de E004 em verificações repetidas.
- **FR-109** [US2]: A entrega MUST usar só aviso no aplicativo e e-mail opt-in de E010, mantendo o aviso interno se o e-mail falhar.
- **FR-110** [US2]: Verificação repetida ou mudança posterior MUST não gerar aviso ou e-mail duplicado.
- **FR-111** [US2]: Mudanças MUST valer só para lembretes não emitidos; a régua lida no início da verificação vale até o fim dela.
- **FR-112** [US3]: O painel MUST mostrar lembretes emitidos com tipo de evento, etapa/janela e situação por canal para admin e gestor.
- **FR-113** [US3]: Editar ou desativar a régua MUST preservar eventos já emitidos.
- **FR-114** [US3]: Domínios sem régua ativa MUST manter o comportamento de E004 e E010.
- **FR-115** [US4]: O sistema MUST registrar autor e data na criação, ajuste e desativação, visíveis para admin e gestor.

### Key Entities

- **Régua de notificação**: configuração por domínio e tipo de evento com limite de lembretes, intervalo, estado ativo e autoria da alteração.
- **Etapa da régua**: posição de um lembrete dentro da régua, associada a uma janela efetiva derivada de E004.
- **Evento de lembrete**: registro de emissão identificável por alerta, etapa e canal, usado para deduplicação e trilha no painel.

## Clarifications

### Session 2026-11-24

- Q: Qual é o limite de etapas por régua? -> A: Cinco lembretes, desde que existam cinco janelas ativas no domínio.
- Q: Como as janelas efetivas são escolhidas? -> A: Da menor janela ativa para a maior, acrescentando janelas só quando o intervalo é respeitado.
- Q: Uma mudança de régua vale na verificação em andamento? -> A: Não; a configuração lida no início vale até o fim da verificação, e a mudança vale na próxima.

## Assumptions & Risks

### Assumptions

- Janelas de E004 são a origem das datas; admin pode ajustá-las em E005.
- Opt-in de E010 é a única condição de envio de e-mail nesta entrega.
- Papéis admin e gestor de E001 bastam para gerenciar a régua.
- Tipo inicial é o alerta de vigência de E004; novos tipos exigem detector próprio.
- Domínios sem configuração mantêm o comportamento atual, sem migração pelo usuário.

### Risks

- **Régua e janelas divergentes** *(likelihood: medium, impact: high)*: etapas podem não existir; mitigar derivando janelas e recusando combinações impossíveis.
- **Duplicação entre canais e etapas** *(likelihood: medium, impact: high)*: mitigar com identidade estável por alerta, etapa e canal.
- **Reenvio de histórico** *(likelihood: low, impact: high)*: mitigar congelando eventos já emitidos.

## Implementation Signals

- `NEW-ENTITY` — configuração de régua por domínio e tipo de evento, com autoria e data da alteração.
- `NEW-API` — criação, atualização, desativação e consulta da régua, com guards de administrador e gestor.
- `NEW-UI` — formulário e leitura da régua no painel de próximos vencimentos.
- `MIGRATION` — ampliação da identidade dos eventos de alerta com etapa e canal, preservando registros existentes.
- `NEW-CONFIG` — limites padrão de etapas e intervalo.

## Success Criteria

SC-001 [US1]: Admin e gestor configuram até cinco lembretes quando há cinco janelas ativas e relêm as mesmas janelas efetivas.

SC-002 [US1]: Configurações inválidas são recusadas sem alteração parcial em toda tentativa de teste.

SC-003 [US2]: Com três etapas e e-mail habilitado, cada etapa gera um aviso no painel e um e-mail, e duas verificações extras não criam avisos nem e-mails adicionais.

SC-004 [US2]: Sem e-mail habilitado, todas as etapas seguem visíveis no painel e nenhuma operação falha por causa do e-mail.

SC-005 [US3]: Após editar ou desativar, 100% dos eventos emitidos permanecem no painel com etapa e canal originais.

SC-006 [US4]: Cada criação, ajuste e desativação exibe autor e data na próxima leitura.

## Glossary

| Term | Definition |
|------|------------|
| Régua | Lembretes configurados por domínio e tipo de evento. |
| Etapa | Posição do lembrete ligada a uma janela efetiva. |
| Janela efetiva | Janela de E004 usada pela etapa. |
| Evento de lembrete | Emissão de etapa em canal, usada para dedup e trilha. |

## Stress-Test Findings

### Session 2026-11-24

STF-001: [cross-requirement-contradiction] (HIGH) — Affected: FR-107, SC-001 — Limite de cinco lembretes depende de cinco janelas ativas

STF-002: [concurrent-trigger-ambiguity] (HIGH) — Affected: FR-108, FR-111 — Mudança no meio da verificação pode alterar etapas em emissão

## Compliance Check

### Instructions Check Report

**Target**: spec.md · **Status**: PASS

| Principle | Verdict | Notes |
|---|---|---|
| I. Development On `dev` | N/A | spec only |
| II. Test-Gated Promotion | PASS | testável |
| III. Session TODO Intake | N/A | lido |
| IV. Agent Output Style | PASS | limites ok |
| Technology Stack | PASS | stack atual |
| Testing & Quality Policy | PASS | verificável |
| Source Code Layout | PASS | layout ok |
| Development Workflow | PASS | sem commit |
| Governance | PASS | sem release docs |

**Violations**: none
