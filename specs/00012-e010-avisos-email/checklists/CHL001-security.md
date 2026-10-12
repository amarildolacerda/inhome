# Security Checklist: Avisos por e-mail — envio opt-in por evento (00012)
**Created**: 2026-10-11 | **Feature**: [spec.md](../spec.md)

## Completeness

- [X] CHK001 O canal opt-in está declarado como dependente de `SMTP_HOST`/`SMTP_PORT`, com nenhuma tentativa de envio quando ausente? [Completeness, Spec §FR-004] <!-- Evaluator: Covered by spec.md FR-004 ("nenhum envio MUST ser tentado") + Key Entities "opt-in por variável de ambiente" + SC-004 -->
- [X] CHK002 A superfície de leitura do estado de envio está restrita a admin e gestor com os guards do painel (prestador fora)? [Completeness, Spec §FR-003; CLAR Q2] <!-- Evaluator: Covered by spec.md FR-003 ("para admin e gestor") + CLAR Q2 ("mesmos guards do painel") + plan.md API Surface (admin, gestor + scopeDomain) -->
- [X] CHK003 O destinatário está limitado ao endereço já cadastrado (atribuído, gestão, `creator_email`), sem endereço arbitrário de entrada do usuário? [Completeness, Spec §Assumptions] <!-- Evaluator: Covered by spec.md Assumptions ("Destinatário = endereço já cadastrado") + FR-002 (`creator_email`) + Excluded ("preferência de canal por usuário") -->
- [X] CHK004 A configuração SMTP é somente por variável de ambiente, sem credencial ou host fixado em código ou repositório? [Completeness, Spec §Key Entities; plan.md Technical Context] <!-- Evaluator: Covered by spec.md Key Entities ("opt-in por variável de ambiente") + plan.md "nenhuma dependência nova" + E001 gate entregue -->
- [X] CHK005 A falha do canal é engolida e registrada — `notify()` sem propagação de exceção — está declarada para os quatro gatilhos? [Completeness, Spec §FR-006] <!-- Evaluator: Covered by spec.md FR-006 + Edge Cases ("notify() nunca lança") + FR-005 (failed registrado) -->

## Clarity

- [X] CHK006 A distinção entre modo inerte (sem config, nada exibido) e falha (configurado, `failed` visível) é inequívoca sem vazar detalhe de infraestrutura na interface? [Clarity, Spec §FR-004; SC-004] <!-- Evaluator: Covered by spec.md SC-004 + STF-003 resolution ("estado de envio é leitura informativa, não erro") + FR-004 ("nenhuma API ou tela MOSTRAR erro") -->
- [X] CHK007 O escopo do envio declara que nada além do aviso (sem marketing ou payload novo) sai por e-mail? [Clarity, Spec §Excluded] <!-- Evaluator: Covered by spec.md Excluded ("Modelos personalizados, marketing, push") + Key Entities (evento com destinatário e estado) -->

## Consistency

- [X] CHK008 O dedup declarado (registro gravado antes do envio, UNIQUE contrato × janela) é consistente com o abuso de reenvio/spam listado no risco? [Consistency, Spec §FR-002; Risks] <!-- Evaluator: Covered by spec.md FR-002 + SC-002 + Risk "Spam por reenvio" (dedup gravada antes do envio) -->
- [X] CHK009 A recusa de prestador no painel declarada aqui é a mesma da épica dona da rota (E005), sem guards novos divergentes? [Consistency, Spec §FR-003; plan.md AD-001] <!-- Evaluator: Covered by plan.md API Surface (mesmos guards de E005) + FR-003 (leitura existente) + CLAR Q2 -->
- [X] CHK010 A configuração opt-in exige apenas variáveis de ambiente, sem instalação, serviço ou dependência nova do lado do produto? [Consistency, Spec §Key Entities; plan.md Technical Context] <!-- Evaluator: Covered by spec.md Key Entities ("opt-in por variável de ambiente") + plan.md Primary Dependencies ("nenhuma dependência nova") + Signals (sem NEW-ENTITY) -->
