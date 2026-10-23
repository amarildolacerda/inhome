# compact.MD — contexto compactado da sessão

> Atualizado em 23/10/2026 (~11:57 UTC) para restauração de contexto. Repo `/mnt/c/git/inhome`, branch `dev`.
> Timestamps de status: `[DD/MM HH:MM]` (data corrente 2026-10-23). Substitui o compact de 17/10.

## Objetivo

- Release fechada: 12/12 épicas (E001–E012) QC-PASS, workspaces `specs/00001`–`specs/00014` todos `COMPLETION_STATE: complete` (validado 23/10 11:57).
- Manter os 14 selos QC válidos em todo momento e `origin/dev` em dia (estado terminal: selos dirty, nunca commitados).
- Manutenção de rotina de 23/10: compact.MD sincronizado com o ciclo pós-17/10; `TODO.md` sem pendências de usuário, com a pendência técnica `users` CHECK registrada em Pending.

## Estado do repositório

- HEAD local e `origin/dev`: `5c67e94` (`chore(qc): re-sigilo pós-c5b9fc1 — 3 reports refresh + 11 mini`) — sincronizado.
- Tree esperada no estado terminal: exatamente 14 entradas ` M specs/*/.qc-passed` (13 originais + `specs/00014-manutencao-tarefas-aprovacao`).
- Ciclo desde o compact anterior: `40b5948` (compact.MD) → `5a05d2a` (AGENTS.md: regra de sync do compact) → `f151df5`+`bbbd4e9` (compacta prosa dos 13 spec.md + re-sigilo) → `41f1965`+`3f2bde2` (usuário logado junto ao Sair, redesign do dashboard, spec 00014 + re-sigilo 13) → ciclo SDD 00014: `c06bbd3` (clarify+plan) → `f74a7f1` (tasks 18/6 phases) → `828b458` (implementação) → `88f89f7` (qc-report PASS, baseline 828b458) → `3908f04` (re-sigilo full 14) → `76f22d9` (TODO) → `b9196bf` (amenda E012 Wave 5, 12 épicas) → `c5b9fc1` (tap na tarefa abre TaskDetailSheet) → `5c67e94` (re-sigilo final).
- Push: `git -c credential.helper=store push origin dev` (`gh` não autenticado). Último push efetivo do ciclo: `3f2bde2..5c67e94` (já executado; 23/10 não há commits novos).

## Bateria (baseline atual, árvore de `5c67e94`)

- unit **165/165** — `docker compose stop backend` → `npm --prefix backend test` → `docker compose start backend` (FR-029 usa a porta 3001; container arco causa `EADDRINUSE` falso).
- smoke **178/178** — `docker compose build backend && up -d backend` → `bash backend/test.sh` (PORT=3199).
- flutter **37/37** + analyze 0 — `docker run --rm -v "$PWD/frontend":/app -w /app ghcr.io/cirruslabs/flutter:stable sh -c "flutter pub get && flutter analyze && flutter test"`.
- audit **0** — `npm --prefix backend audit --audit-level=high`.
- uploads-proxy **6/6** — `backend/test-uploads-proxy.sh` (última execução registrada 17/10; fora do escopo do T018 de 00014, reexecutar se `nginx.conf`/proxy mudar).
- Evidência do ciclo 00014: números de unit/smoke/flutter/audit gravados em `.completed` (T018) na mesma tree; QC reexecutou 34/34 testes de FR.

## Ritual de selo (invariantes)

- Validação: `node scripts/derive-completion-state.mjs specs/<ws>` com path relativo ao repo → 14× `COMPLETION_STATE: complete` / `[]`.
- Repo-state = HEAD + sha256 de `git status --porcelain=v1 -z` menos os 3 paths próprios do workspace (join `\0`, ordem de path). Qualquer arquivo novo/sujo fora dos selos quebra os 14 digests.
- Ciclo: mudou código/docs rastreado → commit → re-sigilo → commit dos selos/reports → mini re-sigilo no novo HEAD → estado terminal = 14 dirty `.qc-passed` → push.
  - código mudou → re-sigilo completo: refresh de digests de evidência em `qc-report.md` via `parseQcEvidence` (`scripts/lib/qc-evidence.mjs`) + bateria nova + reassinatura dos selos;
  - doc-only → mini: só `QC Passed` (UTC Z), `QC Baseline Commit` e repo-state; reports intocados.
- `.gitignore:21 *.code-workspace` é deliberado (estabilidade do digest) — não remover.
- Preflight por turno antes de delegar fases SDD: `node scripts/runtime-preflight.mjs` (node v24.18.1 ok).

## Convenções e decisões ativas

- API: superfície única `/api/v2/*` (mantém o prefixo v2, NÃO volta a `/api/*`); erros com `code` estável; chaves JSON e valores PT de status/papel inalterados (decisão da fase 3); enums numéricos com `backend/src/config/enums.js`.
- Superfície nova de 00014 (já em v2): `/api/v2/tasks/:id/approve`, `/reject`, `/maintenance`, campo `category` (`evidence`/`documentation`) no upload de anexo.
- Workspaces SDD: `specs/00001`–`specs/00014`; `spec/plan ≤ 10240 B`, `tasks ≤ 6144 B`, checkboxes só `[ ]`→`[X]`, IDs imutáveis (`FR/TR/OR/RR/SC/CHK/T/AD/STF`).
- Prosa histórica de specs (qc-report, plan, spec, checklists, manual-test) NÃO é reescrita em sweeps de nomenclatura — só artefatos vivos (código, openapi, docs de operação).
- Estilo de commit: PT curto, conventional. Attestation fixa: `Verifier: Amarildo de Lacerda (aprovação explícita no chat, 2026-10-11)`.

## Pendências conhecidas

1. `users` CHECK — prosa de spec divergente do rebuild (WARNING não-bloqueante do QC de 00013); diferida, agora visível em `TODO.md` Pending.
2. Divergências históricas de prosa `/api/` em specs seladas (ex.: 00003 plan 63-68, health) — decidido: deixar como registro histórico.
3. uploads-proxy 6/6 datado de 17/10 — reexecutar se proxy/nginx mudar.

## Sessões reutilizáveis e regras de lane

- `sdd-1`/`ses_eb41a8dddffe1b1AcIE6o6lquw` (autopilot — re-sigilo), `ora-1`/`ses_ece322481ffe7QF8tJ7dkXrcp8` (oracle), `fix-1`/`ses_eb3e6ff05ffe392ZQNVuCLpm5z` (remoção v1 backend), `fix-2`/`ses_eb3e6de14ffebb8aThM6MNh8FN` (docs/openapi).
- O ciclo 00014 (17–19/10) rodou em sessões não registradas aqui; ao retomar trabalho semelhante, reusar apenas as sessões acima ou spawnar nova lane.
- `task()` exige `subagent_type` + `task_id` explícitos; completed+unreconciled bloqueia `task()` → `task_result` primeiro; spawn dentro de lane proibido (profundidade 1); lanes com escrita: bash `allow`.
- Bash nativo da orquestradora: somente read-only (git status/diff/log, validação de selos).
- Timestamp `[DD/MM HH:MM]` em todo status de mudança de fase.
