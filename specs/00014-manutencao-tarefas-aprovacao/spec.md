---
feature_branch: "00014-manutencao-tarefas-aprovacao"
created: 2026-10-17
input: "TODO.md (Pending): manutenção de tarefas — permissão de estado e anexos; aprovação/rejeição do gestor na revisão"
spec_type: product
spec_maturity: clarified
epic_id: "a-criar"
epic_sources: "{TODO.md pendências; fora do PRD; depende de 00001/00005 e 00013}"
---

# Spec — Manutenção de tarefas com aprovação do gestor

## Problem Statement

O prestador leva a tarefa de Revisão a Concluída sozinho (00005 FR-001); o gestor só reage depois, pela reabertura. Faltam registro de aprovação ou rejeição na revisão e permissão de manutenção do estado fora do fluxo nominal. Documentação de como executar e fotos do realizado só entram no fim, sem dono claro para anexos durante a execução.

## Scope

### Included

- Decisão do gestor na Revisão: aprovar (tarefa vai a Concluída) ou rejeitar (volta a Em Progresso com motivo) — supervisão que coexiste com a auto-conclusão do prestador de 00005 FR-001.
- Manutenção do estado da tarefa por papel autorizado, com motivo e registro no histórico — hoje só há o fluxo nominal e a reabertura (00005 FR-006).
- Anexos de documentação (categoria nova, ex.: como-fazer) e fotos do realizado por etapa — gestor/admin em qualquer etapa, prestador na execução; evidência de conclusão (00005 FR-002/FR-003) inalterada.
- Histórico de decisões e mudanças de estado com autor, motivo e data.

### Excluded

- Novos estados no enum `tasks.status` — a decisão reusa os quatro estados atuais (ver Assumptions).
- Aprovação da lista de tarefas do workflow assistido (00003) — aqui a aprovação é por tarefa em execução.
- Classificação de auditoria (00013) — permanece separada sobre os mesmos estados.
- E-mail/aviso sobre decisão — o motor E004 já existe; integração fica para depois.
- Central documental de contrato/ocorrências (PDD-003, excluída em 00005).

### Edge Cases & Boundaries

- Decisão sobre tarefa que saiu de Revisão antes da ação: recusar sem escrita.
- Reabertura (00005) cobre Concluída; rejeição cobre Revisão — sem sobreposição.
- Estados mantidos: a auditoria de 00013 continua operante sobre Revisão e Concluída.
- Domínio cruzado ou suspenso: 403 pelos guards de E001, como nas rotas de tarefa atuais.

## User Scenarios & Testing

### User Story 1 - Aprovação ou rejeição na revisão (Priority: P1)

Como gestor, abro a tarefa em Revisão, leio a evidência do prestador e decido: aprovar confirma e fecha como Concluída; rejeitar devolve ao prestador com motivo que ele lê na hora. A decisão fica registrada com meu nome e data; a conclusão direta do prestador de 00005 continua liberada.

**Why this priority**: é o núcleo do TODO: sem o portão do gestor, a conclusão continua auto-declarada.

**Independent Test**: prestador envia tarefa à Revisão; gestor aprova uma e rejeita outra com motivo; conferir estado e histórico nos dois casos.

**Acceptance Scenarios**:

1. **Given** tarefa em Revisão com evidência, **When** o gestor aprova, **Then** a tarefa fica Concluída e o histórico registra autor, decisão e data.
2. **Given** tarefa em Revisão, **When** o gestor rejeita sem motivo, **Then** 400 e nada muda.
3. **Given** tarefa em Revisão, **When** o gestor rejeita com motivo, **Then** ela volta a Em Progresso e o prestador vê motivo e autor.

### User Story 2 - Manutenção do estado com permissão (Priority: P1)

Como gestor ou admin, corrijo o estado de uma tarefa para qualquer um dos quatro estados fora da sequência nominal (ex.: tarefa esquecida em Em Progresso) informando o motivo; a mudança entra no histórico com meu nome. Quem não tem permissão não vê nem consegue a ação.

**Why this priority**: sem manutenção, estado errado só se resolve com reabertura forçada ou dado travado.

**Independent Test**: mudar estado de uma tarefa por manutenção com motivo e repetir com papel sem permissão.

**Acceptance Scenarios**:

1. **Given** tarefa em Em Progresso, **When** o gestor dá manutenção para Revisão com motivo, **Then** o estado muda e o histórico registra autor, estados e motivo.
2. **Given** prestador tentando manutenção, **When** a requisição chega, **Then** 403 sem alteração.
3. **Given** manutenção sem motivo, **When** a requisição chega, **Then** 400 antes de qualquer escrita.

### User Story 3 - Documentação e fotos anexadas em qualquer etapa (Priority: P2)

Como prestador, gestor ou admin, anexo à tarefa um documento de como fazer (categoria documentação) ou foto do realizado, conforme a etapa: gestor e admin em qualquer momento, prestador na execução; tudo fica no detalhe com autor e data.

**Why this priority**: anexos já existem (00005 FR-004); o ganho de permissão e etapa é real, mas o MVP de aprovação e manutenção funciona sem ele.

**Independent Test**: anexar um PDF de instrução em tarefa Em Progresso e uma foto em Revisão; abrir o detalhe como gestor e prestador.

**Acceptance Scenarios**:

1. **Given** tarefa Em Progresso, **When** o prestador anexa documentação, **Then** o arquivo aparece no detalhe com autor e data.
2. **Given** arquivo com tipo ou tamanho fora do padrão, **When** o upload chega, **Then** 400 sem gravar arquivo nem registro.

## Requirements

### Functional Requirements

- **FR-030** [US1]: Sistema MUST permitir ao gestor, em tarefa em Revisão, aprovar (vai a Concluída) ou rejeitar (volta a Em Progresso com motivo obrigatório), em adição à auto-conclusão do prestador de 00005 FR-001, inalterada — aprovação é supervisão, não substituição.
- **FR-031** [US1]: Sistema MUST registrar toda decisão no histórico com autor, tipo (aprovação/rejeição), motivo quando rejeição, e data.
- **FR-032** [US1]: Sistema MUST responder 400 sem escrita para rejeição sem motivo e 403 para decisão de papel diverso do gestor.
- **FR-033** [US2]: Sistema MUST permitir a gestor e admin mudar a tarefa para qualquer um dos quatro estados fora da sequência nominal, com motivo obrigatório; prestador e system_admin NÃO têm manutenção.
- **FR-034** [US2]: Sistema MUST registrar toda manutenção no histórico com autor, estado anterior, novo estado, motivo e data.
- **FR-035** [US2]: Sistema MUST aplicar isolamento de domínio e suspensão (403) às rotas de decisão e manutenção como nas rotas de tarefa atuais.
- **FR-036** [US3]: Sistema MUST aceitar anexo de categoria nova "documentação de como fazer", distinta da foto de evidência de conclusão (00005 FR-001..003, inalterada): gestor e admin anexam em qualquer estado, prestador em A Fazer, Em Progresso e Revisão; uploads mantêm validação de tipo/tamanho e gravação do arquivo antes da referência no banco.
- **FR-037** [US3]: Sistema MUST expor os anexos no detalhe da tarefa para todo papel que já acessa a tarefa, com autor e data.

### Key Entities

- **Decisão de revisão**: registro de aprovação ou rejeição de uma tarefa em Revisão, com autor, motivo (rejeição) e data.
- **Manutenção de estado**: registro de mudança de estado fora do fluxo nominal, com autor, motivo, estados anterior/novo e data.
- **Tarefa e anexo**: entidades existentes (00001/00005); esta feature acrescenta permissões e registros de decisão, não as substitui.

## Assumptions & Risks

### Assumptions

- Rejeição devolve a tarefa a Em Progresso (estado existente), espelhando a reabertura; nenhum estado novo no enum `tasks.status`.
- O enum de papéis não muda; manutenção restrita a gestor e admin (FR-033).
- A conclusão documentada do prestador (00005 FR-002/FR-003) permanece inalterada; a aprovação do gestor é supervisão adicional registrada, não etapa obrigatória.
- A classificação de auditoria (00013) permanece sobre Revisão e Concluída sem alteração.

### Risks

- **Quebra do fluxo existente** *(likelihood: medium, impact: high)*: mexer em Revisão → Concluída afeta telas, testes E2E e regras de 00001/00003/00005; mitigação: ações aditivas, mantendo enum, estados e auto-conclusão do prestador.
- **Manutenção como atalho** *(likelihood: medium, impact: medium)*: mudança de estado sem motivo viraria contorno da evidência; mitigação: motivo obrigatório e histórico.
- **Duplicação com anexos existentes** *(likelihood: low, impact: low)*: categoria nova de documentação convive com a evidência de conclusão; mitigação: categorias distintas e evidência de 00005 inalterada (FR-036).

## Implementation Signals

- `NEW-API` — aprovação/rejeição em Revisão e manutenção de estado nas rotas de tarefa (`/api/v2`).
- `NEW-UI` — ações de aprovar/rejeitar e de manutenção no detalhe da tarefa; composição de anexos em qualquer etapa.
- `NEW-ENTITY` — registro de decisão de revisão e de manutenção no histórico de tarefa.
- `MIGRATION` — categoria nova de anexo (documentação) e novos tipos de linha no histórico.

## Success Criteria

### Measurable Outcomes

SC-001 [US1]: Toda aprovação ou rejeição de gestor fica registrada com autor e data; rejeição devolve a Em Progresso com motivo visível ao prestador, e rejeição sem motivo nunca passa pela API.
SC-002 [US2]: Toda mudança de estado por manutenção aparece no histórico com autor, motivo e data; papel sem permissão recebe 403 sem nenhuma alteração.
SC-003 [US3]: Documentação e fotos anexadas em qualquer etapa ficam visíveis no detalhe da tarefa com autor e data, e upload inválido continua sem deixar resíduo.

## Glossary

| Term | Definition |
|------|------------|
| Manutenção de estado | Mudança do estado de uma tarefa fora do fluxo nominal, com motivo e registro, por papel autorizado |
| Decisão de revisão | Aprovação ou rejeição do gestor sobre tarefa em Revisão, com registro no histórico |

## Compliance Check

- **Result**: PASS.
