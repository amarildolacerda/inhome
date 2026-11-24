# QC Report: Importação de acervo (00022)

**Date**: 2026-11-24T00:21:55Z
**Feature Directory**: `specs/00022-importacao-acervo`
**Overall Verdict**: PASS

## QC Scope Baseline
- Baseline Commit: 0a60319c345e3d9e1289e4a0242ef0210f7fc4a8
- Mode: Full
- Prior Baseline: N/A
- Changed Files: N/A (first QC run)
- Test Selection: Full suite
- Scope Safety: primeira execução de QC da feature; nenhum baseline anterior existe, então todas as suítes e todos os checks foram executados do zero.

## Summary
| Check | Status | Details |
|-------|--------|---------|
| Testes unitários backend | PASSED | `npm test` 227/227 |
| Smoke HTTP | PASSED | `bash backend/test.sh` 218/218 |
| Testes Flutter | PASSED | `flutter test` 105/105 |
| Análise estática | PASSED | `flutter analyze lib test` — No issues found |
| Auditoria de segurança | PASSED | `npm audit --audit-level=high` em `backend/` — 0 vulnerabilidades |
| Conformidade com PI | PASSED | Nenhuma violação; branch `dev`, testes verdes antes de qualquer promoção, TODO lido, saída concisa |
| Rastreabilidade | PASSED | 2/2 work items, 4/4 SC, 9/9 FR com task e caminho |
| Checklists | PASSED | 3/3 arquivos, 24/24 itens verificados |
| Gates SDD | PASSED | spec/plan/tasks/provenance válidos; 32/32 tasks `[X]` |
| Limites de manutenibilidade | PASSED | `imports_screen.dart` 454 linhas; `imports_api.dart` 45; nenhum arquivo de implementação acima de 500 linhas |

## Test Results — PASSED
- Runner: `node:test` (`npm test`), Total: 227, Passed: 227, Failed: 0
- Runner: `bash backend/test.sh`, Total: 218, Passed: 218, Failed: 0
- Runner: `flutter test`, Total: 105, Passed: 105, Failed: 0
- Inclui 5/5 testes do parser, 17/17 da migração `attachments`, 9/9 das rotas de importação e 3/3 testes de widget da tela de acervo.

## Failure Index
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|
| — | — | — | — | Nenhuma falha | — |

## Code Coverage — SKIPPED
- Threshold: not configured
- Status: SKIPPED — o projeto não define meta numérica; a barra obrigatória é a suíte unitária verde.

## Static Analysis — PASSED
- Tool: `flutter analyze lib test`
- Critical issues: 0, Warnings: 0, Infos: 0
- Backend: sintaxe validada pela execução das suítes `node:test`.

## Security Audit — PASSED
- Tool: `npm audit --audit-level=high` (em `backend/`, onde existe `package-lock.json`)
- Vulnerabilities found: 0
- Revisão OWASP: rotas com `authenticateToken` → `scopeDomain()` → `requireRole(admin, gestor)` antes de ler `fileName`/`dataBase64`; domínio divergente e papel não autorizado recebem 403 sem leitura de payload; PDFs são validados por `decodeAndValidate` antes de ir para o disco; rollback remove arquivos escritos se a transação falha. Nenhuma dependência nova entrou: `xlsx`, `read-excel-file` e `exceljs` foram rejeitados por advisories sem correção.

## Project Instructions Compliance — PASSED
- Nenhuma violação. Branch `dev` preservada; `main` não foi promovida neste ciclo; `TODO.md`, `TECHNICAL.md` e `specs/project-plan.md` atualizados; limites de tamanho dos artefatos respeitados (spec 10229 B, plan 10231 B, tasks 5957 B).

## Requirements Traceability — 2/2 work items verified, 4/4 SC verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| US1 | Work Item | PASSED | template versionado, detecção de cabeçalhos, mapeamento e prévia com erros linha a linha; 400 sem gravação |
| US2 | Work Item | PASSED | confirmação atômica, vínculo de prestador, anexos PDF, relatório de pulos e rollback sem gravação parcial |
| SC-001 | Success Criteria | PASSED | prévia classifica linhas válidas/inválidas com erro por campo e zero contrato criado |
| SC-002 | Success Criteria | PASSED | mapeamento sem coluna obrigatória responde 400 e banco permanece intacto |
| SC-003 | Success Criteria | PASSED | confirmação cria contratos, vincula prestador e anexa PDFs nomeados pelo contrato |
| SC-004 | Success Criteria | PASSED | PDF sem linha vira item pulado; falha forçada reverte contratos e remove arquivos |

## Traceability Gaps
- Nenhum. FR-071..FR-079 têm task, arquivo e símbolo no coverage map.

## Checklist Fulfillment — 24/24 spot-checked
- CHL001/CHK001–CHK008 — PASSED
- CHL002/CHK001–CHK008 — PASSED
- CHL003/CHK001–CHK008 — PASSED

## Performance — SKIPPED
- Nenhum NFR de desempenho declarado em `spec.md`; os limites de 500 linhas e 4 MB são validação funcional, não meta de latência.

## Accessibility — SKIPPED
- Nenhum NFR de acessibilidade declarado em `spec.md`.

## Browser Runtime Validation — SKIPPED
- Mode: Headless CLI supplement — nenhuma ferramenta de navegador nativa ou MCP exposta neste harness.
- Browser tool: N/A
- App start: Not needed
- Target: N/A
- Cobertura equivalente executada por `flutter test` (3 testes de widget do fluxo completo) e `backend/test.sh` (fluxo HTTP ponta a ponta).

## Manual Testing — Not Required
- Nenhum item pendente; nenhum `manual-test.md` gerado.
- Attestation: N/A

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| README.md | e4f7a08969ac5f71e49cc8f095cd32d394617e47f2765d84b4122b08304d09c8 |
| TECHNICAL.md | e9aac237b5eead20553f800bbf8f4983c44d1260e0c6c4ff98af3c62709c0b11 |
| TODO.md | 42b8574572fe77beca31ec53bb3c0cc77cb4334ce7920b2783519b179236df8f |
| backend/assets/contract-import-template.csv | ea5adcd6d3d8d7dab6fa72ba63f30cb32ce7abc62163e0ed07915d1a7459ac12 |
| backend/src/config/database.js | 87ecc408f57ccc386e9900520f4cd4ee217e081fa25c26ef2e9178e03bea0941 |
| backend/src/config/database.test.js | d268a9b0dbe4437573a9975de7d051d21fc5071321fd4ddc206cf442586ccfde |
| backend/src/routes/imports.js | 36a32037d693cdcf5fb9b122217376587607d33b2fc09872ad7a9457c701dec2 |
| backend/src/routes/imports.test.js | e076f781ca7867561940246595257a4aa41b133b10b0a2b84ca9fe07a5c6a839 |
| backend/src/server.js | 0eb4cc570a356ab0ba739a501f7d80d3a680a811cb8836d840a2d09a3b89a3f7 |
| backend/src/utils/spreadsheet.js | 2f9bdde89d312cf3d7054a6e9f75a4f198f37bb08ab5d9e0f9249df38bfc5a8a |
| backend/src/utils/spreadsheet.test.js | 812f2fd20c1e62056154caab792145e1d90ac8df53d0897a0a9f344ad77151c1 |
| backend/test.sh | 75783ff84b3d23c71568ed7b0bb603a98d94b6071543077f4cea8d5a6d1d6b46 |
| frontend/lib/main.dart | c5f500d13033e8559c9117326216182a57d0d6c8524c4bc39acf0122352f3679 |
| frontend/lib/screens/imports_screen.dart | 4c0221fd33e047c92b7dbcdf510a278f087862582f0a17fec9060fcd4a2b10ad |
| frontend/lib/screens/imports_screen_report.dart | b3f5d264a0a7635f7c5f1ac17ba1393f0d73816be36d5660f9b7e19b651b362e |
| frontend/lib/services/api_service.dart | 8f942e4c4acb0f84e0809a47551d971fd703a1ba7ab2014a19b8fe6080b92a2e |
| frontend/lib/services/imports_api.dart | 638afff3655428ed4d92ebb9bbf86ceafdb877132f125184462efbbc9abc58ad |
| frontend/lib/utils/download_file.dart | 98512e3f23cb4d760589306758a465f6d4c13be82369b4a8317b564600c9da9f |
| frontend/lib/utils/download_file_stub.dart | ed18c6064045b9b82db5ab0cf83c664eedca74a3295a3d7a71dcf746b22f9525 |
| frontend/lib/utils/download_file_web.dart | f611cf5e6b3806097fe696007d8ed552331e3a6826dd88b76891dd6cf93bab25 |
| frontend/lib/utils/picked_file.dart | 0a5f9efbb66141cccbb5631daf60aabfb8d282ea2cfc8e3f091affba60eaa6cb |
| frontend/lib/utils/picked_file_stub.dart | f8fed69e67be935ee737f9bef176d817856cf446c860a7a4512164b0382e7efb |
| frontend/lib/utils/picked_file_web.dart | 627d927083670d0f25e948bfa2fd3c180c14cf4bbc52d68c1a417c3f822a79bf |
| frontend/test/imports_screen_test.dart | 2a23554c3ed045ac5eee7f37f266b67ced258a668d14d683e9bf2a5841251539 |
| frontend/test/roles_nav_test.dart | f24b0d849f8a06940dab6d71314f67d97d0b60e32265db27c2654d69e83af6cd |
| project-instructions.md | 9260be1dac4ab97f553b523ec37daebe3773f8d0d81acc6d8f98a6cd1a39027f |
| specs/00022-importacao-acervo/analysis-report.md | f5f10fb029fe7cc656ad552d4ea3732dc3cfaca0ff3a20552070b6620e9c00c2 |
| specs/00022-importacao-acervo/autopilot-log.md | 00410f64bd8cff94f0035ea18934f1b7aaab2bd147d57a32899af6a0a9b61413 |
| specs/00022-importacao-acervo/checklists/CHL001-security.md | 40d31314a4d7a499285703fb587042a5d6c614a013da0b29e315c03b1d550e5b |
| specs/00022-importacao-acervo/checklists/CHL002-data-integrity.md | 298efe76839dc9009def87f13000101cd2afbf276445f506c6a28b9ebe4715fa |
| specs/00022-importacao-acervo/checklists/CHL003-api-quality.md | f9c34e064ea858238ac5386f99e8fddaf26191e50027040380e3aaf9071bd62e |
| specs/00022-importacao-acervo/plan.md | 8485dccbede96d30e0900c68ed18d2416eadae5685bf3a7d4eec8714542a9924 |
| specs/00022-importacao-acervo/spec.md | 633b740b120061a26cf16b8bf9eac314188d9dc78e6113c73e33ff98737b65bf |
| specs/00022-importacao-acervo/tasks.md | f6ff65a349249edb27b689216361d69653cee357f9aba100d578bf2a3d63e780 |
| specs/project-plan.md | 1bce26aa4823db32a4e747d7c1e383b153cf3a3b6c21a9f3e1d0bcc4f026bf6a |

## Tool Recommendations
- Nenhuma ferramenta obrigatória ausente. `npm audit` só roda em `backend/`, onde existe `package-lock.json`.

## Bug Tasks Generated
- None.
