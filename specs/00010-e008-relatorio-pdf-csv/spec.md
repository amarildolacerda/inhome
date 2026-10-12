---
spec_type: product
epic_id: E008
epic_sources: "{PRD:CAP-007}"
spec_maturity: clarified
---

# Spec: Relatório de serviços executados — PDF e CSV por contrato (00010)

## Problem Statement

CAP-007 existe para provar o que foi feito: o escritor de PDF próprio e o CSV já estão em `services/report.js` com rotas `/:id/report.pdf` e `/:id/report.csv`, guardadas por `requireRole('admin','gestor')` + `scopeDomain()`. Mas o PDF atual só imprime `Fotos: N` — conta a loja de `task_photos` sem embutir a imagem —, e o conjunto nunca foi verificado ponta a ponta sob as bordas do épico (contrato sem tarefas, foto ausente em disco, domínio divergente, falha de leitura). Sem essa verificação e sem as fotos no documento, o gestor não responde "o que foi feito" na hora e HYP/PDD do relatório ficam sem prova.

## Scope

### Included
- Verificação fim a fim dos dois formatos já entregues (PDF `application/pdf`, CSV `text/csv`) com as linhas de conteúdo exigidas: contrato, tarefa, executor, datas, status, evidência de conclusão e contagem de fotos.
- **Gap de embedding**: o PDF passa a embutir as fotos de `task_photos.path` lidas da loja `backend/uploads/` — JPEG (`DCTDecode`) e PNG (`FlateDecode` + preditor PNG, todos os tipos de cor com alpha via SMask); formato sem suporte nativo (`webp`, `gif`) vira referência textual preservada.
- Foto referenciada mas ausente/corrompida em disco: linha textual preservada, documento conclui, nunca derruba a geração.
- Documento vazio legível: contrato sem tarefas sai com cabeçalho e nenhuma linha (PDF `(vazio)` de conteúdo, CSV só cabeçalho), sem erro.
- Escopo: papel `admin`/`gestor` do mesmo domínio; recusa antes de gerar para prestador (403), domínio explícito divergente (`scopeDomain` 403) e contrato inexistente/estrangeiro (404 no banco do domínio).
- Regressão de falha de leitura: 500 com mensagem, repetição manual, sem retry e sem arquivo persistido.

### Excluded
- Relatório agregado multi-contrato ou por prestador (roadmap PDD-003).
- Importação CSV de contratos (PDD-007); o CSV aqui é saída.
- Agendamento/envio de relatório por e-mail (não registrado no PRD).
- Logotipo, assinatura ou modelo regulado (PDD-009).
- Fotos de comentários/anexos (`attachments`) — evidência de tela; o documento embute `task_photos` (base da contagem entregue).

### Edge Cases & Boundaries
- Contrato sem tarefas: PDF e CSV saem com cabeçalho e nenhuma linha, sem erro.
- Foto ausente em disco ou formato sem suporte: evidência textual preservada, documento segue.
- Papel sem permissão ou domínio divergente: recusa (403/404) antes de gerar.
- Falha de leitura do banco: 500, usuário repete a ação, sem retry automático.
- Geração sob demanda: conteúdo transitório, nenhum arquivo persistido.

## User Scenarios & Testing

### User Story 1 - Prova na hora, em PDF (Priority: P1)
Como gestor, gero o relatório do contrato e recebo, num documento só, o que foi feito, quem executou, quando e com que evidência — com as fotos embutidas.

**Why this priority**: provar a execução é o terceiro eixo de valor do PRD e depende do relatório sair completo sem suporte.

**Independent Test**: contrato com conclusões documentadas e foto em disco → PDF com linhas correspondentes e a imagem presente no container; apagar o arquivo da loja → o mesmo PDF sai com a referência textual e 200.

**Acceptance Scenarios**:
1. **Given** contrato com tarefas concluídas e foto em disco, **When** o gestor pede o PDF, **Then** o arquivo volta `application/pdf` com tarefa, executor, datas, evidência e a imagem embutida.
2. **Given** contrato sem tarefas, **When** o relatório é gerado, **Then** o documento sai com cabeçalho e nenhuma linha, sem erro.
3. **Given** foto referenciada mas apagada da loja, **When** o PDF é gerado, **Then** a linha textual da tarefa permanece e a resposta é 200.

### User Story 2 - Caminho leve em CSV (Priority: P1)
Como gestor, baixo o mesmo conteúdo em CSV quando preciso manipular os dados em planilha.

**Why this priority**: o CSV é o caminho alternativo previsto no SAD para o mesmo dado — barato e cobre quem trabalha em planilha.

**Independent Test**: mesmo contrato em PDF e CSV produz o mesmo conjunto de linhas de dado; prestador e contrato de outro domínio são recusados antes de gerar.

**Acceptance Scenarios**:
1. **Given** contrato com tarefas, **When** o gestor pede o CSV, **Then** a resposta volta `text/csv` com as mesmas linhas do PDF.
2. **Given** requisição de papel sem permissão ou de contrato de outro domínio, **When** o relatório é pedido, **Then** a resposta recusa (403/404) antes de gerar arquivo.

## Requirements

- **FR-001** [US1]: O PDF embute as imagens de `task_photos.path` lidas de `backend/uploads/`; JPEG e PNG são embutidos nativamente, `webp`/`gif` viram referência textual, e arquivo ausente ou ilegível preserva a linha textual sem falhar a geração.
- **FR-002** [US1]: O PDF declara contrato (id, nome, status, datas), tarefas (título, status), executor, prazos, evidência de conclusão e contagem de fotos — conteúdo já entregue, verificado fim a fim.
- **FR-003** [US1]: Contrato sem tarefas gera documento legível com cabeçalho e nenhuma linha, sem erro (PDF e CSV).
- **FR-004** [US2]: O CSV devolve o mesmo conjunto de linhas de tarefas do PDF, com cabeçalho `contract_id,contract_name,task_id,...`.
- **FR-005** [US2]: `admin` e `gestor` do domínio do token geram; `prestador`, domínio explícito divergente e contrato desconhecido/estrangeiro são recusados antes de qualquer geração.
- **FR-006** [US2]: Falha de leitura do banco devolve 500 com mensagem; nenhuma persistência de arquivo gerado; repetição manual é a única via.

### Confirmados durante Clarify
- **Q1 — embedding**: JPEG (`DCTDecode`) e PNG (concatenação IDAT + `FlateDecode`/preditor, alpha via SMask) zero-dependência; `webp`/`gif` sem suporte → referência textual.
- **Q2 — recusa de contrato estrangeiro**: o banco é por domínio, então id de outro domínio responde 404 (nenhuma geração, nenhum vazamento); 403 continua valendo para papel (`requireRole`) e `domainId` explícito (`scopeDomain()`). A borda do épico ("403 antes de gerar") é satisfeita por recusa antes de gerar, documentada por caminho.
- **Q3 — escopo de fotos**: só `task_photos` (base da contagem entregue); anexos de comentário (`attachments`) ficam fora do documento.
- **Q4 — contrato desconhecido**: 404 já entregue e verificado pela suíte existente.

## Assumptions & Risks

### Assumptions
- Escritor de PDF próprio permanece sem dependência externa; a incorporação de imagem usa só `zlib` nativo do Node.
- `task_photos.path` guarda o nome do arquivo em `backend/uploads/` (loja servida same-origin por E003).
- Guardas de papel e escopo de E001 já estão ligadas nas rotas; a épica só as verifica.

### Risks
- **PNG com alpha mal embutido** *(likelihood: medium, impact: medium)*: canvas salvo como RGBA. Mitigação: unfilter + SMask testado com o fixture PNG real da loja.
- **Escopo vazando no download** *(likelihood: low, impact: high)*: URL acessível fora do papel. Mitigação: 403/404 na suíte fim a fim (FR-005).

## Implementation Signals

- `GAP:EMBEDDING` — nova função de embedding de imagem em `services/report.js` (zero dependência) + linha textual de fallback; nenhum sinal de esquema ou rota nova.

## Success Criteria

SC-001 [US1]: O gestor baixa o PDF do contrato na hora e o container contém as fotos do histórico de conclusão.
SC-002 [US1]: Apagar uma foto da loja não quebra o PDF: 200, evidência textual intacta.
SC-003 [US1]: Contrato sem tarefas devolve documento legível em ambos os formatos.
SC-004 [US2]: PDF e CSV entregam o mesmo conjunto de linhas para o mesmo contrato.
SC-005 [US2]: 0 relatórios gerados para prestador ou domínio divergente na suíte.

## Compliance Check

- **PASS** — `product`/E008/`{PRD:CAP-007}`/clarified; seções completas; FR-001..006 → US1/US2 (P1); SC-001..005; 0 marcadores; rastreável ao PRD (CAP-007) e ao plano entregue.
