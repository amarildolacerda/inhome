# Sistema de Gestão de Contratos de Terceiros

Dashboard multi-domínio para administrar contratos de terceiros: vigência, tarefas com conclusão documentada, evidências e relatório por contrato.

## Visão

Cada **domínio** é um cliente com isolamento físico de dados (SQLite por domínio). O `system_admin` habilita e suspende domínios na plataforma; dentro do domínio, `admin` e `gestor` administram contratos e tarefas; o `prestador` executa e conclui apenas as tarefas atribuídas a ele.

```
system_admin
  └── Domínio (habilitado | suspenso)
        ├── Contratos → prestadores vinculados → tarefas
        └── Usuários (admin, gestor, prestador)
```

## Escopo MVP

- **Domínios** — habilitar cria banco + primeiro `admin`; suspender preserva dados; reabilitar restaura
- **Papéis** — `system_admin` (só plataforma), `admin`, `gestor`, `prestador` (só suas tarefas)
- **Contratos** — nome/objeto, finalidade, datas, status; vincular/desvincular prestadores; prorrogação e encerramento; atraso só sinalizado
- **Tarefas** — fluxo A Fazer → Em Progresso → Revisão → Concluída; conclusão exige texto + fotos opcionais; reabertura com motivo no histórico; comentários e anexos
- **Busca e filtros** — contrato, status, prioridade, prestador, finalidade, prazo
- **E-mail opt-in** — quatro gatilhos (atribuição, conclusão, reabertura, vencimento); inerte sem `SMTP_*`
- **Relatório** — PDF por contrato (+ CSV) com tarefas, conclusão, executor, datas e fotos
- **Dashboard** — métricas do domínio; prestador vê só as próprias
- **Realtime** — Socket.io sem reload; validação backend + formulários

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Flutter Web (Dart) — porta 8080/3000 |
| Backend | Node.js 22+ / Express — porta 3001 |
| Banco | sql.js — `data/domains/<id>.db` + `data/platform.db` |
| Auth | JWT com papel + `domainId` |
| Realtime | Socket.io |
| Testes backend | `node:test` + supertest (28/28 verdes) |

## Estrutura

```
inhome/
├── backend/          # API Node/Express, testes co-localizados
├── frontend/         # App Flutter Web
├── data/             # SQLite por domínio (gitignored)
├── specs/            # Artefatos SDD (spec, plan, tasks)
├── docs/             # Escopo, referência, workflow SDD
└── scripts/          # Gates e validação
```

## Como rodar

```bash
# Backend (porta 3001)
cd backend && npm install && npm start
# Testes: npm test

# Frontend (requer Flutter SDK — ausente neste ambiente)
cd frontend && flutter run -d chrome
```

## Status

- MVP implementado: 33/34 tarefas; gates spec/plan/tasks PASS
- Pendência: T031 (testes de widget) aguarda instalação do Flutter SDK
- Branch `dev` sincronizada com `origin/dev`

## Documentação

- [Documentação técnica](TECHNICAL.md) — API, modelos, endpoints
- [Escopo aprovado](docs/approved-scope-draft.md) — regras de negócio e matriz de permissões
- [Workspace da feature](specs/00001-contratos-mvp/spec.md) — requisitos e critérios
- [Workflow SDD](docs/sdd-pilot.md) — ciclo Specify → QC e gates deste repositório
