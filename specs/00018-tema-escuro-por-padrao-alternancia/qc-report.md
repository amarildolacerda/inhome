# QC Report: Tema escuro por padrão e alternância persistida (00018)

**Date**: 2026-10-30T20:44:00Z
**Feature Directory**: specs/00018-tema-escuro-por-padrao-alternancia
**Overall Verdict**: PASS

## QC Scope Baseline
- Baseline Commit: 4a35f3021d8cc409a0a059a87d6f51ad02b344ee
- Mode: Full
- Prior Baseline: N/A
- Changed Files: N/A (full run; 17 working-tree changes present)
- Test Selection: Full suite — `flutter analyze`, `flutter test`, backend `npm test`, `backend/test.sh`, `npm run audit --audit-level=high`
- Scope Safety: No prior QC report for this feature; a full run is required.

## Summary
| Check | Status | Details |
|-------|--------|---------|
| Compilation | PASSED | `flutter test` compiles and runs the full suite; backend `npm test` loads every module |
| Static analysis | PASSED | `flutter analyze`: no issues |
| Security | PASSED | `npm audit --audit-level=high`: 0 vulnerabilities; frontend review found no new dependency, route, or secret |
| Frontend tests | PASSED | 75 pass, 0 fail |
| Backend regression | PASSED | 167 pass, 0 fail; smoke 182/182 |
| Coverage | SKIPPED | no numeric threshold configured |
| Requirements | PASSED | US1–US2, FR-064–FR-068, SC-001–SC-005 |
| Browser runtime | PASSED | Headless Chromium: 22 assertions, 10 screenshots |
| Manual attestation | NOT REQUIRED | Browser scenarios executed by automated headless validation |
| PI compliance | PASSED | no violations |

## Test Results — PASSED
- Runner: `flutter analyze` (Docker `ghcr.io/cirruslabs/flutter:stable`) — no issues found.
- Runner: `flutter test` (Docker `ghcr.io/cirruslabs/flutter:stable`), Total: 75, Passed: 75, Failed: 0.
- Runner: `node --test 'src/**/*.test.js'` (backend), Total: 167, Passed: 167, Failed: 0.
- Runner: `bash backend/test.sh` (smoke, port 3199), Total: 182, Passed: 182, Failed: 0.
- The first backend unit run hit `EADDRINUSE` on port 3001 because the running Docker stack owned that port. After `docker compose stop backend`, the rerun passed 167/167; the stack was started again.
- New E014 assertions are active: `FR-064`, `FR-065`, `FR-067` in `theme_preference_test.dart`; `FR-066` in `shell_toolbar_test.dart`; `FR-068` in `a11y_labels_test.dart`; `web_browsers_test.dart` expects `ThemeMode.dark`.

## Failure Index
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|
| None | — | — | — | No active failure | — |

## Code Coverage — SKIPPED
- Threshold: Not configured (project instructions set no numeric coverage gate)
- Status: SKIPPED
- Uncovered files: not measured

## Static Analysis — PASSED
- Tool: `flutter analyze` (Docker)
- Critical issues: 0, Warnings: 0
- `flutter analyze`: No issues found

## Security Audit — PASSED
- Tool: `npm --prefix backend audit --audit-level=high`
- Vulnerabilities found: 0
- Frontend: no maintained Dart scanner. Manual review found no new dependency (`pubspec.yaml` unchanged), no network route, no secret, and a local-only `theme_mode` key with an explicit `light`/`dark` allowlist. The value never leaves the device.

## Project Instructions Compliance — PASSED
- No violations.
- Changes stay on `dev`; `main` is untouched.
- No new frontend or backend dependency; `frontend/pubspec.yaml` is unchanged.
- Unit and widget suites pass before any promotion.
- `TECHNICAL.md` carries the E014 implementation entry and `README.md` documents the user-visible behavior.

## Requirements Traceability — 2/2 work items verified, 5/5 SC verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| US1 | Work Item | PASSED (2/2 criteria) | First run renders dark with OS light and no stored preference; absent or invalid preference falls back to dark without a crash |
| US2 | Work Item | PASSED (3/3 criteria) | Toolbar toggle switches immediately, projects and dashboard stay light, reload restores light/dark, saved choice beats OS |
| FR-064 | Requirement | PASSED | `main()` loads `ThemeMode.dark` by default; browser first-run screenshots are dark with OS light and OS dark |
| FR-065 | Requirement | PASSED | `ThemePreferenceStore.load()` resolves before `runApp`; `decode()` falls back to dark for `null`, empty, unknown, and non-string values; `main()` catches read failures |
| FR-066 | Requirement | PASSED | `_SessionToolbar` exposes `Alternar tema`; click reaches `_toggleTheme`, rebuilds `MaterialApp`, and updates projects and dashboard without reload |
| FR-067 | Requirement | PASSED | `ThemePreferenceStore.save()` writes `flutter.theme_mode`; browser reload restored `light` and `dark` in both directions |
| FR-068 | Requirement | PASSED | Contrast test covers both themes; light dashboard and projects render with `#F8FAFC`; no new dependency |
| SC-001 | Success Criteria | PASSED | OS light + no preference → dark; repeated with OS dark → dark |
| SC-002 | Success Criteria | PASSED | `"sepia"` stored value → dark, no page error, no visible light boot |
| SC-003 | Success Criteria | PASSED | Dark → light toggle updated dashboard and projects immediately; `theme_mode` written as `light` |
| SC-004 | Success Criteria | PASSED | Reload kept light, second toggle wrote dark, reload kept dark, and OS dark did not override stored light |
| SC-005 | Success Criteria | PASSED | WCAG AA contrast assertions pass in both modes; `flutter analyze` clean; 75/75 tests; no new dependency |

## Traceability Gaps
- None. P1 acceptance tests are active and the browser run covers the reload and OS-preference paths.

## Checklist Fulfillment — 18/18 spot-checked PASSED
- CHL002 testing queue: CHK001–CHK018 PASSED; P1 stubs, fallback allowlist, reload in both directions, toolbar callback boundary, both-mode contrast, `flutter analyze`, mocked SharedPreferences, and real entrypoint are all present.
- Queue: 3/3 checklist files complete, 55/55 items checked. CHL001 (UX) and CHL003 (Configuration/State) remain outside the Security/Testing spot-check scope.

## Performance — SKIPPED
- No performance NFR in `spec.md`. The preference is read once before `runApp`; the toggle only calls `setState` and a local write.

## Accessibility — PASSED
- `frontend/test/a11y_labels_test.dart` asserts AA contrast for surface text, primary actions, error text, scaffold text, and distinct status tokens in both modes.
- Browser semantics exposed `Alternar tema` as a button. The toggle keeps its tooltip and does not replace the session name or `Sair`.

## Browser Runtime Validation — PASSED
- Mode: Headless CLI supplement (no native browser or MCP browser tool exposed)
- Browser tool: Puppeteer 24.16.0 with Chrome for Testing 139.0.7258.66
- App start: Docker Compose stack rebuilt with `docker compose build frontend` and `docker compose up -d frontend`; backend restarted after the unit run
- Target: `http://localhost`
- Scenarios: 22 assertions, 10 screenshots. Covered OS light first run, OS dark first run, invalid preference, authenticated dark default, toggle to light, projects screen light, reload light, toggle to dark, reload dark, and stored light with OS dark.
- Runtime errors: none. Only `favicon.ico` returned 404; no page error or console error from the app.
- Screenshots: `/tmp/opencode/qc-browser/evidence/01-first-run-os-light.png` through `10-first-run-os-dark.png`; result JSON at `/tmp/opencode/qc-browser/evidence/result.json`.

## Manual Testing — Not Required
- Real browser validation executed the E014 scenarios; no manual attestation is needed.

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| README.md | 038e967e46ab2ca52cede9b1350404640ab8007a9d3c31f44208009950828c0f |
| TECHNICAL.md | a7c556e31b791ece11d369b14c1eec8e80d49117dd461d1797c015cea0e4cef5 |
| backend/package-lock.json | 62cd176aee0d760254c3acdfa712466602b26b625958a440a8c23a02a71c4ec1 |
| backend/package.json | f950a727452adc8da4a5c5742714091bd0ed55623f200cd66a6c9392c23c4629 |
| docker-compose.yml | 2d0449dd3e094cfcdddc7c2a361c985c80e64f1f2812d58a03b3f005eb88eec8 |
| frontend/Dockerfile | f12fa96c89953f0703a0e67ed02c2aa038f49dc8e4234d83dc1c603aaa4883ee |
| frontend/analysis_options.yaml | cc88073dea00345c800bf1f94021d3295cdd7fbd8b45a595a502a893304a5244 |
| frontend/lib/main.dart | 0c54597a3e7ed703e3ced1e5f3e4866e728413e4a51ef78285f37ba9ec98f4ea |
| frontend/lib/screens/dashboard_screen.dart | 3743e7f0d4c73091b67fed8700d72ea0277108b2592703c8fb34202dd8de65f4 |
| frontend/lib/services/theme_preference_store.dart | 9269f1df442a0185a5a89363fa525301aea9f13d8c1fa319a54b78d5b72857f0 |
| frontend/lib/theme/app_theme.dart | c84fa77d8c87455c856190c6f9bf303441e2a6075d935a3c914d5247b2cbd1e8 |
| frontend/pubspec.lock | 3afc2469bbef98229b7cf2f6b29b9b4d25894905d2a4c82386b05b6d2e4030b7 |
| frontend/pubspec.yaml | 1861f0d113a1a660f4a0ccabe88777d1df9b4f8925defa35b4e14e88800290d4 |
| frontend/test/a11y_labels_test.dart | 62cfabf732da0226c20096fac07882dd9afc4c7db038de7050de810604060fee |
| frontend/test/shell_toolbar_test.dart | a25f062feea56bb5672321daea1b96b13e00aeb358574f11fdc74ab11c97af9a |
| frontend/test/theme_preference_test.dart | 8dec3dbcfde2587c00c39d5bb2496c8cb13d7085f21fcf25b0684669889cb426 |
| frontend/test/web_browsers_test.dart | 40362620477654d4cd9e4d64c2a27580793f9463c91d4384270261b213050dd6 |
| project-instructions.md | 9260be1dac4ab97f553b523ec37daebe3773f8d0d81acc6d8f98a6cd1a39027f |
| specs/00018-tema-escuro-por-padrao-alternancia/checklists/CHL001-ux.md | c651bc6b41993cfd1767e5b690c619c64f943d443d2aeb55c47e576c3de89adb |
| specs/00018-tema-escuro-por-padrao-alternancia/checklists/CHL002-testing.md | 470a834492b3563872bbfbc47aae26fed6085dc6a3afc92d0bf29296b5bf5c74 |
| specs/00018-tema-escuro-por-padrao-alternancia/checklists/CHL003-configuration-state.md | b744d6f2ddcb242629a3928f978114f3a299c58080412e798c69f41d4b8d77d4 |
| specs/00018-tema-escuro-por-padrao-alternancia/plan.md | a9d6f9e259c74a4eae088a8d24484b691a4387084f8f1a2b6cdc10c2e552348a |
| specs/00018-tema-escuro-por-padrao-alternancia/spec.md | 17d9c00e32c1b1987a3f894d576631f3e5e8cf7557e6bfe4ee50cbd8a2e206b9 |
| specs/00018-tema-escuro-por-padrao-alternancia/tasks.md | 08f99a480f265ab0a6433c921d95283cbc3bab9648d4ae37f22e50450cbba447 |

## Tool Recommendations
- None. No native browser or MCP browser tool is exposed; the headless Puppeteer supplement covered the runtime scenarios. No repository dependency is required.

## Bug Context
| Bug Task | Error Output | Stack Trace | Related Test |
|----------|-------------|-------------|--------------|
| None | — | — | — |

## Bug Tasks Generated
- None.
