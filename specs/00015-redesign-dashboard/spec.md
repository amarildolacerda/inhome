---
feature_branch: "00015-redesign-dashboard"
created: "2026-10-23"
input: "E013 Redesign visual do dashboard — KPIs por status, vencimentos, cards e layout em colunas"
spec_type: "product"
spec_maturity: "draft"
epic_id: "E013"
epic_sources: "{PRD:CAP-004,CAP-005}"
---

# Feature Specification: Redesign visual do dashboard

**Feature Branch**: `00015-redesign-dashboard`
**Created**: 2026-10-23
**Status**: Draft
**Spec Type**: product
**Spec Maturity**: draft
**Epic ID**: E013
**Epic Sources**: {PRD:CAP-004,CAP-005}
**Product Document**: specs/prd.md

## Problem Statement *(mandatory)*

O dashboard de E006 não destaca o que exige ação: as contagens não separam os contratos por status (vigente, atrasado, encerrado), não trazem o vencimento à frente nem o responsável, e a grade não segue o layout em colunas do mockup de referência do usuário (2026-10-23). Todos os dados já existem e são servidos (status de E002, janelas de E005, vínculo de responsável) — falta a camada visual que converta esses dados em prioridade operacional para o gestor.

## Scope *(mandatory)*

### Included

- KPIs no topo com cor por status usando dados já servidos: contratos vigentes, atrasados e encerrados (status de E002), ativos e "a vencer" calculado pelas janelas de vencimento 90/60/30/15 de E005.
- Cards de contrato com data de vencimento e responsável, ordenados por urgência.
- Layout em colunas responsivo via `LayoutBuilder`, com reflow em viewport estreito.
- Filtros e busca no corpo da tela — sem AppBar extra, para não conflitar com a top toolbar do MainShell.
- Extensão de tokens em `frontend/lib/theme/app_theme.dart` (arquivo já existente de E006).

### Excluded

- Dados novos — "tipo de contrato" e valores financeiros não existem no modelo e ficam fora por decisão de 2026-10-23; o redesenho não cria capacidade de dados.
- Dependências novas — `fl_chart` e `responsive_framework` rejeitados; gráficos ficam fora até decisão explícita.
- Construção da top toolbar do MainShell — obra ad-hoc em andamento fora do SDD.
- Capacidade nova de API — só reapresentação dos endpoints já servidos (`GET /api/v2/dashboard/stats`, `GET /api/v2/alerts/panel`); extensão de payload do dashboard existente para expor responsável deriva de relação já existente, sem rota nova nem migração.
- Indicadores por prestador e quadro de execução por contrato — roadmap fora (PDD-003).

### Edge Cases & Boundaries

- Contratos sem previsão de finalização: aparecem como incompletos, sem sumir da visão (semântica de E005).
- Prestador autenticado: mantém a visão restrita às próprias tarefas e contratos vinculados (regra de E006); KPIs de domínio não vazam.
- Domínio sem dados: KPIs zerados e estado vazio, sem cartões quebrados.
- Viewport estreito/amplo: colunas reflow via `LayoutBuilder` sem overflow horizontal.
- Contrato alertado e prorrogado: volta a contar como pendente na janela atingida (estado de `alert_events`).

## User Scenarios & Testing *(mandatory for product specs only)*

### User Story 1 - KPIs coloridos por status de contrato (Priority: P1)

Como gestor, vejo no topo do dashboard os contratos vigentes, atrasados e encerrados em destaque com cor por status, e quantos estão ativos e a vencer dentro das janelas configuradas.

**Why this priority**: é a mudança central do mockup — sem os KPIs o gestor continua sem enxergar urgência de relance.

**Independent Test**: domínio com um contrato por status e um a 20 dias: KPIs mostram 1 vigente, 1 atrasado, 1 encerrado e 1 a vencer, com cor distinta por status e sem hex fixo no código.

**Acceptance Scenarios**:

1. **Given** domínio com contratos nos três status, **When** o gestor abre o dashboard, **Then** os KPIs exibem a contagem por status com a cor do token correspondente.
2. **Given** contrato vencendo dentro da janela de 30 dias, **When** o gestor olha o KPI de vencimento, **Then** o contrato aparece como "a vencer".

### User Story 2 - Cards de contrato com vencimento e responsável (Priority: P1)

Como gestor, vejo cards de contrato com a data de vencimento e o responsável, ordenados do mais urgente para o menos urgente.

**Why this priority**: responde "quem resolve o quê, até quando" — o segundo ponto do pedido do usuário de 2026-10-23.

**Independent Test**: contrato a 20 dias com responsável vinculado aparece acima de um a 90 dias e exibe vencimento e responsável no card.

**Acceptance Scenarios**:

1. **Given** dois contratos com previsões diferentes, **When** o dashboard renderiza os cards, **Then** o de vencimento mais próximo vem primeiro e ambos mostram vencimento e responsável.
2. **Given** contrato sem previsão de finalização, **When** o dashboard renderiza, **Then** ele aparece marcado como incompleto, sem sumir da lista.

### User Story 3 - Layout em colunas com filtros no corpo (Priority: P2)

Como usuário em qualquer papel, vejo o painel em colunas que se reorganizam no viewport estreito, com filtros e busca no corpo da tela e sem barra extra no topo.

**Why this priority**: P2 — a estrutura de dados dos KPIs e cards é o valor; o layout responsivo e a colocação dos filtros amoldam a experiência ao shell em construção.

**Independent Test**: estreitar a janela do navegador e ver as colunas reflow sem overflow; aplicar filtro de status no corpo e ver KPIs e cards filtrados.

**Acceptance Scenarios**:

1. **Given** viewport estreito, **When** o dashboard abre, **Then** as colunas reflow sem overflow horizontal.
2. **Given** filtro de status no corpo da tela, **When** o usuário aplica, **Then** KPIs e cards refletem o filtro sem nova requisição de backend.

## Requirements *(mandatory)*

### Functional Requirements *(product specs only)*

- **FR-038** [US1]: Sistema MUST exibir no topo do dashboard KPIs de contratos por status (vigente, atrasado, encerrado) com cor distinta por status restrita a tokens do `ColorScheme`, usando os dados já servidos por `GET /api/v2/dashboard/stats`.
- **FR-039** [US1]: Sistema MUST exibir KPI de contratos ativos (vigentes) e KPI de contratos a vencer calculado pelas janelas de alerta configuradas do domínio (E005), consumindo os endpoints já servidos sem nova configuração.
- **FR-040** [US2]: Sistema MUST exibir cards de contrato com data de previsão de finalização e responsável, ordenados por urgência (atrasados primeiro, depois `forecast_date` ascendente; contrato sem previsão marcado como incompleto e presente na lista).
- **FR-041** [US2]: Sistema MUST manter a visão por papel de E006 — prestador vê apenas contratos vinculados e próprias tarefas, sem KPIs de domínio; admin/gestor veem o domínio inteiro.
- **FR-042** [US3]: Sistema MUST dispor o painel em colunas responsivas via `LayoutBuilder`, com reflow automático em viewport estreito sem overflow horizontal.
- **FR-043** [US3]: Sistema MUST oferecer filtros e busca no corpo da tela (sem AppBar extra), refletindo a filtragem em KPIs e cards sem nova requisição de backend.

### Key Entities *(include for product or technical specs if feature involves data)*

- **Contrato**: entidade central com status (`vigente`/`atrasado`/`encerrado` — efetivo de E002), previsão de finalização (`forecast_date`) e responsável (usuário já vinculado no modelo, derivado de `created_by` → `users`).
- **Janela de alerta**: perímetro configurável por domínio (90/60/30/15 dias de E005) que define quando um contrato vigente conta como "a vencer".
- **Sessão**: papel do usuário autenticado (admin/gestor/prestador — E001/E006) que delimita a visão do dashboard.

## Assumptions & Risks *(mandatory)*

### Assumptions

- `GET /api/v2/dashboard/stats` e `GET /api/v2/alerts/panel` já servem todos os dados do redesenho; nenhum endpoint novo é criado; extensão de payload do dashboard existente para expor o responsável deriva de relação já existente no modelo, sem migração.
- O responsável exibido no card vem de `created_by` → `users.name`; não há campo novo a migrar.
- A top toolbar do MainShell não é pré-condição desta épica (filtros ficam no corpo); é pré-condição de E014.
- A ordem E013 → E014 é de execução, não de contrato: os KPIs e tokens novos precisam nascer legíveis nos dois modos de tema.

### Risks

- **Escopo crescendo para dados novos** *(likelihood: medium, impact: medium)*: pressão por "tipo de contrato" ou financeiro que não existe no modelo. Mitigação: perímetro travado no mockup com dados atuais; qualquer dado novo vira épica própria.
- **Regressão de acessibilidade de E006** *(likelihood: medium, impact: medium)*: reescrita da tela pode perder rótulos e navegação por teclado entregues em T031. Mitigação: regressão de teclado/rótulos junto com a reescrita.
- **Tokens fixos vazando para o mockup** *(likelihood: medium, impact: low)*: hex copiado da imagem de referência. Mitigação: só tokens do `ColorScheme`; revisão de diff barra hex.

## Implementation Signals *(mandatory)*

- `NEW-UI` — reescrita de `frontend/lib/screens/dashboard_screen.dart` no formato do mockup (KPIs, cards, colunas) e tokens novos em `frontend/lib/theme/app_theme.dart`.
- `NEW-UI` — extensão de payload de `GET /api/v2/dashboard/stats` para expor nome do responsável nos `recentProjects` (junção já existente `created_by` → `users`, sem rota nova).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** [US1]: Em domínio com um contrato por status, os KPIs exibem as contagens corretas com cor distinta por status; o diff do código não contém hex fixo.
- **SC-002** [US1]: Contrato vencendo dentro da janela configurada aparece no KPI "a vencer"; contrato vigente fora de toda janela não aparece nele.
- **SC-003** [US2]: Contrato com previsão mais próxima aparece antes; cada card exibe vencimento e responsável; contrato sem previsão aparece marcado como incompleto e permanece visível.
- **SC-004** [US2]: Login como prestador mostra apenas contratos vinculados e tarefas próprias, sem KPIs de domínio; login como gestor mostra o domínio inteiro.
- **SC-005** [US3]: Viewport estreito reorganiza as colunas sem overflow horizontal; filtro aplicado no corpo reflete em KPIs e cards sem nova requisição de backend.
- **SC-006** [US1]: `flutter analyze` limpo, sem dependência nova em `pubspec.yaml`, sem APIs obsoletas (`headline6`/`bodyText2`); a suíte Flutter permanece verde.
