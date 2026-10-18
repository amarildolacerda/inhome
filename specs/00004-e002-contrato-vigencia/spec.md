---
feature_branch: "00004-e002-contrato-vigencia"
created: 2026-10-08
input: "E002 Contrato e vigência"
spec_type: product
spec_maturity: clarified
epic_id: E002
epic_sources: "{PRD:CAP-002}"
---

# Spec — Contrato e vigência (E002)

## Problem Statement

O contrato carrega objeto, finalidade, início, previsão e status e alimenta alertas, painel e relatório; sem ele correto, nada tem o que ler. A capacidade está entregue; falta provar cadastro, vínculo, prorrogação, encerramento e o `atrasado` derivado, corrigindo o que a regressão apontar.

## Scope

### Included

- Cadastro com objeto, exatamente uma finalidade ativa do dicionário, início e previsão.
- Vínculo e desvinculação de prestadores; prorrogação e encerramento; status `vigente`, `atrasado` ou `encerrado`.
- Status `atrasado` derivado na leitura, sem escrita de rotina e sem travar tarefas.
- Regressão dos endpoints com escopo de domínio e papéis, recusando antes de ler.
- Filtro de status e paginação da listagem (consomem E007 e E008), previsão em 100% dos vigentes e resposta abaixo de 2 s.

### Excluded

- Central documental (anexos, ocorrências, trilha) — próxima release, PDD-003.
- Renovação automática, multa e reajuste — PDD-008.
- Novos papéis ou mudança na matriz de permissão — fechada por E001.

### Edge Cases & Boundaries

- Previsão no passado ao salvar: contrato nasce `atrasado` sem impedir a gravação; conta do dia seguinte.
- Prorrogação de contrato `atrasado`: volta a `vigente`, sem escrita manual.
- Encerramento com tarefas abertas: permitido; a tarefa não é travada pelo status.
- Domínio suspenso, papel não habilitado ou `domainId` estrangeiro: 403 antes de qualquer leitura.
- Contrato sem prestadores: aceito; a distribuição de tarefas fica travada.

## User Scenarios & Testing

### User Story 1 - Contrato do início ao fim (Priority: P1)

Como gestor, cadastro o contrato, vinculo prestadores, prorrogo quando o prazo aperta e encerro no fim do objeto.

**Why this priority**: espinha dorsal da CAP-002 e fonte de alertas, painel e relatório.

**Independent Test**: criar, vincular dois prestadores, prorrogar e encerrar, conferindo a transição.

**Acceptance Scenarios**:

1. **Given** previsão futura, **When** a lista abre, **Then** o contrato aparece `vigente` com finalidade e prestadores.
2. **Given** papel não habilitado, **When** cria, vincula, prorroga ou encerra, **Then** 403 sem efeito no banco.

### User Story 2 - Atraso sinalizado sem travar (Priority: P1)

Como gestor, vejo o contrato `atrasado` assim que a previsão passa, mas sigo criando e executando tarefas.

**Why this priority**: o PRD trata `atrasado` como lastro, não como rotina; bloqueio indevido quebraria "aviso antes do prejuízo".

**Independent Test**: salvar com previsão vencida, operar tarefas e prorrogar para recuperar `vigente`.

**Acceptance Scenarios**:

1. **Given** previsão vencida, **When** a lista é consultada, **Then** o exibido é `atrasado` e o gravado permanece `vigente`.
2. **Given** contrato `atrasado`, **When** o gestor cria e move tarefas, **Then** as operações seguem aceitas como em `vigente`.
3. **Given** contrato `atrasado`, **When** a previsão vai para data futura, **Then** o derivado volta a `vigente` sem escrita manual.

### User Story 3 - Contrato só do meu domínio (Priority: P1)

Como gestor, opero só nos contratos do meu cliente: domínio estranho, papel sem permissão ou sessão suspensa não lê nem escreve.

**Why this priority**: isolamento por domínio é inegociável; a superfície de contrato é a mais exposta.

**Independent Test**: repetir leitura e escrita com domínio cruzado, papel errado e suspenso, conferindo 403/401.

**Acceptance Scenarios**:

1. **Given** token do domínio A com `domainId` de B ou papel sem permissão, **When** chega a requisição, **Then** 403 e nenhuma linha é lida.
2. **Given** requisição sem token ou de domínio suspenso, **When** chega à rota, **Then** 401 ou 403 e a listagem do outro domínio não aparece.

### User Story 4 - Listagem com volume, filtro e previsão (Priority: P1)

Como gestor, filtro por `vigente`, `atrasado` ou `encerrado` e recebo a lista rápida com 5.000 contratos, previsão sempre visível.

**Why this priority**: E007 e E008 consomem os filtros daqui; a previsão em 100% dos vigentes é pré-condição do motor de alertas.

**Independent Test**: carregar 5.000 contratos, filtrar por status e medir o tempo.

**Acceptance Scenarios**:

1. **Given** previsão vencida e gravado `vigente`, **When** a lista filtra `atrasado`, **Then** o contrato retorna; `encerrado`, sai.
2. **Given** milhares de contratos, **When** a listagem repete, **Then** resposta abaixo de 2 s no p95 e todo vigente devolve previsão.

## Requirements

### Functional Requirements

- **FR-001** [US1]: Sistema DEVE permitir a admin e gestor criar contrato com objeto, início e previsão de finalização e, quando informada, exatamente uma finalidade ativa do dicionário; 400 para nome ou datas inválidos e finalidade inexistente ou aposentada.
- **FR-002** [US1]: Sistema DEVE vincular e desvincular prestadores por id para admin e gestor, aceitando contrato sem prestadores no cadastro.
- **FR-003** [US1]: Sistema DEVE prorrogar a previsão de contrato vigente e recusar prorrogação de contrato encerrado com 400.
- **FR-004** [US1]: Sistema DEVE encerrar contrato preservando registro e histórico, recusar encerramento repetido com 400 e restringir exclusão a admin.
- **FR-005** [US2]: Sistema DEVE derivar o status (`vigente`, `atrasado`, `encerrado`) na leitura a partir da previsão e do status gravado, mantendo no banco apenas `vigente` ou `encerrado`.
- **FR-006** [US2]: Sistema NÃO DEVE expor caminho de escrita, de rotina ou de job, que persista `atrasado`.
- **FR-007** [US2]: Sistema DEVE aceitar gravação com previsão no passado e expor o contrato como `atrasado`, sem bloquear a escrita.
- **FR-008** [US2]: Sistema DEVE restaurar `vigente` na leitura quando a previsão de um `atrasado` é prorrogada para data futura, sem escrita manual.
- **FR-009** [US2]: Sistema DEVE aceitar criação e movimentação de tarefas sobre contrato `atrasado` nas mesmas condições de um `vigente`.
- **FR-010** [US3]: Sistema DEVE recusar, antes de qualquer leitura ou escrita, requisição sem token com 401 e escrita de contrato por papel diverso de admin e gestor ou requisição de domínio suspenso com 403.
- **FR-011** [US3]: Sistema DEVE recusar com 403, antes de qualquer consulta, contrato com `domainId` explícito diferente do domínio do token, com o guarda de escopo ligado ao roteador de contrato e sem aceitação nova de domínio.
- **FR-012** [US3]: Sistema DEVE restringir toda consulta de contrato ao domínio do token, devolvendo ao `prestador` apenas os contratos vinculados a ele.
- **FR-013** [US4]: Sistema DEVE listar com paginação e filtro de status que particiona os contratos: `vigente` (previsão não vencida), `atrasado` (previsão vencida) e `encerrado`, sem sobreposição.
- **FR-014** [US4]: Sistema DEVE devolver em 100% dos contratos vigentes da API a previsão preenchida e o status derivado.
- **FR-015** [US4]: Sistema DEVE responder a listagem abaixo de 2 s no p95 no ambiente local com 5.000 contratos no domínio.

## Assumptions & Risks

### Assumptions

- A finalidade vem do dicionário, exatamente uma por contrato; o status é derivado na leitura, sem job de reprocessamento.
- Guards de papel e escopo de E001 valem também para a superfície de contrato.

### Risks

- **Fonte de dados instável para alertas** *(likelihood: low, impact: high)*: previsão ausente em vigente deixa o motor sem o que varrer; mitigação: métrica de 100%.
- **Regressão em prorrogação** *(likelihood: medium, impact: medium)*: data alterada sem refletir no status derivado confundiria o painel; mitigação: cenário fim a fim.

## Implementation Signals

- `BREAKING-CHANGE` — ligar o guarda de escopo no roteador de contrato devolve 403 para domínio estranho, valor que antes alcançava o handler.
- `NEW-API` — o filtro de status de `GET /api/contracts` ganha o valor derivado `atrasado`, consumido por E007 e E008.

## Success Criteria

SC-001 [US1]: Criação, vínculo de dois prestadores, prorrogação e encerramento mostram o estado correto a cada transição, com 403 para papel indevido.
SC-002 [US2]: Contrato com previsão vencida aparece `atrasado` na listagem enquanto tarefas seguem aceitas, e a prorrogação devolve `vigente`.
SC-003 [US3]: `domainId` estrangeiro, papel não habilitado ou domínio suspenso recebe 403/401 antes de qualquer linha lida, sem contrato de outro domínio listado.
SC-004 [US4]: Listagem abaixo de 2 s no p95 com 5.000 contratos, previsão preenchida em todo vigente e filtro `atrasado` exato.

## Clarifications

### Session 2026-10-08

- Q: `status=vigente` inclui previsão vencida? -> A: Não; `vigente`, `atrasado` e `encerrado` particionam os contratos.
- Q: Rotas de contrato aceitam `domainId` explícito? -> A: Guarda no roteador; estrangeiro → 403; sem novo parâmetro.
- Q: Quando a previsão vira `atrasado`? -> A: Data estritamente anterior à atual; no dia da previsão segue `vigente`.
- Q: Qual volume define "milhares" no p95 < 2 s? -> A: 5.000 contratos no domínio.

## Stress-Test Findings

### Session 2026-10-08

STF-001: [cross-requirement-contradiction] (HIGH) — Affected: FR-010, FR-012 — FR-010 pedia 403 na leitura não vinculada ao prestador e FR-012 esconde os não vinculados; resolvido restringindo FR-010 à escrita por papel indevido e a requisições sem token ou domínio suspenso.

## Glossary

| Termo | Definição |
|-------|-----------|
| Contrato | Vínculo com objeto, finalidade, início, previsão de finalização e status. |
| Atrasado | Contrato vigente com previsão passada; derivado na leitura, nunca gravado. |

## Compliance Check

- **Result**: PASS.
