---
feature_branch: "00020-previsibilidade-financeira"
created: "2026-11-22"
input: "Avaliação V3 — canvas de valor, lacuna de previsibilidade financeira"
spec_type: "product"
spec_maturity: "clarified"
epic_id: "E018"
epic_sources: "{specs/avaliacao-valor-v3.md; reutiliza E001/E002/E004/E008/E013/E017}"
---

# Spec: Previsibilidade financeira por contrato

**Feature Branch**: `00020-previsibilidade-financeira` · **Created**: 2026-11-22 · **Status**: Clarified · **Spec Maturity**: clarified · **Epic ID**: E018

## Problem Statement

O produto prova o que foi executado, mas não quanto custou nem o que falta pagar. A avaliação V3 apontou previsibilidade financeira como a maior lacuna do canvas: valores vivem em planilhas, parcela vencida é descoberta tarde e E008 descreve serviços, não custos. Prorrogar ou encerrar um contrato hoje ignora a metade financeira.

## Scope

### Included

- Parcelas previstas (descrição, valor, vencimento) e pagamentos (valor, data, comprovante opcional via upload).
- Indicadores por contrato e no painel: previsto, pago, saldo e parcelas atrasadas.
- Exportação CSV e PDF pelo gerador de E008; alerta de parcela vencida no motor E004 com dedup.

### Excluded

- Integração bancária, gateway, NF-e (PDD-009), reajuste por índice (PDD-008).
- Lançamento contábil, impostos, centros de custo e moeda estrangeira.
- Acesso de prestador e visitante — deny-by-default E001.

### Edge Cases & Boundaries

- Pagamento maior que a parcela: 400 sem escrita; valor zero ou negativo: 400.
- Parcela de contrato encerrado continua consultável; não gera alerta novo.
- Comprovante inválido ou acima de 2 MB: 400 sem pagamento parcial.
- Exclusão de parcela com pagamento registrado: bloqueada; pagamento é imutável.
- Domínio divergente ou vínculo de prestador: 403.

## User Scenarios & Testing

### User Story 1 - Parcelas e pagamentos por contrato (Priority: P1)

O gestor cadastra as parcelas previstas de um contrato e registra cada pagamento, com valor, data e comprovante opcional.

**Why this priority**: base das outras histórias — sem lançamento não há previsto nem realizado.

**Acceptance Scenarios**:

1. **Given** contrato vigente, **When** o gestor cadastra três parcelas de R$ 4.000 e paga a primeira com comprovante, **Then** o saldo passa a R$ 8.000 e o comprovante fica ligado ao pagamento.
2. **Given** pagamento acima do valor da parcela, **When** enviado, **Then** responde 400 e nenhuma linha é gravada.

### User Story 2 - Indicadores e alerta de atraso (Priority: P1)

O painel mostra previsto, pago, saldo e parcelas atrasadas; parcela vencida sem pagamento vira alerta deduplicado.

**Why this priority`: transforma lançamento em decisão, o valor do canvas.

**Acceptance Scenarios**:

1. **Given** parcela vencida e não paga, **When** a varredura roda, **Then** o painel mostra o atraso e o alerta aparece uma vez mesmo após novas varreduras.
2. **Given** contrato encerrado, **When** a varredura roda, **Then** nenhum alerta novo é criado e o histórico consultável permanece.

### User Story 3 - Exportação financeira (Priority: P1)

O gestor exporta CSV e PDF com o resumo financeiro do contrato, usando os mesmos números do painel.

**Why this priority**: fecha a comprovação iniciada em E008.

**Acceptance Scenarios**:

1. **Given** parcelas e pagamentos, **When** exporta CSV e PDF, **Then** ambos trazem previsto, pago, saldo e situação por parcela.
2. **Given** prestador autenticado, **When** consulta ou exporta, **Then** recebe 403 sem vazamento.

### User Story 4 - Conciliação externa (Priority: P2)

Importar extrato bancário e conciliar pagamentos automaticamente.

**Why this priority**: depende de integração externa excluída por PDD-009.

**Acceptance Scenarios**:

1. **Given** extrato importado, **When** a conciliação roda, **Then** pagamentos correspondentes são associados com revisão humana.

## Requirements

### Functional Requirements

- **FR-064** [US1]: Sistema DEVE manter parcelas previstas por contrato com descrição, valor monetário positivo e data de vencimento, permitindo criação, leitura e exclusão apenas enquanto não houver pagamento ligado.
- **FR-065** [US1]: Sistema DEVE registrar pagamento por parcela com valor positivo, data e comprovante opcional via upload existente (2 MB, whitelist de tipo), na categoria `payment` distinta de `evidence`, `documentation` e `chat`.
- **FR-066** [US1]: Sistema DEVE rejeitar com 400, sem escrita parcial, pagamento acima do valor da parcela, valor não positivo, comprovante inválido e parcela de outro contrato ou domínio.
- **FR-067** [US2]: Sistema DEVE calcular por contrato previsto, pago, saldo e quantidade de parcelas atrasadas, e expor o agregado no payload de `GET /api/v2/dashboard/stats` sem alterar os campos existentes.
- **FR-068** [US2]: Sistema DEVE alimentar o motor E004 com alerta de parcela vencida e não paga, dedup por `(contract_id, source_kind, source_id)`, sem criar alerta para contrato encerrado e sem duplicar em varreduras repetidas.
- **FR-069** [US3]: Sistema DEVE exportar CSV e PDF do resumo financeiro do contrato com previsto, pago, saldo e situação por parcela, reutilizando os geradores de E008 e sem incluir anexos de chat.
- **FR-070** [US3]: Sistema DEVE restringir leitura e escrita financeira a admin e gestor do domínio; prestador e visitante recebem 403 em todos os endpoints e agregados.
- **FR-071** [US4]: Sistema PODE conciliar pagamentos de extrato externo com revisão humana. Permanece P2, fora do MVP: sem endpoint, tabela ou tela.

### Key Entities

- **Parcela**: linha prevista de um contrato com descrição, valor, vencimento e situação derivada dos pagamentos.
- **Pagamento**: liquidação total ou parcial de uma parcela, com valor, data e comprovante opcional; imutável após gravação.

## Assumptions & Risks

### Assumptions

- Valores em BRL sem conversão; arredondamento em centavos no backend.
- Guards E001, upload, motor E004 e geradores E008 são reutilizados sem alterar contratos.
- Admin herda permissões de gestor; system_admin e visitante ficam de fora.
- API em `/api/v2/*`, payloads em inglês e erros em português.

### Risks

- **Pagamento duplicado** *(likelihood: medium, impact: high)*: duas requisições gravam a mesma parcela. Mitigação: pagamento parcial por parcela com verificação de saldo restante e transação atômica.
- **Vazamento financeiro** *(likelihood: low, impact: high)*: prestador lê valores do contrato. Mitigação: guard por papel em rota e agregado, com casos negativos na suíte.
- **Alerta duplicado** *(likelihood: medium, impact: medium)*: varreduras repetidas criam vários alertas. Mitigação: dedup por tripla de origem no motor E004.

## Clarifications

### Session 2026-11-22 (AUTOPILOT)

- Q: Qual moeda e reajuste entram no MVP? -> A: BRL fixo, sem conversão e sem reajuste automático (PDD-008).
- Q: Pagamentos são integrados ou manuais? -> A: manuais, com comprovante opcional; nenhuma integração bancária (PDD-009).
- Q: Quem vê dados financeiros? -> A: somente admin e gestor; prestador e visitante recebem 403 em rotas e agregados.
- Q: Como tratar pagamento acima da parcela? -> A: 400 sem escrita; pagamento parcial permitido enquanto houver saldo, linha imutável.

## Stress-Test Findings

### Session 2026-11-22

STF-001: [concurrent-trigger-ambiguity] (HIGH) — Affected: FR-065, FR-066, SC-001 — Duas requisições podem pagar a mesma parcela além do valor. Resolução: verificação do saldo restante dentro da transação e 400 atômico se exceder.
STF-002: [cross-requirement-contradiction] (HIGH) — Affected: FR-067, FR-070, SC-003 — Agregado financeiro no dashboard pode vazar valores a prestadores. Resolução: guard por papel no agregado, campos ausentes para papéis não autorizados e teste negativo.
STF-003: [boundary-scale-stress] (MEDIUM) — Affected: FR-064, FR-068, SC-002 — Lançamento sem teto e alerta por parcela podem inflar a varredura. Resolução: limite de 500 parcelas por contrato e dedup por origem no motor E004.
STF-004: [constraint-impossibility] (MEDIUM) — Affected: FR-064, FR-065, FR-066, SC-001 — Excluir parcela com pagamento deixaria órfão. Resolução: exclusão bloqueada quando existe pagamento; comprovante e linha permanecem.
STF-005: [cross-requirement-contradiction] (MEDIUM) — Affected: FR-069, FR-065, SC-003 — Exportação financeira poderia incluir anexos de chat. Resolução: filtro explícito por categoria `payment` no gerador, com teste de exclusão.

## Implementation Signals

- `NEW-ENTITY`: `contract_installments` e `contract_payments` no schema por domínio, migração preguiçosa como E004.
- `NEW-API`: `/api/v2/contracts/:id/finance` (parcelas, pagamentos, resumo, export) sob guards E001.
- `NEW-UI`: seção financeira no detalhe do contrato e cards no painel, sobre `app_theme.dart`.
- `NEW-WORKER`: varredura de parcelas vencidas integrada ao `runDueSweep` de E004.

## Success Criteria

SC-001 [US1]: Três parcelas de R$ 4.000 com a primeira paga resultam em previsto R$ 12.000, pago R$ 4.000 e saldo R$ 8.000; pagamento acima do valor é 400 sem escrita.
SC-002 [US2]: Parcela vencida gera exatamente um alerta após três varreduras e aparece no painel; contrato encerrado não gera alerta.
SC-003 [US3]: CSV e PDF trazem os mesmos números do painel e nenhum anexo de chat; prestador recebe 403 em rota e agregado.
SC-004 [US1]: Comprovante inválido ou acima de 2 MB recebe 400 sem pagamento parcial; parcela com pagamento não pode ser excluída.
SC-005 [US4]: Sem integração externa, o MVP opera com pagamentos manuais e nenhuma chamada a gateway ou banco.

## Glossary

- **Parcela**: valor previsto de um contrato com vencimento.
- **Pagamento**: liquidação registrada de uma parcela, parcial ou total.
- **Saldo**: previsto menos pago, por contrato ou agregado.
