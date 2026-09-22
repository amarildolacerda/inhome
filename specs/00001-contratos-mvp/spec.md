---
spec_type: product
spec_maturity: draft
created: 2026-09-22
updated: 2026-09-22
---
# Spec — Gestão de Contratos de Terceiros (MVP)

## Problem Statement

Administração: vigência, tarefas, evidências. Dashboard multi-domínio: contrato agrupa tarefas; conclusão documentada; relatório.

## Scope

### Included
- Ciclo domínio: habilitar cria banco+admin; suspender preserva dados
- Usuários/papéis por domínio: admin, gestor, prestador
- Finalidades por domínio (escolhidas no contrato)
- Contrato: datas, status, prestadores, prorrogação/encerramento pelo gestor
- Tarefas/contrato: fluxo, prestador vinculado, conclusão+foto, reabertura, comentários, anexos
- Busca/filtros; SMTP_*; PDF/contrato (+CSV); dashboard; realtime; validação; JWT; uploads; SQLite/domínio

### Excluded
- Subtarefas; multi-domínio; fornecedor além prestador; WCAG AA; deploy/CI; system_admin lendo negócio

### Edge Cases & Boundaries
- Contrato vencido com tarefas abertas: tarefas seguem editáveis; atraso só sinalizado
- Sessão pós-suspensão: revalidação nega
- Tarefas abertas travam desvinculação
- Retirar finalidade não altera contratos
- Conclusão exige texto; fotos opcionais
## User Scenarios & Testing
### User Story 1 - Domínio (Priority: P1)

system_admin habilita (banco+admin), suspende, reabilita. Habilitar → login → suspender → falha → reabilitar → ok.

### User Story 2 - Preparação (Priority: P1)

Admin cria usuários/finalidades. Papel; finalidade em contrato.

### User Story 3 - Contrato (Priority: P1)

Gestor cria, vincula, prorroga/encerra. Vencer → atrasado; prorrogar → vigente; encerrar → final.

### User Story 4 - Tarefas (Priority: P1)

Gestor cria tarefas; só vinculado. Não-vinculado → recusa.
### User Story 5 - Execução e conclusão (Priority: P1)

Prestador conclui só suas; texto+foto. Alheia invisível; sem texto → recusa.
### User Story 6 - Reabertura (Priority: P1)

Gestor reabre com motivo registrado no histórico. Teste: sem motivo → recusa; prestador reabre → negado.

### User Story 7 - Relatório por contrato (Priority: P1)

Gestor gera PDF: tarefa, conclusão, prestador, datas, fotos.

### User Story 8 - Isolamento (Priority: P1)

A não lê B. API de A → recurso de B → 403/404.

### User Story 9 - Busca (Priority: P1)

Combinar filtros → conjunto correto.

### User Story 10 - E-mail opt-in (Priority: P1)

Sem SMTP_* zero envios/erros; com, atribuição/conclusão/reabertura/vencimento disparam.
### User Story 11 - Dashboard (Priority: P1)

Admin/gestor: domínio; prestador: só suas.

### User Story 12 - Realtime e validação (Priority: P1)

A reflete em B sem reload; payload inválido → validação.

## Requirements
### Functional
- **FR-001** [US1]: system_admin habilita; cria banco do domínio + primeiro admin.
- **FR-002** [US1]: suspensão bloqueia login; reabilitação restaura; nunca apaga.
- **FR-003** [US1]: system_admin sem acesso a dados de negócio.
- **FR-004** [US2]: admin CRUD usuários; papéis admin/gestor/prestador.
- **FR-005** [US2]: dicionário de finalidades (criar, editar, retirar).
- **FR-006** [US3]: contrato: nome/objeto, finalidade, início, previsão, status.
- **FR-007** [US3]: vincular/desvincular; desvincular exige tarefas fechadas.
- **FR-008** [US3]: prorrogação/encerramento; vencido só sinaliza.
- **FR-009** [US3]: só admin exclui.
- **FR-010** [US4]: fluxo A Fazer → Em Progresso → Revisão → Concluída; só prestador vinculado.
- **FR-011** [US5]: prestador só suas; conclusão: texto+foto.
- **FR-012** [US6]: reabertura com motivo; prestador não reabre.
- **FR-013** [US5]: prestador só contratos com suas; admin/gestor o domínio.
- **FR-014** [US8]: query restrita ao domínio; cross-domain → 403/404.
- **FR-015** [US5]: comentários/anexos além das fotos; prestador só nas próprias.
- **FR-016** [US9]: busca/filtros: contrato, status, prioridade, prestador, finalidade, prazo.
- **FR-017** [US10]: e-mail: atribuição, conclusão, reabertura, vencimento; SMTP_* gate.
- **FR-018** [US7]: PDF/contrato (feito, quem, datas, fotos); CSV secundário.
- **FR-019** [US11]: métricas do domínio; prestador só próprias.
- **FR-020** [US12]: Socket.io sem reload.
- **FR-021** [US12]: validação backend + formulários.
- **FR-022** [US2]: JWT/papel; system_admin só ciclo; admin tudo; gestor contratos/tarefas/relatórios; prestador só suas.
- **FR-023** [US5]: uploads em disco; guarda só referência.
- **FR-024** [US8]: data/domains/<id>.db por domínio; data/platform.db.
- **FR-025** [US1]: sql.js; better-sqlite3 se build OK.
- **FR-026** [US9]: milhares de contratos; <2s localhost.
- **FR-027** [US11]: Chrome, Edge, Firefox, Safari.
- **FR-028** [US11]: labels, contraste, teclado.
- **FR-029** [US12]: backend 3001; frontend 8080/3000.

## Assumptions & Risks
- Scaffold (auth/projects/tasks; 4 telas) remodelado.
- better-sqlite3 falhou; sql.js default.
- E-mail: SMTP_* posterior.
- Flutter SDK ausente.
- Lib PDF no plano.

## Implementation Signals
- backend/src: domínios; projects→contracts; uploads/; e-mail; PDF; Socket.io/domínio.
- Dados: data/platform.db + data/domains/*.db (gitignore); seed admin.
- frontend/lib: telas domínio/contratos; projects_screen; guarda papéis; tema theme/.
- Fontes: docs/approved-scope-draft.md; project-instructions.md v2. Auth: JWT papel+domainId.
## Success Criteria
SC-001 [US1]: admin habilita; primeiro admin loga.
SC-002 [US1]: suspenso recusa; reabilitar restaura.
SC-013 [US2]: gestor+finalidade <5 min; selecionável.
SC-003 [US3]: vencido → atrasado; gestor prorroga/encerra.
SC-004 [US4]: sem atribuição a não-vinculado (API).
SC-005 [US5]: conclusão: texto; fotos visíveis.
SC-006 [US6]: motivo; histórico quem/por quê.
SC-007 [US7]: PDF: tarefa, conclusão, executor, datas.
SC-008 [US8]: dois domínios — zero cruzamento.
SC-009 [US9]: filtros <2s com 1000 contratos.
SC-010 [US10]: sem SMTP_* zero envios; com, quatro gatilhos.
SC-011 [US11]: dashboard por papel <2s.
SC-012 [US12]: sem reload; payload → validação.
