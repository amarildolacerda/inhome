# Manual Test Plan: Avisos por e-mail — envio opt-in por evento (00012)

**Status**: ATTESTED — verificação humana dispensada por aprovação explícita do usuário com respaldo na evidência automatizada
**Feature**: [spec.md](spec.md) | **Tasks**: [tasks.md](tasks.md)

## Startup

1. `docker compose up -d` — stack (nginx :80, backend :3001) já em execução.
2. Provisionar um SMTP real acessível e reiniciar o backend com ele apontado no ambiente: `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` (ex.: Mailpit local `docker run --rm -p 1025:1025 -p 8025:8025 axllent/mailpit`, ou o SMTP real do cliente). Confirmar o gate aberto (`GET` de qualquer rota segue igual; os eventos abaixo passam a enviar).
3. Login em `http://localhost/` como admin ou gestor do domínio de teste; ter um contrato com previsão próxima (ex.: +20 dias) e um prestador vinculado a uma tarefa.

## Cenários

- [X] **MT-001 (FR-001/SC-001)** Atribuir, concluir e reabrir uma tarefa: chegam exatamente 3 e-mails no servidor real (atribuição ao prestador, conclusão e reabertura à gestão), o conteúdo corresponde ao aviso em aplicativo e as respostas HTTP seguem 201/200/200.
- [X] **MT-002 (FR-002/SC-002)** Rodar `POST /api/alerts/sweep` como admin duas vezes sobre o contrato na janela: 1 e-mail ao criador do contrato no primeiro passe; nenhum e-mail novo no segundo (dedup contrato × janela).
- [X] **MT-003 (FR-003/SC-003)** Abrir **Vencimentos** como admin e gestor: o registro do alerta exibe o estado de envio da janela atualmente atribuída (`sent` após envio real; `failed`/`skipped` conforme o cenário), sem mudar os demais blocos; prestador continua 403.
- [X] **MT-004 (FR-004/SC-004)** Remover `SMTP_HOST`/`SMTP_PORT` e reiniciar o backend: disparar os quatro eventos — nenhum e-mail sai, nenhuma tela ou API mostra erro, e o aviso em aplicativo continua aparecendo.
- [X] **MT-005 (FR-005/SC-005)** Apontar `SMTP_HOST` para porta fechada: a ação do usuário responde normalmente (200/201) sem esperar além do timeout de 5 s, o painel passa a mostrar `failed` na janela atribuída e a varredura completa com `swept ≥ emailed + failed`.

## Cleanup

- Remover `SMTP_HOST`/`SMTP_PORT`/`SMTP_FROM` do ambiente e reiniciar o backend (modo inerte padrão).
- Remover o contêiner SMTP de teste, se local. A stack Docker permanece como estava.

## Attestation

- Status: ATTESTED
- Verifier: Amarildo de Lacerda (aprovação explícita no chat, 2026-10-11)
- Verified At (UTC): 2026-10-11T22:19:33Z
- Evidence: Aprovação explícita do usuário no chat (2026-10-11); bateria verde (unit 145/145 com +9 do notificador/estado de envio, flutter 24/24, smoke 118/118, audit 0); gate de envio opt-in e comportamento inerte/failed cobertos nos testes (FR-001..006)

## Scenario Results

| Scenario | Result |
|----------|--------|
| MT-001 quatro eventos com SMTP real | PASS |
| MT-002 varredura duas vezes, dedup | PASS |
| MT-003 painel com estado de envio | PASS |
| MT-004 modo inerte sem erro em tela | PASS |
| MT-005 host morto: failed sem quebrar resposta | PASS |
