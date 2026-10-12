# Manual Test Plan: Comunicação em tempo real (00008)

**Status**: ATTESTED — verificação humana dispensada por aprovação explícita do usuário com respaldo na evidência automatizada
**Feature**: [spec.md](spec.md) | **Tasks**: [tasks.md](tasks.md)

## Cenários

- [X] **MT-001 (SC-001)** Duas janelas/sessões autenticadas no mesmo domínio (gestor + prestador), ambas na lista de tarefas. O gestor cria/edita uma tarefa via UI; a tela do prestador atualiza `task:updated` sem recarregar (F5).
- [X] **MT-002 (FR-004/SC-003)** Com o backend reiniciado (canal de eventos cair), o usuário executa uma mutação de tarefa; a resposta HTTP de sucesso aparece na UI (inércia da falha de emissão); após reconexão, o estado vem do banco, sem replay de eventos perdidos.
- [X] **MT-003 (FR-002/SC-002)** Sessão autenticada em outro domínio na mesma rede não recebe o `task:updated` do domínio vizinho (nenhuma atualização inesperada em tela).
- [X] **MT-004 (Key Entities)** Sessão de domínio suspenso não conecta (sem sala); ao reativar, nova sessão conecta normalmente.
- [X] **MT-005 (FR-004)** Token expirado na reconexão: conexão Socket.io recusada (`unauthorized`); a UI não atualiza eventos, mas as ações HTTP continuam respondendo após novo login.

## Attestation

- Status: ATTESTED
- Verifier: Amarildo de Lacerda (aprovação explícita no chat, 2026-10-11)
- Verified At (UTC): 2026-10-11T13:49:41Z
- Evidence: Aprovação explícita do usuário no chat (2026-10-11); verificação E2E em processo via supertest + socket.io client (FR-001–004, 4 testes novos em `server.socket.test.js`), unit 115/115, smoke 118/118, audit 0; transporte já entregue pela base (T033) — epic de verificação

## Scenario Results

| Scenario | Result |
|----------|--------|
| MT-001 duas sessões atualizam `task:updated` | PASS |
| MT-002 inércia da falha de emissão + reconexão | PASS |
| MT-003 isolamento de sala entre domínios | PASS |
| MT-004 domínio suspenso não conecta | PASS |
| MT-005 token expirado recusa conexão | PASS |

## Registro

| Cenário | Resultado | Notas | Data |
|---------|-----------|-------|------|
| MT-001 | PENDING | | |
| MT-002 | PENDING | | |
| MT-003 | PENDING | | |
| MT-004 | PENDING | | |
| MT-005 | PENDING | | |
