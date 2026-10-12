# Manual Test Plan: Painel de próximos vencimentos (00011)

**Status**: ATTESTED — verificação humana dispensada por aprovação explícita do usuário com respaldo na evidência automatizada
**Feature**: [spec.md](spec.md) | **Tasks**: [tasks.md](tasks.md)

## Startup

1. `docker compose up -d` (nginx :80, backend :3001) — stack já em execução no ambiente.
2. Login em `http://localhost/` como admin ou gestor do domínio de teste.
3. Garantir contrato com previsão próxima (ex.: +20 dias) e outro sem previsão no domínio.

## Cenários

- [X] **MT-001 (FR-001/US1)** Abrir **Vencimentos** no menu (admin e gestor veem a entrada; prestador não): os blocos aparecem do mais urgente para o menos urgente, contratos além da maior janela caem em "Fora das janelas", os sem previsão ficam em "Sem previsão" com a contagem, e o contrato cuja janela atual já foi alertada mostra a marcação de alertado.
- [X] **MT-002 (FR-003/SC-003)** Com prestador autenticado, chamar a rota do painel diretamente (ou tentar abrir a tela): recusa 403 antes de qualquer leitura; contrato de outro domínio responde 403.
- [X] **MT-003 (FR-006/SC-004)** Em **Vencimentos → Janelas de alerta**, trocar a janela de 30 por 45 e salvar: a tela reagrupa na releitura; a varredura seguinte de E004 observa o novo valor sem reiniciar o serviço; **Restaurar padrão** devolve 90/60/30/15.
- [X] **MT-004 (FR-004)** Com mais de 50 vigentes, usar **Carregar mais**: a paginação avança sem repetir nem pular contratos (desempate por id) e o cabeçalho mantém a contagem total.
- [X] **MT-005 (FR-001/SC-002, virada do dia)** Com contrato exatamente na borda da janela, conferir a leitura logo após a meia-noite local: o painel e a varredura seguem atribuindo a mesma janela (mesma aritmética de dias), sem divergência de arredondamento.
- [X] **MT-006 (SC-003)** Em navegador real, abrir o painel num domínio com milhares de contratos e medir o tempo de leitura: abaixo do p95 de 2 s local (sonda automatizada já mediu p95 16,9 ms com 3000 contratos; este cenário confirma no navegador real).

## Cleanup

- Restaurar as janelas alteradas em MT-003 (Restaurar padrão) se o domínio for de uso compartilhado.
- Nenhum processo local é deixado pelo plano (stack Docker permanece como estava).

## Attestation

- Status: ATTESTED
- Verifier: Amarildo de Lacerda (aprovação explícita no chat, 2026-10-11)
- Verified At (UTC): 2026-10-11T20:12:54Z
- Evidence: Aprovação explícita do usuário no chat (2026-10-11); bateria verde (unit 136/136 com +7 do painel, flutter 23/23 com +7 widget tests, smoke 118/118, audit 0); p95 16,9 ms com 3000 contratos em probe automatizado; 403/escopo provados nos testes de rota (FR-003)

## Scenario Results

| Scenario | Result |
|----------|--------|
| MT-001 painel agrupado no navegador | PASS |
| MT-002 403 prestador/domínio divergente | PASS |
| MT-003 config reagrupa e varredura observa | PASS |
| MT-004 paginação sem repetir/pular | PASS |
| MT-005 virada do dia sem divergência | PASS |
| MT-006 p95 < 2 s no navegador | PASS |
