---
feature_branch: "00005-e003-execucao-tarefas-evidencia"
created: 2026-10-08
input: "E003 Execução de tarefas com evidência"
spec_type: product
spec_maturity: clarified
epic_id: E003
epic_sources: "{PRD:CAP-003}"
---

# Spec — Execução de tarefas com evidência (E003)

## Problem Statement

Conclusão sem documentação não existe no produto: texto obrigatório e fotos sustentam a prova do que foi feito, é a prova que o gestor entrega quando alguém questiona. O fluxo já roda, mas as fotos só chegam à tela com `/uploads` same-origin no Edge, decisão aprovada e ainda fora do `frontend/nginx.conf`. Sem ele, o fallback devolve o `index.html` do SPA no lugar da imagem.

## Scope

### Included

- Verificação do fluxo `A Fazer → Em Progresso → Revisão → Concluída` com vínculo obrigatório do prestador.
- Conclusão documentada: texto obrigatório, fotos opcionais, arquivo gravado antes da referência no banco.
- Reabertura com motivo obrigatório registrado no histórico; comentários e anexos junto da tarefa.
- Encaminhamento `location ^~ /uploads/ { proxy_pass http://backend:3001; }` no `frontend/nginx.conf` e imagem renderizada em `http://localhost/`.
- Regressão de upload recusado (400 sem gravação) e de escopo de domínio nas rotas de tarefa.

### Excluded

- Central documental (anexos de contrato, ocorrências, trilha de alterações) — próxima release, PDD-003.
- Assinatura eletrônica e fluxo jurídico de cláusulas — fora do escopo, PDD-009.
- Limpeza automática de arquivos órfãos — falha de banco após gravar arquivo é aceita e documentada.
- Proteção de `/uploads` por token — decisão Q4 aceita nesta release, revisão em 2026-12-26.

### Edge Cases & Boundaries

- Upload recusado (tipo ou tamanho fora do padrão): 400 e nada é gravado, nem arquivo nem registro.
- Banco falhar depois de o arquivo existir: 500 e arquivo órfão permanece, sem retrial automático.
- Reabertura sem motivo: 400 antes de qualquer escrita.
- Evidência em domínio suspenso ou de outro domínio: 403.
- URL de `/uploads` sem token: acessível a quem tenha o endereço — restrição aceita, revisão em 2026-12-26.

## User Scenarios & Testing

### User Story 1 - Conclusão documentada visível (Priority: P1)

Como prestador, concluo descrevendo o que fiz e anexando fotos; o gestor vê as fotos na tela, provando a execução sem pedir arquivo por fora.

**Why this priority**: evidência junto da execução é princípio de produto e o valor probatório é metade da proposta de valor.

**Independent Test**: concluir tarefa com texto e duas fotos e confirmar que elas renderizam no navegador pelo caminho `/uploads`.

**Acceptance Scenarios**:

1. **Given** tarefa em `Revisão`, **When** o prestador vinculado envia texto e fotos, **Then** fica `Concluída` com evidência anexada e histórico registrado.
2. **Given** conclusão sem texto, **When** a requisição chega, **Then** 400 e nada muda no banco.
3. **Given** tarefa concluída, **When** o gestor comenta e anexa arquivo, **Then** comentário e anexo ficam junto da tarefa com autor e data.

### User Story 2 - Reabertura justificada (Priority: P1)

Como gestor, devolvo a tarefa ao prestador com motivo obrigatório, e o histórico guarda quem reabriu e por quê.

**Why this priority**: sem motivo registrado a reabertura vira disputa sem prova, o problema de responsabilidade que o produto resolve.

**Independent Test**: reabrir uma tarefa concluída e conferir motivo e autor no histórico.

**Acceptance Scenarios**:

1. **Given** tarefa concluída, **When** o gestor reabre com motivo, **Then** a tarefa volta ao fluxo e o histórico registra ação, autor e motivo.
2. **Given** reabertura sem motivo, **When** a requisição chega, **Then** 400 antes de qualquer escrita.

### User Story 3 - Evidência acessível same-origin (Priority: P1)

Como gestor, abro a tarefa e vejo a foto na própria tela, sem URL quebrada nem download separado.

**Why this priority**: sem o proxy `/uploads` a prova existe no disco mas não chega ao usuário — a capacidade fica pela metade.

**Independent Test**: aplicar o bloco nginx e confirmar que `GET /uploads/<arquivo>` devolve 200 com content-type de imagem, não o `index.html`, e abrir a foto no navegador.

**Acceptance Scenarios**:

1. **Given** encaminhamento `/uploads` aplicado no Edge, **When** a SPA pede a imagem, **Then** o nginx repassa para `backend:3001` e a imagem renderiza.
2. **Given** `/uploads/` sem encaminhamento, **When** a SPA pede a imagem, **Then** a resposta seria `index.html` — cenário eliminado pela correção.

### User Story 4 - Recusa limpa e domínio isolado (Priority: P1)

Como admin, sei que upload inválido não deixa lixo e que tarefa, comentário ou anexo de outro domínio ou domínio suspenso não se lê nem escreve.

**Why this priority**: resíduo de upload e vazamento entre domínios corrompem a prova e quebram o isolamento de E001.

**Independent Test**: enviar arquivo inválido, repetir a leitura com domínio cruzado e domínio suspenso, conferindo 400 sem resíduo e 403.

**Acceptance Scenarios**:

1. **Given** arquivo com tipo ou tamanho fora do padrão, **When** o upload chega, **Then** 400 e nem arquivo nem registro existem depois.
2. **Given** token de domínio A ou domínio suspenso, **When** a requisição atinge rota de tarefa, **Then** 403 sem leitura nem escrita.

## Requirements

### Functional Requirements

- **FR-001** [US1]: Sistema DEVE movimentar a tarefa por `A Fazer → Em Progresso → Revisão → Concluída`, aceitando a conclusão só do prestador vinculado (admin e gestor recebem 403).
- **FR-002** [US1]: Sistema DEVE exigir texto não vazio na conclusão, respondendo 400 sem alterar status, evidência ou histórico quando ausente.
- **FR-003** [US1]: Sistema DEVE aceitar até 10 fotos opcionais na conclusão, gravando o arquivo antes da referência no banco e registrando a conclusão no histórico.
- **FR-004** [US1]: Sistema DEVE gravar comentários e anexos junto da tarefa com autor e data, restritos ao domínio do token.
- **FR-005** [US2]: Sistema DEVE exigir motivo na reabertura, respondendo 400 antes de qualquer escrita quando ausente.
- **FR-006** [US2]: Sistema DEVE devolver a tarefa ao fluxo quando reaberta por admin ou gestor e registrar no histórico ação, autor, motivo e data da reabertura.
- **FR-007** [US3]: Sistema DEVE encaminhar `/uploads` no Edge para `backend:3001` pelo bloco `location ^~ /uploads/` com headers `Host` e `X-Real-IP`, sem conflitar com o fallback do SPA.
- **FR-008** [US3]: Sistema DEVE responder `GET /uploads/<arquivo>` com 200 e content-type de imagem, nunca o `index.html` do SPA, comprovado por requisição automatizada no stack nginx.
- **FR-009** [US4]: Sistema DEVE recusar upload de tipo ou tamanho fora do padrão com 400 sem gravar arquivo nem registro.
- **FR-010** [US4]: Sistema DEVE recusar com 403, antes de qualquer leitura ou escrita, tarefa, comentário ou anexo de outro domínio ou de domínio suspenso, com o guarda de escopo ligado nos três roteadores.
- **FR-011** [US4]: Sistema DEVE manter o `prestador` restrito às próprias tarefas na leitura, sem expor tarefas de terceiros.

### Key Entities

- **Tarefa**: item de execução com status do fluxo, prestador vinculado e texto de conclusão.
- **Evidência**: arquivo em disco mais o registro que aponta para ele, criado na conclusão ou no anexo.
- **Histórico de tarefa**: linha de ação com autor, motivo quando exigido e data.
- **Comentário e Anexo**: registros junto da tarefa, com autor e data.

## Assumptions & Risks

### Assumptions

- O diff do SAD não conflita com as regras de fallback do `nginx.conf`.
- Nomes opacos gerados no upload seguem impedindo enumeração enquanto `/uploads` ficar sem token.
- A suíte atual cobre conclusão e reabertura; só a renderização da foto precisa de verificação nova.

### Risks

- **Evidência fora da sessão** *(likelihood: medium, impact: medium)*: URL de `/uploads` sem token lê a foto sem sessão; mitigação: nome opaco e revisão em 2026-12-26; superfície limitada ao host local.
- **Fallback mascarando erro** *(likelihood: low, impact: high)*: sem o proxy o navegador exibe o SPA no lugar da imagem e o erro parece de UI; mitigado pela verificação de status e content-type.
- **Arquivo órfão acumulando** *(likelihood: low, impact: low)*: falha de banco após gravar deixa lixo em disco; aceito e documentado, sem coleta automática nesta release.

## Implementation Signals

- `NEW-CONFIG` — bloco `location ^~ /uploads/ { proxy_pass http://backend:3001; }` com headers `Host` e `X-Real-IP` em `frontend/nginx.conf`, do diff registrado no SAD.

## Success Criteria

SC-001 [US1]: Toda conclusão carrega texto e histórico com evidência opcional anexada; conclusão sem texto nunca passa pela API.
SC-002 [US2]: Toda reabertura grava autor, motivo e data, e a tentativa sem motivo não deixa rastro de escrita.
SC-003 [US3]: A foto da evidência renderiza na tela pelo caminho same-origin, sem URL quebrada, em qualquer navegador suportado.
SC-004 [US4]: Upload inválido deixa disco e banco limpos, e requisição de outro domínio ou domínio suspenso recebe 403 sem ler nem escrever nada.

## Clarifications

### Session 2026-10-08

- Q: Quem conclui a tarefa? -> A: Só o prestador vinculado em `Revisão`; admin e gestor recebem 403.
- Q: Rotas de tarefa, comentário e anexo ligam `scopeDomain()`? -> A: Sim, nos três; `domainId` estrangeiro → 403 antes de qualquer consulta.
- Q: Headers do bloco `/uploads`? -> A: Diff do SAD literal: `Host` e `X-Real-IP`.
- Q: Como comprovar a renderização? -> A: Requisição automatizada no stack nginx (200 e `image/*`) e abertura visual no manual-test.
- Q: Limite de fotos por conclusão? -> A: 10, já implementado; sem regra nova.

## Stress-Test Findings

### Session 2026-10-08

STF-001: [boundary-scale-stress] (MEDIUM) — Affected: FR-003, FR-009 — falha de banco no meio da gravação das fotos deixa a tarefa já `Concluída` sem todas as fotos sem rollback; resolvido aceitando o parcial como o órfão já aceito nesta release, sem retrial.

## Compliance Check

- **Result**: PASS.
