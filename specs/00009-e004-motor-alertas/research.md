# Quality Standards Research — E004 (00009)

**Created**: 2026-10-11 | **Author**: inline (Technical Researcher delegation depth-blocked) | Domains: Data Integrity, Security, Resilience

## Data Integrity (ISO 25010 data-maintenance attributes; SQLite best practice)

- Exactly-once semantics for side effects: persist the dedup fact before emitting any external side effect (write-ahead of send), and make the persist idempotent via a UNIQUE constraint rather than application-level pre-checks.
- Migrations must be additive, lazy, and idempotent: guarded by table/column existence checks, safe to re-run, and never requiring a boot-time full-database scan (precedent in this repo: `migrateSchema` guards).
- Derived state (e.g., windows per tenant) must have a documented default that requires no configuration, so fresh tenants behave correctly without setup.

## Security (OWASP; repo authorization baseline)

- Any new state-changing endpoint must be authenticated and authorized by role (admin) and scoped to the caller's tenant via the existing domain guard; cross-tenant parameter tampering must return 403.
- Triggering server-side work from an endpoint is a resource-exhaustion vector: the endpoint must not be unauthenticated and must reuse the single-process scheduling assumption; document the blast radius (one sweep pass) and non-concurrency.
- Optional integrations (SMTP) must be opt-in through environment configuration; absence of credentials must fail closed on the integration (skip send) and never block the core flow.

## Resilience (ISO 25010 robustness; scheduler failure containment)

- Background workers must never crash the host process: per-iteration try/catch, errors swallowed and logged, next scheduled run still fires.
- External I/O (SMTP) must have a hard timeout per item; a hung integration must degrade to a recorded failure, not a stuck worker.
- Failure in one tenant's database must be contained: the sweep continues to remaining tenants (per-tenant try/catch).
- Manual triggers must report partial counts (swept/emitted/emailed/failed) instead of failing the whole request on partial error.

Sources: ISO/IEC 25010:2011 (reliability/maintainability sub-characteristics), OWASP Top 10 2021 (API Security, Broken Access Control), SQLite docs (ALTER TABLE, constraints as integrity backbone), repo precedent (`migrateSchema`, `scopeDomain`, `runDueSweep` containment pattern).
