---
feature_branch: "00016-convite-visitante"
created: "2026-10-24"
input: "V2: link temporário por gestor/admin, visitante e reavaliação"
spec_type: "product"
spec_maturity: "clarified"
epic_id: "E015"
epic_sources: "{V2 user; estende E001 e E003}"
---

# Spec: Convite temporário e papel visitante

**Feature Branch**: `00016-convite-visitante` · **Created**: 2026-10-24 · **Status**: Clarified · **Epic ID**: E015

## Problem Statement

O acesso hoje só nasce por cadastro de admin (00002 FR-008): não existe como convidar alguém de fora com prazo determinado. Contratante eventual ou parceiro que acompanha a execução ou vira prestador permanente sem janela de fim, ou fica de fora. Depois da entrada não há reavaliação estruturada: mudar o papel ou cortar o acesso depende do fluxo genérico de usuários, sem lastro do convite.

## Scope

### Included

- Link de convite gerado por gestor ou admin para um contrato, com validade escolhida no ato (24 h, 7 dias, 30 dias).
- Cadastro público do convidado pelo link como `visitante` no domínio do emissor, com leitura limitada às tarefas daquele contrato.
- Uso múltiplo do link até expirar; um cadastro por e-mail por link.
- Lista de convites ativos (contrato, prazo, uso) com revogação antes do vencimento.
- Reavaliação pelo gestor/admin: mudar o papel do visitante ou suspender o acesso, com histórico de autor e data.

### Excluded

- Convite por e-mail automático — o emissor compartilha o link pelo canal que quiser (e-mail do E012 fica fora).
- Papéis novos além de `visitante`; visitante não é variante de prestador.
- Acesso a contratos além do contrato do convite; múltiplos contratos num link.
- Autenticação social; convites de system_admin ou entre domínios.

### Edge Cases & Boundaries

- Link expirado ou revogado: cadastro recusado sem criar usuário e sem vazar se o token existiu.
- E-mail já no domínio ou já registrado por aquele link: 409, sem alteração (00002 FR-008).
- Rota fora das tarefas do contrato do convite: 403/404 sem vazar conteúdo; contrato encerrado, o visitante segue vendo as tarefas dele.
- Visitante suspenso: login e sessão negados como em 00002; promovido passa pela matriz do novo papel, com origem no histórico.

## User Scenarios & Testing

### User Story 1 - Emissão de link temporário para um contrato (Priority: P1)

Como gestor ou admin, gero um link de convite para um contrato escolhendo a validade (24 h, 7 dias ou 30 dias); ele fica na minha lista com contrato, prazo e uso, e posso revogá-lo antes do vencimento.

**Why this priority**: é a porta de entrada — sem link com prazo não existe visitante.

**Independent Test**: gerar link de 7 dias para o contrato C; conferir prazo e contrato; revogar e tentar cadastro → recusado.

**Acceptance Scenarios**:

1. **Given** gestor autenticado, **When** gera convite de 7 dias para o contrato C, **Then** o link nasce com expiração em 7 dias, contrato C e emissor registrado.
2. **Given** convite ativo, **When** o prazo vence ou o emissor revoga, **Then** o cadastro pelo link é recusado sem criar usuário.

### User Story 2 - Cadastro do convidado como visitante (Priority: P1)

Como convidado, abro o link, me cadastro com nome, e-mail e senha e entro como visitante; só enxergo as tarefas do contrato do convite.

**Why this priority**: sem o cadastro automático como visitante, o link não serve.

**Independent Test**: usar link válido, completar cadastro, logar e confirmar que a listagem mostra só as tarefas do contrato do convite.

**Acceptance Scenarios**:

1. **Given** link válido, **When** o convidado envia nome, e-mail e senha, **Then** o usuário é criado como visitante no domínio do emissor e consegue logar.
2. **Given** visitante logado, **When** lista tarefas, **Then** vê apenas as do contrato do convite; tarefa de outro contrato responde 404.
3. **Given** e-mail já existente no domínio ou já registrado por aquele link, **When** tenta cadastro, **Then** 409 e nada muda.
4. **Given** link expirado, **When** tenta cadastro, **Then** recusa sem criar usuário.

### User Story 3 - Reavaliação da participação (Priority: P1)

Como gestor ou admin, reavaliando a participação: mudo o papel do visitante (ex.: para prestador) ou suspendo o acesso; a mudança entra no histórico com meu nome e data.

**Why this priority**: fecha o ciclo do V2 — entrada temporária sem saída estruturada deixa acesso órfão.

**Independent Test**: promover visitante a prestador e confirmar a nova visão; suspender outro e confirmar login negado e sessão antiga recusada.

**Acceptance Scenarios**:

1. **Given** visitante ativo, **When** o gestor muda o papel para prestador, **Then** o usuário opera pela matriz do prestador e o histórico registra autor, papel anterior, novo papel e data.
2. **Given** visitante ativo, **When** o admin suspende o acesso, **Then** login e chamadas autenticadas são negados e o histórico registra a suspensão.
3. **Given** usuário com outro papel, **When** gestor tenta ação restrita a admin, **Then** 403 sem mudança.

## Requirements

### Functional Requirements

- **FR-044** [US1]: O sistema DEVE permitir que gestor e admin gerem link de convite de um contrato do próprio domínio, com validade entre opções predefinidas (24 h, 7 dias, 30 dias) e token opaco.
- **FR-045** [US1]: O sistema DEVE manter lista de convites do domínio visível a gestor e admin, com contrato, emissor, expiração, estado (ativo/expirado/revogado) e cadastros consumidos, e permitir revogar convite ativo.
- **FR-046** [US2]: O sistema DEVE expor cadastro público por link válido que cria usuário visitante no domínio do emissor com nome, e-mail e senha; link expirado ou revogado, e-mail existente no domínio (409) e segundo cadastro do mesmo e-mail no mesmo link (409) são recusados, sem vazar token inválido.
- **FR-047** [US2]: O sistema DEVE restringir o visitante às tarefas do contrato do convite: listagem e detalhe fora daquele contrato negados (403/404), demais rotas negadas pela matriz com visitante.
- **FR-048** [US3]: O sistema DEVE aceitar o papel visitante na validação de papéis e estender a matriz de permissões de 00002 com o escopo do visitante (FR-047).
- **FR-049** [US3]: O sistema DEVE permitir que gestor e admin alterem o papel de um visitante para qualquer papel válido ou suspendam seu acesso, com histórico de autor, mudança e data; a mudança reorienta a matriz na hora e a suspensão nega login e sessão como em 00002.
- **FR-050** [US3]: O sistema DEVE registrar em histórico emissão de convite, cadastro consumido e toda reavaliação, auditável quanto à origem do acesso.

### Key Entities

- **Convite**: acesso temporário com token opaco, domínio, contrato, emissor, expiração na geração, estado (ativo/revogado; expirado deriva da data) e e-mails consumidos.
- **Usuário visitante**: usuário do domínio com leitura limitada ao contrato do convite; promovível e suspensível.
- **Histórico de acesso**: linhas de emissão, cadastro e reavaliação ligando usuário e convite.

## Glossary

- **Visitante**: papel de quem entra pelo convite; vê só as tarefas do contrato do convite até a reavaliação.
- **Convite**: link de acesso temporário emitido por gestor ou admin para um contrato.
- **Emissor**: gestor ou admin que gerou o convite e responde pela reavaliação.
- **Reavaliação**: mudança de papel ou suspensão após a entrada.

## Assumptions & Risks

### Assumptions

- Duração no ato entre opções fixas (24 h, 7 dias, 30 dias) com expiração absoluta; uso múltiplo até expirar com um cadastro por e-mail por link; visão do visitante só as tarefas do contrato do convite, com detalhe e anexos existentes — decisões de 2026-10-24.
- O token é opaco, aleatório e tratado como credencial compartilhada fora do sistema.
- Suspensão e mudança de papel reusam a superfície de usuários de 00002 FR-008.

### Risks

- **Vazamento de escopo do visitante** *(likelihood: medium, impact: high)*: rota fora da matriz e visitante lê dado de outro contrato. Mitigação: deny-by-default de 00002 FR-005; casos negativos na suíte.
- **Link como credencial longa** *(likelihood: low, impact: medium)*: emissor sempre escolhe 30 dias. Mitigação: opções curtas; revogação; expiração obrigatória.
- **Papel novo na base** *(likelihood: low, impact: medium)*: validação vigente rejeita visitante. Mitigação: precedente de E011 com teste de migração.
- **Abuso do cadastro aberto** *(likelihood: low, impact: medium)*: token vazado gera cadastros indevidos. Mitigação: revogação; um cadastro por e-mail por link.

## Implementation Signals

- `NEW-API`: `POST/GET /api/v2/invites`, `DELETE /api/v2/invites/:id` e cadastro público `POST /api/v2/invites/:token/register`.
- `NEW-TABLE`: convites e cadastros consumidos no schema por domínio, com aceitação do papel visitante no padrão E011 (`backend/src/config/database.js`).
- `NEW-UI`: tela de convites para gestor/admin e tela pública de cadastro pelo link.
- Guards: `requireRole` e `canSeeTask` com papel visitante e escopo por contrato do convite.

## Success Criteria

### Measurable Outcomes

SC-001 [US1]: Gestor gera link de 7 dias; a lista mostra contrato, expiração e estado; após revogar, o link é recusado no cadastro.
SC-002 [US2]: Convidado completa o cadastro e loga como visitante; vê só as tarefas do contrato do convite.
SC-003 [US2]: E-mail já no domínio ou já registrado por aquele link é recusado sem alteração; link expirado não cria usuário.
SC-004 [US3]: Promoção a prestador reorienta a visão para as próprias tarefas e suspensão nega o acesso, ambas com histórico de autor e data.
SC-005 [US3]: Todo acesso de visitante remete a um convite válido ou a uma reavaliação registrada — promovido opera pela matriz do novo papel e suspenso não entra.

## Clarifications

### Session 2026-10-24

- Q: Escopo do visitante? -> A: Só as tarefas do contrato do link.
- Q: Uso/validade do link? -> A: Múltiplo até expirar, um cadastro por e-mail; duração no ato (24 h, 7 d, 30 d).
- Q: Reavaliação? -> A: Mudança de papel ou suspensão, com histórico.