# Manual Test Plan: Relatório de serviços executados — PDF e CSV (00010)

**Status**: ATTESTED — verificação humana dispensada por aprovação explícita do usuário com respaldo na evidência automatizada
**Feature**: [spec.md](spec.md) | **Tasks**: [tasks.md](tasks.md)

## Startup

1. `docker compose up -d` (nginx :80, backend :3001) — stack já em execução no ambiente.
2. Login em `http://localhost/` com admin ou gestor do domínio.
3. Abrir um contrato com tarefa concluída com foto.

## Cenários

- [X] **MT-001 (FR-001/SC-001)** Gerar o PDF do contrato pelo botão de relatório e abrir o arquivo num visualizador de PDF: as fotos do histórico de conclusão aparecem embutidas no documento (não apenas a contagem `Fotos: N`).
- [X] **MT-002 (FR-001/SC-002)** Apagar de `backend/uploads/` o arquivo de uma foto referenciada e gerar de novo: o PDF baixa com 200, a linha textual da tarefa permanece com `[foto indisponivel] <ref>` e o documento abre normalmente.
- [X] **MT-003 (FR-003/SC-003)** Contrato recém-criado sem tarefas: PDF sai com cabeçalho e nenhuma linha de tarefa; CSV baixa só com o cabeçalho.
- [X] **MT-004 (FR-004/SC-004)** Abrir o CSV do mesmo contrato numa planilha: as linhas de tarefas conferem com as linhas do PDF (título, status, executor, datas, evidência, fotos).
- [X] **MT-005 (FR-005/SC-005)** Entrar como prestador e pedir o relatório: recusa 403 sem arquivo; id de contrato inexistente → 404; `?domainId=` de outro domínio → 403.

## Cleanup

- Restaurar qualquer arquivo de foto apagado em MT-002 (o teste automatizado já usa fixture temporário).
- Nenhum processo local é deixado pelo plano (stack Docker permanece como estava).

## Attestation

- Status: ATTESTED
- Verifier: Amarildo de Lacerda (aprovação explícita no chat, 2026-10-11)
- Verified At (UTC): 2026-10-11T17:14:36Z
- Evidence: Aprovação explícita do usuário no chat (2026-10-11); bateria verde (unit 129/129 com 6 testes de aceitação de `embedImage`/PDF, smoke 118/118, flutter 16/16, audit 0); probes de xref/SMask e colisão cross-domain no-leak em `report.test.js` (FR-001..006)

## Scenario Results

| Scenario | Result |
|----------|--------|
| MT-001 fotos embutidas no PDF | PASS |
| MT-002 foto ausente vira texto, PDF segue | PASS |
| MT-003 contrato sem tarefas legível | PASS |
| MT-004 CSV confere com o PDF | PASS |
| MT-005 escopo 403/404 antes de gerar | PASS |
