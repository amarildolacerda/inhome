# Pesquisa de mercado — nov/2026

**Data**: 2026-11-23
**Relação com artefatos existentes**: atualiza `docs/resources.md` (set/2026) como fonte corrente de desejos de usuário; complementa `specs/avaliacao-valor-v3.md` (avaliação entregas × canvas).
**Método**: buscas web abertas em nov/2026 sobre gestão de contratos (BR e internacional), reviews de usuários (Capterra, G2), gestão de terceiros/SST, field service e canais de notificação. Cada afirmação traz a fonte. Sem telemetria do próprio produto e sem entrevistas com usuários reais: tudo aqui é evidência de mercado, não validação de uso.

## Veredito

O mercado mudou de foco desde set/2026: o valor migrou para **depois da assinatura** (obrigações, renovações, dados que viram decisão), e no Brasil o tema que mais cresceu entre fornecedores do setor é **conformidade documental de terceiros** (ASO, NRs, certidões) com alerta de vencimento e bloqueio de acesso.

Três eixos seguem válidos da pesquisa anterior: não perder prazo, não perder documento, saber quem deve o quê. O que é **novo** nesta rodada:

1. **Dossiê documental do prestador** — o contrato não basta: cada trabalhador terceirizado precisa de ASO, treinamento de NR e certidões vigentes, com aviso antes de vencer.
2. **Migração do acervo existente** — importar a planilha e os PDFs é tratado pelo mercado como etapa obrigatória de onboarding, não como recurso opcional.
3. **Recorrência da manutenção preventiva** — agenda que gera a tarefa sozinha, sem depender da memória de ninguém.
4. **Régua de notificação configurável e WhatsApp como canal** — padrão já ofertado por ERPs brasileiros (Conta Azul, Woovi, Nu Empresas), inclusive com preço por mensagem público.
5. **Avaliação de desempenho por prestador** — nota periódica com ocorrências (IDF/SPI/OTIF) é prática consolidada em compras e sobrancelha sobre o contrato.

## O que o mercado confirma e já entregamos

| Sinal de mercado | Fonte | Status no produto |
|---|---|---|
| Alertas de vigência em janelas antes do vencimento | Pramata 2026 (23% querem obrigações aparecerem antes do problema); Projuris abr/2026 | Entregue (E004, E005): janelas 90/60/30/15, in-app + e-mail |
| Repositório único com busca rápida | Pramata 2026: 61% guardam contratos em 4+ lugares, só 11% respondem em minutos; ADoc mar/2026 | Entregue (E001, E006): domínio isolado, busca e filtros |
| Execução com evidência e trilha de auditoria | Capterra 2026: audit trail entre os recursos mais valorizados; Intelagree 2026 | Entregue (E003, E011, E012): conclusão com fotos, reabertura justificada, histórico |
| Chat/colaboração por contrato | Intelagree 2026: colaboração interna entre top 3 de prioridade | Entregue (E016) |
| Controle de pagamentos e valor comprometido | MGI 360 2026: valor pós-assinatura é onde está o retorno | Entregue (E018): parcelas, pagamentos, indicadores, alerta de atraso |
| Extração automática de datas e cláusulas com revisão humana | Conga 2026: 92% exigem revisão humana da IA; ISG nov/2026 | Entregue (E016): extrator local determinístico, sem IA externa |

## Novos desejos de usuário (nov/2026)

| # | Desejo | Severidade | Evidência principal | No produto hoje |
|---|---|---|---|---|
| 1 | Dossiê documental do prestador: ASO, NRs, certidões, com vencimento e alerta | Crítico (novo eixo BR) | sistemasgap jul/2026; Apollus jun/2026 (NR-01); Insoft4 out/nov/2026; GWS out/2026 | Ausente: vínculo prestador existe (E002), sem controle documental |
| 2 | Importar acervo existente (planilha + PDFs em massa, mapeamento de colunas) | Crítico | Bind jan/2026 (guia Excel→CLM); Tomorro, ProcureDesk, Conexa: importação como rotina; HYP-002 aberta desde set/2026 | Ausente: PDD-007 adiou CSV |
| 3 | Manutenção preventiva recorrente que gera a tarefa sozinha | Alto | Geosite, Opserax, Field Control: recorrência automática de OS | Parcial: manutenção registra estado (E012), sem agenda recorrente |
| 4 | Régua de notificação configurável (janelas, canais, frequência) | Alto | Conta Azul (régua por perfil, 9h, dias úteis); Woovi (até 5 lembretes por fase); Projuris abr/2026 pede alertas para vencimento, renovação, reajuste, denúncia, entrega e assinatura | Parcial: janelas fixas 90/60/30/15 no motor de alertas |
| 5 | WhatsApp como canal de lembrete | Alto | Conta Azul R$ 0,60/msg; Nu Empresas set/2026; ForSign; Receita Federal: lembretes automáticos elevaram 9% os pagamentos em dia de MEI | Ausente: PDD-008 rejeitou (R5) |
| 6 | Avaliação de desempenho do prestador (nota, SLA, ocorrências) | Médio | Petrobras IDF (5 macrocritérios, escala 1–6); EDP SPE; Enel SPI; oHub: OTIF e índice de não conformidade | Parcial: KPIs por status (E013, E017), sem nota por prestador |
| 7 | Checklist/formulário por tarefa (campos foto, assinatura, lógica condicional) | Médio | SafetyCulture, Geosite (15 tipos de campo), Checkmob; Capterra: compliance tracking entre os recursos mais valorizados | Ausente: lacuna "checklists de conformidade" da avaliação V3 |
| 8 | Versão de documentos do contrato (aditivos versionados, diff) | Médio | Capterra 2026: version control no top de recursos; ADoc mar/2026; ContractSafe: comparação lado a lado é desejo recorrente | Parcial: histórico de tarefas versiona estados, não documentos (V3) |
| 9 | Modo offline e app de campo para o prestador | Médio (delighter) | Geosite, Sodtrack, Checkmob, Opserax: offline é padrão de categoria em FSM | Ausente: Flutter Web exige conexão |
| 10 | SLA contratual configurável (prazo de resposta por etapa) | Baixo hoje | Projuris set/2026; ISG nov/2026: obligation tracking é a capacidade mais sub-atendida | Parcial: sem meta de prazo por contrato |
| 11 | Link de relatório compartilhável com o cliente/diretoria | Baixo | Opserax: "link de relatório em um clique" | Ausente: só exportação PDF/CSV (E008) |
| 12 | Busca dentro do conteúdo dos PDFs anexados | Baixo | Capterra: full-text search no top de recursos; ContractSafe: OCR como diferencial | Parcial: busca em metadados (FR-016); extração cobre só documentos enviados ao chat |

## Reclamações de usuário que devemos evitar

- Curva de aprendizado íngreme e configuração pesada (Conga, Webdox): adoção cai quando o setup é longo. Nosso diferencial declarado é implantação local simples.
- Permissões rígidas para o operador do dia a dia (Webdox, Juro): o papel que usa a ferramenta todo dia precisa conseguir executar sem pedir admin.
- Sistema de notificação fraco ou lembrete de renovação ausente (ContractHero, Contractbook): cobrança inesperada por renovação automática é a reclamação mais cara da categoria.
- Dashboard pobre em gráficos de próximas renovações (ContractSafe): o painel precisa responder "o que vence primeiro" sem exportar.
- lentidão com arquivos grandes (ContractSafe, Juro): upload de PDF pesado precisa de limite e progresso claros.

## Candidatos a requisito (priorização sugerida)

1. **P1 — Importação de acervo**: XLSX/CSV com mapeamento de colunas + upload em massa de PDFs assinados, com prévia e confirmação antes de gravar. Reabre `PDD-007` (HYP-002).
2. **P1 — Dossiê documental do prestador**: documentos por prestador e por trabalhador (ASO, NR, certidões) com vigência, alerta antes de vencer e bloqueio de vinculação/tarefa quando vencido. Tema novo: exige decisão de escopo (o que é obrigatório por tipo de serviço).
3. **P2 — Agenda de manutenção preventiva**: recorrência por contrato/tipo de serviço que cria tarefas automaticamente na data certa.
4. **P2 — Régua de notificação configurável**: janelas e frequência por domínio/contrato, mantendo o motor de alertas atual.
5. **P2 — WhatsApp como canal** (com custo por mensagem configurado): reabre `PDD-008`.
6. **P2 — Nota de desempenho por prestador**: pontualidade, ocorrências e conclusões no prazo viram nota visível no vínculo.
7. **P2 — Checklist por tarefa**: formulário com itens obrigatórios e evidência por resposta (fecha a lacuna de checklists da avaliação V3).
8. **P3 — Versão de documentos do contrato**, **SLA configurável**, **modo offline do prestador**, **link de relatório**, **busca no conteúdo dos PDFs**.

## Decisões que precisam de revisão explícita antes de implementar

- `PDD-007`: importação CSV adiada em 2026-09-26; a evidência de nov/2026 reforça que é barreira de adoção.
- `PDD-008`: WhatsApp, reajuste automático por índice e mobile rejeitados; WhatsApp voltou como padrão de mercado BR.
- `PDD-009`: assinatura ICP-Brasil segue fora de escopo; o mercado trata assinatura como commodity, integração com parceiro continua sendo a saída correta.

Reajuste automático por índice (IPCA/IGP-M/INPC) segue fora: nenhum achado novo desta rodada mudou o custo/benefício para o MVP, e `PDD-008` permanece válido até decisão contrária.

## Fora de escopo mantido

- Contratos públicos, NFS-e, Lei 14.133, empenho (`PDD-009`).
- Redação e workflow jurídico de cláusulas: o produto é gestão pós-assinatura.
- IA generativa externa: o extrator local determinístico atende aos dados que usamos, e o mercado confirma que 92% das organizações exigem revisão humana (Conga 2026).
- Integração ERP/CRM/portal de fornecedor: sem demanda registrada neste repositório.

## Fontes principais

- Tendências e dados: pramata.com/blog/5-contract-lifecycle-management-trends-to-know/ (Contract Intelligence Index 2026, 450+ líderes); intelagree.com (CLM Trends 2026, 50+ GCs); mgiresearch.com (CLM Top 35 2026); isg-one.com (Buyers Guide CLM 2026, nov/2026); conga.com (AI in Contracts 2026, 250 profissionais); gminsights.com (mercado CLM US$ 1,43 bi em 2026).
- BR: projuris.com.br (software de gestão de contratos 2026, set/2026; 10 problemas, abr/2026); contraktor.com.br (guia CLM, abr/2026; 11 problemas, out/2025); adoc.com.br (mar/2026); legalcontrol.com.br; capterra.com.br (Webdox, Conga, ContractSafe, netLex); g2.com (ContractSafe, ContractHero, Contractbook).
- Gestão de terceiros/SST: sistemasgap.com.br (jul/2026); apollusehs.com.br (NR-01, jun/2026); greatworksafety.com.br (out/2026); insoft4.com.br (GT Soft, estruturação e multicontrato, out/nov/2026); portalnr1.com.br (jun/2026); efcaz.com.br (jul/2026).
- Campo e recorrência: geosite.com.br; opserax.com; store.omie.com.br (Field Control); sodtrack.com; checkmob.com; officetrack.trescon.com.br.
- Notificação: ajuda.contaazul.com (régua de lembretes, nov/2026); ajuda.woovi.com (out/2026); blog.nubank.com.br (set/2026); forsign.digital (out/2026); blog.meujames.com (fev/2026, dado da Receita Federal).
- Migração/importação: bindlegal.com (guia Excel→CLM jan/2026 e bulk import out/2026); help.tomorro.com; help.procuredesk.com; ajuda.conexa.app; juro.com/learn/contract-migration; contractlogix.com.
- Desempenho de fornecedores: canalfornecedor.petrobras.com.br (IDF); edp.com (SPE); globalprocurement.enel.com (SPI); base.ohub.com.br (OTIF); wa.gov.au (supplier performance KPIs).

## Limitações

- Sem acesso a usuários reais do produto: os desejos são de compradores e usuários de ferramentas parecidas, não do nosso usuário final.
- Reviews de Capterra/G2 misturam produtos internacionais e brasileiros; o peso das fontes BR é qualitativo.
- Números de vendor em blog são indicação, não estatística; os únicos dados quantitativos com amostra declarada são Pramata (450+), Intelagree (50+), Conga (250) e Capterra (reviews verificadas do último ano).
- Reajuste automático, assinatura e integrações não receberam achado novo suficiente para mudar decisões já registradas.
