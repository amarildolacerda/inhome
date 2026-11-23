# Security Checklist: Convite temporário e papel visitante (00016)
**Created**: 2026-11-16 | **Evaluated**: 2026-11-19 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 O requisito de token opaco ≥ 128 bits está declarado com valor não derivado de dados do usuário e sem estrutura reconhecível? [Completeness, Spec §FR-044; plan.md AD-002] <!-- Evaluator: Covered by spec.md §FR-044; plan.md AD-002 (randomBytes(16) base64url) -->
- [X] CHK002 A proibição de expor o token está declarada para todas as superfícies — resposta de criação, listagem, erros e logs? [Completeness, Spec §FR-044; data-model.md §FR-044] <!-- Evaluator: Covered by spec.md §FR-044 (só no 201; nunca em listagem, erro, log de aplicação ou access log) -->
- [X] CHK003 A exigência de recusa uniforme de token (inválido, expirado, revogado) está declarada sem qualquer indício da existência do token na resposta? [Completeness, Spec §FR-046; plan.md AD-008] <!-- Evaluator: Covered by spec.md §FR-046; plan.md AD-008 -->
- [X] CHK004 O limite do cadastro público está declarado como rate limit por IP com resposta 429? [Completeness, Spec §FR-046; plan.md AD-003] <!-- Evaluator: Covered by spec.md §FR-046; plan.md AD-003 -->
- [X] CHK005 Os parâmetros do rate limit (janela e teto) estão especificados com precisão suficiente para julgar o abuso do cadastro aberto? [Completeness, Spec §FR-046; Spec §Risks; research.md §Rate limit] <!-- Evaluator: Covered by spec.md §FR-046 (10 por IP a cada 60 s; a 11ª → 429) -->
- [X] CHK006 A recusa de e-mail já registrado no domínio está declarada como 409 sem nenhuma escrita e sem consumir o convite, inclusive em outro convite? [Completeness, Spec §FR-046; Spec §SC-003] <!-- Evaluator: Covered by spec.md §FR-046; §SC-003 -->
- [X] CHK007 A criação do usuário e o consumo do convite estão declarados como operação atômica, em que sucesso exige as duas escritas? [Completeness, Spec §Edge Cases; data-model.md §FR-046] <!-- Evaluator: Covered by data-model.md §FR-046 (invite_emails na mesma transação do INSERT em users) -->
- [X] CHK008 A negação por padrão das rotas fora da matriz do visitante está declarada como requisito (403) e não apenas como efeito da listagem? [Completeness, Spec §FR-047; FR-048; Spec §Risks] <!-- Evaluator: Covered by spec.md §FR-047 (demais rotas → 403); FR-048; §Risks (deny-by-default 00002 FR-005) -->
- [X] CHK009 A revalidação do convite a cada requisição, com negação imediata após expiração ou revogação, está declarada como exigência da guarda? [Completeness, Spec §FR-047; STF-003] <!-- Evaluator: Covered by spec.md §FR-047 (guarda revalida convite ou reavaliação registrada; nega em T+0) -->
- [X] CHK010 A precedência da suspensão por convite sobre mudança de papel concorrente está declarada junto da reavaliação? [Completeness, Spec §FR-045; FR-049; STF-001] <!-- Evaluator: Covered by spec.md §FR-045 (suspensão já gravada prevalece); FR-049 (promover exige ativo) -->
- [X] CHK011 Existe requisito de política de senha para o cadastro público (comprimento mínimo ou critério aceito), além do campo ser obrigatório? [Completeness, Spec §FR-046; Spec §US2] <!-- Evaluator: Covered by spec.md §FR-046 (senha ≥ 6 caracteres); §US2 cenário 1 -->
- [X] CHK012 O armazenamento de senha do cadastro público está declarado como hash, sem texto puro em respostas ou logs? [Completeness, Spec §FR-046; data-model.md §Visitor/User] <!-- Evaluator: Covered by data-model.md §FR-046 (bcrypt em password_hash, nunca texto puro em resposta ou log) -->

## Clarity

- [X] CHK013 A distinção entre a recusa uniforme de token e a recusa própria do e-mail duplicado está enunciada sem ambiguidade? [Clarity, Spec §FR-046; plan.md AD-008] <!-- Evaluator: Covered by spec.md §FR-046 (mensagem uniforme vs duplicata); openapi.yaml §register 409 (dois casos distintos) -->
- [X] CHK014 O alcance de "sem vazar token inválido" está claro quanto às superfícies cobertas (corpo da resposta, log e mensagem de erro)? [Clarity, Spec §FR-046; plan.md HINT-005] <!-- Evaluator: Covered by spec.md §FR-044 (listagem, erro, log de aplicação e access log); plan.md HINT-005 -->
- [X] CHK015 O mapeamento 404 (listagem e detalhe fora do contrato) versus 403 (demais rotas) está livre de sobreposição, inclusive para contrato encerrado? [Clarity, Spec §Edge Cases; FR-047] <!-- Evaluator: Covered by spec.md §FR-047; §Edge Cases (404 tarefas / 403 demais; encerrado mantém tarefas) -->
- [X] CHK016 A negação imediata ("nega em T+0") está explicada como ausência de carência após expiração ou revogação? [Clarity, Spec §FR-047; STF-003] <!-- Evaluator: Covered by spec.md §FR-047 (T+0 após gravar suspensão); FR-045 (expiração na 1ª observação, sem job) -->
- [X] CHK017 O escopo do rate limit está claro quanto ao alvo: só o cadastro público por IP, sem penalizar a emissão autenticada? [Clarity, Spec §FR-046; research.md §Rate limit] <!-- Evaluator: Covered by spec.md §FR-046 (limite declarado só na cláusula de cadastro); openapi.yaml (429 apenas no register) -->
- [X] CHK018 O significado de negar por padrão está claro: toda rota não contemplada na matriz do visitante responde 403? [Clarity, Spec §FR-048; FR-047] <!-- Evaluator: Covered by spec.md §FR-047 (demais rotas fora da matriz → 403); FR-048; §Risks -->

## Consistency

- [X] CHK019 O 404 de tarefa fora do contrato em FR-047 é consistente com SC-002 e US2, que exigem 404, sem alternativa 403 ambígua? [Consistency, Spec §FR-047; SC-002; STF-005] <!-- Evaluator: Covered by spec.md §FR-047 (404 reservado a tarefas fora do contrato); §US2 cenário 2 -->
- [X] CHK020 O escopo de dedup de FR-046 (domínio, inclusive em outro convite) é consistente com Edge Cases e SC-003? [Consistency, Spec §FR-046; SC-003; STF-002] <!-- Evaluator: Covered by spec.md §FR-046; §Edge Cases; §SC-003 -->
- [X] CHK021 O 409 da recusa de cadastro e o 409 de revogação de convite expirado têm significados distintos e não conflitantes para o cliente? [Consistency, Spec §FR-046; contracts/openapi.yaml §revokeInvite] <!-- Evaluator: Covered by openapi.yaml §register 409 (dup/token) vs §revokeInvite 409 (expirado não revogável); endpoints distintos -->
- [X] CHK022 A regra de não expor o token é consistente entre FR-044, data-model.md, plan.md e contracts/openapi.yaml (exposição só no 201)? [Consistency, Spec §FR-044; data-model.md; plan.md HINT-005; contracts/openapi.yaml] <!-- Evaluator: Covered by spec.md §FR-044; data-model.md §FR-044; plan.md HINT-005; openapi.yaml info (token só no 201) -->
- [X] CHK023 A matriz do visitante é consistente com a base negar por padrão de 00002 FR-005 e com a extensão declarada em FR-048? [Consistency, Spec §FR-048; Spec §Risks] <!-- Evaluator: Covered by spec.md §FR-048 (extensão da matriz de 00002); §Risks (deny-by-default FR-005) -->
- [X] CHK024 A suspensão por convite e a suspensão manual produzem o mesmo efeito de acesso (login e sessão negados) em FR-045, FR-049 e SC-004? [Consistency, Spec §FR-045; FR-049; SC-004] <!-- Evaluator: Covered by spec.md §FR-049 (suspensão nega login e sessão como em 00002); §SC-004 -->
- [X] CHK025 A reativação de um suspenso está definida de forma consistente (convite válido OU reavaliação registrada) entre FR-049, data-model.md e SC-005? [Consistency, Spec §FR-049; STF-001; data-model.md §Constraints] <!-- Evaluator: Covered by spec.md §FR-049 (reativar exige reavaliação ou convite válido); data-model.md §FR-048/049; §SC-005 -->

## Testability

- [X] CHK026 SC-005 é mensurável: todo acesso de visitante remete a convite válido ou reavaliação registrada, com condição de falha observável? [Testability, Spec §SC-005] <!-- Evaluator: Covered by spec.md §SC-005 (acesso sem base observável = suspenso não entra) -->
- [X] CHK027 Existe cenário de aceitação para a recusa uniforme de token (inválido, expirado, revogado) com resposta indistinguível? [Testability, Spec §US2; FR-046] <!-- Evaluator: Resolved — added US2 acceptance scenario 3 (409 idêntico sem token) to spec.md -->
- [X] CHK028 Existe critério de sucesso ou cenário para o rate limit do cadastro público (teto excedido → 429)? [Testability, Spec §SC-002; FR-046] <!-- Evaluator: Resolved — added "11ª tentativa no mesmo minuto → 429" to spec.md §SC-002 -->
- [X] CHK029 A dedup de domínio é mensurável em SC-003: e-mail repetido recusado sem alteração e convite não consumido? [Testability, Spec §SC-003] <!-- Evaluator: Covered by spec.md §SC-003 -->
- [X] CHK030 Existe critério observável para a ausência do token em listagem, erros e logs? [Testability, Spec §FR-044; SC-001] <!-- Evaluator: Covered by spec.md §SC-001 (lista sem o token; erros e logs nunca o contêm) -->
- [X] CHK031 Existe cenário de aceitação para a política de senha do cadastro público, dado que nenhum SC menciona senha? [Testability, Spec §SC-002; FR-046] <!-- Evaluator: Resolved — added "senha ≥ 6 caracteres" to spec.md §US2 acceptance scenario 1 -->
