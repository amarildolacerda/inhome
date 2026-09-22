<!-- template-version: 2 -->
# InHome Project Instructions

## Core Principles

<!-- 3–7 non-negotiable principles. Each: succinct name, MUST/SHOULD rule, rationale. Add or remove ### blocks as needed. -->

### I. Development On `dev`

All changes MUST land on `dev` first — `main` stays production-only. Feature branches are created from `dev` and merged back into `dev`; nothing is pushed directly to `main`. Merging `dev` → `main` requires explicit approval from the project owner.

### II. Test-Gated Promotion

The unit test suite MUST pass before any `dev` → `main` promotion — a failing unit test blocks the promotion, no exceptions. Rationale: production only ever receives verified code.

### III. Session TODO Intake

At the start of every session, read `TODO.md` and surface any new custom TODOs before beginning other work — custom tasks stay visible instead of being lost between sessions.

### IV. Agent Output Style

All agent output MUST be concise and outcome-oriented. This principle supersedes any verbose defaults.

- **Progress reports**: Facts and outcomes only — no narration, no restating the task.
- **Artifacts**: Emit required sections only — no preamble paragraphs, no summary epilogues.
- **Reasoning**: Omit unless the user asks "why" or the decision is non-obvious.
- **Errors / blockers**: State the problem, the attempted fix, and the result — nothing else.
- **Phase-boundary reports**: ≤ 5 bullet points.
- **Preserve without compressing**: Artifact template structure and required sections; explicit decision / registration / validation guidance in shared skills; delegation constraints and sub-agent role definitions; existing size limits (spec ≤ 10 KB, research ≤ 4 KB, stories ≤ 200 words).

## Technology Stack

<!-- Downstream phases (Plan, QC, Autopilot) read this section as the authoritative tech-stack reference. -->

- **Language/Runtime**: Dart 3 (Flutter Web) frontend; Node.js 22+ backend
- **Frameworks**: Flutter Web; Express + Socket.io
- **Storage**: JSON file storage with a SQLite-shaped access layer (no native DB driver)
- **Infrastructure**: local only (backend port 3001, frontend dev port 8080/3000)
- **Auth**: JWT (`jsonwebtoken`) with `bcryptjs` password hashing

## Testing & Quality Policy

<!-- QC extracts enforcement rules from this section. Use the keywords below so automated checks activate correctly. -->
<!-- Keywords recognised by QC: lint, static analysis, code quality, coverage, security, vulnerability, OWASP, WCAG, accessibility, benchmark, performance -->

- **Coverage Target**: none until a formal suite exists — then raise deliberately
- **Required QC Categories**: linting, unit tests before promotion
- **Test Strategy**: Unit tests are mandatory before every `dev` → `main` promotion; integration/E2E for critical paths (auth, CRUD) should follow
- **Linting / Formatting**: `flutter analyze` for the frontend; Node syntax/lint for the backend — or "none" where no tool is configured

## Source Code Layout

- **Policy**: PRESERVE_EXISTING_LAYOUT
- **Convention**: Backend under `backend/src/` (config, middleware, models, routes, `server.js`); frontend under `frontend/lib/` (models, screens, services, `main.dart`); SDD scripts under `scripts/`; feature artifacts under `specs/`; governance at repo root (`AGENTS.md`, `project-instructions.md`, `TODO.md`)

## Development Workflow

- **Branching**: Feature branches from `dev`, merge back into `dev`; `main` only via approved promotion
- **Commit Convention**: Conventional Commits — `<type>: <description>`, types `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- **CI Requirements**: unit tests pass before merge; `dev` → `main` promotion is blocked while any unit test fails
- **Versioning**: Semantic Versioning (MAJOR.MINOR.PATCH), initial `v0.0.1`, stored in `backend/.env` (`APP_VERSION`); increment on promotion — `fix:` patch, `feat:` minor, breaking change major
- **Session start**: read `TODO.md` for new custom TODOs before other work

<!-- Optional: add additional sections below (Security Requirements, Performance Standards, Compliance, etc.) -->

## Governance

- Project instructions supersede all other documentation and practices.
- Amendments require a version bump with ISO-dated changelog entry.
- All implementations MUST pass the Instructions Check gate during planning.
- Complexity beyond these principles MUST be justified and documented.
- `AGENTS.md` holds only the universal SDD sections; project-specific rules live here.

[GOVERNANCE_ADDITIONAL_RULES]

**Version**: 1 | **Last Amended**: 2026-09-22
