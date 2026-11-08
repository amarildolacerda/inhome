# Documentação Técnica — Project Manager

## Status do estado atual

- Repositório em desenvolvimento na branch `dev`.
- Feature ativa: `E017` — indicadores do dashboard para contratos perpétuos.
- Situação: implementação validada no ponto de regressão do dashboard (`dashboard.test.js`), com contrato perpétuo ignorado em incompletos e janelas de alerta, mas mantendo contagem de tarefas vencidas.

## Arquitetura

```
project-manager/
├── backend/          # API RESTful (Node.js 22+)
├── frontend/         # Interface web (Flutter Web)
├── scripts/          # Scripts de validação SDD Pilot
├── specs/            # Artefatos de especificação
├── docs/             # Documentação institucional
├── data/             # Bancos SQLite por domínio e plataforma
├── uploads/          # Anexos em disco
└── TECHNICAL.md      # Documento técnico do projeto
```

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Flutter Web (Dart 3) |
| Backend | Node.js 22+ (Express) |
| Banco de dados | SQLite por domínio (`data/domains/<id>.db`) + `data/platform.db` |
| Real-time | Socket.io |
| Autenticação | JWT (`jsonwebtoken`) com `bcryptjs` |
| Uploads | arquivos em disco em `backend/uploads/` |

## API REST

### Endpoints principais

#### Autenticação e domínio
- `POST /api/v2/auth/login` — autenticação com domínio habilitado
- `POST /api/v2/domains/enable` — habilita um domínio novo
- `GET /api/v2/auth/me` — usuário autenticado

#### Contratos
- `GET /api/v2/contracts` — listar contratos do domínio/escopo
- `GET /api/v2/contracts/:id` — detalhes do contrato
- `POST /api/v2/contracts` — criar contrato
- `PUT /api/v2/contracts/:id` — atualizar contrato
- `DELETE /api/v2/contracts/:id` — remover contrato

Regras do E017:
- `perpetual` é um campo aditivo no contrato.
- `forecast_date` pode permanecer vazia quando `perpetual` for `true`.
- O valor `perpetual` é exportado no payload do dashboard e não dispara `a_vencer` / `incompleto`.

#### Tarefas
- `GET /api/v2/tasks` — listar tarefas
- `GET /api/v2/tasks/:id` — detalhe da tarefa
- `POST /api/v2/contracts/:id/tasks` — criar tarefa vinculada ao contrato
- `PATCH /api/v2/tasks/:id/status` — avançar no fluxo de status
- `POST /api/v2/tasks/:id/complete` — concluir tarefa com texto de evidência

#### Dashboard
- `GET /api/v2/dashboard/stats` — métricas do domínio, escopo por papel e contratos

Campos relevantes do contrato no payload:
- `perpetual`
- `tasks_total`
- `tasks_done`
- `tasks_overdue`
- `a_vencer`
- `effective_status`

#### Alertas e vencimentos
- `GET /api/v2/alerts/sweep` — varredura de vencimentos
- `GET /api/v2/alerts/panel` — painel agrupado por janelas
- `GET /api/v2/alerts/windows` — janelas do domínio
- `PUT /api/v2/alerts/windows` — atualização das janelas

### Headers de autenticação

Todas as rotas protegidas exigem:

```
Authorization: <token>
```

### Estrutura de resposta

```json
{
  "data": { ... },
  "error": null
}
```

## Modelos de dados

### Contrato
```json
{
  "id": 1,
  "name": "Contrato X",
  "start_date": "2026-10-01",
  "forecast_date": "",
  "perpetual": true,
  "status": "vigente",
  "effective_status": "vigente",
  "tasks_total": 2,
  "tasks_done": 1,
  "tasks_overdue": 1,
  "a_vencer": false
}
```

### Tarefa
```json
{
  "id": 1,
  "contract_id": 1,
  "title": "Entrega principal",
  "status": "A Fazer",
  "priority": "high",
  "assignee_id": 3,
  "due_date": "2026-11-12"
}
```

## Regras de negócio relevantes

- Contratos perpétuos não entram em `a_vencer` nem em `incompleto`.
- O card do dashboard usa texto explícito (`Perpétuo`) em vez de falso "Incompleto".
- Tarefas vencidas continuam sendo contadas para `tasks_overdue`, mesmo quando o contrato é perpétuo.
- O dashboard pega contagens por contrato diretamente de `tasks`, sem criar nova superfície de API.

## Setup

### Pré-requisitos

- Node.js 22+
- Flutter SDK 3.x
- SQLite local por domínio

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
flutter pub get
flutter run -d chrome
```

### Variáveis de ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `PORT` | Porta do backend | `3001` |
| `JWT_SECRET` | Segredo dos tokens | — |
| `DATA_DIR` | Diretório de dados do projeto | `./data` |
| `APP_VERSION` | Versão da aplicação | `0.0.1` |

## Desenvolvimento

### Comandos úteis

```bash
# Backend
cd backend && node --test src/routes/dashboard.test.js
cd backend && npm test

# Frontend
cd frontend && flutter analyze
cd frontend && flutter test
```

### Estrutura do backend

```
backend/src/
├── config/
│   └── database.js      # DDL + migração por domínio
├── middleware/
│   └── auth.js          # JWT + autorização
├── models/
│   ├── Contract.js      # lógica de status e overdue
│   ├── Task.js          # fluxo de tarefas / histórico
│   └── User.js          # usuários do domínio
├── routes/
│   ├── auth.js          # auth + domínio
│   ├── contracts.js     # CRUD de contratos
│   ├── tasks.js         # CRUD de tarefas
│   ├── dashboard.js     # métricas do painel
│   └── alerts.js        # alertas e janelas
└── server.js            # entry point
```

### Estrutura do frontend

```
frontend/lib/
├── models/
│   ├── contract.dart
│   └── task.dart
├── screens/
│   ├── dashboard_screen.dart
│   ├── contracts_screen.dart
│   └── tasks_screen.dart
├── services/
│   └── api_service.dart
└── main.dart
```

## Git workflow

- **Branch `dev`**: desenvolvimento
- **Branch `main`**: produção
- Nenhuma promoção para `main` sem testes e aprovação explícita

## Atualização de documentação

- `TECHNICAL.md`: revisado para refletir o stack real e a feature E017 em desenvolvimento.
- `README.md`: atualizado com o comportamento de contratos perpétuos e do painel.

---

**Voltar ao [README](./README.md)**
