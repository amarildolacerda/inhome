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

## Problem Statement

O acesso nasce só por cadastro de admin (00002 FR-008): falta convite com prazo para o contratante eventual e reavaliação após a entrada — mudar papel ou cortar acesso é fluxo sem lastro do convite.

## Scope

### Included

- Link de convite por contrato, de gestor/admin, com validade no ato (24 h/7 d/30 d).
- Cadastro público como `visitante`, só as tarefas do contrato.
- Uso múltiplo do link; um cadastro por e-mail por domínio.
- Lista de convites (contrato, prazo, uso) revogável antes do vencimento.
- Reavaliação por gestor/admin, com histórico de autor e data.

### Excluded

- Convite por e-mail automático: o emissor compartilha o link.
- Papéis novos além de `visitante`.
- Acesso a outros contratos ou múltiplos num link.
- Autenticação social; convites de system_admin ou entre domínios.

### Edge Cases & Boundaries

- Link expirado/revogado: cadastro recusado, sem usuário nem token.
- E-mail já registrado no domínio: 409, sem alteração, convite não consumido.
- Rota fora das tarefas do contrato: 404 (tarefas) / 403 (demais), sem vazar conteúdo; encerrado mantém tarefas visíveis.
- Suspenso: login e sessão negados como em 00002; promovido segue a matriz do novo papel.

## User Scenarios & Testing

### User Story 1 - Emissão de link temporário para um contrato (Priority: P1)

Como gestor ou admin, gero um link com validade (24 h, 7 dias ou 30 dias); fica na lista com contrato, prazo e uso.

**Why this priority**: sem link com prazo não existe visitante.

**Independent Test**: gerar link de 7 dias para C, revogar e tentar cadastro → recusado.

**Acceptance Scenarios**:

1. **Given** gestor autenticado, **When** gera convite de 7 dias para C, **Then** nasce com expiração, contrato C e emissor.
2. **Given** convite ativo, **When** o prazo vence ou é revogado, **Then** o cadastro é recusado sem criar usuário.

### User Story 2 - Cadastro do convidado como visitante (Priority: P1)

Como convidado, abro o link, me cadastro (nome, e-mail, senha) e entro como visitante; vejo só as tarefas do contrato.

**Why this priority**: sem cadastro como visitante, o link não serve.

**Independent Test**: usar link válido, logar e ver só as tarefas do contrato na listagem.

**Acceptance Scenarios**:

1. **Given** link válido, **When** envia nome, e-mail e senha, **Then** nasce visitante no domínio do emissor e loga.
2. **Given** visitante logado, **When** lista tarefas, **Then** só as do contrato; tarefa de outro contrato → 404.
3. **Given** token inválido, expirado ou revogado, **When** envia cadastro, **Then** o mesmo 409 e a mesma mensagem, sem escrita.
4. **Given** IP acima do teto, **When** envia cadastro, **Then** 429, sem escrita.
5. **Given** senha com menos de 6 caracteres, **When** envia cadastro, **Then** 400, sem escrita.

### User Story 3 - Reavaliação da participação (Priority: P1)

Como gestor ou admin, mudo o papel do visitante (ex.: prestador) ou suspendo o acesso; entra no histórico com autor e data.

**Why this priority**: entrada temporária sem saída estruturada deixa acesso órfão.

**Independent Test**: promover visitante a prestador e ver a nova visão; suspender e ver login e sessão negados.

**Acceptance Scenarios**:

1. **Given** visitante ativo, **When** o gestor muda o papel para prestador, **Then** opera pela matriz do prestador e o histórico registra autor, papéis e data.
2. **Given** visitante ativo, **When** o admin suspende o acesso, **Then** login e sessão negados, com histórico.
3. **Given** usuário com outro papel, **When** gestor tenta ação restrita a admin, **Then** 403 sem mudança.

## Requirements

### Functional Requirements

- **FR-044** [US1]: O sistema DEVE permitir que gestor e admin gerem link de convite de contrato do próprio domínio, com validade fixa no ato (24 h, 7 dias, 30 dias) e token opaco ≥ 128 bits, exposto só na criação (201), nunca em listagem, erro ou log.
- **FR-045** [US1]: O sistema DEVE listar convites do domínio para gestor e admin (contrato, emissor, expiração, estado, cadastros), revogáveis; revogação ou expiração suspende os visitantes do convite — autor: emissor na expiração, ator na revogação —; a suspensão prevalece sobre mudança de papel concorrente.
- **FR-046** [US2]: O sistema DEVE expor cadastro público por link válido que cria visitante no domínio do emissor (nome, e-mail, senha com ≥ 6 caracteres; username do e-mail com sufixo em colisão; sem verificação de posse; rate limit por IP); recusas 409: link expirado/revogado e e-mail já registrado no domínio, inclusive em outro convite, não consumido, sem vazar token inválido.
- **FR-047** [US2]: O sistema DEVE restringir o visitante às tarefas do contrato do convite: listagem e detalhe fora do contrato → 404, demais rotas fora da matriz → 403, e a guarda revalida o convite na requisição (nega em T+0).
- **FR-048** [US3]: O sistema DEVE aceitar o papel visitante e estender a matriz de permissões de 00002 com o escopo do visitante (FR-047).
- **FR-049** [US3]: O sistema DEVE permitir que gestor e admin alterem o papel de um visitante ativo ou suspendam seu acesso, com histórico de autor, papéis e data; gestão de usuário de outro papel é de admin (gestor leva 403), promover exige visitante ativo e reativar exige convite válido ou reavaliação registrada; a mudança reorienta a matriz e a suspensão nega login e sessão como em 00002.
- **FR-050** [US3]: O sistema DEVE registrar em histórico emissão, cadastro e reavaliação, auditável na origem do acesso.

### Key Entities

- **Convite**: token opaco, contrato, emissor, expiração, estado (ativo/revogado; expirado deriva da data) e e-mails consumidos.
- **Usuário visitante**: só lê o contrato do convite; promovível e suspensível.
- **Histórico de acesso**: emissão, cadastro e reavaliação.

## Glossary

- **Visitante**: entra pelo convite; vê só as tarefas do contrato.
- **Convite**: link temporário para um contrato.
- **Emissor**: gerou o convite; responde pela reavaliação.
- **Reavaliação**: mudança de papel ou suspensão após entrada.

## Assumptions & Risks

### Assumptions

- Duração fixa no ato (24 h/7 d/30 d), expiração absoluta; um cadastro por e-mail por domínio; visitante só vê tarefas do contrato.
- O token é credencial compartilhada fora do sistema.
- Suspensão e mudança de papel reusam a superfície de usuários de 00002.

### Risks

- **Vazamento de escopo** *(likelihood: medium, impact: high)*: visitante lê dado de outro contrato. Mitigação: deny-by-default de 00002 FR-005.
- **Link como credencial longa** *(likelihood: low, impact: medium)*: emissor escolhe só 30 dias. Mitigação: opções curtas e revogação.
- **Papel novo na base** *(likelihood: low, impact: medium)*: validação vigente rejeita visitante. Mitigação: precedente de E011.
- **Abuso do cadastro aberto** *(likelihood: low, impact: medium)*: token vazado gera cadastros. Mitigação: rate limit por IP; um cadastro por e-mail por domínio.

## Implementation Signals

- `NEW-API`: `POST/GET/DELETE /api/v2/invites` e `POST /api/v2/invites/:token/register`.
- `NEW-TABLE`: convites e cadastros no schema por domínio; papel visitante no padrão E011 (`backend/src/config/database.js`).
- `NEW-UI`: tela de convites e página pública de cadastro.
- Guards: `requireRole` e `canSeeTask` com escopo do visitante.

## Success Criteria

SC-001 [US1]: Gestor gera link de 7 dias; a lista mostra contrato, expiração e estado, sem o token; erros e logs nunca o contêm; revogado, é recusado no cadastro.
SC-002 [US2]: Convidado completa o cadastro e loga como visitante; vê só as tarefas do contrato.
SC-003 [US2]: E-mail já registrado no domínio é recusado sem alteração e sem consumir o convite; link expirado não cria usuário.
SC-004 [US3]: Promoção a prestador reorienta a visão e suspensão nega o acesso, ambas com histórico de autor e data.
SC-005 [US3]: Todo acesso de visitante remete a convite válido ou reavaliação registrada — promovido opera pela matriz do novo papel e suspenso não entra.

## Clarifications

### Session 2026-10-24

- Q: Escopo do visitante? -> A: Só as tarefas do contrato do link.
- Q: Uso/validade? -> A: Múltiplo até expirar, um cadastro por e-mail; duração no ato (24 h, 7 d, 30 d).
- Q: Reavaliação? -> A: Mudança de papel ou suspensão, com histórico.

### Session 2026-11-16

- Q: Revogar/expirar? -> A: Suspende os visitantes do convite, com histórico (FR-045).
- Q: Escopo da reavaliação? -> A: Só visitantes; gestor em outro papel leva 403 (FR-049).
- Q: Username? -> A: Derivado do e-mail com sufixo em colisão (FR-046).
- Q: Proteção do token? -> A: ≥ 128 bits e rate limit por IP no cadastro (FR-044/046).
- Q: Verificação de e-mail? -> A: Não; o link é a credencial (FR-046).

## Stress-Test Findings

### Session 2026-11-16

STF-001: [concurrent-trigger-ambiguity] (HIGH) — Affected: FR-045, FR-049, SC-004, SC-005, US3 — Sem precedência entre suspensão por convite e reavaliação; suspenso promovido indefinido.
STF-002: [cross-requirement-contradiction] (HIGH) — Affected: FR-046, FR-047, SC-003, US2 — Dedup por link vs domínio deixa convite válido sem resultado definido.
STF-003: [boundary-scale-stress] (MEDIUM) — Affected: FR-045, FR-047, SC-005 — Expiração sem prazo de imposição; SC-005 falha.
STF-004: [constraint-impossibility] (MEDIUM) — Affected: FR-045, FR-050, SC-004 — Expiração sem ator para a coluna de autor do histórico.
STF-005: [cross-requirement-contradiction] (MEDIUM) — Affected: FR-047, SC-002, US2 — FR-047 admite 403/404; SC-002 exige 404.

## Compliance Check

**Instructions Check (2026-11-16): PASS** — I/II/III N/A · IV style PASS · stack/testing/layout/governance PASS · IDs únicos · 0 markers. **Violations**: none.