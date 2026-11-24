---
feature_branch: "00022-importacao-acervo"
created: "2026-11-23"
input: "Wave 11 — importação de acervo (R3 do roadmap; PDD-007 revisada)"
spec_type: "product"
spec_maturity: "draft"
epic_id: "E020"
epic_sources: "{specs/plan/E020.md; HYP-002; pesquisa nov/2026}"
---

# Spec: Importação de acervo

**Feature Branch**: `00022-importacao-acervo` · **Created**: 2026-11-23 · **Status**: Draft · **Spec Type**: product · **Epic ID**: E020

## Problem Statement

Quem sai do Excel digita contrato por contrato antes de ver valor no painel de vencimentos. `HYP-002` está aberta desde setembro de 2026; a pesquisa de novembro confirma a migração de acervo como etapa obrigatória de onboarding. Sem importação, o primeiro acesso exige trabalho manual e a adoção falha antes da primeira tarefa.

## Scope

### Included

- Download de template CSV versionado no repositório, com cabeçalhos e uma linha de exemplo.
- Envio de planilha CSV ou XLSX com leitura dos cabeçalhos e mapeamento configurável para os campos de contrato de E002.
- Prévia com contagem de linhas válidas e inválidas, erros descritos linha a linha e nenhuma gravação.
- Confirmação atômica: todas as linhas válidas viram contrato em uma única transação, com vínculo de prestador quando informado.
- Upload em massa de PDFs associados às linhas pela coluna de nome, reaproveitando o storage de E003 e a tabela `attachments`.
- Relatório pós-importação com contratos criados, linhas puladas e motivo de cada pulo.

### Excluded

- Importação de tarefas, pagamentos, anexos de tarefa, histórico ou alertas.
- Integração com ERP, Drive, e-mail ou assinatura eletrônica (PDD-009).
- Deduplicação automática por conteúdo de arquivo ou por contrato já existente.
- Revisão de PDD-008 (WhatsApp, reajuste por índice, mobile) — fora sem decisão de produto.
- Leitura de planilhas protegidas por senha, macros ou múltiplas abas: apenas a primeira aba é lida.
- Acesso de prestador, visitante, auditor ou `system_admin` à importação.

### Edge Cases & Boundaries

- Arquivo sem coluna obrigatória mapeada: prévia recusa com 400 e zero gravação.
- Linha com data inválida ou início posterior à previsão: marcada inválida com erro por campo; as demais seguem válidas.
- Prestador ou finalidade inexistente no domínio: linha inválida, sem criar vínculo.
- PDF sem linha correspondente: não gravado; aparece no relatório como pulado com motivo.
- Duplo envio da mesma prévia: cada confirmação cria contratos novos; sem deduplicação por conteúdo.
- Falha em qualquer linha da confirmação: transação inteira revertida, nenhum contrato ou arquivo parcial.
- Contrato ou arquivo de outro domínio: 403 antes de qualquer leitura ou escrita.

## User Scenarios & Testing

### User Story 1 - Preparar e revisar a importação (Priority: P1)

Como gestor do domínio, quero enviar minha planilha, mapear as colunas e revisar uma prévia antes de gravar, para corrigir erros no Excel sem sujar o acervo do sistema.

**Why this priority**: Sem a prévia o gestor não confia na importação e volta à digitação manual; é a barreira decisiva de adoção (`HYP-002`).

**Independent Test**: Baixar o template, enviar uma planilha de 50 linhas com 3 datas inválidas e conferir 47 válidas / 3 erros descritos, com nenhum contrato criado.

**Acceptance Scenarios**:

1. **Given** template baixado do endpoint, **When** o gestor o abre, **Then** os cabeçalhos e uma linha de exemplo estão presentes.
2. **Given** planilha CSV ou XLSX enviada, **When** a prévia é solicitada, **Then** os cabeçalhos detectados aparecem para mapeamento.
3. **Given** mapeamento aplicado, **When** a prévia é gerada, **Then** cada linha é classificada como válida ou inválida com erro por campo.
4. **Given** arquivo sem coluna obrigatória, **When** a prévia é solicitada, **Then** responde 400 e nenhuma linha é gravada.
5. **Given** sessão de prestador, visitante, auditor ou `system_admin`, **When** tenta importar, **Then** recebe 403.

### User Story 2 - Confirmar importação e associar PDFs (Priority: P1)

Como admin do domínio, quero confirmar a prévia e enviar os PDFs assinados em massa, para que o acervo entre pronto com vigência, prestador vinculado e documentos no lugar certo.

**Why this priority**: Fecha o onboarding: sem a gravação atômica e os PDFs, a prévia não entrega o acervo utilizável.

**Independent Test**: Confirmar a prévia de 47 linhas válidas com 40 PDFs nomeados pelo contrato e verificar 47 contratos criados, 40 anexos vinculados, 2 PDFs pulados no relatório e o painel de vencimentos populado.

**Acceptance Scenarios**:

1. **Given** prévia com linhas válidas, **When** o admin confirma, **Then** todos os contratos válidos são criados em uma transação.
2. **Given** PDFs enviados com nomes iguais ao da coluna de nome mapeada, **When** a confirmação roda, **Then** cada PDF é anexado ao contrato correspondente em `attachments`.
3. **Given** PDF sem contrato correspondente, **When** a confirmação roda, **Then** o arquivo não é gravado e o relatório registra o motivo do pulo.
4. **Given** falha em qualquer linha, **When** a transação é revertida, **Then** nenhum contrato, vínculo ou arquivo fica persistido.
5. **Given** importação concluída, **When** o relatório é exibido, **Then** criados, pulados e motivos aparecem por linha.

## Requirements

### Functional Requirements

- **FR-071** [US1]: o template CSV MUST estar versionado no repositório e ser servido por um endpoint autenticado, com cabeçalhos estáveis e ao menos uma linha de exemplo.
- **FR-072** [US1]: a leitura MUST aceitar CSV e XLSX (primeira aba) e devolver os cabeçalhos detectados sem gravar nada.
- **FR-073** [US1]: o mapeamento MUST associar colunas da planilha aos campos `name`, `start_date`, `forecast_date`, `object`, `purpose`, `provider` e `perpetual`, recusando 400 quando `name`, `start_date` ou `forecast_date` não estiverem mapeados.
- **FR-074** [US1]: a prévia MUST classificar cada linha como válida ou inválida, com contagem total e erro por campo em cada linha inválida, sem escrita em banco ou disco.
- **FR-075** [US1]: a validação MUST exigir nome não vazio, datas ISO `YYYY-MM-DD`, início não posterior à previsão e existência de prestador/finalidade no domínio quando informados.
- **FR-076** [US2]: a confirmação MUST criar todos os contratos válidos em uma única transação, revertendo tudo se qualquer gravação falhar.
- **FR-077** [US2]: os PDFs MUST ser associados às linhas pelo valor da coluna mapeada para `name`, reaproveitando `saveToUploads` e a tabela `attachments` com `contract_id`.
- **FR-078** [US2]: o relatório MUST listar contratos criados, linhas puladas e arquivos pulados com o motivo de cada pulo.
- **FR-079** [US1]: todas as rotas MUST exigir `admin` ou `gestor` do domínio, responder 403 para outros papéis e isolar o escopo por `domainId`.

### Key Entities

- **Prévia**: resultado somente leitura da planilha mapeada, com cabeçalhos, linhas classificadas e erros; nunca persistida.
- **Linha importada**: valores mapeados de uma linha da planilha para os campos de `contracts` de E002.
- **Documento importado**: PDF enviado em massa, ligado ao contrato pela coluna de nome e gravado como linha de `attachments` com `contract_id`.
- **Relatório**: saída da confirmação com criados, pulados e motivos; não gera tabela própria.

## Assumptions & Risks

- Planilhas exportadas do Excel usam `;` ou `,` como separador e datas no formato ISO; o template fixa esses formatos.
- O leitor XLSX embutido lê a primeira aba com células compartilhadas e inline strings; fórmulas usam o valor cached.
- `attachments` ganha `contract_id` por rebuild guardado, preservando ids, categorias e os pais existentes de E003/E016/E018/E019.
- O envelope JSON de 4 MB limita o tamanho da requisição; lotes grandes devem ser divididos.
- `HYP-002` segue aberta: a feature entrega a capacidade, não prova a hipótese sem uso real.

### Stress-Test Findings

STF-001: [boundary-scale-stress] (HIGH) — Affected: FR-074, FR-076 — Prévia e confirmação podem processar milhares de linhas em uma única requisição e estourar o envelope. Resolvido: limite explícito de linhas e validação antes da transação, com erro 400 e zero escrita.

STF-002: [cross-requirement-contradiction] (MEDIUM) — Affected: FR-072, FR-079 — Ler a planilha antes do guarda de papel poderia expor cabeçalhos de outro domínio. Resolvido: `authenticateToken` → `scopeDomain()` → `requireRole` antes de qualquer leitura do payload.

STF-003: [concurrent-trigger-ambiguity] (MEDIUM) — Affected: FR-076, FR-078 — Duas confirmações concorrentes da mesma prévia poderiam duplicar contratos. Resolvido: sem estado de prévia no servidor; cada confirmação revalida o payload e a transação é atômica por domínio.

## Implementation Signals

- Roteador `imports.js` registrado sob `/api/v2/contracts` em `backend/src/server.js`.
- Utilitário `spreadsheet.js` com parser CSV e leitor XLSX mínimo (ZIP + XML via `zlib`), 0 dependência nova.
- Template versionado em `backend/assets/contract-import-template.csv`.
- Rebuild guardado de `attachments` com `contract_id` no mesmo padrão de E016/E018/E019.
- Tela `imports_screen.dart` com etapas: arquivo → mapeamento → prévia → confirmação → relatório; entrada no rail para admin/gestor.
- 0 nova rota raiz, 0 nova dependência, 0 novo papel.

## Success Criteria

SC-001 [US1]: Dado um template baixado e uma planilha de 50 linhas com 3 erros de data, o gestor obtém prévia com 47 válidas, 3 inválidas e erro descrito por linha, sem contrato criado.

SC-002 [US1]: Dado um arquivo sem coluna obrigatória, a prévia responde 400 e o banco permanece sem novos contratos.

SC-003 [US2]: Dada a confirmação da prévia e PDFs nomeados pelo contrato, 47 contratos e os anexos correspondentes existem após a requisição, com vínculo de prestador quando informado.

SC-004 [US2]: Dado um PDF sem contrato correspondente e uma falha forçada em uma linha, o relatório registra os pulos e nenhuma gravação parcial permanece.
