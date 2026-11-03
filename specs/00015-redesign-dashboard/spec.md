---
feature_branch: "00015-redesign-dashboard"
created: "2026-10-23"
input: "E013 Redesign visual do dashboard"
spec_type: "product"
spec_maturity: "clarified"
epic_id: "E013"
epic_sources: "{PRD:CAP-004,CAP-005}"
---

# Feature Specification: Redesign visual do dashboard

**Feature Branch**: `00015-redesign-dashboard`
**Created**: 2026-10-23
**Status**: Clarified
**Spec Type**: product
**Spec Maturity**: clarified
**Epic ID**: E013
**Epic Sources**: {PRD:CAP-004,CAP-005}
**Product Document**: specs/prd.md

## Problem Statement

O dashboard de E006 não destaca o que exige ação: as contagens não separam os contratos por status (vigente, atrasado, encerrado), não trazem o vencimento à frente nem o responsável, e a grade não segue o layout em colunas do mockup do usuário (2026-10-23). Todos os dados já existem e são servidos (E002, E005, vínculo de responsável) — falta a camada visual que os converta em prioridade operacional.

## Scope

### Included

- KPIs no topo com cor por status sobre dados servidos: vigentes, atrasados, encerrados (E002), ativos e "a vencer" (janelas 90/60/30/15 de E005).
- Cards de contrato com vencimento e responsável, ordenados por urgência.
- Layout em colunas responsivo via `LayoutBuilder`, reflow em viewport estreito.
- Filtros e busca no corpo da tela — sem AppBar extra, sem conflitar com a top toolbar do MainShell.
- Extensão de tokens em `frontend/lib/theme/app_theme.dart` (arquivo já existente de E006).

### Excluded

- Dados novos — "tipo de contrato" e valores financeiros não existem no modelo e ficam fora por decisão de 2026-10-23.
- Dependências novas — `fl_chart` e `responsive_framework` rejeitados; gráficos ficam fora até decisão explícita.
- Construção da top toolbar do MainShell — obra ad-hoc em andamento fora do SDD.
- Capacidade nova de API — só reapresentação de `GET /api/v2/dashboard/stats` e `GET /api/v2/alerts/panel`; expor responsável deriva de junção existente, sem rota nova nem migração.
- Indicadores por prestador e quadro de execução por contrato — roadmap fora (PDD-003).

### Edge Cases & Boundaries

- Sem previsão de finalização: aparecem como incompletos, sem sumir da visão (E005).
- Prestador: visão restrita às próprias tarefas e contratos vinculados (E006); KPIs de domínio não vazam.
- Domínio sem dados: KPIs zerados e estado vazio, sem cartões quebrados.
- Viewport estreito/amplo: reflow via `LayoutBuilder` sem overflow horizontal.
- Alertado e prorrogado: volta a contar na janela atingida (`alert_events`).

## User Scenarios & Testing

### User Story 1 - KPIs coloridos por status de contrato (Priority: P1)

Como gestor, vejo no topo os contratos vigentes, atrasados e encerrados em destaque com cor por status, e quantos estão ativos e a vencer nas janelas configuradas.

**Why this priority**: é a mudança central do mockup — sem KPIs o gestor não enxerga urgência de relance.

**Independent Test**: 1 contrato por status + 1 a 20 dias: KPIs mostram 1 vigente, 1 atrasado, 1 encerrado, 1 a vencer, com cor distinta por status e sem hex.

**Acceptance Scenarios**:

1. **Given** contratos nos três status, **When** o gestor abre o dashboard, **Then** os KPIs exibem a contagem por status com a cor do token.
2. **Given** contrato vencendo em 30 dias, **When** o gestor olha o KPI de vencimento, **Then** ele aparece como "a vencer".

### User Story 2 - Cards de contrato com vencimento e responsável (Priority: P1)

Como gestor, vejo cards de contrato com vencimento e responsável, ordenados do mais urgente para o menos.

**Why this priority**: responde "quem resolve o quê, até quando" — ponto do pedido do usuário de 2026-10-23.

**Independent Test**: contrato a 20 dias com responsável aparece acima de um a 90 dias, com vencimento e responsável no card.

**Acceptance Scenarios**:

1. **Given** dois contratos com previsões diferentes, **When** o dashboard renderiza os cards, **Then** o de vencimento mais próximo vem primeiro e ambos mostram vencimento, responsável e chip de status.
2. **Given** contrato sem previsão, **When** o dashboard renderiza, **Then** ele aparece como incompleto, sem sumir da lista.

### User Story 3 - Layout em colunas com filtros no corpo (Priority: P2)

Como usuário em qualquer papel, vejo o painel em colunas que se reorganizam no viewport estreito, com filtros e busca no corpo da tela.

**Why this priority**: P2 — os KPIs e cards são o valor; layout e filtros amoldam a experiência ao shell em construção.

**Independent Test**: estreitar a janela e ver reflow sem overflow; aplicar filtro no corpo e ver KPIs e cards filtrados.

**Acceptance Scenarios**:

1. **Given** viewport estreito, **When** o dashboard abre, **Then** as colunas reflow sem overflow.
2. **Given** filtro de status no corpo, **When** aplicado, **Then** KPIs e cards refletem sem nova requisição de backend.

## Requirements

### Functional Requirements

- **FR-038** [US1]: Sistema MUST exibir no topo do dashboard KPIs de contratos por status (vigente, atrasado, encerrado) com cor distinta restrita a tokens do `ColorScheme`, sobre `GET /api/v2/dashboard/stats`.
- **FR-039** [US1]: Sistema MUST exibir KPI de ativos (vigentes) e KPI de a vencer calculado pelas janelas do domínio (E005), sem nova configuração de endpoint.
- **FR-040** [US2]: Sistema MUST exibir cards de contrato com previsão de finalização, responsável e chip de status (mesmo mapeamento de tokens do `ColorScheme` dos KPIs, sempre com rótulo textual), ordenados por urgência (atrasados primeiro, depois `forecast_date` ascendente; sem previsão marcado como incompleto e presente na lista); sem paginação local, segue o conjunto servido.
- **FR-041** [US2]: Sistema MUST manter a visão por papel de E006 — prestador vê painel reduzido: sem a linha de KPIs de domínio e apenas contratos vinculados e tarefas próprias; admin/gestor veem o domínio inteiro.
- **FR-042** [US3]: Sistema MUST dispor o painel em colunas responsivas via `LayoutBuilder`, com reflow em viewport estreito sem overflow horizontal.
- **FR-043** [US3]: Sistema MUST oferecer filtros por status e responsável e busca por nome de contrato no corpo da tela (sem AppBar extra), refletindo a filtragem em KPIs e cards client-side, sem nova requisição de backend; filtros persistem quando o payload atualiza (E009).

### Key Entities

- **Contrato**: entidade central com status (`vigente`/`atrasado`/`encerrado` — efetivo de E002), previsão de finalização (`forecast_date`) e responsável (derivado de `created_by` → `users`).
- **Janela de alerta**: perímetro por domínio (90/60/30/15 dias de E005) que define quando um vigente conta como "a vencer".
- **Sessão**: papel autenticado (admin/gestor/prestador — E001/E006) que delimita a visão do dashboard.

## Assumptions & Risks

### Assumptions

- `GET /api/v2/dashboard/stats` e `GET /api/v2/alerts/panel` já servem todos os dados do redesenho; nenhum endpoint novo nem migração — expor o responsável deriva de `created_by` → `users`.
- A top toolbar do MainShell não é pré-condição desta épica (filtros ficam no corpo).
- A ordem E013 → E014 é de execução; os KPIs e tokens precisam nascer legíveis nos dois modos de tema.

### Risks

- **Escopo crescendo para dados novos** *(likelihood: medium, impact: medium)*: pressões por dados que não existem no modelo. Mitigação: perímetro travado no mockup; dado novo vira épica própria.
- **Regressão de acessibilidade de E006** *(likelihood: medium, impact: medium)*: reescrita pode perder rótulos e teclado de T031. Mitigação: regressão de teclado/rótulos na reescrita.
- **Tokens fixos vazando para o mockup** *(likelihood: medium, impact: low)*: hex copiado da imagem de referência. Mitigação: só tokens do `ColorScheme`; diff sem hex.

## Implementation Signals

- `NEW-UI` — reescrita de `frontend/lib/screens/dashboard_screen.dart` no formato do mockup (KPIs, cards, colunas) e tokens novos em `frontend/lib/theme/app_theme.dart`.
- `NEW-UI` — extensão de payload de `GET /api/v2/dashboard/stats` para expor nome do responsável nos `recentProjects` (junção `created_by` → `users`, sem rota nova).

## Success Criteria

### Measurable Outcomes

SC-001 [US1]: Com um contrato por status, os KPIs exibem as contagens corretas com cor distinta; o diff não contém hex fixo.
SC-002 [US1]: Contrato vencendo dentro da janela configurada aparece no KPI "a vencer"; vigente fora de toda janela, não.
SC-003 [US2]: Contrato com previsão mais próxima aparece antes; cada card exibe vencimento, responsável e chip de status; sem previsão aparece como incompleto e permanece visível.
SC-004 [US2]: Prestador logado vê apenas contratos vinculados e tarefas próprias, sem KPIs de domínio; gestor vê o domínio inteiro.
SC-005 [US3]: Viewport estreito reorganiza as colunas sem overflow horizontal; filtros e busca aplicados no corpo refletem em KPIs e cards sem nova requisição de backend.
SC-006 [US1]: `flutter analyze` limpo, sem dependência nova em `pubspec.yaml`, sem APIs obsoletas (`headline6`/`bodyText2`); suíte Flutter verde.

## Clarifications

### Session 2026-10-24

- Q: Dimensões de filtro/busca (FR-043)? -> A: status + responsável + busca por nome, client-side em KPIs e cards.
- Q: Painel do prestador (FR-041)? -> A: reduzido — sem KPIs de domínio; cards só dos vinculados.
- Q: Chip de status nos cards (FR-040)? -> A: tokens do ColorScheme + rótulo textual.
