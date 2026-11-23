# Research: Convite temporário e papel visitante

**Purpose**: Definir token opaco, rate limit da rota pública, username derivado do e-mail, validação de convite na requisição e migração aditiva, sem novas dependências.
**Context**: Express + sql.js (SQLite por domínio), Flutter Web; baseline de `specs/sad.md`; padrões de E001/E003/E011.

## Token opaco de convite
- **Decision**: `crypto.randomBytes(16)` (128 bits) → base64url; valor nunca aparece em log, erro ou resposta de listagem.
- **Rationale**: 128 bits inviabiliza adivinhação; opaco não precisa de estrutura nem assinatura.
- **Rejected**: UUIDv4 (menos entropia útil e formato reconhecível); JWT (não é revogável por estado sem cache).
- **Pitfalls**: não derivar do e-mail nem de hash previsível; tratar como credencial em toda resposta.
- **Sources**: https://nodejs.org/api/crypto.html#crypto_randombytes_size_callback

## Rate limit por IP sem dependência nova
- **Decision**: middleware próprio de janela fixa em memória (Map IP→contador, janela 60 s, teto 10 só na rota de cadastro), resposta 429.
- **Rationale**: uma rota pública; evitar dependência nova para um teto por IP.
- **Rejected**: express-rate-limit (dependência nova para um teto); limite por convite (gira junto com o token).
- **Pitfalls**: contador por processo zera no restart; não aplicar à emissão autenticada.
- **Sources**: https://cheatsheetseries.owasp.org/cheatsheets/Rate_Limiting_Cheat_Sheet.html

## Username derivado do e-mail
- **Decision**: local part em minúsculas sanitizada para `[a-z0-9._-]`; colisão ganha sufixo numérico (`2`, `3`…); `users.username` UNIQUE respeitado.
- **Rationale**: `User.create` aceita `username` e o login de 00002 casa `email OR username`; coluna UNIQUE existe desde a migração de E011.
- **Rejected**: campo username no formulário público (fricção no convite); login só por e-mail (muda 00002).
- **Pitfalls**: local part vazio ou só símbolos cai para `visitante`; não reaproveitar sufixo de usuário desativado.
- **Sources**: https://www.rfc-editor.org/rfc/rfc5322

## Validade de convite na requisição (STF-003)
- **Decision**: guarda deriva o estado do convite a cada request (`expires_at > now` e sem revogação) junto do escopo por contrato; suspensão persistida complementa, não substitui.
- **Rationale**: expiração sem job deixa janela T+0; derivação na leição nega em T+0 conforme FR-047.
- **Rejected**: job periódico de suspensão (intervalo indeterminado); só flag de usuário (não cobre novo convite).
- **Pitfalls**: não cachear estado do convite na sessão; join barato por `contract_id` no escopo do visitante.
- **Sources**: STF-003 em [spec.md](spec.md)

## Migração aditiva preguiçosa
- **Decision**: `CREATE TABLE IF NOT EXISTS` para convites e guarda `PRAGMA table_info` + `ALTER TABLE ADD COLUMN` para colunas novas, no padrão de E011.
- **Rationale**: startup do sql.js já usa esse padrão em `database.js`; sem rebuild de tabela.
- **Rejected**: rebuild 12-passos; migração fora do startup.
- **Pitfalls**: DDL em inglês, defaults `NOT NULL` obrigatórias; executar por domínio como as demais tabelas.
- **Sources**: https://sqlite.org/lang_altertable.html

## Summary

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Token | `randomBytes(16)` base64url | 128 bits, opaco |
| Rate limit | janela fixa em memória, 429 | sem dependência nova |
| Username | local part + sufixo em colisão | UNIQUE de 00002 preservada |
| Validade | derivação na requisição | fecha janela do STF-003 |
| Migração | guarda `PRAGMA` + `ADD COLUMN` | padrão E011 |

## Sources Index

| URL | Topic | Publisher | Fetched |
|-----|-------|-----------|---------|
| https://nodejs.org/api/crypto.html | Token | Node.js | 2026-11-16 |
| https://cheatsheetseries.owasp.org/cheatsheets/Rate_Limiting_Cheat_Sheet.html | Rate limit | OWASP | 2026-11-16 |
| https://www.rfc-editor.org/rfc/rfc5322 | Local part | IETF | 2026-11-16 |
| https://sqlite.org/lang_altertable.html | Migração | SQLite | 2026-11-16 |
