# API Quality Checklist: Convite temporário e papel visitante (00016)
**Created**: 2026-11-19 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 Todos os endpoints novos estão declarados com método, caminho e finalidade, sem superfície implícita? [Completeness, Spec §FR-044; plan.md §API Surface] <!-- Evaluator: Covered by openapi.yaml §paths (3 caminhos, 4 operações); plan.md §API Surface (mesmas 4 operações) -->
- [X] CHK002 Os requisitos de autenticação e papel por endpoint estão declarados (gestor/admin autenticado vs cadastro público)? [Completeness, Spec §FR-044; FR-046] <!-- Evaluator: Covered by spec.md §FR-044 (JWT admin/gestor) e §FR-046 (cadastro público); openapi.yaml §security e §register (security: []) -->
- [X] CHK003 As regras de validação da emissão (contrato, validade limitada às três opções) estão declaradas? [Completeness, Spec §FR-044; openapi §InviteCreateInput] <!-- Evaluator: Covered by openapi.yaml §InviteCreateInput (contract_id, validity enum 24h/7d/30d) e resposta 400; spec.md §FR-044 -->
- [X] CHK004 As regras de validação do cadastro (campos obrigatórios e senha) estão declaradas? [Completeness, Spec §FR-046; openapi §InviteRegisterInput] <!-- Evaluator: Resolved — added minLength 6 + descrição em openapi.yaml §InviteRegisterInput.password e menção no 400 -->
- [X] CHK005 Os códigos de sucesso estão declarados por operação (criação 201, listagem/revogação 200, cadastro 201)? [Completeness, Spec §FR-044; FR-046; openapi] <!-- Evaluator: Covered by openapi.yaml (201 emissão/cadastro, 200 listagem/revogação); spec.md §FR-044 (token no 201) -->
- [X] CHK006 Cada modo de falha dos requisitos tem erro correspondente declarado (400, 401, 403, 404, 409, 429)? [Completeness, Spec §Requirements; plan.md §Error Handling; openapi] <!-- Evaluator: Covered by plan.md §Error Handling (400/401/403/404/409/429) e openapi.yaml (todas as respostas declaradas por operação) -->
- [X] CHK007 Os formatos de resposta estão declarados (convite sem token; sessão completa no cadastro)? [Completeness, Spec §FR-044; openapi §schemas] <!-- Evaluator: Covered by openapi.yaml §InviteCreated (token só aqui), §InviteListItem (sem token) e §Session (sessão completa) -->
- [X] CHK008 A mudança de comportamento das rotas existentes de tarefas está documentada como parte do contrato? [Completeness, Spec §FR-047; openapi §Nota FR-047] <!-- Evaluator: Covered by openapi.yaml §info Nota FR-047 (rotas de tarefas mudam de comportamento; contrato não redefinido) -->
- [X] CHK009 O formato de corpo de erro é declarado como uniforme para toda a superfície nova? [Completeness, Spec §Requirements; openapi §info; plan.md §Error Handling] <!-- Evaluator: Covered by openapi.yaml §info (Erros sempre {error}); plan.md §Error Handling -->

## Clarity

- [X] CHK010 O ponto único de exposição do token (resposta de criação) é inequívoco para o consumidor da API? [Clarity, Spec §FR-044; openapi §createInvite] <!-- Evaluator: Covered by spec.md §FR-044 (só na criação); openapi.yaml §info e §createInvite (O token aparece só nesta resposta) -->
- [X] CHK011 Os dois significados de 409 (cadastro vs revogação de expirado) estão claramente distinguidos? [Clarity, Spec §FR-046; openapi §register 409; §revokeInvite 409] <!-- Evaluator: Covered by openapi.yaml §register 409 (dois casos) vs §revokeInvite 409 (expirado não revogável); spec.md §FR-046 -->
- [X] CHK012 O mapeamento de respostas do visitante (404 em tarefas fora do contrato, 403 nas demais) está livre de ambiguidade? [Clarity, Spec §FR-047] <!-- Evaluator: Covered by spec.md §FR-047 (404 tarefas fora do contrato; demais 403); openapi.yaml §Nota FR-047 -->
- [X] CHK013 O alvo e a janela do rate limit estão claros (somente cadastro público, 10 por IP a cada 60 s)? [Clarity, Spec §FR-046; openapi §RateLimited] <!-- Evaluator: Covered by spec.md §FR-046 (só no cadastro, 10/60 s); openapi.yaml §RateLimited; research.md §Rate limit (não aplicar à emissão) -->
- [X] CHK014 Os valores de estado derivado do convite (ativo, revogado, expirado) e sua precedência estão claros ao consumidor? [Clarity, Spec §FR-045; openapi §listInvites] <!-- Evaluator: Covered by openapi.yaml §listInvites (revogado > expirado > ativo, derivado por requisição); spec.md §FR-045 -->
- [X] CHK015 A expectativa de idempotência da revogação repetida está declarada? [Clarity, Spec §FR-045; openapi §revokeInvite] <!-- Evaluator: Covered by openapi.yaml §revokeInvite (Já revogado → 200 idempotente, sem novas linhas); spec.md §FR-045 -->
- [X] CHK016 O limite de domínio dos endpoints (pertencência ao domínio do token) está declarado? [Clarity, Spec §FR-044; openapi §info] <!-- Evaluator: Covered by openapi.yaml §info (rotas operam no domínio do token); spec.md §FR-044 (próprio domínio) -->

## Consistency

- [X] CHK017 A lista de endpoints do plano corresponde exatamente aos caminhos do contrato, sem sobra em nenhum dos dois? [Consistency, Spec §FR-044; plan.md §API Surface; openapi §paths] <!-- Evaluator: Covered by plan.md §API Surface (4 linhas) e openapi.yaml §paths (4 operações) — mesmos métodos e caminhos -->
- [X] CHK018 Os códigos de status exigidos pelos requisitos são os mesmos declarados no contrato (409 encerrado, 429, 404/403)? [Consistency, Spec §FR-044; FR-046; FR-047; openapi] <!-- Evaluator: Covered by spec.md §FR-044 (encerrado → 409), §FR-046 (429), §FR-047 (404/403) vs openapi.yaml (mesmos códigos) -->
- [X] CHK019 A convenção de idioma (descrições em português, campos em inglês) é consistente entre contrato e plano? [Consistency, Spec §Requirements; plan.md §Project Structure; openapi] <!-- Evaluator: Covered by plan.md §Project Structure (EN em DDL/payload, PT em telas) e openapi.yaml (descrições PT, campos EN) -->
- [X] CHK020 A sessão devolvida no cadastro é consistente com o formato de sessão já usado pelo login existente? [Consistency, Spec §US2; openapi §Session] <!-- Evaluator: Covered by openapi.yaml §Session e §register 201 (mesma sessão do login: user + JWT + domainId) -->
- [X] CHK021 Os números do rate limit são idênticos entre requisito, plano, contrato e pesquisa? [Consistency, Spec §FR-046; plan.md; openapi; research.md] <!-- Evaluator: Covered by spec.md §FR-046 (10/60 s), plan.md §Error Handling (10 por 60 s), openapi.yaml §RateLimited e research.md §Rate limit (janela 60 s, teto 10) -->
- [X] CHK022 A semântica dos métodos (DELETE para revogar, POST para emitir/cadastrar) é consistente com o modelo de estado do convite? [Consistency, Spec §FR-045; openapi] <!-- Evaluator: Covered by openapi.yaml (DELETE revoga, POST emite/cadastra) e spec.md §FR-045 (estado derivado; revogação parcial) -->
- [X] CHK023 O prefixo de versão da superfície nova é consistente com a convenção v2 já existente? [Consistency, Spec §Requirements; plan.md §API Surface; openapi §servers] <!-- Evaluator: Covered by plan.md §API Surface e openapi.yaml (todas as rotas em /api/v2/invites, prefixo v2 já usado pela API existente) -->

## Testability

- [X] CHK024 Cada modo de falha tem critério observável de status e corpo de resposta? [Testability, Spec §FR-046; plan.md §Error Handling; openapi] <!-- Evaluator: Covered by plan.md §Error Handling (status + corpo + retry por categoria) e openapi.yaml (respostas de erro por operação) -->
- [X] CHK025 A ausência do token na listagem é mensurável na resposta? [Testability, Spec §SC-001; FR-044] <!-- Evaluator: Covered by spec.md §SC-001 (lista sem o token; erros e logs nunca o contêm) -->
- [X] CHK026 O rate limit tem critério observável de recusa na janela (11ª tentativa → 429)? [Testability, Spec §SC-002; FR-046] <!-- Evaluator: Covered by spec.md §SC-002 (11ª tentativa no mesmo minuto → 429) -->
- [X] CHK027 O mapeamento 404/403 é testável por classe de rota com cenário declarado? [Testability, Spec §SC-002; FR-047; US2] <!-- Evaluator: Covered by spec.md §SC-002 e §US2 cenário 2 (404 no outro contrato), §FR-047 (demais → 403) -->
- [X] CHK028 A recusa de emissão para contrato encerrado (409) é observável em cenário declarado? [Testability, Spec §SC-001; FR-044] <!-- Evaluator: Resolved — added US1 acceptance scenario 2 (contrato encerrado → 409 sem escrita) to spec.md -->
