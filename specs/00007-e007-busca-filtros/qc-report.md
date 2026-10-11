# QC Report: Busca e filtros (E007)

**Generated**: 2026-10-10
**Mode**: Full (no prior report)
**Overall Verdict**: BLOCKED

## QC Scope Baseline

| Field | Value |
|-------|-------|
| Baseline Commit | 26ff3f99008ee2e0b665e6f4376108aa1d0d5049 |
| Mode | Full |
| Prior baseline | N/A |
| Changed files | 11 (see Evidence Manifest) |
| Test selection | Full suites |
| Safety explanation | First QC run for E007; no prior baseline. Full suites are the conservative choice and prove zero regression on E002/E003/E006. |

## Test Results

| Suite | Runner | Count | Failures |
|-------|--------|-------|----------|
| Backend unit | `npm --prefix backend test` | 111 | 0 |
| Backend smoke | `bash backend/test.sh` | 118/118 | 0 |
| Flutter widget | `flutter analyze && flutter test` | 16/16 | 0 |

**Zero regression**: smoke 118/118 matches the pre-E007 baseline; unit grew 107 → 111 (4 new E007 tests); flutter 16/16 matches baseline. The two additive indexes (`idx_tasks_priority`, `idx_tasks_due_date`) did not regress the E002/E003 listing suites.

## Static Analysis

| Tool | Issues |
|------|--------|
| `flutter analyze` | 0 (clean) |
| `node --check` on modified backend files | 0 (all pass) |

## Security Audit

| Tool | Vulns |
|------|-------|
| `npm audit --audit-level=high` | 0 |

## PI Compliance

**No violations.**

## Requirements Traceability

| Requirement | Task | Code | Status |
|-------------|------|------|--------|
| FR-001 (six filters isolated + combined) | T002 | `backend/src/routes/search.test.js` FR-001 test | PASS |
| FR-002 (empty result + pagination consistency) | T003 | `backend/src/routes/search.test.js` FR-002 test | PASS |
| FR-003 (p95 < 2 s + ensureIndexes + no cache) | T004, T006 | `backend/src/routes/search.test.js` FR-003 test; `backend/src/config/database.js:309-310` | PASS |
| FR-004 (token domain + role scope) | T005 | `backend/src/routes/search.test.js` FR-004 test | PASS |
| FR-005 (regression green after index change) | T007 | full battery green, smoke 118/118 | PASS |
| SC-001 | T002 | combined filters return exact set | PASS |
| SC-002 | T003 | empty + page-beyond-total | PASS |
| SC-003 | T004, T011 | automated p95 < 2 s local; browser-timed p95 requires human | MANUAL |
| SC-004 | T005 | prestador own-only, domainId ignored, cross-domain isolated | PASS |
| SC-005 | T007, T008 | full battery green, zero regression | PASS |

## Traceability Gaps

None. FR-001..005 and SC-001..005 fully mapped.

## Checklist Fulfillment

| Checklist | Items | Status |
|-----------|-------|--------|
| CHL001-security | 14/14 | PASS |
| CHL002-api-quality | 14/14 | PASS |
| CHL003-performance | 14/14 | PASS |

Spot-checked: `[Security]` items (token isolation, no domainId param, LIKE escape) verified in `search.js` + FR-004 test. `[Performance]` items (p95, ensureIndexes, no cache) verified in FR-003 test + `database.js` indexes.

## Performance (MANUAL VERIFICATION NEEDED)

**Detected**: SC-003 requires the p95 measured below 2 s in the browser. Automated FR-003 test asserts server-side p95 < 2 s with 2000 seeded tasks; the browser-timed measurement needs a human (network tab, 5 runs, note the slowest).

## Accessibility

No accessibility NFRs detected in this spec (backend search epic; UI unchanged).

## Browser Runtime Validation

**Mode**: Manual fallback (`BROWSER_RUNTIME_AVAILABLE = false`)
**Target**: `http://localhost/` (Flutter Web behind Edge `:80`)
**Scenarios**: browser-timed p95, gestor combines filters, prestador sees only own, empty result readable, page beyond total.

## Manual Testing

See [`manual-test.md`](manual-test.md). **Attestation: PENDING** — 5 scenarios need human review (browser-timed p95, gestor filter combination, prestador scoping, empty result, page beyond total). Autopilot cannot attest this itself; `.qc-passed` is not created.

## QC Evidence Manifest

| Path | SHA-256 |
|------|---------|
| specs/00007-e007-busca-filtros/spec.md | 960826466786eef25fe7ba9a3c580c506acd2c1503750b875fba2b4cf24970a2 |
| specs/00007-e007-busca-filtros/plan.md | 6e4dc2fb5bd4fe78189c9029c10aff70de6ad2dc4a56f2884bf19e8a617bdcd7 |
| specs/00007-e007-busca-filtros/tasks.md | 139cd7f736819300e0b0848af24a2ba2eaa2cf82a20484f0a73ac4de27ede6ec |
| project-instructions.md | cb223e54fffb9964cc95bad25b7ab36c74481611eafac2fcb7399e0daeb91c6a |
| specs/00007-e007-busca-filtros/checklists/CHL001-security.md | 353b822ddcbdc6dd47526cb587c6aa1d2503c3a6104afb4c114e97ec0b9113f8 |
| specs/00007-e007-busca-filtros/checklists/CHL002-api-quality.md | bd9173147c69ae01f39eb257c434deb1a2ea5e8079d1cfaebcd243b0823851df |
| specs/00007-e007-busca-filtros/checklists/CHL003-performance.md | b5d9f7164de5b8464672a65e10adb03ee7def59f9f8f473b666a8eebdbbaccae |
| specs/00007-e007-busca-filtros/manual-test.md | 1a91f3cefea6f31d5432b8375dcd069c5d05db377dbfeee5e146172f63f9d50e |
| backend/src/routes/search.js | b885d119786395edace5cefd983f7749aaa54ff54360686f9cf84b4ec4768fa1 |
| backend/src/routes/search.test.js | 81785276addf1b9742e9ed54ad4f9240918213d6ddceead78bd2d978c47ff53c |
| backend/src/config/database.js | f3853c151fecb800f2b2c3b1dd3d51cc8cbba9d450104f2245f3163f542b869c |

## Tool Recommendations

None. All planned tools ran successfully.

## Bug Tasks Generated

None. No automated failures.

## Next Action

A human must open `http://localhost/`, run through the 5 scenarios in [`manual-test.md`](manual-test.md) (browser-timed p95, gestor filter combination, prestador scoping, empty result, page beyond total), and change the attestation to `Status: ATTESTED` with all scenarios `PASS`. Only then can QC be re-run to produce `.qc-passed`.
