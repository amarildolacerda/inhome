# Analysis Report: 00018 Tema escuro por padrão e alternância persistida

**Date**: 2026-10-28 | **Mode**: Analysis + auto-remediation (AUTOPILOT=true) | **Feature Dir**: `specs/00018-tema-escuro-por-padrao-alternancia/`
**Artifacts**: `spec.md` (product, draft), `plan.md`, `tasks.md`, `checklists/` (3 files, 55/55 checked)

## Instructions Check Report (Policy Auditor)

**Target**: spec.md, plan.md, tasks.md
**Status**: PASS

| Principle | Verdict | Notes |
|-----------|---------|-------|
| I — Development on `dev` | PASS | `HEAD -> refs/heads/dev`; plan targets `dev`; 0 promotion commit |
| II — Test-gated promotion | PASS | T016/T017 gate `flutter analyze` + `flutter test` before any promotion |
| III — Session TODO intake | PASS | `TODO.md` read; E014 surfaced (line 8) |
| IV — Agent output style | PASS | Required sections only; spec ~8.5 KB, plan ~9.0 KB, tasks ~5.2 KB, all within budgets |
| Technology stack | PASS | Dart 3 / Flutter Web; `shared_preferences ^2.2.3` already in `frontend/pubspec.yaml`; 0 new dependency |
| Source code layout (PRESERVE_EXISTING_LAYOUT) | PASS | New `frontend/lib/services/theme_preference_store.dart` inside existing tree; no move or rename |
| Testing & quality policy | PASS | `flutter analyze` + unit/widget suite; coverage target empty; security N/A (no backend, no route) |
| Governance — `TECHNICAL.md` after plan | PASS | E014 entry marked `in progress` (`TECHNICAL.md:240`) |
| Governance — `README.md` after implementation | PASS | Obligation now tracked by T019 (added by AN-002) |

No policy violation blocks downstream work.

## Spec Quality (Spec Validator, read-only)

**Result**: PASS | **Score**: 31/31 | **Unresolved clarification markers**: 0 (maximum 3)
Sections, frontmatter, requirement ownership, P1 acceptance criteria, scenario style, glossary and stress-test criteria all satisfied. One wording issue (AN-007) corrected.

## Task Parse (Task Tracker equivalent)

19 tasks, 4 phases, 0 parse errors, 0 malformed VERIFY annotations, `after:` graph acyclic.
Node execution of `scripts/parse-tasks.mjs` and `scripts/phase-gates.mjs` is blocked by the shell policy; the same grammar and gate rules were applied statically, matching prior-phase practice recorded in `autopilot-log.md`.

## Findings

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| AN-001 | Coverage / Testability | MEDIUM | tasks.md T002 | VERIFY greps `ThemePreferenceStore.save` inside the class own file; a class-body `save(` declaration never contains that literal, so the assertion cannot pass after correct implementation. | Assert the method declaration (`grep "save("`). |
| AN-002 | Governance / Coverage | MEDIUM | plan.md, tasks.md | Project instructions require a `README.md` update after each plan is implemented; no task tracked that obligation. | Add a Polish task for the README update. |
| AN-003 | Consistency | LOW | plan.md §Acceptance Test Stubs | Claims stubs are "ativos em RED", but the stub files are created by T003/T004/T008/T011/T013. | State that tasks create the RED stubs. |
| AN-004 | Consistency | LOW | plan.md §Project Structure | `shell_toolbar_test.dart` annotated with AD-004/AD-006; AD-006 targets `web_browsers_test.dart`. | Keep only AD-004. |
| AN-005 | Terminology | LOW | plan.md §Risk Mitigation vs spec FR-068, E006 | Plan imposes WCAG AA while spec says "contraste básico de E006" and E006 records "sem meta AA". | Keep AA only as a test reference, not an epic target. |
| AN-006 | Testability | LOW | tasks.md T018 | VERIFY `grep "E014" TECHNICAL.md` already matches the in-progress entry, so it passes before completion. | Informational: needs completion wording to become discriminating. |
| AN-007 | Spec quality | LOW | spec.md SC-005 | Product success criterion named the `flutter analyze` tool; product criteria should stay technology-agnostic. | Generalize to static analysis plus green suite. |

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-064 | Yes | T003, T005, T006 | `[COMPLETES FR-064]` on last task |
| FR-065 | Yes | T001, T004, T005, T007 | `[COMPLETES FR-065]` on last task |
| FR-066 | Yes | T008, T009, T010 | `[COMPLETES FR-066]` on last task |
| FR-067 | Yes | T002, T011, T012 | `[COMPLETES FR-067]` on last task |
| FR-068 | Yes | T013, T014, T015 | `[COMPLETES FR-068]` on last task |

SC-001..SC-005 each map to a covered FR. No orphan requirement, no orphan acceptance stub.

## Unmapped Tasks

T016, T017, T018, T019 — Polish phase (E006 expectation update, regression battery, TECHNICAL.md, README.md). Untagged tasks in the optional Polish phase are allowed.

## Metrics

- Total requirements: 5 (all P1)
- Total tasks: 19 (18 before remediation)
- P1 coverage: 100% (5/5)
- Critical issues: 0
- High issues: 0
- Medium issues: 2
- Low issues: 5

## Remediation Summary

| # | Finding ID | Severity | File(s) Modified | Change Applied | Status |
|---|-----------|----------|-----------------|----------------|--------|
| 1 | AN-001 | MEDIUM | tasks.md | T002 VERIFY changed to `grep "save(" frontend/lib/services/theme_preference_store.dart` | Applied |
| 2 | AN-002 | MEDIUM | tasks.md | Added T019 (README update, `after:T018`) and its dependency bullet | Applied |
| 3 | AN-003 | LOW | plan.md | Stub note now says T003/T004/T008/T011/T013 create the RED stubs | Applied |
| 4 | AN-004 | LOW | plan.md | `shell_toolbar_test.dart` annotation corrected to AD-004 | Applied |
| 5 | AN-005 | LOW | plan.md | AA qualified as test reference; E006 has no AA target | Applied |
| 6 | AN-006 | LOW | tasks.md T018 | Left unchanged; assertion is weak but not wrong and a rewrite would invent completion wording | Skipped (informational) |
| 7 | AN-007 | LOW | spec.md | SC-005 now says static analysis plus green test suite | Applied |

## Revalidation After Amendments

| Validator | Result | Evidence |
|-----------|--------|----------|
| Spec Validator (owns spec.md) | PASS | 31/31, 0 markers, 5 FR owned, P1 SC present |
| Plan Validator (downstream) | PASS | 5/5 P1 rows with paths and symbols; AD-001..AD-006 consumed; dependency installable |
| Tasks Validator (downstream) | PASS | 19/19 parsed, 19 ≤ 40, ~5.2 KB ≤ 6 KB, 5/5 P1 covered, acyclic `after:`, phases valid |
| Checklist Reader | PASS | 55/55 `[X]`, 0 unchecked, 0 duplicate CHK within file |
| Policy Auditor re-check | PASS | No principle regression from the edits |

Node-based validators were unavailable under the shell policy; results above come from the same deterministic rules applied to the amended files on disk.

## Next Actions

- No CRITICAL or HIGH findings. P1 coverage is complete.
- Proceed to `/sddp-implement` with `specs/00018-tema-escuro-por-padrao-alternancia/tasks.md` (T001 first).
- Keep AN-006 in mind at T018: confirm TECHNICAL.md no longer reads `in progress` for E014.
