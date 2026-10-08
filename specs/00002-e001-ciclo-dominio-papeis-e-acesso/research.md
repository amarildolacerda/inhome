---
feature: 00002-e001-ciclo-dominio-papeis-e-acesso
epic_id: E001
created: 2026-09-27
---

# Research — E001

Delegação ao Technical Researcher indisponível nesta sessão (`Subagent depth limit reached (1)`). Base abaixo é evidência local do próprio repositório, lida na data do arquivo.

## Isolamento por domínio e guards

Autorização deny by default: `requireRole` nega tudo que não está na lista do papel e `requireSystemAdmin` separa o operador da plataforma de qualquer rota de negócio. Todo roteador de negócio aplica `authenticateToken` antes das rotas; o status do domínio é revalidado em toda requisição autenticada, então suspender derruba sessão emitida sem esperar o token expirar. A seleção de tenant sai do `domainId` do token em todas as rotas — nenhuma rota aceita caminho de arquivo nem `domainId` vindo do cliente. Fontes: `specs/sad.md` (Security, FLOW-001); `backend/src/middleware/auth.js`.

## Ciclo de domínio sem perda de dados

Habilitação grava o registro em `platform.db` e cria o arquivo do banco do domínio em operação única; falha de gravação devolve 500 e o registro não é reaproveitado, sem retry automático. Suspensão muda o status e bloqueia login e requisições; reativação restaura o acesso porque nada é apagado no caminho. Migração de esquema é aditiva e preguiçosa, aplicada na abertura do arquivo do domínio. Fontes: `specs/sad.md` (FLOW-001, Data Management); `backend/src/routes/domains.js`.

## Matriz de quatro papéis

README é a referência da matriz (EVD-009): system_admin opera só o ciclo de domínio, admin cuida de usuários e finalidades, gestor administra contratos e tarefas, prestador executa apenas as próprias tarefas. A interface já monta navegação por papel e esconde ações de gestão dos não-administradores. Casos negativos existem em teste unitário do middleware e na suíte fim a fim (401/403). Fontes: `README.md`; `backend/src/routes/users.js`.

## Critérios de aceitação para regressão de autorização

Padrão usado no projeto: caminho feliz plus caso negativo por guarda, medido por suíte automatizada — 35 unitários, 16 verificações de fumaça e 28 fim a fim, todos verdes antes de qualquer promoção. Métrica de segurança registrada no SAD: 100% das rotas de negócio atrás de JWT e escopo de domínio, medida pela suíte com casos de 401 e 403 a cada promoção. Dois domínios ativos em uso simultâneo é a única forma de provar isolamento. Fontes: `specs/sad.md` (Quality Attributes); `specs/prd.md` (EVD-005, EVD-006).
