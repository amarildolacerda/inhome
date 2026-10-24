# Documentação Técnica — Project Manager

## Arquitetura

```
project-manager/
├── backend/          # API RESTful (Node.js)
├── frontend/         # Interface web (Flutter Web)
├── scripts/          # Scripts de validação SDD Pilot
├── specs/            # Artefatos de especificação
└── docs/             # Documentação
```

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Flutter Web (Dart) |
| Backend | Node.js 18+ (Express) |
| Banco de dados | SQLite (via JSON file) |
| Real-time | Socket.io |
| Autenticação | JWT (jsonwebtoken) |

## API REST

### Endpoints Principais

#### Autenticação
- `POST /api/v2/auth/register` — Criar conta
- `POST /api/v2/auth/login` — Fazer login
- `GET /api/v2/auth/me` — Obter usuário atual

#### Contratos
- `GET /api/v2/contracts` — Listar contratos do usuário
- `GET /api/v2/contracts/:id` — Detalhes do contrato
- `POST /api/v2/contracts` — Criar contrato
- `PUT /api/v2/contracts/:id` — Atualizar contrato
- `DELETE /api/v2/contracts/:id` — Excluir contrato

#### Tarefas
- `GET /api/v2/tasks` — Listar tarefas
- `GET /api/v2/tasks/:id` — Detalhes da tarefa
- `POST /api/v2/tasks` — Criar tarefa
- `PUT /api/v2/tasks/:id` — Atualizar tarefa
- `DELETE /api/v2/tasks/:id` — Excluir tarefa

#### Dashboard
- `GET /api/v2/dashboard/stats` — Métricas e estatísticas

#### Alertas e vencimentos
- `GET /api/v2/alerts/sweep` — Executa a varredura de vencimentos (admin/gestor)
- `GET /api/v2/alerts/panel` — Painel agrupado pelas janelas de alerta, com paginação (admin/gestor)
- `GET /api/v2/alerts/windows` — Lê as janelas configuradas do domínio (admin/gestor)
- `PUT /api/v2/alerts/windows` — Grava as janelas do domínio, validadas (admin/gestor)

### Headers de Autenticação

Todas as rotas protegidas requerem:

```
Authorization: Bearer <token>
```

### Estrutura de Resposta

```json
{
  "data": { ... },
  "error": null
}
```

## Modelos de Dados

### User
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "User Name",
  "role": "member",
  "created_at": "2026-09-22T00:00:00Z"
}
```

### Project
```json
{
  "id": 1,
  "name": "Project Name",
  "description": "Description",
  "status": "active",
  "owner_id": 1,
  "task_count": 5,
  "completed_count": 3
}
```

### Task
```json
{
  "id": 1,
  "title": "Task title",
  "description": "Description",
  "status": "todo",
  "priority": "high",
  "project_id": 1,
  "assignee_id": 1
}
```

## Enumerações

- **Project Status**: `active`, `paused`, `completed`, `archived`
- **Task Status**: `todo`, `in_progress`, `review`, `done`
- **Task Priority**: `low`, `medium`, `high`, `urgent`

## Setup

### Pré-requisitos

- Node.js 18+
- Flutter SDK 3.0+

### Backend

```bash
cd backend
npm install
cp .env.example .env  # Configure as variáveis
npm run dev           # Inicia em http://localhost:3001
```

### Frontend

```bash
cd frontend
flutter pub get
flutter run -d chrome  # Inicia em http://localhost:8080
```

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `PORT` | Porta do servidor | `3001` |
| `JWT_SECRET` | Segredo para tokens | — |
| `DATABASE_PATH` | Caminho do banco | `./database.json` |
| `APP_VERSION` | Versão da aplicação | `0.0.1` |

## WebSocket

Eventos disponíveis:

- `join_project` — Entrar em sala de projeto
- `leave_project` — Sair de sala de projeto

URL: `ws://localhost:3001`

## Desenvolvimento

### Comandos

```bash
# Backend
npm run dev      # Desenvolvimento com hot-reload
npm start        # Produção

# Frontend
flutter run      # Desenvolvimento
flutter build web --release  # Build de produção
```

### Estrutura Backend

```
backend/src/
├── config/
│   └── database.js      # Configuração do banco
├── middleware/
│   └── auth.js          # Middleware JWT
├── models/
│   ├── User.js          # Modelo de usuário
│   ├── Project.js       # Modelo de projeto
│   └── Task.js          # Modelo de tarefa
├── routes/
│   ├── auth.js          # Rotas de autenticação
│   ├── projects.js      # Rotas de projetos
│   ├── tasks.js         # Rotas de tarefas
│   └── dashboard.js     # Rotas do dashboard
└── server.js            # Entry point
```

### Estrutura Frontend

```
frontend/lib/
├── models/
│   ├── user.dart
│   ├── project.dart
│   └── task.dart
├── screens/
│   ├── login_screen.dart
│   ├── dashboard_screen.dart
│   ├── projects_screen.dart
│   └── tasks_screen.dart
├── services/
│   └── api_service.dart
└── main.dart
```

## Git Workflow

- **Branch `dev`**: Desenvolvimento (todas as alterações)
- **Branch `main`**: Produção (merge requer autorização)

```bash
# Fluxo
git checkout -b feature/nova-funcionalidade dev
# ... desenvolver ...
git checkout dev
git merge feature/nova-funcionalidade
# Após aprovação
git checkout main
git merge dev  # Requer autorização
```

## Versionamento

- **Formato**: Semantic Versioning (MAJOR.MINOR.PATCH)
- **Arquivo**: `backend/.env` → `APP_VERSION`
- **Incremento ao promover dev → main**:
  - `fix:` → patch (0.0.1 → 0.0.2)
  - `feat:` → minor (0.0.1 → 0.1.0)
  - Breaking → major (0.0.1 → 1.0.0)

## Plano em progresso

- **00015-redesign-dashboard** (E013 — Redesign visual do dashboard): plano em `specs/00015-redesign-dashboard/plan.md`; payload aditivo de `GET /api/v2/dashboard/stats` (`contracts[]`, `responsavel`, `contractsAVencer` via junção `created_by` → `users` e janelas de E005) + rewrite de `frontend/lib/screens/dashboard_screen.dart` (KPIs, cards, filtros) sobre tokens do `ColorScheme` em `app_theme.dart`. Versão final marcada após a bateria de testes.

---

**Voltar ao [README](./README.md)**
