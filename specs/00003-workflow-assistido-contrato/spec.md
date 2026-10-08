---
feature_branch: 00003-workflow-assistido-contrato
created: 2026-10-06
input: "Geração e revisão da lista de tarefas via OpenCode — abertura e vigência"
spec_type: product
spec_maturity: clarified
epic_id: a-criar
epic_sources: "{novo (fora do PRD); depende de E003, PRD:CAP-003}"
---

# Spec — Workflow Assistido por OpenCode a partir das Definições do Contrato

**Feature Branch**: `00003-workflow-assistido-contrato` · capacidade nova fora do PRD · PRD: specs/prd.md

**Spec Maturity**: clarified

## Problem Statement

Cadastrado o contrato, o gestor monta tarefas à mão e ignora o descritivo de finalidade já existente. As definições ficam dispersas, a lista sai incompleta e o prestador executa sem roteiro. Restam retrabalho e nenhuma auditoria por que cada tarefa existe.

## Scope

### Included

- Definições versionadas do contrato
- Análise no OpenCode e lista sugerida com justificativa por item
- Revisão humana antes do registro: aprovar, remover, editar, refinar
- Lista aprovada vira o workflow oficial das tarefas
- Plano de execução por tarefa e estado visível da geração
- Revisão na vigência com aprovação prévia

### Excluded

- Execução automática — o OpenCode só propõe; o sistema registra após aprovação (FR-009)
- Reanálise automática e medição de uso
- Subtarefas e dependências entre propostas

### Edge Cases & Boundaries

- Falha do OpenCode, inclusive resposta vazia ou não interpretável: definições preservadas, retry manual, nunca sugestão
- Revisão aprovada edita e cria só em A Fazer; mudança em iniciada ou concluída não se aplica e vira conflito (ver Glossário)
- Revisão durante análise aguarda a anterior

## User Scenarios & Testing

### User Story 1 - Definições (Priority: P1)

Gestor preenche e salva as definições do contrato; sem elas a análise não parte.
**Why this priority**: entrada obrigatória.
**Independent Test**: preencher, salvar, recarregar.

**Acceptance Scenarios**:

1. **Given** sem definições, **When** gestor abre a seção, **Then** exige o preenchimento.

### User Story 2 - Sugestão pelo OpenCode (Priority: P1)

Gestor submete definições; OpenCode devolve lista com justificativa, estado visível e retry.
**Why this priority**: núcleo de valor.
**Independent Test**: disparar e inspecionar.

**Acceptance Scenarios**:

1. **Given** definições válidas, **When** análise é pedida, **Then** lista surge com justificativa.
2. **Given** OpenCode fora do ar, **When** análise roda, **Then** falha visível e retry liberado.

### User Story 3 - Aprovação e refinamento (Priority: P1)

Gestor edita, refina ou aprova; aprovação exige um item e ativa o workflow.
**Why this priority**: o humano decide.
**Independent Test**: editar e aprovar.

**Acceptance Scenarios**:

1. **Given** sugestão recebida, **When** gestor edita, **Then** nova versão entra sem apagar histórico.

### User Story 4 - Workflow do contrato (Priority: P1)

Lista aprovada vira as tarefas oficiais no fluxo; ativação dispara evento.
**Why this priority**: conecta os executores.
**Independent Test**: aprovar; ver prestador.

**Acceptance Scenarios**:

1. **Given** workflow aprovado, **When** prestador lista tarefas, **Then** vê no fluxo e sessões recebem evento.

### User Story 5 - Plano de execução (Priority: P1)

Toda tarefa aprovada recebe plano (passos, critérios, riscos) no detalhe de gestor e prestador; geração assíncrona não bloqueia a ativação.
**Why this priority**: plano obrigatório na primeira release.
**Independent Test**: aprovar; abrir detalhe como gestor e prestador.

**Acceptance Scenarios**:

1. **Given** tarefa aprovada, **When** plano é gerado, **Then** aparece no detalhe de gestor e prestador sem mudar status nem atrasar ativação.

### User Story 6 - Histórico (Priority: P3)

Gestor consulta versões de definições, sugestões e planos com autor e data.
**Why this priority**: auditoria e transparência.
**Independent Test**: editar e ler histórico.

**Acceptance Scenarios**:

1. **Given** definições editadas, **When** gestor abre histórico, **Then** vê versões com autor e data.

### User Story 7 - Revisão na vigência (Priority: P2)

Na vigência, gestor revisita a lista; após aprovação, o registro muda.
**Why this priority**: vigência muda parâmetros.
**Independent Test**: revisitar, aprovar, conferir.

**Acceptance Scenarios**:

1. **Given** revisão aprovada, **When** alterações são aplicadas, **Then** só A Fazer muda; concluídas intactas e conflitos sinalizados.

## Requirements

### Functional Requirements

- **FR-001** [US1]: Registrar finalidade, limitações, alvo, escopo, premissas e entregáveis.
- **FR-002** [US1]: Versionar definições por contrato; editar só admin/gestor; gerar, aprovar e revisar só gestor.
- **FR-003** [US1]: Bloquear análise sem definições obrigatórias, informando o que falta.
- **FR-004** [US2]: Enviar ao OpenCode só as 6 definições, identificação e vigência do contrato, com payload montado no servidor.
- **FR-005** [US2]: Receber lista de tarefas com justificativa por item.
- **FR-006** [US2]: Falha do OpenCode — inclusive resposta vazia ou não interpretável — preserva definições, não vira sugestão e permite retry manual.
- **FR-007** [US3]: Só gestor aprova, remove e edita itens; admin e prestador não aprovam.
- **FR-008** [US3]: Refinamento gera nova versão sem apagar a anterior.
- **FR-009** [US3]: Aprovação exige ao menos um item.
- **FR-010** [US4]: Lista aprovada vira o workflow oficial; tarefa criada fora da lista só entra com opt-in do gestor.
- **FR-011** [US4]: Tarefas seguem o fluxo de status e vínculo existentes.
- **FR-012** [US4]: Ativação emite evento realtime na sala do domínio.
- **FR-013** [US4]: Prestador vê só tarefas aprovadas, nunca sugestões.
- **FR-014** [US5]: Plano obrigatório com passos, critérios verificáveis e riscos.
- **FR-015** [US5]: Plano gerado após a ativação sem bloqueá-la, no detalhe de gestor e prestador; regeneração em falha.
- **FR-016** [US5]: Plano não altera status, conclusão, fotos nem histórico.
- **FR-017** [US6]: Histórico de versões com autor e data.
- **FR-018** [US2]: Integração configurável e assíncrona; timeout (padrão 60 s) marca falha e libera retry manual, sem retry automático; 30 s é meta de UX (SC-002).
- **FR-019** [US1]: Isolamento por domínio e papéis.
- **FR-020** [US2]: Contexto limitado à allowlist (6 definições + identificação + vigência); sem partes, CNPJ, valores, contatos nem campo fora do escopo do domínio.
- **FR-021** [US2]: Estado da geração visível sem recarregar, com retry em falha.
- **FR-022** [US7]: Revisão carrega definições e tarefas atuais; sugestão versionada aguarda aprovação.
- **FR-023** [US7]: Aplicação aprovada edita e cria tarefas só em A Fazer, sem remover nem fechar; preserva iniciadas, concluídas e histórico; mudança nelas vira conflito; elegível por status; reabertura cai fora de A Fazer e vira conflito.
- **FR-024** [US7]: Revisão por gatilho manual do gestor, sem reanálise automática.

## Assumptions & Risks

### Assumptions

- Definições em texto livre; obrigatórias validadas no salvamento.
- OpenCode via CLI local, assíncrono com timeout e retry, sem limite nesta release.
- Fluxo de status existente; geração, ativação e revisão: só do gestor; admin edita só definições.
- Revisão não altera tarefas iniciadas ou concluídas nem histórico; reabertura (fluxo existente, fora desta capacidade) devolve a tarefa a Em Progresso, que fica fora de A Fazer e vira conflito na revisão.

### Risks

- Definições sensíveis enviadas ao OpenCode *(likelihood: medium, impact: high)*: allowlist montada no servidor (FR-004/FR-020).
- Sugestões desalinhadas ao contrato *(likelihood: medium, impact: medium)*: aprovação humana obrigatória.

### Dependencies

- E003 (execução de tarefas com evidência): workflow alimenta o fluxo de status.

## Implementation Signals

- `NEW-ENTITY`: ContractDefinition, TaskSuggestion, WorkflowVersion, ExecutionPlan (sql.js por domínio).
- `NEW-API`: definições, análise, revisão, aprovação, plano, evento.
- `NEW-UI`: definições, sugestão/revisão, estado da geração.
- `EXTERNAL-SERVICE`: OpenCode (CLI local).
- `NEW-CONFIG`: flags, timeout, allowlist.
- `NEW-WORKER`: job assíncrono de análise.
- `MIGRATION`: tabelas novas por domínio.

## Success Criteria

SC-001 [US1]: Definições completas persistem ao recarregar.
SC-002 [US2]: Meta: em 9 de 10 análises bem-sucedidas, lista sugerida com justificativa surge em até 30 s com estado visível.
SC-003 [US2]: Nenhuma falha apaga definições; retry disponível na hora.
SC-004 [US3]: Gestor remove, edita, refina e aprova; lista vazia recusa aprovação.
SC-005 [US4]: Prestador vê tarefas no fluxo e sessões recebem evento sem recarregar.
SC-006 [US5]: Toda tarefa aprovada tem plano consultável sem bloquear a ativação; falha permite regenerar.
SC-007 [US6]: Histórico lista versões com autor e data após cada edição.
SC-008 [US7]: Revisão aprovada edita ou cria tarefas A Fazer na mesma sessão, sem alterar iniciadas ou concluídas; conflitos sinalizados.

## Clarifications

### Session 2026-10-06

- Q: Autoridade? -> A: Só gestor; admin só edita definições.
- Q: Revisão altera? -> A: Editar/criar só em A Fazer; alvo iniciada/concluída vira conflito; sem remoção.
- Q: Reaberta? -> A: Elegível por status; reabertura fora desta capacidade.
- Q: Plano? -> A: Obrigatório pós-ativação sem bloquear; gestor e prestador veem.
- Q: Opt-in FR-010? -> A: Tarefa manual só entra com confirmação do gestor.
- Q: Contexto OpenCode? -> A: Allowlist 6 definições + identificação + vigência; payload no servidor.
- Q: SC-002? -> A: Meta 30 s; timeout 60 s vira falha com retry manual, sem retry automático.
- Q: Resposta vazia? -> A: Falha com retry; nunca sugestão; regeneração irrestrita.

## Glossary

| Term | Definition |
|---|---|
| Conflito | Mudança de revisão não aplicada por atingir tarefa iniciada ou concluída; sinalizada ao gestor |
