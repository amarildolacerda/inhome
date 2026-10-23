# compact.MD — contexto compactado da sessão

> Atualizado em 23/10/2026 (~15:10 UTC) para restauração de contexto. Repo `/mnt/c/git/inhome`, branch `dev`.
> Timestamps de status: `[DD/MM HH:MM]` (data corrente 2026-10-23). Substitui o compact de 23/10 11:57.

## Objetivo

- Release fechada: 12/12 épicas (E001–E012) QC-PASS, workspaces `specs/00001`–`specs/00014` todos `COMPLETION_STATE: complete` (validado 23/10 pós-re-sigilo).
- Pacote UX de 23/10 entregue e commitado (`d99c175`): toolbar shell, cards navegáveis, teclado no dashboard, vínculo/reatribuição de prestadores, lembrar login, manutenção fecha sheet + estado pré-marcado, upload 4m.
- Épicos novos E013 (redesign dashboard) e E014 (tema escuro default + toggle claro) registrados em `specs/project-plan.md` Wave 6 — próximos trabalhos estruturados (SDD).
- Manter os 14 selos QC válidos em todo momento e `origin/dev` em dia (estado terminal: selos dirty, nunca commitados).

## Estado do repositório

- Sequência do ciclo 23/10: `1f4fe8e` (compact rotina) → `d99c175` (feat pacote UX + épicos) → `00a8b12` (`chore(qc): re-sigilo pós-d99c175 — 11 reports refresh + 3 mini`) → commit do compact (este arquivo) → mini re-sigilo no HEAD final → push.
- Tree esperada no estado terminal: exatamente 14 entradas ` M specs/*/.qc-passed` (13 originais + `specs/00014-manutencao-tarefas-aprovacao`).
- Push: `git -c credential.helper=store push origin dev` (`gh` não autenticado). Último push efetivo: `3f2bde2..5c67e94` + `1f4fe8e` (pendente o push do ciclo 23/10).

## Bateria (baseline atual, tree pós-`d99c175`)

- unit **165/165** — `docker compose stop backend` → `npm --prefix backend test` → `docker compose start backend` (FR-029 usa a porta 3001; container arco causa `EADDRINUSE` falso).
- smoke **178/178** — `docker compose build backend && up -d backend` → `bash backend/test.sh` (PORT=3199).
- flutter **65/65** + analyze 0 — `docker run --rm -v "$PWD/frontend":/app -w /app ghcr.io/cirruslabs/flutter:stable sh -c "flutter pub get && flutter analyze && flutter test"`.
- audit **0** — `npm --prefix backend audit --audit-level=high`.
- uploads-proxy **6/6** — `backend/test-uploads-proxy.sh`, reexecutado 23/10 porque `nginx.conf` mudou (client_max_body_size 4m).
- Re-sigilo pós-`d99c175`: 11 qc-report.md com refresh de linhas de evidência (código) + 3 mini; 14/14 complete no commit `00a8b12`.

## Ritual de selo (invariantes)

- Validação: `node scripts/derive-completion-state.mjs specs/<ws>` com path relativo ao repo → 14× `COMPLETION_STATE: complete` / `[]`.
- Repo-state = HEAD + sha256 de `git status --porcelain=v1 -z --untracked-files=all` menos os 3 paths próprios do workspace (join `\0`, ordem do porcelain). Qualquer arquivo novo/sujo fora dos selos quebra os 14 digests.
- Ciclo: mudou código/docs rastreado → commit → re-sigilo → commit dos selos/reports → mini re-sigilo no novo HEAD → estado terminal = 14 dirty `.qc-passed` → push.
  - código mudou → re-sigilo completo: refresh de linhas de evidência de código em `qc-report.md` (sha256 por linha, sem tocar prosa) + bateria nova + reassinatura dos selos;
  - doc-only → mini: só `QC Passed` (UTC Z), `QC Baseline Commit` e repo-state; reports intocados.
- `.gitignore:21 *.code-workspace` é deliberado (estabilidade do digest) — não remover.
- Preflight por turno antes de delegar fases SDD: `node scripts/runtime-preflight.mjs` (node v24.18.1 ok).

## Convenções e decisões ativas

- API: superfície única `/api/v2/*` (mantém o prefixo v2, NÃO volta a `/api/*`); erros com `code` estável; chaves JSON e valores PT de status/papel inalterados (decisão da fase 3); enums numéricos com `backend/src/config/enums.js`.
- Superfície nova de 00014 (já em v2): `/api/v2/tasks/:id/approve`, `/reject`, `/maintenance`, campo `category` (`evidence`/`documentation`) no upload de anexo.
- Workspaces SDD: `specs/00001`–`specs/00014`; `spec/plan ≤ 10240 B`, `tasks ≤ 6144 B`, checkboxes só `[ ]`→`[X]`, IDs imutáveis (`FR/TR/OR/RR/SC/CHK/T/AD/STF`).
- Prosa histórica de specs (qc-report, plan, spec, checklists, manual-test) NÃO é reescrita em sweeps de nomenclatura — só artefatos vivos (código, openapi, docs de operação).
- Estilo de commit: PT curto, conventional. Attestation fixa: `Verifier: Amarildo de Lacerda (aprovação explícita no chat, 2026-10-11)`.
- Design/UX segue regras do brief do redesign (E013): estender `app_theme.dart`, só tokens do ColorScheme, sem deps novas, APIs M3; mockup de referência do usuário salvo como referência no TODO/E013.
- `/sddp-autopilot` sem argumentos HALTou em Gate (12/12 épicos completos na época) — com E013/E014 agora `[ ]`, auto-select volta a funcionar.

## Pendências conhecidas

1. `users` CHECK — prosa de spec divergente do rebuild (WARNING não-bloqueante do QC de 00013); diferida, visível em `TODO.md` Pending.
2. Divergências históricas de prosa `/api/` em specs seladas (ex.: 00003 plan 63-68, health) — decidido: deixar como registro histórico.
3. Épicos E013 (redesign dashboard) e E014 (tema escuro + toggle) — Wave 6, prontos para `/sddp-autopilot`.

## Sessões reutilizáveis e regras de lane

- `fix-1`/`ses_e975da22fffeTbo84qC0bipD6q` (re-sigilo/rotina), `fix-2`/`ses_e974af481ffezJEWucbD7jE8AA` (sheet/atribuição backend+frontend), `des-1`/`ses_e9748a580ffeYHaTVNhPStm24O` (toolbar/dashboard), `des-2`/`ses_e97186e65ffecTfJIfh6qUJRc2` (vínculo/atribuição UI), `sdd-1`/`ses_e96d7ce76ffeiFgH4NQUxxDM0w` (project-planner).
- `task()` exige `subagent_type` + `task_id` explícitos; completed+unreconciled bloqueia `task()` → `task_result` primeiro; spawn dentro de lane proibido (profundidade 1); lanes com escrita: bash `allow`.
- Bash nativo da orquestradora: somente read-only (git status/diff/log, validação de selos).
- Timestamp `[DD/MM HH:MM]` em todo status de mudança de fase.
