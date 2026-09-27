# Sistema de Gestão de Projetos

## Stack
- **Frontend:** Flutter Web
- **Backend:** Node.js (Express) + SQLite
- **Auth:** JWT
- **Real-time:** WebSockets (Socket.io)

## Arquitetura
```
/inhome
├── backend/          # API Node.js
│   ├── src/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── config/
│   └── package.json
├── frontend/         # Flutter Web
│   ├── lib/
│   │   ├── screens/
│   │   ├── widgets/
│   │   ├── services/
│   │   └── models/
│   └── pubspec.yaml
└── .slim/deepwork/   # Progress tracking
```

## Fases de Implementação

### Fase 1: Setup do Projeto ✅ DONE
- Criar estrutura de pastas
- Configurar backend (Express + SQLite + CORS)
- Configurar Flutter Web
- Configurar .gitignore

### Fase 2: Backend - Auth & Models ✅ DONE
- Modelos: User, Project, Task
- Rotas de auth (login, register, logout)
- Middleware JWT
- Migration do banco

### Fase 3: Backend - API CRUD ✅ DONE
- CRUD Projetos (criar, listar, editar, excluir)
- CRUD Tarefas (criar, listar, editar, excluir, status)
- Endpoints de dashboard (métricas, stats)

### Fase 4: Frontend - Layout & Auth ✅ DONE
- Layout base (Sidebar + Header)
- Tela de Login/Registro
- Rotas protegidas
- State management (Provider/Riverpod)

### Fase 5: Frontend - Dashboard & CRUD ✅ DONE
- Dashboard com cards de métricas
- Lista de projetos
- Formulário de criar/editar projeto
- Lista de tarefas
- Formulário de criar/editar tarefa

### Fase 6: Real-time & Integrações ✅ DONE
- WebSocket para updates em tempo real
- Notificações de mudanças
- Integrações externas (opcional)

### Fase 7: Validação Final ✅ DONE
- Testes manuais
- Verificação de fluxo completo
- Deploy preparation

## Git Workflow
- **Branch `dev`**: Desenvolvimento (todas as alterações vão aqui)
- **Branch `main`**: Produção (merge requer autorização explícita)
- **Commits**: Conventional Commits (`feat:`, `fix:`, etc.)
- **Feature Branches**: Criar a partir de `dev`, mergear de volta em `dev`

## Status
- **Fase Atual:** Concluído (MVP validado E2E 28/28) — pendências: bootstrap SDD (bloqueado por modelo) e rename domínio teste
- **Bloqueios:** Nenhum
- **Atualizado:** MVP validado — 28/28 fluxo completo no stack publicado, 35 testes backend, test.sh 16/16, socket em sessões de domínio
