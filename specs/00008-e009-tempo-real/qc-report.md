# QC Report: Comunicação em tempo real (00008)

**Status**: BLOCKED — aguardando verificação humana (`manual-test.md` PENDING)
**Date**: 2026-10-10T01:08:18Z | **Branch**: `dev` | **HEAD**: `26ff3f99008ee2e0b665e6f4376108aa1d0d5049`

## Resultado

- 7/7 tasks `[X]` (Setup 1, Delivery 4, Polish 2).
- 4 testes novos em `backend/src/server.socket.test.js`: FR-001 (HTTP → socket ponta a ponta), FR-002 (isolamento de sala), FR-003 (inércia da falha de emissão), FR-004 (emitter ausente + sem replay).
- 0 findings CRITICAL/HIGH/MEDIUM/LOW na análise.
- Transporte verificado sob entrega existente: `emitDomainEvent()` → `domain_<id>`, `try/catch → false`, `if (!emitter) → false`. Nenhum código de produção alterado — só testes.

## Battery

| Suíte | Baseline | Pós-provas | Status |
|-------|----------|-----------|--------|
| unit (`npm --prefix backend test`) | 111/111 | **115/115** (+4 novos) | PASS |
| smoke (`bash backend/test.sh`) | 118/118 | **118/118** | PASS |
| flutter analyze | limpo | **limpo** | PASS |
| flutter test | 16/16 | **16/16** | PASS |
| `node --check backend/src/server.js` | — | **PASS** | PASS |
| `npm audit --audit-level=high` | 0 | **0** | PASS |

Zero regressão em 00004–00007: smoke 118/118 inalterado; unit só cresce com os 4 testes E009; flutter 16/16 inalterado.

## Bloqueio

`.qc-passed` **não emitido**: 5 cenários de `manual-test.md` (MT-001..005) exigem verificação humana em navegador (duas janelas, queda de canal, isolamento visual, domínio suspenso, token expirado). Gate `.completed` presente; `.qc-passed` ausente por design.

## Manifesto SHA-256

| Artefato | SHA-256 |
|----------|---------|
| `specs/00008-e009-tempo-real/spec.md` | `e2f2f007c3c4f2b970ba63e9f954b061db5a27bfd5471bc74b4e03fa58a71db9` |
| `specs/00008-e009-tempo-real/plan.md` | `99813384d7ea40de76b4b29677b21b1898015f3edafb028c681d4af2850539c6` |
| `specs/00008-e009-tempo-real/tasks.md` | `faeb5ac88f743014e65155aa688f268db9eb3d476dae1395a226016d22d395b0` |
| `backend/src/server.socket.test.js` | `345bfc4cb759cb6ef06413266a8f5738e55e707a9b3c703708c35be3c179efee` |

**Git baseline**: branch `dev`, HEAD `26ff3f99008ee2e0b665e6f4376108aa1d0d5049`
**Repo state digest**: `8174816d1580401a` (git status --porcelain | sha256sum, prefixo 16)
