# Escopo aprovado — Sistema de gestão de contratos de terceiros

Rascunho conversacional aprovado pelo owner em 2026-09-22. Entrada oficial para `/sddp-specify`.

## Visão

Dashboard de administração de contratos de terceiros com gestão de projeto por contrato. Plataforma multi-domínio: cada domínio é um cliente/isolamento de dados com seus contratos, usuários e regras.

## Arquitetura de dados

- Banco por domínio: SQLite em `data/domains/<domainId>.db`.
- Banco de plataforma: `data/platform.db` (domínios + usuários `system_admin`).
- Habilitar domínio = criar arquivo de banco + criar primeiro usuário `admin` do domínio.
- Suspender domínio = bloquear acesso de todos os usuários do domínio; dados preservados; reabilitação restaura o acesso.
- `system_admin` opera apenas no banco da plataforma; nunca acessa dados de contrato/tarefa de domínios.
- Driver: `sql.js` já está no projeto (sem build nativo); `better-sqlite3` só se o build passar no ambiente.
- Volume-alvo: milhares de contratos por plataforma.

## Hierarquia

```
system_admin
  └── Domínio (habilitado | suspenso)
        ├── Contratos
        │     ├── prestadores vinculados
        │     └── tarefas (múltiplas)
        └── Usuários do domínio (admin, gestor, prestador)
```

## Entidades principais

### Domínio
- Cadastro pela plataforma; status `habilitado | suspenso`.
- Ao habilitar: criação do 1º usuário `admin` (nome, e-mail, senha).

### Usuário
- Papéis: `system_admin` | `admin` | `gestor` | `prestador`.
- `admin`, `gestor`, `prestador` pertencem a exatamente 1 domínio.
- `system_admin` não pertence a domínio.

### Finalidade (dicionário por domínio)
- Lista de valores possíveis; admin do domínio gerencia.
- Cada contrato recebe exatamente 1 finalidade.

### Contrato
- Campos: domínio, nome/objeto, finalidade (selecionada do dicionário), data de início, previsão de finalização, status.
- Status operacional: em vigência, atrasado (passou da previsão), encerrado (gestor encerra).
- Prestadores vinculados (membros do contrato).

### Tarefa
- Vinculada a 1 contrato; atribuída a 1 prestador vinculado ao contrato.
- Fluxo: `A Fazer → Em Progresso → Revisão → Concluída` (+ reabertura).
- Prioridade, responsável, prazo.
- Conclusão (prestador): texto de documentação + fotos da execução (obrigatório texto; fotos opcionais mas suportadas).
- Reabertura (gestor/admin): motivo obrigatório, registrado no histórico.
- Comentários livres e anexos genéricos (PDF, docs) na tarefa.

### Relatório
- PDF de serviços executados, escopo por contrato: o que foi feito (tarefa + texto de conclusão), quem executou (prestador), data (conclusão/execução); inclui fotos como evidência.
- Disparado por admin/gestor.

## Papéis e permissões

| Ação | system_admin | admin | gestor | prestador |
|---|---|---|---|---|
| Habilitar/suspender domínio; criar 1º admin | ✅ | ❌ | ❌ | ❌ |
| Ver contratos/tarefas/relatórios | ❌ | ✅ | ✅ | só seus |
| Gerenciar usuários do domínio | ❌ | ✅ | ❌ | ❌ |
| Gerenciar dicionário de finalidades | ❌ | ✅ | ❌ | ❌ |
| CRUD contrato, prorrogar, encerrar | ❌ | ✅ | ✅ | ❌ |
| Vincular/desvincular prestador ao contrato | ❌ | ✅ | ✅ | ❌ |
| Criar/atribuir/editar tarefa | ❌ | ✅ | ✅ | ❌ |
| Atualizar status/prazo da tarefa | ❌ | ✅ | ✅ | só suas |
| Concluir com texto + fotos | ❌ | ✅ | ✅ | só suas |
| Reabrir com motivo | ❌ | ✅ | ✅ | ❌ |
| Comentar/anexar em tarefa visível | ❌ | ✅ | ✅ | só suas |
| Relatório PDF / export por contrato | ❌ | ✅ | ✅ | ❌ |
| Dashboard | ❌ | completo | completo | parcial (suas tarefas) |

Isolamento: toda query de negócio filtrada pelo domínio do usuário logado; físico via arquivo de banco por domínio.

## Regras de negócio

1. Contrato passou da previsão de finalização → sinalizado como atrasado; sem bloqueio automático.
2. Gestor (e admin) prorroga (atualiza previsão) ou encerra o contrato.
3. Prestador dá tarefa por concluída sem validação prévia, documentando com texto + fotos.
4. Gestor (e admin) discorda → reabre com motivo obrigatório.
5. Tarefa só pode ser atribuída a prestador vinculado ao contrato.
6. Suspensão de domínio nunca apaga dados.

## MVP — dentro

- CRUD: domínio (habilitar/suspender), usuário, finalidade, contrato, tarefa.
- Vínculo prestador ↔ contrato.
- Fluxo de tarefa com conclusão documentada + fotos e reabertura justificada.
- Comentários e anexos genéricos em tarefa.
- Busca e filtros avançados (domínio, contrato, status, prioridade, prestador, prazo).
- Notificações por e-mail: código pronto, desativado quando ausentes `SMTP_*` no `.env`; gatilhos: atribuição, conclusão, reabertura, vencimento de previsão.
- Relatório PDF de serviços executados por contrato (+ export CSV secundário).
- Dashboard (visão admin/gestor; visão parcial do prestador).
- Tempo real (Socket.io).
- Validacao de entrada (backend + formulários).
- Auth JWT com roles; upload de imagens/arquivos em disco (`backend/uploads/`), JSON/SQLite guarda referência.

## MVP — fora

- Subtarefas.
- Multi-domínio por usuário (usuário fica em 1 domínio).
- Acesso do terceiro/fornecedor além do papel `prestador`.
- WCAG AA formal (acessibilidade básica apenas).
- Deploy em produção, CI completo (ambiente local primeiro).

## Não funcionais

- Navegadores mais usados: Chrome, Edge, Firefox, Safari (versões atuais).
- Volume: milhares de contratos (SQLite por domínio).
- Performance: respostas < 2s em localhost.
- Acessibilidade básica: labels, contraste razoável, navegação por teclado nas telas principais.

## Contexto do código existente

Scaffold parcial em `backend/` (auth, projects, tasks, dashboard, Express + Socket.io, JWT) e `frontend/` (Flutter Web, 4 telas: login, dashboard, projects, tasks). O trabalho futuro remodela `projects` → `contratos`, introduz `domínios`, papéis e os demais requisitos acima. Arquitetura de storage vigente na governança (JSON) foi substituída por esta decisão (SQLite por domínio).
