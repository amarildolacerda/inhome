---
spec_type: product
epic_id: E007
spec_maturity: "clarified"
epic_sources: "{PRD:CAP-006}"
---

# E007 — Busca e filtros

## Problem Statement

O gestor precisa achar contrato, fornecedor ou conteúdo em segundos sem abrir planilha paralela. A busca já existe em `/api/search` com os seis filtros do PRD (contrato, status, prioridade, prestador, finalidade, prazo), mas falta provar que cada filtro devolve o conjunto certo, que o escopo do domínio e do papel nunca vaza, e que a resposta segue abaixo de 2 s em volume representativo. Sem essa prova, a CAP-006 não está entregue: um filtro sem índice ou uma rota sem escopo passaria despercebido até o usuário comparar com o Excel.

## Scope

### Included
- Verificação dos seis filtros (contrato, status, prioridade, prestador, finalidade, prazo) isolados e combinados em `/api/search/contracts` e `/api/search/tasks`.
- Verificação do escopo por domínio do token e alcance do papel (prestador enxerga só as próprias tarefas).
- Verificação de `ensureIndexes()` e da paginação em `backend/src/config/database.js`.
- Medição de latência (p95) da listagem/busca em ambiente local com volume representativo.
- Correção pontual de índice ou filtro apontado pela verificação, sem introduzir cache.

### Excluded
- Busca full-text ou por conteúdo de evidência/foto — fora do escopo do PRD.
- Salvar buscas, favoritos ou alertas de busca — nenhuma exigência registrada.
- Autocomplete com sugestões — nenhuma exigência registrada.
- Exportação do resultado de busca — relatório é domínio de E008.
- Nova camada de cache — proibida pela restrição de leitura única por requisição.

### Edge Cases & Boundaries
- Combinação de filtros sem resultado: resposta vazia, sem erro, paginação consistente.
- Filtro por prestador sem tarefas/contratos: lista vazia legível.
- Página além do total: resposta vazia, sem erro.
- Parâmetro de domínio divergente do token: não aceito — a rota não recebe `domainId` e usa o domínio do token (mesma construção do painel, AD-003).
- P95 acima de 2 s: regressão, atacada por índice e nunca por cache.

## User Scenarios & Testing

### User Story 1 - Achar em segundos (Priority: P1)

Como gestor, busco por contrato, fornecedor ou conteúdo e combino filtros de status, prioridade, prestador, finalidade e prazo até o resultado certo aparecer, sem abrir outra ferramenta.

**Why this priority**: "ache rápido sem abrir planilha" é um dos seis trabalhos do usuário no PRD; sem ele o produto perde para a busca do Excel e a CAP-006 fica sem entrega.

**Independent Test**: combinando três filtros sobre uma base com contratos de finalidades e statuses distintos e conferindo o conjunto exato retornado pela API.

**Acceptance Scenarios**:

1. **Given** contratos com statuses e finalidades distintos no mesmo domínio, **When** o gestor combina filtro de status com finalidade, **Then** só os contratos que satisfazem ambos aparecem, e cada um dos seis filtros isolados devolve o subconjunto esperado.
2. **Given** busca cuja combinação de filtros não corresponde a nenhum registro, **When** a requisição chega, **Then** a lista vazia é retornada sem erro e a paginação permanece consistente.
3. **Given** uma consulta paginada com total conhecido, **When** o cliente pede uma página além do total, **Then** a resposta vem vazia, sem erro e com o total correto.

### User Story 2 - Busca respeita o escopo do papel (Priority: P1)

Como prestador, busco nas minhas tarefas e não enxergo contrato ou tarefa de outro domínio ou de outro prestador; o gestor e o admin do domínio enxergam o domínio inteiro.

**Why this priority**: isolamento por domínio é inegociável e vale para leitura tanto quanto para escrita — a mesma restrição que protege a escrita protege a busca.

**Independent Test**: mesma busca executada por papéis e domínios diferentes, comparando os conjuntos retornados e confirmando que a regressão das listagens de contrato e tarefa permanece verde.

**Acceptance Scenarios**:

1. **Given** prestador autenticado no domínio A com tarefas atribuídas, **When** ele busca tarefas, **Then** vê apenas as próprias do domínio A, nunca as de outro prestador nem de outro domínio.
2. **Given** requisição autenticada no domínio A, **When** o cliente tenta passar um domínio divergente por parâmetro, **Then** a rota ignora o parâmetro e responde só com o domínio do token — nenhum dado de outro domínio aparece.
3. **Given** qualquer mudança de índice ou filtro feita nesta épica, **When** a suíte de regressão roda, **Then** as listagens de contrato e tarefa de E002/E003 continuam verdes, sem efeito colateral.

## Requirements

- **FR-001** [US1]: Os seis filtros (contrato, status, prioridade, prestador, finalidade, prazo) funcionam isolados e combinados em `/api/search/contracts` e `/api/search/tasks`, devolvendo o conjunto exato para cada combinação.
- **FR-002** [US1]: Combinação de filtros sem correspondência retorna lista vazia sem erro, com paginação consistente; página além do total retorna vazia com o total correto.
- **FR-003** [US1]: A busca e a listagem respondem com p95 abaixo de 2 s em ambiente local com volume representativo; `ensureIndexes()` cobre os campos filtrados; nenhuma camada de cache é introduzida; leitura única por requisição.
- **FR-004** [US2]: Todo resultado é restrito ao domínio do token e ao alcance do papel; prestador enxerga apenas as próprias tarefas; rota não aceita domínio divergente do token.
- **FR-005** [US2]: Qualquer correção de índice ou filtro desta épica não regreda as listagens de contrato e tarefa de E002/E003 — suíte de regressão permanece verde.

## Key Entities

- **Contrato**: objeto, status, finalidade, prestador (filtros de busca em `/api/search/contracts`).
- **Tarefa**: título, descrição, status, prioridade, prestador, prazo, contrato (filtros de busca em `/api/search/tasks`).

## Assumptions & Risks

### Assumptions
- Os seis filtros do PRD correspondem aos parâmetros já implementados em `/api/search` (`q`, `status`, `priority`, `prestador_id`, `finalidade_id`, `due_after`/`due_before`, `contract_id`).
- O volume de teste local (milhares de contratos) é representativo para a medição de p95.
- A superfície `backend/src/config/database.js` não muda salvo correção de índice apontada pela medição.
- A rota de busca não recebe parâmetro `domainId` — o domínio vem sempre do token, como já construído no painel (AD-003).

### Risks
- **Regressão por índice** *(likelihood: low, impact: medium)*: índice novo altera o plano de consulta das listagens de E002/E003. Mitigação: regressão de listagem junto com a medição.
- **Latência acima de 2 s em volume** *(likelihood: medium, impact: medium)*: filtros combinados sem índice composto (hoje faltam índices em `tasks.priority` e `tasks.due_date`). Mitigação: atacar por índice, conforme o SAD — cache está fora.

## Implementation Signals

- `MIGRATION` (condicional): índice aditivo preguiçoso em `ensureIndexes()` apenas se a medição de p95 apontar lacuna — `CREATE INDEX IF NOT EXISTS` é idempotente e não exige `migrateSchema()`.
- Nenhum sinal novo de API, entidade ou UI — busca, rota e filtros já entregues sob FR-016.

## Success Criteria

SC-001 [US1]: Combinando três filtros sobre uma base com contratos de finalidades e statuses distintos, a API retorna exatamente o conjunto esperado; cada um dos seis filtros isolados devolve o subconjunto correto.
SC-002 [US1]: Busca sem correspondência retorna lista vazia sem erro com paginação consistente, e página além do total retorna vazia com o total correto.
SC-003 [US1]: O p95 da busca/listagem medido em ambiente local com volume representativo fica abaixo de 2 s, com `ensureIndexes()` ativo e sem cache.
SC-004 [US2]: Prestador do domínio A busca e vê apenas as próprias tarefas do domínio A; admin e gestor do domínio veem o domínio inteiro; nenhum dado de outro domínio aparece em nenhuma combinação.
SC-005 [US2]: A bateria completa (unit 107+, smoke 118+, flutter 16+) permanece verde após qualquer mudança de índice ou filtro, sem regressão nas listagens de E002/E003.

## Glossary

| Term | Definition |
|------|-----------|
| p95 | Nonéximo percentil de latência: 95% das requisições respondem abaixo do valor medido. |
| Escopo de domínio | Restrição que limita cada requisição ao banco do domínio do token autenticado. |

## Clarifications

- **Q1 — Filtro de prazo: `due_after`, `due_before` ou ambos?** Ambos opcionais e combináveis: `due_after` filtra `due_date >= valor`, `due_before` filtra `due_date <= valor`; janela aberta com só um, fechada com os dois. (Recomendado; código existente em `search.js`.)
- **Q2 — Medição de p95: como medir em ambiente local?** Semeia volume representativo (milhares de contratos/tarefas via fixtures), executa N requisições sequenciais cronometradas em `/api/search/tasks` com filtros combinados, calcula p95. Cache proibido; medição no servidor local. (Recomendado.)
- **Q3 — Filtro "contrato" do PRD: o que cobre?** `contract_id` em `/api/search/tasks`. Descoberta de contrato por nome/objeto é o texto livre `q` em `/api/search/contracts`. (Recomendado; mapeia os seis filtros do PRD aos parâmetros implementados.)

## Stress-Test Findings

Nenhum finding — quatro passagens (contradições, impossibilidades, gatilho concorrente, fronteira/escala) sem achados. P95 < 2 s sem cache é alcançável por índice; a lacuna em `tasks.priority`/`tasks.due_date` é meta de correção (FR-003/FR-005), não contradição.

## Compliance Check

- **PASS** — `spec.md` segue as convenções do projeto: `spec_type: product`, `epic_id: E007`, `epic_sources: "{PRD:CAP-006}"`, `spec_maturity: clarified`, seções obrigatórias completas, FR-001..005 com dono US1/US2 (ambas P1), SC-001..005, nenhum marcador de clarificação pendente, rastreável ao PRD.
