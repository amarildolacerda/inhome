# Manual Test Plan: Comunicação em tempo real (00008)

**Status**: PENDING — requer verificação humana em navegador com duas janelas
**Feature**: [spec.md](spec.md) | **Tasks**: [tasks.md](tasks.md)

## Cenários

- [ ] **MT-001 (SC-001)** Duas janelas/sessões autenticadas no mesmo domínio (gestor + prestador), ambas na lista de tarefas. O gestor cria/edita uma tarefa via UI; a tela do prestador atualiza `task:updated` sem recarregar (F5).
- [ ] **MT-002 (FR-004/SC-003)** Com o backend reiniciado (canal de eventos cair), o usuário executa uma mutação de tarefa; a resposta HTTP de sucesso aparece na UI (inércia da falha de emissão); após reconexão, o estado vem do banco, sem replay de eventos perdidos.
- [ ] **MT-003 (FR-002/SC-002)** Sessão autenticada em outro domínio na mesma rede não recebe o `task:updated` do domínio vizinho (nenhuma atualização inesperada em tela).
- [ ] **MT-004 (Key Entities)** Sessão de domínio suspenso não conecta (sem sala); ao reativar, nova sessão conecta normalmente.
- [ ] **MT-005 (FR-004)** Token expirado na reconexão: conexão Socket.io recusada (`unauthorized`); a UI não atualiza eventos, mas as ações HTTP continuam respondendo após novo login.

## Registro

| Cenário | Resultado | Notas | Data |
|---------|-----------|-------|------|
| MT-001 | PENDING | | |
| MT-002 | PENDING | | |
| MT-003 | PENDING | | |
| MT-004 | PENDING | | |
| MT-005 | PENDING | | |
