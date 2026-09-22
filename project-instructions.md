<!-- template-version: 2 -->
# Project Manager - Instruções do Projeto

## Core Principles

### I. Branching Strategy

- **`dev`** é a branch de desenvolvimento. Todas as alterações novas DEVEM ser feitas aqui.
- **`main`** é a branch de produção. Código só entra em `main` após autorização explícita.
- Merge de `dev` → `main` REQUER aprovação do responsável pelo projeto.
- Feature branches devem ser criadas a partir de `dev` e mergeadas de volta em `dev`.

### II. Commit Convention

- Mensagens de commit devem ser claras e descritivas.
- Formato: `<tipo>: <descrição>` (ex: `feat: add user authentication`)
- Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### III. Code Quality

- Código deve passar em linting antes de commit.
- Funcionalidades novas devem ter testes quando aplicável.
- Não quebrar funcionalidades existentes.

### IV. Agent Output Style

All agent output MUST be concise and outcome-oriented.

- **Progress reports**: Facts and outcomes only — no narration, no restating the task.
- **Artifacts**: Emit required sections only — no preamble paragraphs, no summary epilogues.
- **Reasoning**: Omit unless the user asks "why" or the decision is non-obvious.
- **Errors / blockers**: State the problem, the attempted fix, and the result — nothing else.

## Technology Stack

- **Frontend**: Flutter Web (Dart)
- **Backend**: Node.js (Express)
- **Database**: SQLite (via JSON file storage)
- **Real-time**: Socket.io
- **Auth**: JWT (jsonwebtoken)

## Development Workflow

- **Branching**: `dev` para desenvolvimento, `main` para produção
- **Merge Policy**: `dev` → `main` requer autorização explícita
- **Commit Convention**: Conventional Commits (`feat:`, `fix:`, etc.)
- **Feature Branches**: Criar a partir de `dev`, mergear de volta em `dev`

## Git Rules

### Branch `dev`
- Branch principal de desenvolvimento
- Todas as novas funcionalidades e correções devem ser feitas aqui
- Pull requests devem ser direcionados para esta branch

### Branch `main`
- Branch de produção
- Código estável e testado
- Merge DEPENDE de autorização explícita do responsável

### Fluxo de Trabalho
1. Criar feature branch a partir de `dev`
2. Desenvolver e testar
3. Merge na `dev` após revisão
4. Quando aprovado para produção, merge de `dev` → `main` (com autorização)

### Regras de Merge
- `dev` → `main`: REQUER autorização explícita
- Feature branches → `dev`: Após revisão de código
- Nunca fazer push direto em `main`

## Governance

- Project instructions supersede all other documentation and practices.
- Amendments require a version bump with ISO-dated changelog entry.
- All implementations MUST pass the Instructions Check gate during planning.

**Version**: 1.0.0 | **Last Amended**: 2026-09-22
