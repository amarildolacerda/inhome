---
feature_branch: "00011-e005-painel-vencimentos"
created: 2026-10-11
input: "E005 Painel de próximos vencimentos (CAP-004: janelas 90/60/30/15)"
spec_type: product
spec_maturity: "clarified"
epic_id: E005
epic_sources: "{PRD:CAP-004}"
---

# E005 — Painel de próximos vencimentos

## Problem Statement

O gestor precisa ver o que vence primeiro antes de o prazo virar prejuízo e nenhuma tela responde isso hoje: a listagem não ordena por urgência nem mostra a janela de cada contrato. O motor de E004 já grava `alert_events` e as janelas, mas sem o painel o aviso chega avulso, sem visão de conjunto, e HYP-001 (alerta como principal valor) fica sem uso real.

## Scope

### Included

- Tela de próximos vencimentos: vigentes agrupados nas janelas 90/60/30/15, ordenados pela previsão, com seção fora das janelas e lista de incompletos.
- Estado de alertado lido de `alert_events` contra a janela atribuída; o painel consome o motor, sem regra própria de emissão.
- Leitura e gravação das janelas em tela (admin e gestor) em `domains.alert_windows`, observadas pela varredura seguinte de E004 sem reinício.
- Gestor e admin consomem painel e configuração; prestador 403.
- Paginação na rota quente (limit/offset, leitura única, sem cache) para p95 abaixo de 2 s com milhares de contratos.

### Excluded

- Emissão, dedup e agendamento de alertas — E004; e-mail de vencimento — E010.
- Quadro de execução e indicadores por prestador — roadmap fora (PDD-003).
- Decisão automática de prorrogação/encerramento — o painel informa, o gestor decide.
- Cartão novo no dashboard por papel — E006 é dono da navegação base; o painel é tela própria.

### Edge Cases & Boundaries

- Sem previsão: lista incompleta com contagem — não some (métrica PRD: 100% dos vigentes com previsão).
- Já vencido: topo do bloco 15; alertado só se `alert_events` registra a janela.
- Janela alterada com eventos gravados: estado real contra a config atual, sem regravar histórico.
- Alertado e prorrogado: a nova previsão o devolve como pendente na janela re-atingida (dedup mantém a linha).
- Encerrado: fora do painel. Domínio sem contratos: vazio com as janelas atuais visíveis.
- Prestador: 403 na rota do painel e da configuração.

## User Scenarios & Testing

### User Story 1 - O que vence primeiro, na tela (Priority: P1)

Como gestor, abro o painel e vejo os vigentes agrupados nos blocos 90/60/30/15, ordenados pela previsão, o mais urgente no topo, os de mais de 90 dias fora das janelas, os sem previsão na lista incompleta e cada contrato marcado quando `alert_events` registra sua janela.

**Why this priority**: demonstração visível da CAP-004 — sem o painel não há sequência de vencimentos nem uso real de HYP-001.

**Independent Test**: quatro contratos em janelas diferentes → blocos corretos, ordenação por urgência e marcação vinda de `alert_events`.

**Acceptance Scenarios**:

1. **Given** contratos a 10, 25, 45 e 120 dias, **When** o gestor abre o painel, **Then** blocos 15, 30 e 60 dias (o de 10 no topo); o de 120 dias fica fora das janelas.
2. **Given** evento em `alert_events` da janela atual, **When** o painel abre, **Then** marcado como alertado; sem evento, pendente.
3. **Given** vigente sem previsão, **When** o painel abre, **Then** consta na lista incompleta com contagem, fora dos blocos.
4. **Given** prestador autenticado ou domínio divergente, **When** a requisição chega, **Then** 403 antes de qualquer leitura.

### User Story 2 - Janelas ajustáveis sem deploy (Priority: P1)

Como admin ou gestor, ajusto as janelas do domínio na própria tela; o painel reagrupa na releitura e a varredura seguinte de E004 observa o novo valor sem reinício.

**Why this priority**: a janela 90/60/30/15 é hipótese da pesquisa (EVD-002); ajuste sem deploy permite confirmá-la em uso real.

**Independent Test**: trocar a janela de 30 por 45 dias e conferir o novo agrupamento e a varredura seguinte.

**Acceptance Scenarios**:

1. **Given** admin na configuração, **When** altera uma janela e salva, **Then** a releitura reflete o novo agrupamento.
2. **Given** janela alterada, **When** a varredura seguinte roda, **Then** ela observa o valor gravado sem reinício do serviço.
3. **Given** janelas customizadas, **When** o gestor restaura o padrão, **Then** o domínio volta a 90/60/30/15 sem setup.

## Requirements

### Functional Requirements

- **FR-001** [US1]: o painel MUST agrupar os vigentes com previsão na menor janela ativa que contém os dias restantes (aritmética de dias do motor, meia-noite local; inclusiva `janela ≥ dias`), ordenar cada bloco pela previsão com desempate por id e expor a seção fora das janelas e a lista de incompletos com contagem.
- **FR-002** [US1]: a marcação de alertado MUST vir de `alert_events` para a janela atribuída ao contrato, sem cálculo paralelo de emissão que possa divergir do motor.
- **FR-003** [US1]: a rota do painel MUST recusar prestador e domínio divergente com 403 antes de qualquer leitura (guards E001).
- **FR-004** [US1]: a listagem MUST paginar com limit/offset no mesmo contrato de `GET /api/contracts` sobre a leitura única da página (incompletos primeiro, depois por previsão, desempate por id), derivando os blocos dos itens retornados, sem cache compartilhado.
- **FR-005** [US2]: admin e gestor MUST ler as janelas atuais do domínio pela API do painel, com o default 90/60/30/15 visível sem setup (mesma leitura do motor).
- **FR-006** [US2]: admin e gestor MUST gravar as janelas; gravação inválida é recusada com 400 e restauração vazia devolve o default, persistido em `domains.alert_windows` sem migração de coluna.
- **FR-007** [US2]: a releitura do painel MUST refletir a nova configuração imediatamente e a varredura seguinte de E004 MUST observar o valor gravado sem reinício, sem regravar histórico de `alert_events`.

### Key Entities

- **Contrato**: vigente com previsão, alimenta o agrupamento; encerrado fica fora do painel.
- **Janela de alerta**: intervalo em dias antes da previsão (padrão 90/60/30/15) configurável por domínio em `domains.alert_windows`.
- **Alerta de vigência**: registro em `alert_events` (contrato × janela) que define o estado de alertado.

## Assumptions & Risks

### Assumptions

- Agrupamento deriva da previsão, mesma fonte do motor — sem cálculo independente de data.
- Gestor e admin compartilham a mesma visão; só o prestador é excluído.
- O padrão 90/60/30/15 é o default até o uso real derrubá-lo (EVD-002).

### Risks

- **Divergência painel × motor** *(likelihood: low, impact: high)*: duas leituras de janela quebrariam a confiança. Mitigação: reutilizar `readWindows()` e a aritmética do motor.
- **Listagem lenta em domínio grande** *(likelihood: medium, impact: medium)*: sem paginação estoura 2 s. Mitigação: paginação e índice na rota quente.
- **Configuração acidental** *(likelihood: low, impact: low)*: janela errada silencia o agrupamento. Mitigação: default restaurável e estado visível na tela.

## Implementation Signals

- [`NEW-API`] — endpoints do painel e das janelas em `routes/alerts.js`, consumindo `alert_events` e `domains.alert_windows`.
- [`NEW-UI`] — tela com blocos, marcação, lista incompleta e configuração (estende navegação em `main.dart`, sem forcar a base do E006).
- [`MIGRATION`] — índice idempotente em `contracts.forecast_date` (padrão lazy/migrate do E004).

## Success Criteria

SC-001 [US1]: Contratos a 10, 25, 45 e 120 dias renderizam os blocos corretos com o mais urgente no topo e o de 120 dias fora das janelas.
SC-002 [US1]: Todo contrato marcado alertado tem linha correspondente em `alert_events` da janela atribuída; sem linha não há marcação — 0 divergências em leitura cruzada, inclusive na virada do dia.
SC-003 [US1]: Com milhares de contratos o gestor lê "o que vence primeiro" dentro do p95 de 2 s local, sem filtro manual; prestador e domínio divergente recebem 403.
SC-004 [US2]: Trocar a janela de 30 por 45 reagrupa o painel na releitura e é observado pela varredura seguinte sem reinício; restaurar devolve 90/60/30/15.
SC-005 [US1]: Contrato sem previsão permanece visível na lista incompleta e encerrado não aparece — 100% dos vigentes com previsão ou explicitamente incompleto.

## Glossary

| Term | Definition |
|------|------------|
| Painel de próximos vencimentos | Tela que agrupa os vigentes pelas janelas de alerta, ordena por previsão e mostra o estado de alerta. |
| Janela de alerta | Intervalo em dias antes da previsão (90, 60, 30 ou 15); configurável por domínio e lido pelo motor de E004. |
| Estado de alertado | Marcação vinda de `alert_events` indicando que a janela atual do contrato já foi emitida. |

## Clarifications

### Session 2026-10-11

- Q: Paginação × blocos? -> A: página única limit/offset (incompletos primeiro); blocos derivados dos itens.
- Q: Contratos vencidos? -> A: topo do bloco 15; alertado só com linha em `alert_events` da janela atribuída.
- Q: Encerrados no painel? -> A: não — só vigentes.
- Q: Quem grava janelas? -> A: admin e gestor; prestador 403.
- Q: Endpoints? -> A: `routes/alerts.js` (IP-001, guardas E001).
- Q: Lista incompleta? -> A: itens e contagem próprios, fora dos blocos.
- Q: Definição de alertado? -> A: linha em `alert_events` para a janela atribuída.
- Q: Prazo de leitura? -> A: p95 de 2 s (percepção 3 s coberta pela margem).

## Stress-Test Findings

### Session 2026-10-11

STF-001: [boundary-scale-stress] (HIGH) — Affected: FR-001, SC-002 — painel e motor podem arredondar dias em bases diferentes (SQL vs meia-noite local) e divergir na atribuição na virada do dia.
STF-002: [boundary-scale-stress] (MEDIUM) — Affected: FR-001 — no limite dias == janela a inclusão `janela ≥ dias` do motor deve valer no painel.
STF-003: [boundary-scale-stress] (MEDIUM) — Affected: FR-004 — ordenar só por previsão com empates torna a paginação instável entre páginas.

## Compliance Check

Policy Auditor (inline, depth-blocked): PASS — §Technology Stack, PRESERVE_EXISTING_LAYOUT, grammars AGENTS.md.
