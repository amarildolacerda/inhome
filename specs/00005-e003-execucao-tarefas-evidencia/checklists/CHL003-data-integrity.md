# Data Integrity Checklist: Execução de tarefas com evidência (00005)
**Created**: 2026-10-08 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 A ordem "arquivo gravado antes da referência no banco" está declarada como exigência? [Completeness, Spec §Requirements FR-003] <!-- Evaluator: Covered by spec.md FR-003 ("gravando o arquivo antes da referência no banco") + §Included e §Constraints da épica -->
- [X] CHK002 A política de falha de banco depois de gravar arquivo está declarada (500, órfão aceito, sem retrial)? [Completeness, Spec §Edge Cases & Boundaries] <!-- Evaluator: Covered by spec.md §Edge Cases ("500 e arquivo órfão permanece, sem retrial automático") + §Excluded (limpeza automática fora) -->
- [X] CHK003 A ausência de estado parcial em upload inválido está declarada, sem exceção? [Completeness, Spec §Requirements FR-009] <!-- Evaluator: Covered by spec.md FR-009 ("400 sem gravar arquivo nem registro") + SC-004 ("deixa disco e banco limpos") -->
- [X] CHK004 O limite de fotos por conclusão está declarado como regra de integridade de entrada? [Completeness, Spec §Requirements FR-003] <!-- Evaluator: Covered by spec.md FR-003 ("até 10 fotos") -->
- [X] CHK005 A geração de nome opaco está declarada como controle do registro? [Completeness, Spec §Assumptions] <!-- Evaluator: Covered by spec.md §Assumptions ("Nomes opacos gerados no upload") + §Constraints da épica (nome opaco gerado no upload) -->
- [X] CHK006 O que o registro persiste (referência, não bytes) está declarado? [Completeness, Spec §Key Entities] <!-- Evaluator: Covered by spec.md §Key Entities Evidência ("arquivo em disco mais o registro que aponta para ele") + plan.md §Requirement Coverage Map (saveToUploads()) -->
- [X] CHK007 Comentário e anexo ficam com autor e data declarados? [Completeness, Spec §Requirements FR-004] <!-- Evaluator: Covered by spec.md FR-004 ("com autor e data") + §Key Entities Comentário e Anexo -->
- [X] CHK008 O histórico de reabertura declara ação, autor, motivo e data? [Completeness, Spec §Requirements FR-006] <!-- Evaluator: Covered by spec.md FR-006 + SC-002 ("grava autor, motivo e data") -->

## Clarity

- [X] CHK009 O termo evidência está definido na própria spec? [Clarity, Spec §Key Entities] <!-- Evaluator: Covered by spec.md §Key Entities Evidência + §Problem Statement (prova do que foi feito) -->
- [X] CHK010 A distinção entre foto da conclusão e anexo da tarefa está declarada? [Clarity, Spec §Requirements FR-003] <!-- Evaluator: Covered by spec.md FR-003 (fotos na conclusão) vs FR-004 (anexos junto da tarefa) + §Key Entities -->
- [X] CHK011 O estado parcial aceito está descrito com efeito observável e causa? [Clarity, Spec §Stress-Test Findings] <!-- Evaluator: Covered by spec.md STF-001 (falha de banco no meio da gravação das fotos deixa a tarefa já `Concluída` sem todas as fotos) -->
- [X] CHK012 A política de arquivos órfãos é descrita como aceita nesta release, não como dívida aberta? [Clarity, Spec §Scope] <!-- Evaluator: Covered by spec.md §Excluded ("Limpeza automática ... aceita e documentada") + §Risks (sem coleta automática nesta release) -->

## Consistency

- [X] CHK013 O diretório de uploads é o mesmo entre plano, publicação do stack e proxy? [Consistency, Spec §Requirements FR-007] <!-- Evaluator: Covered by plan.md §Technical Context (`backend/uploads/` bind mount) = docker-compose.yml (backend/uploads → /app/uploads) = FR-007 (proxy preserva o caminho `/uploads/`) -->
- [X] CHK014 A política de estado parcial (STF-001) não contradiz a recusa de upload inválido (FR-009)? [Consistency, Spec §Stress-Test Findings] <!-- Evaluator: Covered by spec.md STF-001 (falha de banco, depois da gravação) vs FR-009 (entrada inválida, antes da gravação) — causas distintas, sem contradição -->
- [X] CHK015 A declaração de esquema inalterado é coerente com a superfície compartilhada com E007/E008? [Consistency, Spec §Key Entities] <!-- Evaluator: Covered by plan.md §Data Model Summary ("tasks, task_photos, task_history e attachments inalterados — superfície compartilhada com E007/E008") + HINT-004 -->

## Measurability

- [X] CHK016 A recusa de upload inválido tem teste que confere ausência de resíduo? [Measurability, Spec §Success Criteria SC-004] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-009 → backend/src/middleware/upload.test.js) + spec.md SC-004 -->
- [X] CHK017 O critério "disco e banco limpos" é conferível com mecanismo nomeado? [Measurability, Spec §Success Criteria SC-004] <!-- Evaluator: Covered by spec.md SC-004 + stub FR-009 (recusa 400 sem gravação) + US4 cenário 1 -->
- [X] CHK018 O registro de histórico de reabertura tem teste nomeado? [Measurability, Spec §Requirements FR-006] <!-- Evaluator: Covered by plan.md §Acceptance Test Stubs (FR-006 → backend/src/routes/tasks.test.js) -->

## Coverage

- [X] CHK019 Cada risco de dados da spec tem mitigação com dono nomeado no plano? [Coverage, Spec §Assumptions & Risks] <!-- Evaluator: Covered by plan.md §Risk Mitigation (3 riscos → nginx.conf, test-uploads-proxy.sh, upload.js; 3 de 3) -->

## Traceability

- [X] CHK020 FR-003 e FR-009 apontam para o símbolo que grava os bytes no mapa de cobertura? [Traceability, Spec §Requirements FR-003] <!-- Evaluator: Covered by plan.md §Requirement Coverage Map (FR-003 → saveToUploads()/completeTask(); FR-009 → saveToUploads()/fail(), decisão AD-004) -->
