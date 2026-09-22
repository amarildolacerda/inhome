# TODO

Custom project TODOs. Agents read this file at session start.

## Pending

- [ ] Backend HTTP end-to-end test (register → login → project → task → dashboard)
- [ ] Formal unit test suite + `npm test` script (required by the production gate rule)
- [ ] Fase 6: Real-time — wire Socket.io events to the Flutter frontend
- [ ] Fase 7: Validação
- [ ] SDD bootstrap: `/sddp-init`, `/sddp-prd`, `/sddp-systemdesign`, `/sddp-projectplan` (fill `.github/sddp-config.md` paths; create `specs/`)
- [ ] Flutter SDK local install (frontend not buildable in this environment yet)
- [ ] Update `.slim/deepwork/project-management-system.md` progress file
- [ ] Remove unused `sql.js` dependency from `backend/package.json` — now obsolete: `sql.js` is the chosen driver (keep it)
- [ ] Remodel backend/frontend: projects → contratos; add domínios, papéis (system_admin/admin/gestor/prestador), vínculo prestador↔contrato, conclusão documentada + fotos, reabertura justificada, comentários/anexos, busca/filtros, e-mail (SMTP opt-in), relatório PDF por contrato, SQLite por domínio (fonte: `docs/approved-scope-draft.md`)
- [ ] Reiniciar OpenCode para aplicar os modelos corrigidos (`mimo-v2.6-flash-free`) — lanes designer/fixer ainda falham com `mimo-v2.5-free`/`hy3-free` do processo em memória
