---
feature_branch: "00006-e006-painel-papel"
created: 2026-10-09
input: "E006 Painel por papel"
spec_type: product
spec_maturity: "clarified"
epic_id: E006
epic_sources: "{PRD:CAP-005}"
---

# Spec — Painel por papel (E006)

**Feature Branch**: `00006-e006-painel-papel`  
**Created**: 2026-10-09  
**Status**: Draft  
**Spec Type**: product  
**Spec Maturity**: clarified  
**Epic ID**: E006  
**Epic Sources**: {PRD:CAP-005}  
**Product Document**: specs/prd.md

## Problem Statement

Cada papel enxerga o andamento do domínio na medida da sua responsabilidade: admin e gestor veem o domínio inteiro, o prestador só as próprias tarefas. O dashboard está implementado, mas a base entregue fecha com uma pendência registrada — a tarefa T031 (bootstrap web e rótulos de acessibilidade em `main.dart` e `app_theme.dart`) ficou em aberto. Enquanto não fechar, navegação por teclado e rótulos das telas principais não estão garantidos e a acessibilidade básica da release fica sem prova.

## Scope

### Included

- Verificação do dashboard por papel: totais do domínio para admin e gestor, só tarefas próprias para o prestador.
- Regressão de escopo do dashboard: 403 para papel sem permissão e domínio divergente.
- Fechamento de T031: bootstrap web em `frontend/lib/main.dart` e rótulos de acessibilidade em `frontend/lib/theme/app_theme.dart` e nas telas que consomem o tema.
- Navegação por teclado nas telas principais, com foco visível e rótulo legível — o nível básico que o PRD exige.
- Regressão fim a fim após alterar `main.dart` (superfície compartilhada por todas as telas).

### Excluded

- Acessibilidade formal nível AA — meta explícita fora desta release (PRD Constraints).
- Indicadores por prestador e quadro de execução por contrato — roadmap (PDD-003).
- Novos cartões ou métricas no dashboard além dos existentes.
- Telemetria de uso do painel — medição manual, sem coleta (decisão de produto).

### Edge Cases & Boundaries

- Prestador autenticado pedindo o dashboard completo: 403, com a visão restrita às próprias tarefas.
- Sessão sem permissão de leitura do painel (system_admin): 403, sem dados vazados.
- Token de outro domínio consultando o dashboard: 403 por escopo de domínio.
- Domínio sem dados: painel zera sem erro e sem cartões quebrados.
- Bootstrap web ausente: página inicializa sem tema aplicado — cenário que T031 fecha.
- Componente sem rótulo acessível: navegação por teclado perde o destino — cenário que T031 fecha.

## User Scenarios & Testing

### User Story 1 - Visão do domínio por papel (Priority: P1)

Como admin ou gestor, vejo o andamento do domínio completo; como prestador, a mesma tela mostra só o que é meu. O painel devolve os totais de contratos e tarefas do papel logado e recusa com 403 qualquer leitura de escopo que não é do seu papel ou domínio.

**Why this priority**: o painel por papel prova que permissão mínima vale também na leitura, não só na escrita — sem ele a matriz de papéis de E001 fica incompleta.

**Independent Test**: logar nos três papéis no mesmo domínio, comparar o conteúdo exibido e fazer uma chamada de escopo errado esperando 403.

**Acceptance Scenarios**:

1. **Given** admin autenticado no domínio, **When** abre o dashboard, **Then** vê os totais do domínio inteiro.
2. **Given** prestador autenticado, **When** abre o dashboard, **Then** vê apenas as próprias tarefas e nada do restante.
3. **Given** sessão de papel sem permissão ou token de domínio divergente, **When** solicita o dashboard, **Then** 403 e nenhum dado.

### User Story 2 - Interface acessível no básico (Priority: P1)

Como usuário que navega por teclado, percorro as telas principais com Tab e Shift+Tab e leio o rótulo de cada campo e ação. A aplicação carrega com o tema aplicado desde a primeira pintura, sem conteúdo sem estilo, fechando a pendência T031 da base entregue.

**Why this priority**: T031 é a única pendência registrada da base entregue; o PRD mantém rótulos, contraste e teclado como exigência desta release.

**Independent Test**: percorrer as telas principais só com teclado, conferindo rótulo e foco em cada ação, e recarregar a página conferindo tema aplicado sem flash.

**Acceptance Scenarios**:

1. **Given** a aplicação carregada, **When** o usuário navega por teclado, **Then** cada campo e ação recebe foco visível com rótulo.
2. **Given** o bootstrap web aplicado, **When** a página abre, **Then** o tema é aplicado sem conteúdo sem estilo.

## Requirements

### Functional Requirements

- **FR-001** [US1]: System MUST deliver domain-wide contract and task metrics to admin and gestor sessions.
- **FR-002** [US1]: System MUST restrict the prestador dashboard to the prestador's own tasks and linked contracts, exposing no domain-wide counters.
- **FR-003** [US1]: System MUST respond 403 for sessions without dashboard permission (system_admin) and for requests from a divergent domain.
- **FR-004** [US2]: System MUST apply the web bootstrap at startup in `frontend/lib/main.dart` so the theme renders from the first paint without unstyled content.
- **FR-005** [US2]: System MUST expose accessible labels, readable contrast, and visible keyboard focus on the main screens via `frontend/lib/theme/app_theme.dart` and its consuming screens (T031 closure).
- **FR-006** [US2]: System MUST keep the end-to-end regression suite green after shared-surface changes to `main.dart`.

### Key Entities

- **Métricas do domínio**: agregação de contratos e tarefas do domínio, ou da parcela própria do prestador, devolvida conforme o papel da sessão.
- **Tarefa**: unidade de trabalho atribuída a um prestador; base do recorte próprio no painel.
- **Sessão**: papel autenticado (admin, gestor, prestador) que determina o escopo de leitura permitido.

## Assumptions & Risks

### Assumptions

- T031 continua válida como descrita na entrega anterior (FR-027, FR-028) sem novo requisito de acessibilidade.
- O dashboard existente já aplica a visão por papel; a épica só confirma e corrige desvio.
- A verificação de teclado é manual nas telas principais, sem ferramenta automatizada nesta release.

### Risks

- **Bootstrap quebrando tela existente** *(likelihood: medium, impact: medium)*: `main.dart` é importado por todas as telas. Mitigação: regressão fim a fim completa após a alteração.
- **Escopo de acessível crescendo para AA** *(likelihood: low, impact: medium)*: resolver AA dentro desta épica estoura o escopo. Mitigação: manter o perímetro em rótulos, contraste e teclado.

## Implementation Signals

- [`NEW-UI`] — bootstrap web e rótulos de acessibilidade no tema e nas telas principais (fechamento de T031); superfície `main.dart`/`app_theme.dart` importada por todas as telas.

## Success Criteria

### Measurable Outcomes

SC-001 [US1]: Em um mesmo domínio, os três papéis abrem o dashboard e cada um vê exatamente a sua parcela; a comparação lado a lado mostra domínio inteiro para admin/gestor e só tarefas próprias para prestador, com 403 em toda tentativa de escopo errado.
SC-002 [US2]: As telas principais são operáveis só por teclado, com foco visível e rótulo em toda ação; o tema carrega em toda inicialização sem conteúdo sem estilo e a pendência T031 deixa de existir.
SC-003 [US2]: A suíte de regressão fim a fim termina verde após as alterações em `main.dart`, sem perda de casos em relação à linha de base.

## Clarifications

### Session 2026-10-09

- Q: T031 está aberta ou fechada? -> A: Fechada ([X] em specs/00001-contratos-mvp/tasks.md, flutter 13/13); US2 vira verificação + extensão de rótulos às telas principais.
- Q: FR-003 domínio divergente liga `scopeDomain()`? -> A: Não — rota usa `req.user.domainId` direto, sem parâmetro `domainId`; isolamento por token já impede cross-domain; `scopeDomain()` é no-op aqui.
- Q: Telas principais de US2? -> A: Dashboard + tarefas + projetos (destinos do NavigationRail); fase de plan define o detalhe.

## Compliance Check

- **Result**: PASS.
