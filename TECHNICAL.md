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
- `POST /api/auth/register` — Criar conta
- `POST /api/auth/login` — Fazer login
- `GET /api/auth/me` — Obter usuário atual

#### Projetos
- `GET /api/projects` — Listar projetos do usuário
- `GET /api/projects/:id` — Detalhes do projeto
- `POST /api/projects` — Criar projeto
- `PUT /api/projects/:id` — Atualizar projeto
- `DELETE /api/projects/:id` — Excluir projeto

#### Tarefas
- `GET /api/tasks` — Listar tarefas
- `GET /api/tasks/:id` — Detalhes da tarefa
- `POST /api/tasks` — Criar tarefa
- `PUT /api/tasks/:id` — Atualizar tarefa
- `DELETE /api/tasks/:id` — Excluir tarefa

#### Dashboard
- `GET /api/dashboard/stats` — Métricas e estatísticas

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

---

**Voltar ao [README](./README.md)**
