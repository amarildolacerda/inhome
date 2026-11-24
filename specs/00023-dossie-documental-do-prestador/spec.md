---
feature_branch: "00023-dossie-documental-do-prestador"
created: "2026-11-24"
input: "Wave 12 — dossiê documental do prestador (R7 do roadmap; pesquisa nov/2026)"
spec_type: "product"
spec_maturity: "clarified"
epic_id: "E021"
epic_sources: "{specs/plan/E021.md; CAP-002; CAP-004; pesquisa nov/2026}"
---

# Spec: Dossiê documental do prestador

**Feature Branch**: `00023-dossie-documental-do-prestador` · **Created**: 2026-11-24 · **Status**: Draft · **Spec Type**: product · **Spec Maturity**: clarified · **Epic ID**: E021

## Problem Statement

O produto liga prestadores a contratos, mas não controla ASO, NR e certidões. Documento vencido descoberto após a entrada em campo gera passivo trabalhista. O sistema precisa alertar e bloquear vínculo e atribuição antes da execução, com o motivo da recusa visível.

## Scope

### Included

- Trabalhadores do prestador com nome, função e situação ativa.
- Documentos do prestador e do trabalhador com tipo, número, arquivo, vigência e conferência.
- Checklist mínimo por finalidade, com tipo de documento e abrangência.
- Avaliação antes de vincular prestador e antes de atribuir ou reatribuir tarefa.
- Recusa com documento ausente ou vencido e código de erro estável.
- Alerta no painel de E004 com dedup por contrato, origem e documento.
- Limpeza do alerta após regularização ou fim do vínculo.
- Consulta de dossiê e conformidade por prestador e contrato.

### Excluded

- catracas, eSocial, PCMSO, portaria, renovação automática e validação de autenticidade.
- `PDD-008`/`PDD-009`, WhatsApp e e-mail dedicado ao dossiê.

### Edge Cases & Boundaries

- Contrato sem finalidade usa checklist global com ASO.
- Sem trabalhador ativo, itens de prestador são atendidos e itens de trabalhador ficam pendentes.
- Sem conferência, o documento não conta; vigência igual a hoje conta como vigente.
- Vínculo e tarefa criados antes do vencimento não são desfeitos.
- Contrato encerrado ou vínculo removido não gera alerta; alertas antigos são limpos.
- Arquivo acima de 2 MB ou fora do padrão de E003 é recusado antes de gravar.
- Prestador vê só o próprio dossiê; visitante, auditor e `system_admin` não acessam.

## User Scenarios & Testing

### User Story 1 - Cadastrar dossiê e checklist mínimo (Priority: P1)

Como gestor, quero registrar trabalhadores, documentos e o checklist de cada finalidade para saber o que cada prestador precisa apresentar.

**Why this priority**: Sem cadastro e checklist não há base para alerta nem bloqueio.

**Independent Test**: Cadastrar prestador com dois trabalhadores, conferir ASO e NR-35, configurar checklist de manutenção e ver os quatro documentos no dossiê.

**Acceptance Scenarios**:

1. **Given** prestador do domínio, **When** o gestor cadastra trabalhador ativo, **Then** ele aparece com nome, função e situação.
2. **Given** trabalhador cadastrado, **When** o gestor anexa documento com tipo, número, arquivo e vigência futura, **Then** ele aparece vigente e aguardando conferência.
3. **Given** documento aguardando conferência, **When** o gestor o confere, **Then** autor e data são registrados e ele passa a contar para conformidade.
4. **Given** finalidade de manutenção, **When** o gestor adiciona ASO e NR-35, **Then** os itens ficam ativos; sem itens, vale o ASO global.

### User Story 2 - Bloquear operação sem documentação em dia (Priority: P1)

Como gestor, quero que o sistema recuse vínculo e atribuição com documentação vencida, informando o motivo, para não depender de conferência manual.

**Why this priority**: Transforma o cadastro em conformidade efetiva.

**Independent Test**: Com ASO vencido, tentar vínculo e atribuição, conferir 400 com `PROVIDER_DOCUMENTS_MISSING`, regularizar e repetir com sucesso.

**Acceptance Scenarios**:

1. **Given** prestador sem ASO vigente, **When** o gestor tenta vinculá-lo, **Then** responde 400 com `PROVIDER_DOCUMENTS_MISSING` e nada é gravado.
2. **Given** NR-35 vencido para trabalho em altura, **When** a tarefa é atribuída, **Then** a recusa informa tipo e trabalhador faltante.
3. **Given** documento vencido após o vínculo, **When** a varredura roda, **Then** vínculo e tarefas abertas permanecem.
4. **Given** documento regularizado, **When** nova atribuição é feita, **Then** a guarda passa e a tarefa é gravada.

### User Story 3 - Alertar e limpar alertas de vencimento (Priority: P1)

Como gestor, quero ver no painel os documentos que vencem em breve, sem duplicatas, e vê-los sumir após a regularização.

**Why this priority**: O alerta antecedente evita a recusa no momento da operação.

**Independent Test**: Com ASO a 30 dias e dois contratos, duas varreduras geram dois alertas; regularizar e conferir a limpeza.

**Acceptance Scenarios**:

1. **Given** documento a 30 dias do vencimento, **When** a varredura de E004 roda, **Then** cada contrato ativo recebe um alerta `provider_document` com a data.
2. **Given** varredura repetida, **When** o painel é consultado, **Then** não há alerta duplicado.
3. **Given** documento regularizado ou vínculo removido, **When** a varredura seguinte roda, **Then** os alertas saem do painel.

## Requirements

### Functional Requirements

- **FR-080** [US1]: o domínio MUST cadastrar, listar e desativar trabalhadores, com escrita restrita a admin e gestor.
- **FR-081** [US1]: o cadastro MUST exigir prestador, tipo entre ASO, NR-10, NR-35, certidão ou outro, número, arquivo e vigência ISO, com storage de E003.
- **FR-082** [US1]: a edição MUST alterar número e vigência e registrar conferência com autor e data, preservando a anterior.
- **FR-083** [US1]: o checklist MUST ser configurável por finalidade, com tipo de documento e abrangência.
- **FR-084** [US1]: sem itens ativos na finalidade, a avaliação MUST usar o checklist global com ASO.
- **FR-085** [US2]: a vinculação MUST avaliar o checklist antes de gravar e recusar com `PROVIDER_DOCUMENTS_MISSING` e motivos.
- **FR-086** [US2]: atribuição e reatribuição MUST usar a mesma guarda, sem gravar tarefa ou histórico na recusa.
- **FR-087** [US2]: a guarda MUST NOT desfazer vínculo, tarefa aberta ou histórico quando o documento vence depois.
- **FR-088** [US3]: a varredura MUST inserir alertas `provider_document` em `extracted_alerts` dentro das janelas de E004, com dedup tripla.
- **FR-089** [US3]: a varredura MUST remover alertas de documento regularizado ou vínculo encerrado.
- **FR-090** [US1]: a consulta MUST devolver documentos, trabalhadores e conformidade, com prestador limitado ao próprio registro.
- **FR-091** [US1]: as rotas MUST exigir autenticação, escopo por `domainId` e papel, com limite de 2 MB e 400 antes de gravar payload inválido.

### Key Entities

- **Trabalhador**: pessoa ligada ao prestador, com nome, função e situação ativa.
- **Documento**: ASO, NR ou certidão do prestador ou trabalhador, com número, arquivo, vigência e conferência.
- **Checklist**: itens obrigatórios por finalidade, com tipo e abrangência.
- **Alerta de documento**: linha do painel de E004 ligada ao contrato que emprega o prestador.

## Clarifications

### Session 2026-11-24

- Q: O que o checklist mínimo exige por tipo de serviço -> A: itens configuráveis por finalidade, com tipo e abrangência de prestador ou trabalhador; sem itens na finalidade, vale o ASO global.
- Q: Documento vencido desfaz vínculo e tarefa -> A: não; a guarda vale só para vínculo novo e atribuição.

## Assumptions & Risks

- Prestador é usuário `prestador` de E002; finalidade é `purposes`, com fallback global.
- Arquivos seguem E003: bytes em disco, referência no banco, 2 MB.
- Conferência é declaração do gestor; `HYP-002` segue aberta.

### Risks

- **Bloqueio excessivo** *(medium/high)*: checklist mal configurado impede vínculo legítimo. Mitigação: motivos explícitos e guarda só em operação nova.
- **Alerta órfão** *(medium/medium)*: desvínculo deixa alerta. Mitigação: sincronização com vínculos ativos.
- **Carga no painel** *(low/medium)*: muitos documentos geram alertas. Mitigação: uma janela por documento.

### Stress-Test Findings

STF-001: [cross-requirement-contradiction] (HIGH) — Affected: FR-085, FR-087 — A guarda poderia desfazer vínculos e tarefas antigos. Resolvido: avaliação só em vínculo novo e atribuição, sem efeito retroativo.

STF-002: [concurrent-trigger-ambiguity] (HIGH) — Affected: FR-088, FR-089 — Varreduras concorrentes poderiam duplicar ou deixar alertas obsoletos. Resolvido: dedup tripla e remoção das linhas fora do conjunto corrente.

STF-003: [cross-requirement-contradiction] (MEDIUM) — Affected: FR-083, FR-084 — Global e finalidade poderiam exigir o mesmo documento duas vezes. Resolvido: global só vale sem item ativo na finalidade.

## Integration Points

- **IP-001**: E002 fornece `users`, `contract_providers` e `purposes`.
- **IP-002**: E004 fornece janelas e `extracted_alerts`.
- **IP-003**: E003 fornece `saveToUploads` e limite de arquivo.

## Implementation Signals

- `NEW-ENTITY`: trabalhadores, documentos e checklist por finalidade.
- `NEW-API`: dossiê, conferência, trabalhadores e checklist sob guards de E001.
- `NEW-UI`: tela de dossiê com conformidade.
- `MIGRATION`: nenhuma tabela muda; nenhum serviço externo.

## Success Criteria

SC-001 [US1]: Dado prestador com dois trabalhadores, quando o gestor cadastra e confere ASO e NR-35, o dossiê lista quatro documentos com vigência e autor.

SC-002 [US2]: Dado prestador sem ASO vigente, quando o gestor tenta vínculo e atribuição, ambas respondem 400 com `PROVIDER_DOCUMENTS_MISSING` e nada é gravado.

SC-003 [US2]: Dado documento vencido depois do vínculo, quando o gestor regulariza, vínculo e tarefa aberta permanecem e a próxima atribuição é aceita.

SC-004 [US3]: Dado ASO com 30 dias e dois contratos, duas varreduras geram dois alertas sem duplicata; após regularização, os alertas saem do painel.

## Glossary

| Term | Definition |
|------|------------|
| ASO | Atestado de Saúde Ocupacional, documento com vigência que atesta aptidão. |
| NR | Norma Regulamentadora; NR-10 e NR-35 são tipos de documento. |
