---
feature_branch: "00021-gestao-documental-contrato"
created: "2026-11-23"
input: "Wave 10 — gestão documental do contrato (V3 item 2)"
spec_type: "product"
spec_maturity: "draft"
epic_id: "E019"
epic_sources: "{specs/avaliacao-valor-v3.md; reutiliza E001/E002/E003/E008/E016}"
---

# Spec: Gestão documental do contrato

**Feature Branch**: `00021-gestao-documental-contrato` · **Created**: 2026-11-23 · **Status**: Draft · **Spec Type**: product · **Epic ID**: E019

## Problem Statement

O chat por contrato já anexa arquivos e extrai prazos, multas e seguros, mas esses documentos ficam dispersos na conversa. Gestor e auditor não conseguem resolver, em um só lugar, quais documento estão associados a um contrato, quais foram analisados e quais prazos ainda exigem ação. Sem essa visão, a evidência documental depende de rolagem do chat e de memória pessoal.

## Scope

### Included

- Biblioteca por contrato com os anexos já existentes em `attachments`, incluindo os de mensagem (`message_id`) e os de pagamento (`payment_id`) sem duplicar arquivo.
- Filtro por categoria existente e por origem (chat, tarefa, pagamento); leitura do resultado de `document_analyses` e dos alertas extraídos já vinculados ao contrato.
- Ações de gestão sobre o documento: alterar categoria e marcar como conferido, com autor e data; ações restritas a admin e gestor do domínio.

### Excluded

- Upload de novo arquivo, preview e download fora do fluxo atual de `attachments` — o storage de E003 já atende.
- Nova tabela de documentos ou de conferência — as colunas aditivas em `attachments` bastam.
- Nova tabela, nova rota de análise ou reextração automática — `document_analyses` e o extrator de E016 são reaproveitados.
- Versionamento, assinatura eletrônica (PDD-009) e reajuste por índice (PDD-008) — fora do escopo sem revisão do PRD.
- Acesso de prestador, visitante e auditor à gestão; outros papéis seguem deny-by-default de E001.

### Edge Cases & Boundaries

- Documento de outro domínio ou de contrato divergente: 403 antes de qualquer consulta.
- Categoria desconhecida: 400 sem escrita; categoria vazia mantém a atual.
- Documento já conferido: nova conferência atualiza autor e data sem criar registro duplicado.
- Contrato encerrado: documentos continuam consultáveis, sem nova extração.
- Arquivo órfão (sem linha em `attachments`): não aparece na biblioteca.

## User Scenarios & Testing

### User Story 1 - Consultar biblioteca do contrato (Priority: P2)

Como gestor do domínio, quero ver em uma tela todos os documentos do contrato, com categoria, origem e resultado da análise de E016, para localizar rapidamente o que foi enviado e o que já foi processado.

**Why this priority**: Entrega o valor central da central documental com reuso integral do que já existe — sem isso o gestor continua dependendo do chat.

**Independent Test**: Abrir a biblioteca de um contrato com anexos de chat e de pagamento e ver as duas origens listadas, com a categoria e o resumo da análise já extraída.

**Acceptance Scenarios**:

1. **Given** contrato com anexos de chat e de pagamento no mesmo domínio, **When** o gestor abre a biblioteca, **Then** ambos aparecem uma única vez com categoria, origem e data.
2. **Given** documento com análise de E016, **When** o gestor abre a biblioteca, **Then** o resumo extraído e os alertas vinculados ao contrato são exibidos.
3. **Given** filtro por categoria ou origem, **When** aplicado, **Then** apenas documentos correspondentes do contrato são listados.
4. **Given** sessão de prestador, visitante ou auditor, **When** tenta acessar, **Then** recebe 403 e a entrada não aparece na navegação.

### User Story 2 - Classificar e conferir documento (Priority: P2)

Como admin do domínio, quero ajustar a categoria de um documento e marcá-lo como conferido, com registro de quem conferiu e quando, para encerrar a revisão documental sem sair da biblioteca.

**Why this priority**: Fecha o ciclo de conferência sobre a base já entregue, sem criar outro fluxo de aprovação.

**Independent Test**: Alterar a categoria de um anexo e conferir o documento; recarregar e confirmar categoria, autor e data persistidos, com uma única marcação.

**Acceptance Scenarios**:

1. **Given** categoria válida e documento do contrato, **When** o admin altera a categoria, **Then** o anexo é atualizado sem criar nova linha ou novo arquivo.
2. **Given** documento ainda não conferido, **When** o admin marca como conferido, **Then** autor e data são gravados e a ação é idempotente.
3. **Given** categoria desconhecida, **When** a requisição é feita, **Then** responde 400 sem escrita.
4. **Given** documento de outro domínio, **When** o admin tenta alterar, **Then** responde 403 antes de qualquer consulta.

## Requirements

### Functional Requirements

- **FR-064** [US1]: a biblioteca MUST listar cada anexo do contrato uma única vez, com categoria, origem e data, incluindo anexos de chat e de pagamento já presentes em `attachments`.
- **FR-065** [US1]: a biblioteca MUST exibir o resumo de `document_analyses` e os alertas extraídos vinculados ao contrato quando existirem.
- **FR-066** [US1]: o filtro por categoria e origem MUST limitar a listagem aos documentos do contrato no domínio autenticado.
- **FR-067** [US1]: o acesso MUST exigir `admin` ou `gestor` do domínio, com 403 para `prestador`, `visitante`, `auditor`, `system_admin` e sessões sem papel.
- **FR-068** [US2]: a alteração de categoria MUST aceitar apenas categorias já existentes, responder 400 sem escrita para categoria desconhecida e não duplicar o anexo.
- **FR-069** [US2]: a conferência MUST registrar autor e data uma única vez por documento, sendo idempotente em chamadas repetidas.
- **FR-070** [US2]: alteração e conferência MUST ser restritas a `admin` e `gestor`, com 403 para qualquer outro papel e para documento de domínio divergente.

### Key Entities

- **Documento do contrato**: linha existente de `attachments` associada ao contrato, com categoria e origem derivada de `message_id` ou `payment_id`; nenhuma nova tabela.
- **Conferência**: colunas `reviewed_by`/`reviewed_at` no anexo, derivadas do usuário autenticado; nenhum novo evento ou histórico.

## Assumptions & Risks

### Assumptions

- `attachments` já possui categoria e vínculo opcional com mensagem e pagamento, preservados por E016 e E018; o rebuild adiciona só autor/data da conferência.
- `document_analyses` e `extracted_alerts` já usam `contract_id` e `source_kind`/`source_id`.
- Admin e gestor podem conferir; nenhuma aprovação por auditor é necessária no MVP.

### Risks

- **Isolamento** *(likelihood: low, impact: high)*: listagem sem filtro de domínio expõe arquivo de outro cliente. Mitigação: `scopeDomain` antes da consulta e teste negativo por papel.
- **Duplicação de anexo** *(likelihood: medium, impact: medium)*: reuso ingênuo de `attachments` pode criar segunda linha para o mesmo arquivo. Mitigação: atualizar a linha existente e cobrir em teste.

## Implementation Signals

- [`NEW-API`] — endpoints de listagem, categorização e conferência sob `requireRole()` e isolamento de domínio.
- [`NEW-UI`] — biblioteca documental por contrato e entrada na navegação para admin/gestor.
- [`MIGRATION`] — nenhuma: tabelas e categorias existentes são reaproveitadas sem alteração de esquema.

## Success Criteria

### Measurable Outcomes

- **SC-001** [US1]: gestor localiza em até duas ações um documento do contrato e vê sua origem e análise, sem percorrer o chat.
- **SC-002** [US1]: 100% dos anexos do contrato aparecem uma única vez, com filtros por categoria e origem e zero vazamento entre domínios.
- **SC-003** [US2]: categoria e conferência persistem após recarregar, com autor e data, sem nova linha de anexo.
- **SC-004** [US2]: papéis sem permissão recebem 403 nas três rotas e não veem entrada de navegação.
