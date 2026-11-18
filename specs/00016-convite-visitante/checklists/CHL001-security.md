# Security Checklist: Convite temporário e papel visitante (00016)
**Created**: 2026-11-16 | **Feature**: [spec.md](../spec.md)

## Completeness

- [ ] CHK001 O requisito de token opaco ≥ 128 bits está declarado com valor não derivado de dados do usuário e sem estrutura reconhecível? [Completeness, Spec §FR-044; plan.md AD-002]
- [ ] CHK002 A proibição de expor o token está declarada para todas as superfícies — resposta de criação, listagem, erros e logs? [Completeness, Spec §FR-044; data-model.md §FR-044]
- [ ] CHK003 A exigência de recusa uniforme de token (inválido, expirado, revogado) está declarada sem qualquer indício da existência do token na resposta? [Completeness, Spec §FR-046; plan.md AD-008]
- [ ] CHK004 O limite do cadastro público está declarado como rate limit por IP com resposta 429? [Completeness, Spec §FR-046; plan.md AD-003]
- [ ] CHK005 Os parâmetros do rate limit (janela e teto) estão especificados com precisão suficiente para julgar o abuso do cadastro aberto? [Completeness, Spec §FR-046; Spec §Risks; research.md §Rate limit]
- [ ] CHK006 A recusa de e-mail já registrado no domínio está declarada como 409 sem nenhuma escrita e sem consumir o convite, inclusive em outro convite? [Completeness, Spec §FR-046; Spec §SC-003]
- [ ] CHK007 A criação do usuário e o consumo do convite estão declarados como operação atômica, em que sucesso exige as duas escritas? [Completeness, Spec §Edge Cases; data-model.md §FR-046]
- [ ] CHK008 A negação por padrão das rotas fora da matriz do visitante está declarada como requisito (403) e não apenas como efeito da listagem? [Completeness, Spec §FR-047; FR-048; Spec §Risks]
- [ ] CHK009 A revalidação do convite a cada requisição, com negação imediata após expiração ou revogação, está declarada como exigência da guarda? [Completeness, Spec §FR-047; STF-003]
- [ ] CHK010 A precedência da suspensão por convite sobre mudança de papel concorrente está declarada junto da reavaliação? [Completeness, Spec §FR-045; FR-049; STF-001]
- [ ] CHK011 Existe requisito de política de senha para o cadastro público (comprimento mínimo ou critério aceito), além do campo ser obrigatório? [Completeness, Spec §FR-046; Spec §US2]
- [ ] CHK012 O armazenamento de senha do cadastro público está declarado como hash, sem texto puro em respostas ou logs? [Completeness, Spec §FR-046; data-model.md §Visitor/User]

## Clarity

- [ ] CHK013 A distinção entre a recusa uniforme de token e a recusa própria do e-mail duplicado está enunciada sem ambiguidade? [Clarity, Spec §FR-046; plan.md AD-008]
- [ ] CHK014 O alcance de "sem vazar token inválido" está claro quanto às superfícies cobertas (corpo da resposta, log e mensagem de erro)? [Clarity, Spec §FR-046; plan.md HINT-005]
- [ ] CHK015 O mapeamento 404 (listagem e detalhe fora do contrato) versus 403 (demais rotas) está livre de sobreposição, inclusive para contrato encerrado? [Clarity, Spec §Edge Cases; FR-047]
- [ ] CHK016 A negação imediata ("nega em T+0") está explicada como ausência de carência após expiração ou revogação? [Clarity, Spec §FR-047; STF-003]
- [ ] CHK017 O escopo do rate limit está claro quanto ao alvo: só o cadastro público por IP, sem penalizar a emissão autenticada? [Clarity, Spec §FR-046; research.md §Rate limit]
- [ ] CHK018 O significado de negar por padrão está claro: toda rota não contemplada na matriz do visitante responde 403? [Clarity, Spec §FR-048; FR-047]

## Consistency

- [ ] CHK019 O 404 de tarefa fora do contrato em FR-047 é consistente com SC-002 e US2, que exigem 404, sem alternativa 403 ambígua? [Consistency, Spec §FR-047; SC-002; STF-005]
- [ ] CHK020 O escopo de dedup de FR-046 (domínio, inclusive em outro convite) é consistente com Edge Cases e SC-003? [Consistency, Spec §FR-046; SC-003; STF-002]
- [ ] CHK021 O 409 da recusa de cadastro e o 409 de revogação de convite expirado têm significados distintos e não conflitantes para o cliente? [Consistency, Spec §FR-046; contracts/openapi.yaml §revokeInvite]
- [ ] CHK022 A regra de não expor o token é consistente entre FR-044, data-model.md, plan.md e contracts/openapi.yaml (exposição só no 201)? [Consistency, Spec §FR-044; data-model.md; plan.md HINT-005; contracts/openapi.yaml]
- [ ] CHK023 A matriz do visitante é consistente com a base negar por padrão de 00002 FR-005 e com a extensão declarada em FR-048? [Consistency, Spec §FR-048; Spec §Risks]
- [ ] CHK024 A suspensão por convite e a suspensão manual produzem o mesmo efeito de acesso (login e sessão negados) em FR-045, FR-049 e SC-004? [Consistency, Spec §FR-045; FR-049; SC-004]
- [ ] CHK025 A reativação de um suspenso está definida de forma consistente (convite válido OU reavaliação registrada) entre FR-049, data-model.md e SC-005? [Consistency, Spec §FR-049; STF-001; data-model.md §Constraints]

## Testability

- [ ] CHK026 SC-005 é mensurável: todo acesso de visitante remete a convite válido ou reavaliação registrada, com condição de falha observável? [Testability, Spec §SC-005]
- [ ] CHK027 Existe cenário de aceitação para a recusa uniforme de token (inválido, expirado, revogado) com resposta indistinguível? [Testability, Spec §US2; FR-046]
- [ ] CHK028 Existe critério de sucesso ou cenário para o rate limit do cadastro público (teto excedido → 429)? [Testability, Spec §SC-002; FR-046]
- [ ] CHK029 A dedup de domínio é mensurável em SC-003: e-mail repetido recusado sem alteração e convite não consumido? [Testability, Spec §SC-003]
- [ ] CHK030 Existe critério observável para a ausência do token em listagem, erros e logs? [Testability, Spec §FR-044; SC-001]
- [ ] CHK031 Existe cenário de aceitação para a política de senha do cadastro público, dado que nenhum SC menciona senha? [Testability, Spec §SC-002; FR-046]
