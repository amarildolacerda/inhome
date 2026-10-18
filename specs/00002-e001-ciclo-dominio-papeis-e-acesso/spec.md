---
feature_branch: "00002-e001-ciclo-dominio-papeis-e-acesso"
created: 2026-09-27
input: "E001 Ciclo de domínio, papéis e acesso"
spec_type: product
spec_maturity: draft
epic_id: E001
epic_sources: "{PRD:CAP-001}"
---

# Spec — Ciclo de domínio, papéis e acesso (E001)

**Feature Branch**: `00002-e001-ciclo-dominio-papeis-e-acesso` · Epic E001 · {PRD:CAP-001} · PRD: specs/prd.md

## Problem Statement

Cada cliente opera como domínio isolado e a suspensão bloqueia acesso sem apagar nada. Se o ciclo de domínio ou a matriz dos quatro papéis falhar, dado de um cliente aparece para outro — violação inegociável. A capacidade já está entregue; falha aqui contamina a release.

## Scope

### Included

- Ciclo de domínio: habilitar, suspender e reativar com arquivo criado em operação única e dados preservados.
- Login com JWT de 24 h (`role`, `domainId`), identificação por e-mail ou username, papel automático e bloqueio de suspenso.
- Matriz dos quatro papéis (system_admin, admin, gestor, prestador) conforme README, com todos os negativos.
- Guards de sessão, papel e escopo: 401 sem token, 403 com papel ou domínio errado, antes de qualquer leitura.
- Superfície da interface por papel e correção pontual de rota ou tela sem guarda se a regressão abrir o gap.

### Excluded

- Novos papéis ou permissões — matriz fechada pelo MVP aprovado (EVD-001).
- Usuário em múltiplos domínios — excluído no MVP aprovado.
- SSO, 2FA e recuperação de senha self-service — sem exigência no PRD.
- Habilitação ou suspensão só pelo system_admin — o operador da plataforma executa o ciclo.
- Acesso à rota `/uploads` sem token — restrição aceita no SAD (2026-12-26); a verificação cobre a API.

### Edge Cases & Boundaries

- Sessão ativa em domínio suspenso: token segue assinado e a requisição seguinte recebe 403 sem ler.
- Falha na criação do arquivo do domínio: 500 e o registro em `domains` não é reaproveitado.
- Parâmetro divergente do token: recusa antes de consultar; recurso de outro domínio responde 403/404 sem expor conteúdo.
- Login com domínio inexistente ou senha errada: 401/403 sem revelar qual falhou; suspenso não é pesquisado.
- Username repetido no mesmo domínio: 409, sem alterar o usuário existente.
- Respostas de erro: validação `400` + `details`; domínio já existente na habilitação e credenciais em dois domínios `409`; corpo `{error: string}` em 401, 403, 404, 409 e 500.

## User Scenarios & Testing

### User Story 1 - Ciclo de domínio verificado (Priority: P1)

Como system_admin, habilito um domínio, entro com o primeiro administrador, suspendo e reativo sem que nenhum dado se perca no caminho.

**Why this priority**: fronteira de isolamento que a release toda pressupõe.

**Independent Test**: percorrer habilitar → login → suspender (403 na sessão ativa) → reativar → login, com dois domínios em paralelo.

**Acceptance Scenarios**:

1. **Given** domínio criado e usuário ativo, **When** faz login, **Then** o JWT de 24 h traz `role`/`domainId` e a sessão abre.
2. **Given** domínio com contratos, usuários e histórico, **When** é suspenso e reativado, **Then** os registros seguem presentes e o login volta a funcionar.
3. **Given** domínio suspenso, **When** chega requisição com token válido emitido antes da suspensão, **Then** 403 sem ler dados de negócio.

### User Story 2 - Permissão mínima por papel (Priority: P1)

Como gestor, uso cada tela sabendo que o prestador enxerga só as próprias tarefas e que papéis sem permissão recebem 403 em rota de gestão.

**Why this priority**: vazamento entre papéis é tão grave quanto entre domínios.

**Independent Test**: matriz do README nos quatro papéis, com dois domínios ativos e todos os negativos.

**Acceptance Scenarios**:

1. **Given** prestador autenticado, **When** chama rota de criação ou gestão de contratos, **Then** 403.
2. **Given** gestor autenticado no domínio A, **When** pede recurso do domínio B, **Then** 403 ou 404 sem expor conteúdo de B.
3. **Given** requisição sem token, **When** chega a qualquer rota de negócio, **Then** 401 antes de qualquer leitura.
4. **Given** admin do domínio A autenticado, **When** tenta gestão do domínio B ou o ciclo de domínio, **Then** 403.

### User Story 3 - Superfície da interface por papel (Priority: P2)

Como usuário autenticado, vejo só as entradas de navegação e as ações que meu papel permite, sem topar em botão que termina em 403.

**Why this priority**: sem isso a experiência quebra mesmo com o backend certo.

**Independent Test**: logar como admin, gestor e prestador e conferir que cada papel abre a própria navegação.

**Acceptance Scenarios**:

1. **Given** prestador logado, **When** a aplicação monta a navegação, **Then** não aparecem usuários, finalidades nem gestão de contratos.
2. **Given** system_admin logado, **When** a aplicação monta a navegação, **Then** ele vê só o ciclo de domínio e nenhuma tela de dados de negócio.

## Requirements

### Functional Requirements

- **FR-001** [US1]: O sistema deve habilitar domínio pelo system_admin criando o registro e o arquivo do banco do domínio em operação única; falha de gravação devolve 500 e o registro não é reaproveitado.
- **FR-002** [US1]: O sistema deve emitir no login um JWT de 24 h com `role` e `domainId`, aceitando e-mail ou username como identificador e resolvendo o papel automaticamente.
- **FR-003** [US1]: O sistema deve bloquear com 403 o login e as requisições de um domínio suspenso, sem apagar nenhum registro, e restaurar o acesso na reativação com os dados intactos.
- **FR-004** [US1]: O ciclo habilitar, suspender e reativar deve ficar restrito ao system_admin, que não acessa dados de negócio.
- **FR-005** [US2]: Toda rota de negócio deve exigir token válido (401 sem token; malformado ou de chave errada: 403) e papel aceito (403 com papel errado), negando por padrão tudo que não esteja na lista da rota.
- **FR-006** [US2]: O sistema deve aplicar a matriz dos quatro papéis do README: system_admin só o ciclo de domínio; admin usuários, finalidades e contratos; gestor contratos, tarefas e relatórios; prestador apenas as próprias tarefas.
- **FR-007** [US2]: O sistema deve selecionar o banco pelo `domainId` do token e recusar com 403 ou 404, antes de qualquer consulta, um parâmetro ou recurso de outro domínio.
- **FR-008** [US2]: O admin deve criar, listar, alterar e excluir usuários do próprio domínio com papel válido; username repetido no mesmo domínio deve responder 409 sem alterar o usuário existente.
- **FR-009** [US3]: O frontend deve resolver o papel no login e mostrar apenas as entradas de navegação e as ações que o papel permite, sem exibir ação que o backend nega.

### Key Entities

- **Domínio**: unidade de um cliente; nome, slug, status ativo ou suspenso e arquivo próprio de banco; suspensão não altera dados.
- **Usuário**: pessoa do domínio; nome, e-mail, username único por domínio, papel, senha hash e flag de ativo.

## Assumptions & Risks

### Assumptions

- A matriz de permissões do README reflete o comportamento real das rotas implementadas.
- `JWT_SECRET` está definido em `backend/.env` em todo ambiente que roda a suíte; ausente, login devolve 500 e requisições 403.
- A base entregue não mudou desde a validação fim a fim 28/28 (EVD-005).
- A rota `/uploads` sem token permanece aceita e fora da verificação de suspensão.

### Risks

- **Guard ausente em rota nova** *(likelihood: low, impact: high)*: rota nova sem guarda vaza dado entre domínios. Mitigação: 401/403 na suíte fim a fim.
- **Teste só em domínio único** *(likelihood: medium, impact: medium)*: domínio único não prova isolamento. Mitigação: dois domínios no roteiro fim a fim.
- **Guard de parâmetro de domínio sem uso** *(likelihood: medium, impact: high)*: guarda tem teste unitário mas não está ligado a rota; manter o caso divergente na suíte.
- **`JWT_SECRET` e `/uploads` sem cobertura** *(likelihood: low, impact: high)*: segredo ausente quebra autenticação; rota aceita sem token. Mitigação: `.env.example` e 401/403 por rota na suíte.

## Implementation Signals

- Nenhum artefato novo previsto — a épica verifica a superfície já entregue.
- `NEW-API`: só se a regressão achar rota sem guarda; correção vira item de escopo.
- `NEW-UI`: só se a interface exibir ação que o backend nega para o papel.

## Success Criteria

### Measurable Outcomes

SC-001 [US1]: Com dois domínios ativos, habilitar → login → suspender → reativar completa sem perder registros, e a sessão aberta recebe 403 na requisição seguinte à suspensão.
SC-002 [US1]: Após suspensão e reativação, contratos, usuários e histórico do domínio seguem íntegros e o login volta a abrir.
SC-003 [US2]: A matriz dos quatro papéis passa em 100% dos casos positivos e negativos da suíte automatizada, incluindo 401 sem token e 403 com papel ou domínio errados.
SC-004 [US2]: Com dois domínios em uso simultâneo, zero dados de um domínio aparecem nas respostas do outro, em API, tela ou relatório.
SC-005 [US3]: Logados os quatro papéis, cada um abre apenas a própria navegação e nenhuma ação visível termina em 403.

## Glossary

| Term | Definition |
|------|------------|
| Guard | Sessão, papel ou escopo verificados antes de qualquer leitura de dados. |
| Escopo de domínio | Impede a sessão do domínio A de ler ou parametrizar o domínio B. |

## Compliance Check

- **Result**: PASS — auditoria local; `sddp-policy-auditor` indisponível (limite de subagente).
