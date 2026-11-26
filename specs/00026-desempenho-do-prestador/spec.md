---
feature_branch: "00026-desempenho-do-prestador"
created: "2026-11-25"
input: "E024 Desempenho do prestador"
spec_type: "product"
spec_maturity: "clarified"
epic_id: "E024"
epic_sources: "PRD:CAP-002,CAP-003,CAP-005"
---

# Feature Specification: Desempenho do prestador

**Feature Branch**: `00026-desempenho-do-prestador`  
**Created**: 2026-11-25  
**Status**: Draft  
**Spec Type**: product  
**Spec Maturity**: clarified  
**Epic ID**: E024  
**Epic Sources**: PRD:CAP-002,CAP-003,CAP-005  
**Product Document**: specs/prd.md

## Problem Statement
Admin e gestor decidem renovação e reatribuição de prestadores usando memória ou KPIs gerais do domínio, porque o produto mostra o andamento das tarefas mas não o desempenho individual de quem executou. Sem nota nem ocorrências por prestador, atrasos repetidos e reaberturas ficam invisíveis na decisão. O resultado é renovação mal informada e retrabalho que só aparece quando o contrato já foi reatribuído.

## Scope
### Included

- Nota de 0 a 100 por prestador e período, com componentes de pontualidade, conclusão no prazo e ocorrências.
- Ocorrências derivadas do histórico já existente de tarefas: reabertura, manutenção com motivo, rejeição do gestor e conclusão após o prazo.
- Detalhe por prestador com as ocorrências do período e a tarefa de origem de cada uma.
- Filtro por prestador e período e ordenação pela nota no painel de admin e gestor.
- Cálculo sob demanda com data de referência explícita, isolado por domínio.

### Excluded

- Tabela de avaliações manuais, pesos configuráveis e revisão humana da nota — exige fluxo de contestação fora desta épica.
- SLA configurável por contrato, checklist por tarefa e busca no conteúdo de PDFs — itens P3 do roadmap.
- WhatsApp, reajuste automático e aplicativo mobile do prestador — dependem da revisão de `PDD-008`.
- Ranqueamento entre domínios e score de risco trabalhista — quebram o isolamento por domínio e misturam fontes.
- Publicação da nota para o prestador nesta entrega — a nota apoia decisão interna ainda não sujeita a contestação.

### Edge Cases & Boundaries

- Prestador sem tarefas no período aparece como "sem dados", nunca como nota zero.
- Quando não há prestadores com execução no período, o painel mostra estado vazio com orientação, não uma lista zerada.
- Uma reabertura seguida de reconclusão conta uma ocorrência, não duas.
- Com uma única tarefa no período a nota é calculada normalmente; "sem dados" vale apenas quando não há nenhuma tarefa.
- Listas com mais de cem prestadores são exibidas em páginas de cem itens, com total informado.
- Datas de referência iguais produzem notas iguais; mudança de período não altera o histórico de origem.
- Dados de outro domínio nunca entram no cálculo, mesmo quando o prestador tem vínculo em mais de um domínio.
- Acesso de leitura negado a quem não é admin ou gestor, sem vazamento da nota por mensagem de erro.

## User Scenarios & Testing
### User Story 1 - Consultar nota e componentes no painel (Priority: P1)

Como gestor, abro o painel de desempenho e vejo cada prestador do domínio com sua nota no período, acompanhada dos três componentes. Preciso entender de onde vem a nota antes de decidir renovação, sem preencher formulário nem configurar pesos.

**Why this priority**: Entrega o valor central da épica: transformar dados de execução já existentes em uma nota acionável.

**Independent Test**: Com tarefas concluídas e reabertas em um domínio de teste, abrir o painel como gestor e conferir nota e componentes por prestador.

**Acceptance Scenarios**:

1. **Given** prestadores com execução no período, **When** o gestor abre o painel de desempenho, **Then** cada prestador aparece com nota de 0 a 100 e os três componentes.
2. **Given** um prestador sem tarefas no período, **When** o painel é carregado, **Then** ele aparece como "sem dados" e não recebe nota zero.
3. **Given** um usuário com papel de prestador, **When** tenta abrir o painel, **Then** recebe negativa de acesso sem ver a nota.

### User Story 2 - Entender cada ocorrência (Priority: P1)

Como gestor, abro o detalhe de um prestador e vejo as ocorrências do período com a origem de cada uma, para justificar a nota em conversa com o prestador e com a diretoria.

**Why this priority**: Sem a origem rastreável, a nota vira número arbitrário e não sustenta decisão de renovação.

**Independent Test**: Criar uma tarefa reaberta e uma manutenção com motivo, abrir o detalhe e conferir as duas ocorrências ligadas às tarefas corretas.

**Acceptance Scenarios**:

1. **Given** uma tarefa reaberta no período, **When** o gestor abre o detalhe do prestador, **Then** a reabertura aparece como ocorrência com acesso à tarefa de origem.
2. **Given** uma manutenção registrada com motivo, **When** o detalhe é aberto, **Then** o motivo aparece associado à ocorrência.
3. **Given** a mesma tarefa reaberta e concluída novamente, **When** o detalhe é atualizado, **Then** a reabertura aparece uma única vez.

### User Story 3 - Confiar no cálculo (Priority: P1)

Como gestor, quero que a nota seja estável para a mesma data de referência e que considere apenas prestadores do meu domínio, para comparar períodos sem suspeitar de erro de cálculo.

**Why this priority**: A nota só vira critério de decisão se for reproduzível e isolada por domínio.

**Independent Test**: Calcular a nota duas vezes com a mesma data de referência e comparar; repetir em outro domínio com prestador de mesmo nome.

**Acceptance Scenarios**:

1. **Given** o mesmo conjunto de tarefas e a mesma data de referência, **When** o cálculo é feito duas vezes, **Then** as notas e os componentes são idênticos.
2. **Given** prestadores com o mesmo nome em domínios diferentes, **When** o gestor consulta o próprio domínio, **Then** apenas os dados desse domínio aparecem.
3. **Given** uma data de referência diferente, **When** o período muda, **Then** a nota reflete apenas as tarefas do novo período sem apagar o histórico de origem.

### User Story 4 - Localizar prestador e período (Priority: P2)

Como gestor, quero filtrar por prestador e período e ordenar pela nota, para ir direto ao prestador que preciso avaliar em uma lista grande.

**Why this priority**: Reduz o custo de uso em domínios com muitos prestadores; o valor central já existe nas histórias P1.

**Independent Test**: Com vários prestadores, aplicar filtro de texto e período, ordenar pela nota e conferir a ordem exibida.

**Acceptance Scenarios**:

1. **Given** mais de dez prestadores no domínio, **When** o gestor filtra por parte do nome, **Then** apenas os prestadores correspondentes aparecem.
2. **Given** prestadores com notas diferentes, **When** o gestor ordena pela nota, **Then** a lista aparece da maior para a menor nota.

## Requirements
### Functional Requirements
- **FR-001** [US1]: O sistema DEVE apresentar uma nota de 0 a 100 para cada prestador com execução no período selecionado.
- **FR-002** [US1]: O sistema DEVE apresentar, junto à nota, os componentes de pontualidade, conclusão no prazo e ocorrências.
- **FR-003** [US1]: O sistema DEVE indicar "sem dados" para prestadores sem tarefas no período, sem atribuir nota zero.
- **FR-004** [US1]: O sistema DEVE restringir a leitura da nota a usuários com papel admin ou gestor do domínio.
- **FR-005** [US2]: O sistema DEVE derivar ocorrências de reabertura, manutenção com motivo, rejeição do gestor e conclusão após o prazo; conclusão após o prazo degrada a pontualidade e gera uma única ocorrência.
- **FR-006** [US2]: O sistema DEVE associar cada ocorrência à tarefa de origem e ao motivo registrado, quando houver.
- **FR-007** [US2]: O sistema NÃO DEVE contar a mesma reabertura mais de uma vez quando a tarefa é reconcluída.
- **FR-008** [US3]: O sistema DEVE calcular a nota de forma determinística para uma mesma data de referência e conjunto de tarefas.
- **FR-009** [US3]: O sistema DEVE limitar o cálculo e a listagem ao domínio da sessão corrente.
- **FR-010** [US4]: O sistema DEVE permitir filtrar prestadores por nome e por período.
- **FR-011** [US4]: O sistema DEVE permitir ordenar a lista pela nota, da maior para a menor.
- **FR-012** [US4]: O sistema DEVE exibir a lista em páginas de até cem prestadores, com o total de itens disponíveis.

### Key Entities
- **Prestador**: pessoa jurídica ou profissional vinculado a contratos do domínio; identificador, nome e vínculos ativos.
- **Período**: intervalo delimitado por data de referência e janela anterior, usado para selecionar as tarefas consideradas.
- **Nota**: resultado de 0 a 100 com três componentes; derivada, não persistida como avaliação manual.
- **Ocorrência**: evento do histórico de tarefas que degrada um componente; tem tipo, origem, data e motivo opcional.

## Clarifications

### Session 2026-11-25

- Q: Qual janela de período usar por padrão? -> A: 30 dias, com data de referência explícita.
- Q: Prestador com uma única tarefa no período recebe nota? -> A: Sim; "sem dados" apenas com zero tarefas.
- Q: Conclusão após o prazo conta como ocorrência e afeta pontualidade? -> A: Sim, com uma única ocorrência e um único componente degradado.

## Stress-Test Findings

### Session 2026-11-25

STF-001: [boundary-scale-stress] (MEDIUM) — Affected: FR-010, FR-011 — Lista sem limite em domínios com muitos prestadores

Resolução aplicada: FR-012 limita a página a cem prestadores e informa o total.

## Assumptions & Risks
### Assumptions

- Todo prestador elegível já possui vínculo com contrato no domínio, registrado pela épica de contrato.
- O histórico de tarefas registra data de conclusão, reaberturas e manutenções com motivo de forma confiável.
- Admin e gestor são os únicos decisores de renovação e reatribuição no ciclo atual.
- A janela de 30 dias é suficiente para uma primeira nota útil; períodos maiores podem ser acrescentados depois.
- Nenhum prestador precisa acessar a própria nota nesta entrega.

### Risks

- **Histórico incompleto** *(likelihood: medium, impact: medium)*: tarefas antigas sem data de conclusão podem distorcer a nota; mitigar com "sem dados" para execução insuficiente.
- **Interpretação como veredito** *(likelihood: medium, impact: medium)*: a nota pode ser lida como decisão automática; mitigar mostrando componentes e ocorrências com origem.
- **Custo de leitura** *(likelihood: low, impact: low)*: agregar histórico sob demanda pode ficar lento em domínios grandes; mitigar limitando o período e reaproveitando consultas já usadas no painel.

## Implementation Signals
- `NEW-API` — leitura da nota, componentes e ocorrências por prestador e período, restrita por papel e domínio.
- `NEW-UI` — painel de desempenho com filtro, ordenação e detalhe por prestador.
- `EXTERNAL-SERVICE` — nenhum: o cálculo usa apenas dados locais já produzidos por tarefas e indicadores.

## Success Criteria
### Measurable Outcomes

SC-001 [US1]: 100% dos prestadores com execução no período exibem nota de 0 a 100 com os três componentes no painel de gestor.
SC-002 [US1]: Prestadores sem tarefas no período são exibidos como "sem dados" em 100% dos casos, sem nota zero.
SC-003 [US2]: 100% das ocorrências exibidas no detalhe apontam para a tarefa de origem e incluem o motivo quando ele existe.
SC-004 [US3]: Duas consultas com a mesma data de referência devolvem nota e componentes idênticos em 100% dos casos.
SC-005 [US3]: 100% das listagens e notas contêm apenas prestadores do domínio da sessão corrente.
SC-006 [US4]: Filtro por nome e ordenação pela nota produzem a lista esperada em 100% dos casos testados.

## Glossary
| Term | Definition |
|------|------------|
| Nota | Valor de 0 a 100 derivado do histórico de tarefas do prestador no período; não é avaliação digitada. |
| Componente | Parte da nota referente a pontualidade, conclusão no prazo ou ocorrências. |
| Ocorrência | Evento do histórico de tarefas que representa falha de execução, com origem rastreável. |
| Data de referência | Data que delimita o fim do período considerado no cálculo. |

## Compliance Check

- **Policy Auditor**: PASS — alinhado a `project-instructions.md` §I (mudanças em `dev`), §II (testes antes de promoção), §III (TODO lido), §IV (saída concisa). Sem segredo, chave ou dado pessoal no artefato; nenhuma capacidade regulada ou integração externa adicionada.
