# AGENTS.md — Project Manager

Apply the Spec-Driven Development rules below during feature delivery. Enforce the lifecycle order, phase gates, conventions, and execution policy. If any rule here conflicts with `project-instructions.md`, follow `project-instructions.md`.

## Lifecycle

`Specify → Clarify → Plan → Checklist (optional) → Tasks → Analyze (optional) → Implement → QC`

Treat this order as strict. If a required artifact for the next phase is missing, stop and return the work to the phase that owns it.

## Runtime Preflight

Every public `/sddp-*` command must run this preflight exactly once before reading or writing any SDD Pilot artifact, delegating a phase, or running another SDD Pilot script. Nested phases inherit the successful in-turn result and must not run it again:

```sh
if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' 'SDD Pilot requires Node.js 22 or newer available as node. Detected: not found. Install a supported Node.js LTS release: https://github.com/attilaszasz/sdd-pilot#prerequisites. No SDD Pilot artifact was modified.'
  exit 1
fi
node scripts/runtime-preflight.mjs
```

On a non-zero result, halt without reading or modifying SDD Pilot artifacts. Do not install Node or use an editor-bundled runtime.

## Phase Gates

Each phase boundary runs a mandatory structural validator before the next phase may start. A FAIL blocks the next phase: in autopilot the pipeline halts; interactively the user may override with "Proceed anyway" (the bypass is recorded in the conversation only — no persistent marker is written).

- `spec.md` must exist before Clarify or Plan.
- **Spec → Plan gate**: `/sddp-plan` delegates the **Spec Validator** (`_spec-validator.md`) — allows 0–3 unresolved `[NEEDS CLARIFICATION: ...]` markers and fails at 4+, independently fails any unresolved CRITICAL/HIGH stress-test finding, and enforces concrete acceptance criteria for all P1 stories and frontmatter completeness. FAIL blocks Plan.
- `plan.md` must exist before Tasks.
- **Plan → Tasks gate**: `/sddp-tasks` delegates the **Plan Validator** (`_plan-validator.md`) — enforces 100% P1 requirement coverage in the Requirement Coverage Map, no orphaned Architecture Decisions, and all declared dependencies installable. FAIL blocks Tasks.
- `tasks.md` must exist before Implement.
- **Tasks → Implement gate**: `/sddp-implement` (via `references/gates.md`) delegates the **Tasks Validator** (`_tasks-validator.md`) — enforces complete task parsing, ≤40 tasks, every P1 requirement has ≥1 task, no circular `after:` chains, `tasks.md` ≤ 6 KB, valid phase structure, and semantic reconciliation of checked task provenance against current spec/plan requirements, coverage, imports/exports, and dependencies. FAIL blocks Implement.
- If `checklists/` exists, all checklist items must be complete before Implement unless the user explicitly overrides.
- `.completed` must exist before QC.
- Do not treat a feature as release-ready until `.qc-passed` exists and its report/evidence SHA-256 digests, Git baseline, and repository-state digest validate.
- Any `project-instructions.md` violation is CRITICAL severity.

## Core Conventions

- Store Feature Workspace artifacts in `specs/<feature-folder>/`.
- New Feature Workspaces use `00001-feature-name` folder names.
- If the active branch matches `#####-feature-name`, use `specs/<branch-name>/`.
- Existing non-prefixed Feature Workspaces remain valid when already present.
- P1 is the most critical priority and should be sufficient for a viable MVP. Each user story or objective must be independently testable.

Markers:

- `.completed` means implementation is complete with no unresolved CRITICAL/ERROR bugs.
- `qc-report.md` records QC results.
- `.qc-passed` means current QC has passed only when its report/evidence SHA-256 digests, Git baseline, and repository-state digest validate; pending manual verification and deferred CRITICAL/ERROR bugs block it.

## Artifact Conventions

Ambient primer for edits to files under `specs/<feature-folder>/`. Expanded reference (exceptional lookups only): `.github/skills/artifact-conventions/SKILL.md`.

### Format Grammars

- Task: `- [ ] T### [P?] [US#|OBJ#?] {(FR|TR|OR|RR)-###?} [COMPLETES req?] Description [after:T###?] [← T###:Symbol?] [→ exports: Symbol?] [VERIFY: <command>]?*`
- Requirement: `- **(FR|TR|OR|RR)-###** [US#|OBJ#]: ...`
- Success criterion: `SC-### [US#|OBJ#]: [Measurable, technology-agnostic outcome]`
- Checklist item: `- [ ] CHK### <question> [Quality Dimension, Spec §X.Y]`
- Bug task: `- [ ] T### [BUG:severity] [RECURRING?] [ESCALATED?] [DEFERRED?] {(FR|TR|OR|RR)-###} [category] Description — file:line`
- Stress-test finding: `STF-###: [Category] (Severity) — Affected: [IDs] — [summary]`

### Immutable IDs

Never change, renumber, or delete cross-referenced `T###`, `CHK###`, `FR-###`, `TR-###`, `OR-###`, `RR-###`, `SC-###`, `AD-###`, `ADR-NNNN`, or `STF-###` IDs. `[VERIFY: <command>]` command text is an executable assertion, not a stable ID; correcting a broken command is allowed. Respect `[NEEDS CLARIFICATION]` markers until the user approves an answer.

### Checkbox Transition

The only valid completion transition is `- [ ]` → `- [X]`. Never revert `[X]` → `[ ]` or delete a checkbox line without explicit user approval.

### Spec Section Rules

Product specs require `Problem Statement`, `Scope`, `User Scenarios & Testing`, `Requirements`, `Assumptions & Risks`, `Implementation Signals`, and `Success Criteria`; technical specs use `Technical Objectives` and `Integration Points`; operational specs use `Operational Objectives` and `Integration Points`. Mandatory sections stay even when empty. Size budget: ≤ **10KB**.

### Plan and Tasks Size Limits

- `plan.md`: preserve `Instructions Check`, `Technical Context`, `Requirement Coverage Map`, and `Acceptance Test Stubs`; populate coverage paths and symbols. Size limit: ≤ **10KB**.
- `tasks.md`: preserve `Dependencies` and existing phase headers. Size limit: ≤ **6KB** and 40 tasks.

## Communication Style

Follow `project-instructions.md` section IV (Agent Output Style). That section is authoritative; do not duplicate or paraphrase its rules elsewhere.

Runtime communication from any skill or sub-agent MUST also follow the contract below. These rules are ambient — they apply without re-reading any file.

### Default Rules

- Lead with outcome, verdict, or delta.
- Prefer short sentences, fragments, and flat bullets.
- Report only changed state, counts, blockers, and next action.
- Do not restate workflow steps unless status changed.
- Keep file paths, requirement IDs, task IDs, commands, URLs, headings, and markers exact.
- Keep fenced code blocks and inline code exact.
- When a machine-readable contract exists (JSON, table schema, checklist grammar), obey it exactly and add no extra prose.

### Preferred Output Patterns

- Progress update: done, issue, next.
- Validation or audit: PASS/FAIL first, then only failing or risky items.
- Research: recommendation, avoid, sources.
- Review finding: location, severity, problem, fix.
- Summary: counts, deltas, blockers, next step.

### Writing Quality

Apply a writing-quality pass to user-facing text and newly written or changed prose before delivery.

- Preserve meaning, scope, certainty, evidence, citations, and the user's voice.
- Prefer concrete facts, plain words, active voice, and natural sentence rhythm. Remove puffery, stock AI phrasing, filler, vague attribution, forced symmetry, and generic conclusions.
- Say what a project-specific mechanism does. If a sentence could appear unchanged in another project's docs, make it specific or cut it.
- Avoid em dashes, decorative emoji, excessive boldface, title case for newly authored narrative headings, and chatbot or sycophantic openers.
- Edit only narrative spans created or changed by the current task. Never use a style pass to resolve ambiguity, strengthen a claim, alter requirements or priorities, or remove a caveat.
- Preserve frontmatter, required headings and section order, tables, checkbox lines, IDs, markers, paths, commands, URLs, citations, code, quoted text, and machine-readable content exactly.
- `project-instructions.md` remains authoritative. Security, legal, policy, and compliance language keeps its required precision even when that prose is less conversational.
- Before finishing, ask: "What makes this obviously AI generated?" Fix the remaining tells without changing meaning.

### Auto-Clarity

Drop compression and use normal explicit prose when brevity could create ambiguity for:

- security warnings
- destructive or irreversible actions
- ordered multi-step instructions
- user questions showing confusion or repetition
- policy, compliance, or safety-sensitive nuance

Resume compact mode after the risky section is clear.

### Boundaries

- Never compress or mutate artifact grammars, IDs, checkbox state, or required section headers.
- For parser-sensitive files under `specs/`, write concise normal prose; do not rewrite them into stylized shorthand.
- Readability beats maximum compression for persisted artifacts.

## Continuous Execution Policy

Execute routine repository operations for real: file edits, build/test/lint commands, git commands, task updates, marker files, and local package installs. Do not simulate completion, test results, QC results, or pass states. Stop only for ambiguity, destructive actions, system-level installs, or actions outside the project boundary. Report progress at phase boundaries.

- At session start, read `TODO.md` and surface any new custom TODOs before beginning other work.
- Unit tests gate production: run the unit test suite before any `dev` → `main` promotion and do not promote while any test fails.
