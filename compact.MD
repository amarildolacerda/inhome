# compact.MD — contexto compactado da sessão

> Atualizado em [15/11 12:15] para restauração de contexto. Repo `/mnt/windows/git/inhome`, branch `dev`.
> Estado atual: pipeline `/sddp-autopilot` de E017 concluído com QC PASS; push realizado em `dev` (`74bf654`).

## Objetivo

- Executar `/sddp-autopilot` de ponta a ponta para a epic **E017** (`specs/00019-dashboard-indicadores-de-contrato-perpetuo`): Specify → Clarify → Plan → Checklist → Tasks → Analyze → Implement+QC → Post-Pipeline, com log em `autopilot-log.md`.
- Melhoria lateral concluída: tracking de progresso por Wave em `specs/project-plan.md` (colunas `Status`/`Concluída em` + linha `Progress`), sincronizado com `.github/sddp/workflows/project-planning/WORKFLOW.md`.

## Estado do repositório

- Branch ativa: `dev`; base `origin/dev` = `bf546b0` (em sincronia antes do commit desta sessão).
- Evidência do QC de E017 bindada ao baseline `bf546b0` (`.qc-passed`); após o commit desta sessão o marcador passa a ser histórico — padrão já usado por 00018.
- Stack Docker `inhome` (backend:3001, frontend:80) deve ficar **up**; para rodar `npm test` é preciso `docker compose stop backend` → teste → `docker compose start backend` (`server.test.js` fixa 3001; `test.sh` usa 3199 e não conflita).

## Resultado da sessão (E017)

- **Pipeline completo**: spec 10216 B (PASS 31/31), plan 10234 B (PASS 14/14), tasks 6052 B (PASS; halt I0 corrigido: headings `Work Item` → `Delivery [US#]`), checklists 102/102 COMPLETE, Policy Auditor PASS nas bordas.
- **24/24 tasks `[X]`** com evidência real: backend `npm test` 173/173, E2E `bash backend/test.sh` 182/182, frontend `flutter test` 83/83, `flutter analyze` 0 issues, `npm audit` 0 vulns.
- **QC PASS**: `qc-report.md` (manifest de 33 SHA-256), `.qc-passed` atômico validado; `derive-completion-state` → `QC_COMPLETE=true`, `COMPLETION_STATE=complete`, 0 issues.
- **Pós-pipeline**: E017 `[X]`, Progress **15/15**, Wave 7 **Concluída 2026-11-15** em `specs/project-plan.md` (`validate-prd --profile planning-ready --project-plan` valid=true).

## Decisões técnicas relevantes

- `bf546b0` (07/11) já pré-implementava boa parte do backend/frontend de E017 — tasks verificadas contra o estado real; stubs de aceitação anexados no fim dos arquivos para não alterar contagens de teste.
- Arquivo `frontend/lib/screens/dashboard_screen_queue.dart` passou de 500 linhas → marcadores extraídos para o part novo `dashboard_screen_tags.dart` (`dashboard_screen.dart` agora tem 6 `part`s).
- 62 issues pré-existentes de `flutter analyze` (refactor de `suggestion_panel*`/`workflow_sheet` em `bf546b0`) corrigidos por refundir: campos concretos de `_SuggestionPanelState` movidos para `SuggestionPanelLogic`, contratos abstratos duplicados removidos, `SuggestionPanelUi on State<SuggestionPanel>, SuggestionPanelLogic`, 3 helpers mortos removidos do workflow_sheet.
- Bug real do T022: o escalonamento fixo `i * 0.14 + 0.55` estourava `Interval` com o 5º segmento de KPI → passo adaptativo `0.45 / (items.length - 1)`.
- FR-069 no frontend: não existe fluxo de edição de datas — escopo do switch "Contrato perpétuo" é o dialog de criação em `projects_screen.dart` (PUT backend já aceita `perpetual`).
- Browser runtime: sem tool nativa nem MCP (`list_mcp_resources` vazio) → `BROWSER_RUNTIME_REQUIRED=false` (SCs cobertos headless por widget tests + supertest), padrão de 00014.
- Subagentes esgotaram a cota免费 → QC Auditor e Story Verifier executados inline.

## Pendências / próximos passos

- ~~Commit + push em `dev`~~ concluído: `74bf654` (artefatos E017 + limpezas + `compact.MD`).
- E017 release-ready no instante do QC; nada mais bloqueia promoção futura `dev` → `main` (suíte verde é pré-requisito — está verde).
