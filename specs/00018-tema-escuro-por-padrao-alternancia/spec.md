---
feature_branch: "00018-tema-escuro-por-padrao-alternancia"
created: "2026-10-28"
input: "E014 Tema escuro por padrão"
spec_type: "product"
spec_maturity: "draft"
epic_id: "E014"
epic_sources: "{PRD:CAP-005}"
---

# Feature Specification: Tema escuro por padrão e alternância persistida

**Feature Branch**: `00018-tema-escuro-por-padrao-alternancia`
**Created**: 2026-10-28
**Status**: Draft
**Spec Type**: product
**Spec Maturity**: draft
**Epic ID**: E014
**Epic Sources**: {PRD:CAP-005}
**Product Document**: specs/prd.md

## Problem Statement

Hoje o app segue o tema do sistema operacional: a primeira tela de um gestor depende da configuração da máquina, não da escolha do usuário. Em 2026-10-23 o usuário pediu que o app nasça em tema escuro e ofereça alternância para o claro com a escolha lembrada. Sem default escuro, a primeira impressão varia por SO; sem persistência, quem prefere o claro reconfigura a cada sessão; sem alternância global, telas abertas continuam no tema anterior.

Afeta todos os papéis autenticados. A consequência de não agir é uma preferência de interface que o produto não controla e que o usuário não consegue fixar.

## Scope

### Included

- Primeira execução em tema escuro, independentemente do tema do sistema operacional.
- Alternância claro/escuro na top toolbar do MainShell, com reflexo imediato em todas as telas abertas.
- Persistência local da escolha e restauração antes da primeira renderização; chave ausente, corrompida ou desconhecida cai no escuro sem erro.
- Tema claro utilizável do fim a fim, incluindo o dashboard redesenhado de E013.
- Legibilidade de rótulos e contraste básico de E006 nos dois modos.

### Excluded

- Construção da top toolbar do MainShell — obra ad-hoc em andamento fora do SDD; esta épica não altera usuário, papel, domínio nem o botão Sair da toolbar.
- Sincronização da preferência entre dispositivos ou no servidor — persistência local apenas.
- Voltar a seguir o tema do sistema depois da primeira escolha — a decisão do usuário vence o sistema.
- Outras preferências de interface (tamanho de fonte, densidade, idioma).
- Dependências novas de tema, estado ou persistência.

### Edge Cases & Boundaries

- Primeira execução sem preferência salva: abre escuro.
- Preferência corrompida ou com valor desconhecido: fallback para escuro, sem crash e sem tela clara intermitente no boot.
- Alternância durante a sessão: todas as telas abertas, inclusive o dashboard de E013, refletem o novo tema sem recarregar.
- Tema claro sobre widgets com tokens antigos: rótulos permanecem legíveis e ações continuam identificáveis.
- Toolbar indisponível (obra ad-hoc atrasada): o toggle não tem onde morar; é pré-condição registrada, não escopo desta épica.
- Preferência salva em "claro" e sistema em "escuro": o app abre claro.

## User Scenarios & Testing

### User Story 1 - Aplicação nasce escura por padrão (Priority: P1)

Como usuário em qualquer papel, abro o app e vejo tema escuro por padrão, mesmo com o sistema operacional em modo claro, sem precisar configurar nada.

**Why this priority**: é o default decidido pelo usuário em 2026-10-23 — sem ele, a alternância não muda a primeira impressão.

**Independent Test**: SO claro, primeira execução sem preferência salva → app abre escuro, sem erro no boot.

**Acceptance Scenarios**:

1. **Given** navegador com SO em tema claro e sem preferência salva, **When** o usuário abre o app, **Then** a interface renderiza em tema escuro.
2. **Given** preferência ausente ou inválida, **When** o app inicia, **Then** o fallback é o tema escuro, sem crash e sem exibir a interface clara antes do tema correto.

### User Story 2 - Alternância persistida na toolbar (Priority: P1)

Como usuário logado, alterno entre tema claro e escuro pelo toggle da top toolbar e a escolha persiste entre sessões, valendo para todas as telas.

**Why this priority**: é a metade funcional do pedido — sem persistência e reflexo global, o toggle vira cosmético.

**Independent Test**: alternar para claro e recarregar → claro; alternar para escuro e recarregar → escuro; telas abertas refletem a troca na hora.

**Acceptance Scenarios**:

1. **Given** app em tema escuro, **When** o usuário toca o toggle na toolbar, **Then** todas as telas passam ao claro imediatamente, incluindo o dashboard de E013, e a escolha é gravada.
2. **Given** escolha "claro" persistida, **When** o usuário recarrega a página, **Then** o app abre em claro.
3. **Given** escolha "escuro" persistida, **When** o usuário recarrega a página, **Then** o app abre em escuro.

## Requirements

### Functional Requirements

- **FR-064** [US1]: O sistema DEVE abrir em tema escuro na primeira execução, independentemente do tema configurado no sistema operacional.
- **FR-065** [US1]: O sistema DEVE resolver a preferência de tema antes da primeira renderização e usar o tema escuro como fallback para ausência, corrupção ou valor desconhecido, sem erro visível no boot.
- **FR-066** [US2]: O sistema DEVE oferecer um toggle claro/escuro na top toolbar do MainShell que aplica a troca imediatamente a todas as telas abertas, sem recarregar a página.
- **FR-067** [US2]: O sistema DEVE persistir localmente a escolha do usuário e restaurá-la na sessão seguinte, fazendo a escolha do usuário prevalecer sobre o tema do sistema operacional.
- **FR-068** [US2]: O sistema DEVE manter o tema claro utilizável do fim a fim, com rótulos legíveis e contraste básico de E006 nos dois modos, sem introduzir dependência nova.

### Key Entities

- **Sessão**: usuário autenticado em qualquer papel; a preferência de tema é local e não distingue papel.
- **Preferência local de tema**: escolha claro/escuro do usuário, guardada no dispositivo e aplicada antes da primeira renderização.

## Glossary

- **Tema escuro**: paleta escura padrão do app, aplicada na primeira execução.
- **Toggle**: controle na top toolbar que alterna entre tema claro e escuro.
- **MainShell**: casca autenticada que hospeda a top toolbar e as telas do app.

## Assumptions & Risks

### Assumptions

- A top toolbar do MainShell existe quando esta épica rodar — pré-condição entregue pela obra ad-hoc em andamento, fora do SDD.
- O mecanismo de persistência local já adotado pelo app é suficiente e não exige dependência nova.
- O tema claro existente estende para os tokens de E013 sem reescrever as telas.

### Dependencies

- E006: temas claro/escuro e bootstrap da aplicação.
- E013: dashboard redesenhado que precisa nascer legível no modo claro.
- Top toolbar do MainShell: entrega ad-hoc que hospeda o toggle.

### Risks

- **Toolbar atrasada bloqueando o toggle** *(likelihood: medium, impact: medium)*: o toggle não tem onde morar. Mitigação: default escuro e persistência podem ser entregues antes; o toggle entra quando a toolbar chegar.
- **Token ilegível no modo claro** *(likelihood: medium, impact: medium)*: widgets pensados no escuro perdem contraste. Mitigação: regressão de legibilidade nos dois modos junto com os tokens de E013.
- **Preferência legada ou inválida** *(likelihood: low, impact: low)*: valor desconhecido gravado por versão futura ou teste. Mitigação: validação do valor lido com fallback explícito para escuro.

## Implementation Signals

- `NEW-UI` — default de tema escuro e leitura da preferência no bootstrap de `frontend/lib/main.dart`; integração do toggle na top toolbar do MainShell.
- `NEW-UI` — extensão de `AppTheme.light` em `frontend/lib/theme/app_theme.dart` se os tokens de E013 exigirem.
- `NEW-CONFIG` — chave de preferência local de tema no mecanismo de persistência já adotado pelo app; sem dependência nova.

## Success Criteria

### Measurable Outcomes

SC-001 [US1]: Com o SO em tema claro e sem preferência salva, a primeira execução renderiza o app em tema escuro.
SC-002 [US1]: Preferência ausente ou inválida resulta em tema escuro, sem crash e sem exibição intermitente do tema claro no boot.
SC-003 [US2]: O toggle na top toolbar troca o tema na hora em todas as telas abertas, incluindo o dashboard de E013, sem recarregar.
SC-004 [US2]: Após recarregar a página, o app reabre no tema escolhido nos dois sentidos; mudar o tema do SO não sobrescreve a escolha.
SC-005 [US2]: Nos dois modos, rótulos e ações permanecem legíveis com contraste básico de E006; análise estática limpa, suíte de testes verde e nenhuma dependência nova.
