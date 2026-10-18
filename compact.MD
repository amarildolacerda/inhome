# compact.MD — contexto compactado da sessão

> Gerado em 17/10/2026 (~23:59 UTC) para restauração de contexto. Repo `/mnt/c/git/inhome`, branch `dev`.
> Timestamps de status: `[DD/MM HH:MM]` (data corrente 2026-10-17).

## Objetivo

- Concluir a fase 5 do padrão de nomenclatura (versionamento da API) — **FEITA**.
- Remover o alias v1 da API (aprovado pelo usuário com "sim") — **FEITA**.
- Manter os 13 selos QC válidos em todo momento e fazer push em `origin/dev`.

## Estado do repositório

- HEAD local: `3f1e125` + o commit deste arquivo. Ciclo atual: `ca56acb` (remoção v1) → `3f1e125` (re-sigilo) → `compact.MD` + mini re-sigilo.
- `origin/dev` sincronizado até `823451e` antes deste ciclo; o push do ciclo é o passo final: `git -c credential.helper=store push origin dev` (`gh` não autenticado; credential.helper padrão ausente).
- Tree esperada no estado terminal: exatamente 13 entradas ` M specs/*/.qc-passed` (selos nunca são commitados).

## Histórico desta sessão (commits)

- `95a5bc3`…`26c299d` — nomenclatura fases 1–5; fase 5 em `26c299d` (prefixo `/api/v2`, aliases compartilhados, campo `code` estável, frontend `baseUrl='/api/v2'`).
- `f796256`, `099f4c1` — re-sigilo e reparo de digests de evidência (76 células em 00002/00003).
- `628608d`, `decb35c`, `823451e` — TODO.md (4 pendências do usuário: tarefas/anexos; aprovação; usuário logado junto ao "Sair"; dashboard → design).
- `ca56acb` — **remoção v1** (49 arquivos): mounts `/api/*` e rotas PT removidos de `server.js`/`contracts.js`; `Location` em `/api/v2/...`; testes + `test.sh` migrados a v2 com regressão 404 em v1; openapi 00003/00004/00013 sincronizados; `docs/naming-conventions.md` fase 5 com "v1 removido (2026-10-17)"; comentários dart e `TECHNICAL.md` em v2 (`projects`→`contracts`).
- `3f1e125` — re-sigilo completo (139 células de digest de evidência atualizadas em 13 `qc-report.md`).
- mini re-sigilo pós-`3f1e125` — timestamp `2026-10-17T23:58:20Z`, reports intocados.

## Bateria (baseline pós-remoção v1, mesmo tree)

- unit **157/157** — `docker compose stop backend` → `npm --prefix backend test` → `docker compose start backend` (FR-029 usa a porta 3001; container arco causa `EADDRINUSE` falso).
- smoke **134/134** — `docker compose build backend && up -d backend` → `bash backend/test.sh`.
- uploads-proxy **6/6** — `backend/test-uploads-proxy.sh`.
- flutter **25/25** + analyze limpo — `docker run --rm -v "$PWD/frontend":/app -w /app ghcr.io/cirruslabs/flutter:stable sh -c "flutter pub get && flutter analyze && flutter test"`.
- audit **0** — `npm --prefix backend audit --audit-level=high`.

## Ritual de selo (invariantes)

- Validação: `node scripts/derive-completion-state.mjs specs/<ws>` com path relativo ao repo → 13× `COMPLETION_STATE: complete` / `[]`.
- Repo-state = HEAD + sha256 de `git status --porcelain=v1 -z` menos os 3 paths próprios do workspace (join `\0`, ordem de path). Qualquer arquivo novo/sujo fora dos selos quebra os 13 digests.
- Ciclo: mudou código/docs rastreado → commit → re-sigilo → commit dos selos/reports → mini re-sigilo no novo HEAD → estado terminal = 13 dirty `.qc-passed` → push.
  - código mudou → re-sigilo completo: refresh de digests de evidência em `qc-report.md` via `parseQcEvidence` (`scripts/lib/qc-evidence.mjs`) + bateria nova + reassinatura dos selos;
  - doc-only → mini: só `QC Passed` (UTC Z), `QC Baseline Commit` e repo-state; reports intocados.
- `.gitignore:21 *.code-workspace` é deliberado (estabilidade do digest) — não remover.
- Preflight por turno antes de delegar fases SDD: `node scripts/runtime-preflight.mjs` (node v24.18.1 ok).

## Convenções e decisões ativas

- API: superfície única `/api/v2/*` (mantém o prefixo v2, NÃO volta a `/api/*`); erros com `code` estável; chaves JSON e valores PT de status/papel inalterados (decisão da fase 3); enums numéricos com `backend/src/config/enums.js`.
- Workspaces SDD: `specs/00001`–`specs/00013`; `spec/plan ≤ 10240 B`, `tasks ≤ 6144 B`, checkboxes só `[ ]`→`[X]`, IDs imutáveis (`FR/TR/OR/RR/SC/CHK/T/AD/STF`).
- Prosa histórica de specs (qc-report, plan, spec, checklists, manual-test) NÃO é reescrita em sweeps de nomenclatura — só artefatos vivos (código, openapi, docs de operação).
- Estilo de commit: PT curto, conventional. Attestation fixa: `Verifier: Amarildo de Lacerda (aprovação explícita no chat, 2026-10-11)`.

## Pendências conhecidas

1. Push do ciclo acima (se ainda não executado neste turno).
2. TODO.md — 4 pendências do usuário: tarefas/anexos; fluxo de aprovação; usuário logado junto ao "Sair"; dashboard → design (@designer).
3. `users` CHECK — prosa de spec diferida.
4. Divergências históricas de prosa `/api/` em specs seladas (ex.: 00003 plan 63-68, health) — decidido: deixar como registro histórico.

## Sessões reutilizáveis e regras de lane

- `sdd-1`/`ses_eb41a8dddffe1b1AcIE6o6lquw` (autopilot — re-sigilo), `ora-1`/`ses_ece322481ffe7QF8tJ7dkXrcp8` (oracle), `fix-1`/`ses_eb3e6ff05ffe392ZQNVuCLpm5z` (remoção v1 backend), `fix-2`/`ses_eb3e6de14ffebb8aThM6MNh8FN` (docs/openapi).
- `task()` exige `subagent_type` + `task_id` explícitos; completed+unreconciled bloqueia `task()` → `task_result` primeiro; spawn dentro de lane proibido (profundidade 1); lanes com escrita: bash `allow`.
- Bash nativo da orquestradora: somente read-only (git status/diff/log, validação de selos).
- Timestamp `[DD/MM HH:MM]` em todo status de mudança de fase.
