---
feature_branch: "00016-convite-visitante"
created: "2026-10-24"
spec_type: "product"
spec_maturity: "clarified"
epic_id: "E015"
epic_sources: "{V2 user; estende E001 e E003}"
---

# Spec: Convite temporário e papel visitante

## Problem Statement

Acesso nasce só por cadastro de admin (00002 FR-008): falta convite com prazo para o contratante eventual e reavaliação após a entrada; mudar papel ou cortar acesso não tem lastro.

## Scope

### Included

- Convite por contrato (gestor/admin), validade no ato, lista com estado e revogação.
- Cadastro público como `visitante`, só as tarefas do contrato; um cadastro por e-mail por domínio.
- Reavaliação por gestor/admin com histórico de autor e data.

### Excluded

- Convite por e-mail automático (emissor compartilha o link); papéis novos além de `visitante`; outros contratos num link; autenticação social; convites de system_admin ou entre domínios.

### Edge Cases & Boundaries

- Link expirado/revogado: cadastro recusado, sem usuário nem token; contrato encerrado não recusa.
- E-mail já registrado no domínio: 409, sem alteração nem consumo.
- Rota fora das tarefas: 404 (tarefas) / 403 (demais); encerrado mantém tarefas visíveis.
- Suspenso/expirado em voo: 403 padrão e sessão negada como em 00002; promovido segue a matriz nova.

## User Scenarios & Testing

### User Story 1 - Emissão de link temporário para um contrato (Priority: P1)

Como gestor ou admin, gero link com validade (24 h, 7 ou 30 dias); entra na lista com contrato, prazo e uso.

**Why this priority**: sem link com prazo não existe visitante.

**Independent Test**: gerar link de 7 dias, revogar e tentar cadastro → recusado.

**Acceptance Scenarios**:

1. **Given** gestor, **When** gera convite de 7 d para C, **Then** nasce com expiração, contrato e emissor.
2. **Given** contrato encerrado, **When** gestor emite convite, **Then** 409 sem escrita.

### User Story 2 - Cadastro do convidado como visitante (Priority: P1)

Como convidado, abro o link, me cadastro (nome, e-mail, senha) e entro como visitante; vejo só as tarefas do contrato.

**Why this priority**: sem cadastro como visitante, o link não serve.

**Independent Test**: usar link válido, logar e ver só as tarefas do contrato.

**Acceptance Scenarios**:

1. **Given** link válido, **When** envia nome, e-mail e senha ≥ 6 caracteres, **Then** nasce visitante no domínio do emissor e loga.
2. **Given** visitante logado, **When** lista tarefas, **Then** só as do contrato; outro contrato → 404.
3. **Given** link inválido/expirado/revogado, **When** envia cadastro, **Then** 409 idêntico sem token.

### User Story 3 - Reavaliação da participação (Priority: P1)

Como gestor ou admin, mudo o papel do visitante (ex.: prestador) ou suspendo o acesso; entra no histórico com autor e data.

**Why this priority**: entrada temporária sem saída estruturada deixa acesso órfão.

**Independent Test**: promover a prestador e ver a nova visão; suspender nega login.

**Acceptance Scenarios**:

1. **Given** visitante ativo, **When** gestor muda o papel para prestador, **Then** opera pela matriz do prestador, com autor, papéis e data.

## Requirements

### Functional Requirements

- **FR-044** [US1]: O sistema DEVE permitir que gestor e admin gerem link de convite de contrato do próprio domínio não encerrado (encerrado → 409), com validade no ato (24 h, 7 dias, 30 dias) e token opaco ≥ 128 bits exposto só na criação (201), nunca em listagem, erro, log de aplicação ou access log.
- **FR-045** [US1]: O sistema DEVE listar convites do domínio para gestor e admin (contrato, emissor, expiração, estado, cadastros); revogação e expiração suspendem visitantes sem reavaliação vigente — expiração na 1ª observação (guarda ou listagem), sem job — com autor (emissor na expiração, ator na revogação); só visitante é suspenso; suspensão já gravada prevalece sobre mudança de papel concorrente.
- **FR-046** [US2]: O sistema DEVE expor cadastro público por link válido que cria visitante no domínio do emissor (nome, e-mail, senha ≥ 6 caracteres; username do e-mail, sufixo em colisão; sem verificação de posse; 10 tentativas por IP a cada 60 s, a 11ª → 429); recusas 409 sem escrita: token inválido, expirado ou revogado → mensagem uniforme sem o token; e-mail já registrado no domínio, inclusive em outro convite → duplicata, sem consumo.
- **FR-047** [US2]: O sistema DEVE restringir o visitante às tarefas do contrato do convite: listagem e detalhe fora do contrato → 404, demais rotas fora da matriz → 403; a guarda revalida convite ou reavaliação registrada na requisição e nega em T+0 com 403 padrão após gravar a suspensão.
- **FR-048** [US3]: O sistema DEVE aceitar o papel visitante e estender a matriz de permissões de 00002 ao escopo do visitante (FR-047).
- **FR-049** [US3]: O sistema DEVE permitir que gestor e admin alterem o papel ou suspendam o acesso de um visitante ativo, com histórico de autor, papéis e data; gestor só atribui prestador ou auditor (alvo admin/gestor só de admin; gestor → 403); promover exige visitante ativo e revalida no commit convite vigente ou reavaliação registrada (expirado/revogado sem reavaliação → recusa), e vincula ao contrato do convite, inclusive encerrado; reativar exige reavaliação registrada ou convite válido e vale até nova suspensão gravada; a mudança reorienta a matriz; suspensão nega login e sessão como em 00002.
- **FR-050** [US3]: O sistema DEVE registrar em histórico emissão, cadastro e reavaliação, auditável na origem do acesso.

## Glossary

- **Visitante**: entra pelo convite; vê só as tarefas do contrato; promovível e suspensível. **Convite**: link temporário com token, contrato, emissor, expiração, estado e cadastros. **Reavaliação**: mudança de papel ou suspensão após a entrada.

## Assumptions & Risks

### Assumptions

- Duração fixa no ato, expiração absoluta; um cadastro por e-mail por domínio; escopo limitado ao contrato.

### Risks

- **Vazamento de escopo** *(likelihood: medium, impact: high)*: visitante lê dado de outro contrato. Mitigação: deny-by-default de 00002 FR-005.
- **Link como credencial longa** *(likelihood: low, impact: medium)*: opção de 30 dias. Mitigação: opções curtas e revogação.
- **Abuso do cadastro aberto** *(likelihood: low, impact: medium)*: token vazado gera cadastros. Mitigação: rate limit por IP e cadastro único.

## Implementation Signals

- `NEW-API`: `/api/v2/invites` + `/api/v2/invites/:token/register`.
- `NEW-TABLE`: convites e cadastros por domínio; papel visitante no padrão E011.
- `NEW-UI`: tela de convites, cadastro público e `users_screen` do gestor (ação em visitantes; histórico de promovidos e suspensos).

## Success Criteria

SC-001 [US1]: Gestor gera link de 7 d; lista mostra contrato, expiração e estado sem o token; erros e logs nunca o contêm; revogado recusado.
SC-002 [US2]: Convidado completa o cadastro e loga como visitante; vê só as tarefas do contrato; 11ª tentativa no mesmo minuto → 429.
SC-003 [US2]: E-mail já registrado é recusado sem alteração nem consumo do convite; link expirado não cria usuário.
SC-004 [US3]: Promoção a prestador reorienta a visão e suspensão nega o acesso, ambas com histórico de autor e data.
SC-005 [US3]: Todo acesso de visitante remete a convite válido ou reavaliação registrada; promovido opera pela matriz do novo papel e suspenso não entra.

## Clarifications

### Session 2026-10-24

- Q: Escopo do visitante? -> A: só as tarefas do contrato.
- Q: Uso/validade? -> A: múltiplo, um cadastro por e-mail, duração no ato (24 h/7 d/30 d).
- Q: Reavaliação? -> A: mudança de papel ou suspensão, com histórico.

### Session 2026-11-16

- Q: Revogar/expirar? -> A: suspende os visitantes, com histórico (FR-045).
- Q: Escopo da reavaliação? -> A: só visitantes; outro papel, 403 (FR-049).
- Q: Username? -> A: derivado do e-mail com sufixo em colisão (FR-046).
- Q: Proteção do token? -> A: ≥ 128 bits e rate limit por IP (FR-044/046).
- Q: Verificação de e-mail? -> A: não; o link é a credencial (FR-046).

### Session 2026-11-17

- Q: Papéis do gestor? -> A: só prestador/auditor; alvo admin, só admin (FR-049).
- Q: Promovido antes da revogação? -> A: segue ativo; só visitante suspenso (FR-045).
- Q: Expiração grava quando? -> A: 1ª observação, sem job (FR-045).
- Q: Teto do rate limit? -> A: 10 por IP/60 s; a 11ª → 429 (FR-046).
- Q: Token em log? -> A: app/erros nunca; rota fora do access log (FR-044).
- Q: Sessão expirada em voo? -> A: 403 padrão após gravar suspensão (FR-047).
- Q: Contrato encerrado? -> A: 409 na emissão (FR-044).

### Session 2026-11-18

- Q: Vínculo do promovido? -> A: auto-vínculo ao contrato do convite (FR-049).
- Q: Reativação? -> A: basta reavaliação; convite válido é alternativa (FR-049).
- Q: Tela da reavaliação? -> A: `users_screen` do gestor; ação em visitantes, histórico de promovidos (FR-049/050).
- Q: Promoção com convite expirado? -> A: revalida no commit; expirado/revogado → recusa (FR-049).
- Q: Contrato encerrado no cadastro? -> A: aceito; só o token vale (FR-046).

## Stress-Test Findings

### Session 2026-11-16

STF-001: [concurrent-trigger-ambiguity] (HIGH) — Affected: FR-045, FR-049, SC-004, SC-005, US3 — Sem precedência entre suspensão por convite e reavaliação; suspenso promovido indefinido.
STF-002: [cross-requirement-contradiction] (HIGH) — Affected: FR-046, FR-047, SC-003, US2 — Dedup por link vs domínio deixa convite válido sem resultado definido.
STF-003: [boundary-scale-stress] (MEDIUM) — Affected: FR-045, FR-047, SC-005 — Expiração sem prazo de imposição; SC-005 falha.
STF-004: [constraint-impossibility] (MEDIUM) — Affected: FR-045, FR-050, SC-004 — Expiração sem ator para a coluna de autor do histórico.
STF-005: [cross-requirement-contradiction] (MEDIUM) — Affected: FR-047, SC-002, US2 — FR-047 admite 403/404; SC-002 exige 404.

## Compliance Check

**Instructions Check (2026-11-17) e Policy Auditor (2026-11-18): PASS** — 0 violações.
