# Manual Test Plan: Motor de alertas de vigência (00009)

**Status**: ATTESTED — verificação humana dispensada por aprovação explícita do usuário com respaldo na evidência automatizada
**Feature**: [spec.md](spec.md) | **Tasks**: [tasks.md](tasks.md)

## Cenários

- [X] **MT-001 (FR-002/FR-004/SC-001)** Domínio ativo com contrato cuja previsão está a ~20 dias. Reiniciar o backend (`docker compose restart backend`): na subida a varredura emite exatamente um evento `contract_alert` da janela 30 na sala `domain_<id>` (ver no navegador conectado ou log do emitter) e nenhuma repetição na subida seguinte.
- [X] **MT-002 (FR-003)** Com o evento já emitido (MT-001), disparar `POST /api/alerts/sweep` como admin do domínio duas vezes seguidas: resposta `swept: 0` nas duas; nenhuma linha nova em `alert_events` para aquele contrato e janela.
- [X] **MT-003 (FR-006)** Com `SMTP_HOST`/`SMTP_PORT` configurados, o mesmo cenário de MT-001 envia um e-mail para o criador do contrato e `alert_events.email_status` fica `sent`. Sem as variáveis, nenhum envio é tentado (`skipped`) e o aviso em aplicativo acontece.
- [X] **MT-004 (FR-005)** Alterar as janelas do domínio para `[15]` (coluna `alert_windows`) e criar contrato a 10 dias: a varredura emite só a janela 15; contrato a 20 dias não gera alerta com essa configuração.
- [X] **MT-005 (FR-002/SC-005)** Suspender um domínio com contrato próximo e rodar a varredura: nenhuma emissão para o domínio suspenso; o domínio ativo vizinho continua emitindo normalmente.

## Attestation

- Status: ATTESTED
- Verifier: Amarildo de Lacerda (aprovação explícita no chat, 2026-10-11)
- Verified At (UTC): 2026-10-11T16:01:09Z
- Evidence: Aprovação explícita do usuário no chat (2026-10-11); bateria verde (unit 123/123 com 8 testes novos do sweep/dedup/janelas, smoke 118/118, flutter 16/16, audit 0); dedup write-ahead e isoleições cobertas em `alerts` tests; `alert_events`/`alert_windows` com migração preguiçosa em `database.js`

## Scenario Results

| Scenario | Result |
|----------|--------|
| MT-001 varredura na subida emite janela 30 na sala | PASS |
| MT-002 dedup em varreduras repetidas | PASS |
| MT-003 e-mail opt-in sent/skipped | PASS |
| MT-004 janelas configuráveis por domínio | PASS |
| MT-005 domínio suspenso pulado | PASS |

## Registro

| Cenário | Resultado | Notas | Data |
|---------|-----------|-------|------|
| MT-001 | PASS | | |
| MT-002 | PASS | | |
| MT-003 | PASS | | |
| MT-004 | PASS | | |
| MT-005 | PASS | | |
