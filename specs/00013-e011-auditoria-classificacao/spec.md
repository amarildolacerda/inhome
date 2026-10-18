---
spec_type: product
epic_id: E011
epic_sources: "{PRD:CAP-003}"
spec_maturity: clarified
---

# Spec: Acesso de auditoria e classificação de tarefas executadas (00013)

## Problem Statement

CAP-003 prova o que foi feito — texto, fotos e histórico de reabertura —, mas quem audita não tem como olhar as tarefas executadas nem registrar o que achou: o gestor vê o painel (E006) e o relatório prova por contrato (E008), nenhum com olhar de auditoria. A pendência está no TODO desde a baseline; sem o papel que lê e classifica as executadas, a release fecha sem a trilha da CAP-003.

## Scope

### Included
- Papel `auditor` no enum, habilitável pelo admin no CRUD de usuários de E001.
- Visão de auditoria: tarefas do domínio em Revisão ou Concluída, com histórico e anexos de E003.
- Classificação por tarefa: um dos três estados, nota opcional de até 500 caracteres, autor e data; registro único substituído na reclassificação.
- Leitura e escrita para `auditor`, `admin` e `gestor` do domínio; `prestador` e `system_admin` com 403.
- Migração aditiva preguiçosa em inglês (precedente `alert_events`), sem alterar `tasks`/`task_history`.
- Entrada Auditoria no Flutter para `auditor`, `admin` e `gestor`.

### Excluded
- Aprovação e histórico de versões da classificação — gravação imediata.
- Relatório e filtros de classificação — E008 e E007 inalterados.
- Auditoria de eventos de sistema; o escopo é tarefa executada.
- Mudança no fluxo de tarefa ou em conclusão/reabertura de E003; tela nova de papéis.

### Edge Cases & Boundaries
- Reabertura: registro permanece no detalhe, tarefa sai da visão de executadas e volta a classificar só em Revisão ou Concluída.
- Domínio sem executadas: lista vazia com 200.
- Outro domínio ou suspenso: 403/404 antes de qualquer leitura (guardas de E001).
- Estado fora dos três ou nota acima de 500 caracteres: 400.
- Concorrência: última gravação vence, sem trava otimista, sempre com autor e data correntes; nunca dois registros.

## User Scenarios & Testing

### User Story 1 - Auditoria e classificação das tarefas executadas (Priority: P1)
Como auditor, na visão de auditoria do meu domínio, vejo as tarefas executadas (Revisão e Concluída) com histórico e anexos e classifico cada atendimento em um dos três estados, com nota quando algo ficou a corrigir.

**Why this priority**: razão de existir da épica — sem leitura e classificação não há trilha e o TODO item 3 continua aberto.

**Independent Test**: habilitar o papel, listar as executadas, classificar uma como `deficiente (a corrigir)` com nota e conferir estado, nota, autor e data; tarefa de outro domínio não aparece e responde 403.

**Acceptance Scenarios**:

1. **Given** tarefas em Revisão e Concluída no domínio, **When** o auditor abre a visão, **Then** aparecem exatamente essas com histórico e anexos, nenhuma de outro domínio.
2. **Given** tarefa executada visível, **When** o auditor classifica como `deficiente (a corrigir)` com a nota "falta foto da calha", **Then** estado, nota, autor e data ficam registrados e legíveis na visão.
3. **Given** classificação registrada, **When** o auditor ou o gestor reclassificam a mesma tarefa, **Then** o registro é substituído com autor e data da última mudança — nunca dois registros.

### User Story 2 - Papel controlado e isolado (Priority: P1)
Como admin, habilito o papel auditor pelo cadastro existente; sessões sem nenhum papel de auditoria não acessam rota ou tela de auditoria, e o auditor não enxerga fora do domínio.

**Why this priority**: sem o papel no enum e nos guards, dados de auditoria ficam abertos ou o recurso é inútil — segurança P1 que destrava a US1.

**Independent Test**: habilitar e remover o papel; prestador e sessão sem papel recebem 403; domínio A não lê tarefa do domínio B.

**Acceptance Scenarios**:

1. **Given** sessão de `prestador` ou `system_admin`, **When** acessa as rotas de auditoria, **Then** recebe 403 e nenhuma entrada de auditoria aparece na navegação.
2. **Given** papel `auditor` habilitado pelo admin, **When** o usuário faz login, **Then** a navegação mostra Auditoria e as rotas aceitam a sessão do próprio domínio.
3. **Given** sessão do domínio A, **When** pede tarefa ou classificação do domínio B, **Then** a resposta é 403 sem vazar dados.

## Requirements

- **FR-001** [US1]: a visão de auditoria MUST retornar as tarefas do domínio do token nos estados Revisão e Concluída, com histórico e anexos, excluindo tarefas de outros domínios ou de domínio suspenso.
- **FR-002** [US1]: a classificação MUST aceitar exatamente um dos três estados (`atendido plenamente`, `atendido com resalva`, `deficiente (a corrigir)`) com nota opcional de até 500 caracteres, gravando autor e data; estado inválido ou nota acima do limite MUST responder 400 sem escrita.
- **FR-003** [US1]: cada tarefa MUST ter no máximo um registro de classificação corrente; reclassificação MUST substituir o registro mantendo autor e data da última mudança, sem versões anteriores preservadas.
- **FR-004** [US1]: classificação MUST ser aceita apenas para tarefa em Revisão ou Concluída do mesmo domínio, de forma imediata e sem aprovação; tarefa reaberta sai da visão de executadas e o registro permanece.
- **FR-005** [US2]: o enum de papéis MUST incluir `auditor`, aceito na criação e alteração de usuário pelo admin, mantendo 400 para papel desconhecido.
- **FR-006** [US2]: rotas de leitura e classificação MUST exigir `auditor`, `admin` ou `gestor` (403 para `prestador`, `system_admin` e sessões sem papel) e aplicar o isolamento de domínio de E001 antes de qualquer consulta; classificação fica invisível para `prestador`.
- **FR-007** [US2]: o frontend MUST exibir a entrada Auditoria para `auditor`, `admin` e `gestor`, nunca para `prestador` ou `system_admin`, sem expor ação a papéis sem permissão.

## Key Entities

- **Tarefa executada**: em Revisão ou Concluída no domínio, com histórico e anexos de E003.
- **Classificação de atendimento**: registro único por tarefa: estado, nota opcional, autor e data da última mudança.
- **Papel auditor**: lê as executadas do domínio e classifica, sem alterar fluxo, evidência ou cadastro.

## Assumptions & Risks

### Assumptions

- Habilitação do papel usa o CRUD de usuários de E001 — nenhuma tela nova de papéis.
- Classificação pertence à tarefa, não à sessão; registros permanecem legíveis após reabertura.
- `task_history` e anexos seguem os de E003 — classificação é dado adjunto, sem novo evento.

### Risks

- **Vazamento de domínio** *(likelihood: low, impact: high)*: rota nova sem isolamento expõe tarefas de outro cliente. Mitigação: guardas por rota e teste negativo.
- **Papel com permissão inflada** *(likelihood: medium, impact: medium)*: `auditor` cai em lista que escreve no fluxo. Mitigação: `requireRole()` por rota e teste 403 por papel.
- **Migração colidindo com a base entregue** *(likelihood: low, impact: medium)*: DDL novo quebra bancos existentes. Mitigação: migração aditiva preguiçosa no precedente `alert_events`.

## Implementation Signals

- [`NEW-ENTITY`] — registro de classificação por tarefa (estado, nota, autor, data).
- [`MIGRATION`] — migração aditiva preguiçosa em inglês, `migrateSchema()` antes de `applySchema()`.
- [`NEW-API`] — rotas de leitura e classificação sob `requireRole()` e isolamento de domínio; enum de papéis estendido.
- [`NEW-UI`] — tela de auditoria e entrada de navegação por papel no Flutter.

## Success Criteria

SC-001 [US1]: A visão do auditor lista exatamente as tarefas Revisão/Concluída do próprio domínio — zero de outros domínios com dois domínios populados — e devolve histórico e anexos íntegros.
SC-002 [US1]: Toda classificação aceita fica atribuível (estado válido, nota de até 500 caracteres, autor, data) e substitui a anterior sem duplicar registro; estado fora dos três responde 400.
SC-003 [US2]: Sem nenhum dos papéis aceitos (prestador, system_admin ou sessão sem permissão), nenhuma rota de auditoria responde além de 403 e nenhuma entrada aparece na navegação; com o papel habilitado, o acesso fica restrito ao domínio da sessão.

## Glossary

| Term | Definition |
|------|------------|
| Tarefa executada | Tarefa do domínio em Revisão ou Concluída — o que o auditor lê. |
| Classificação de atendimento | Registro único por tarefa: estado (três categorias), nota opcional (até 500 caracteres), autor e data. |

## Clarifications

### Session 2026-10-11

- Q: Quem vê a entrada Auditoria na navegação? -> A: auditor, admin e gestor — os mesmos que leem e reclassificam.
- Q: Qual o limite da nota opcional? -> A: 500 caracteres; acima, 400 sem escrita.
- Q: A reclassificação preserva versões anteriores? -> A: não — só o registro corrente com autor e data.
- Q: Classificação exige aprovação? -> A: não — gravação imediata, sem estado pendente.
- Q: O que acontece na reabertura? -> A: registro permanece, sai da visão e volta a classificar só em Revisão/Concluída.
- Q: O prestador vê a classificação? -> A: não — campo restrito a auditor, admin e gestor.

## Stress-Test Findings

### Session 2026-10-11

STF-001: [cross-requirement-contradiction] (MEDIUM) — Affected: FR-006, FR-007, SC-003 — FR-007 restringia a entrada ao auditor enquanto FR-006 aceita admin e gestor; ficariam sem entrada mas com API.
STF-002: [cross-requirement-contradiction] (MEDIUM) — Affected: US2, SC-003 — "usuário sem o papel" não distinguia prestador (403) de admin e gestor aceitos por FR-006.
STF-003: [boundary-scale-stress] (MEDIUM) — Affected: FR-002, SC-002 — FR-002 punia nota acima do limite sem definir o limite; nenhum valor de teste era verificável.
STF-004: [cross-requirement-contradiction] (MEDIUM) — Affected: FR-003, SC-002 — última gravação vence na concorrência sem destino para a gravação anterior perdida.

## Compliance Check

Policy Auditor (inline, depth-blocked): PASS — §Technology Stack, PRESERVE_EXISTING_LAYOUT.
