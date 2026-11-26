# Roadmap

Priorização por benefício ao usuário: primeiro o que reduz perda de prazo e
perda de documento, depois adoção, depois diferenciais. Esforço em S/M/L.
Prazos não são promessa, ordem é.

Base de pesquisa: `docs/resources.md` (set/2026) e
`docs/pesquisa-mercado-2026-11.md` (nov/2026, atualiza a anterior). Itens
R0–R6 preservam os IDs originais; R7–R12 são os novos desejos da pesquisa
de nov/2026.

## Status geral

| Item | Tema | Status |
|------|------|--------|
| R0 | Chat por contrato | Entregue — E016, QC PASS 2026-11-21 |
| R1 | Alertas de vigência + painel "vence primeiro" | Entregue — E004, E005, E010 |
| R2 | Central documental do contrato | Parcial — E019 entregue; trilha de alterações pendente |
| R3 | Onboarding de baixa fricção | Entregue — E020; HYP-002 aberta |
| R4 | Acompanhamento de prestadores | Pendente |
| R5 | Canais e automações | Pendente — WhatsApp e reajuste dependem de `PDD-008` |
| R6 | Mobile do prestador | Pendente — depende de `PDD-008` |
| R7 | Dossiê documental do prestador | Entregue — E021 |
| R8 | Régua de notificação (frequência e canal) | Reaberta no plano — E023 |
| R9 | Desempenho do prestador (nota e ocorrências) | Entregue — E024 |
| R10 | Checklist por tarefa | Pendente — novo, fecha lacuna da avaliação V3 |
| R11 | Itens P3 (versão, SLA, link de relatório, busca nos PDFs) | Pendente — novo da pesquisa nov/2026 |
| R12 | Agenda de manutenção preventiva recorrente | Entregue — E022 |

## Base: o que a pesquisa diz que mais vale

Pesquisa nov/2026 (`docs/pesquisa-mercado-2026-11.md`):

1. Dossiê documental do prestador: ASO, NRs e certidões com vencimento,
   alerta antes de vencer e bloqueio (novo eixo BR, não existia em set/2026).
2. Importar o acervo existente: planilha + PDFs em massa é etapa obrigatória
   de onboarding no mercado.
3. Manutenção preventiva recorrente que gera a tarefa sozinha.
4. Régua de notificação configurável, com WhatsApp como canal (padrão de ERP
   brasileiro, com preço público por mensagem).
5. Nota de desempenho por prestador (IDF/OTIF simplificado com ocorrências).

Pesquisa set/2026 (`docs/resources.md`), mantida como histórico: alertas
escalonados, repositório único, painel do que vence primeiro, obrigações como
tarefas, primeiro login com ganho visível.

## R0 — Chat por contrato — Entregue

Entregue como E016 (`specs/00017-chat-colaborativo-contrato`, QC PASS
2026-11-21): canal por contrato com mensagens, anexos, cards de
alertas/próximas/executadas e extrator local de prazos, multas, seguros,
riscos e local.

## R1 — Próximos vencimentos + alertas de vigência — Entregue

Entregue como E004 (motor de varredura, dedup e janelas), E005 (painel 90/60/
30/15) e E010 (e-mail opt-in), com aviso in-app por socket. O status
`atrasado` deixou de ser a única forma de descobrir o problema.

## R2 — Central documental do contrato — Parcial

- Biblioteca por contrato com os anexos já existentes (chat, tarefa, pagamento)
  com filtro e conferência: entregue como E019, feature
  `specs/00021-gestao-documental-contrato`, QC PASS em 2026-11-23.
- Ocorrências/comunicações: cobertas em essência pelo chat (E016).
- Trilha de alterações do contrato (quem mudou status/data, quando): segue
  pendente; a auditoria de acesso (E010/E011) não cobre mudança de cadastro.

## R3 — Onboarding de baixa fricção — Entregue

- Painel de vencimentos já populado no primeiro login: entregue (E005).
- Importação de planilha CSV/XLSX de contratos com mapeamento de colunas e
  upload em massa de PDFs: entregue como E020, Wave 11, feature
  `specs/00022-importacao-acervo`, QC PASS em 2026-11-24. `PDD-007` revisada;
  `HYP-002` segue aberta até validação com uso real.

## R4 — Acompanhamento de prestadores — Pendente

- Indicadores por prestador: contratos vinculados, tarefas em atraso,
  conclusão. Usa dados já existentes (`contract_providers`, tarefas).
- Kanban de execução por contrato (delighter citado em set/2026).
- Extensão nova: nota de desempenho ver R9.

## R5 — Canais e automações — Pendente

- ~~WhatsApp como canal de aviso~~ resolvido em `PDD-008` (2026-11-25): em vez
  de integração com WhatsApp, o usuário escolheu app próprio (Wave 16, E025)
  que carrega o app web e recebe as mensagens.
- Reajuste automático por IPCA/IGP-M/INPC e prorrogação como fluxo com alerta:
  mantido fora na revisão de `PDD-008` (2026-11-25); nenhum achado novo mudou
  o custo/benefício.

## R6 — App próprio do prestador (mobile) — Registrada (Wave 16)

- Revisada em `PDD-008` em 2026-11-25: vira a épica P2 E025 (Wave 16),
  substituindo a ideia de WhatsApp como canal.
- App que faz login e acessa os serviços web (Android é prioridade).
- Usa a câmera para as imagens do serviço realizado.
- Recebe notificações das tarefas atribuídas e stats das atribuições.
- Acessa documentos públicos das suas atribuições.
- Benefício: diferenciais; não bloqueia o uso principal. Esforço: M/L.

## R7 — Dossiê documental do prestador — Entregue

- Documentos por prestador e por trabalhador: ASO, treinamentos de NR,
  certidões e regularidade, com vigência individual.
- Alerta antes de vencer e bloqueio de vinculação/tarefa quando vencido.
- Evidência: sistemasgap, Apollus (NR-01), Insoft4, GWS — todos jul–nov/2026.
- Entregue como E021, Wave 12, feature `specs/00023-dossie-documental-do-prestador`,
  QC PASS em 2026-11-24. O checklist por finalidade ficou decidido na Clarify;
  `PDD-008` segue pendente e `HYP-002` aberta até uso real.
- Benefício: fecha o maior eixo novo da pesquisa; reduz risco trabalhista da
  contratante. Esforço: M/L. Depende de decisão de escopo: o que é
  obrigatório por tipo de serviço.

## R8 — Régua de notificação (frequência e canal) — Reaberta no plano

- As janelas 90/60/30/15 já são configuráveis (E004); falta régua no estilo
  cobrança: quantas vezes, em que momentos e por qual canal cada aviso sai,
  por domínio ou tipo de evento.
- Wave 14 reaberta no plano em 2026-11-25 (E023, spec
  `00025-regua-de-notificacao-configuravel`); implementação e QC preservados.
  O escopo preserva as janelas de E004 e os canais in-app e e-mail opt-in de
  E010; WhatsApp continua fora e depende da revisão de `PDD-008`.
- Evidência: Conta Azul, Woovi, ForSign, Nu Empresas (out–nov/2026).
- Benefício: elimina "lembrete único" como limite do motor atual. Esforço: M.

## R9 — Desempenho do prestador (nota e ocorrências) — Wave 15 registrada

- Nota periódica por prestador: pontualidade, conclusões no prazo e
  ocorrências registradas (modelo simplificado de IDF/OTIF).
- Usa dados de E003 (conclusão), E012 (aprovação/manutenção) e E017
  (indicadores do painel); sem tabela nova de avaliações manuais no MVP.
- Evidência: Petrobras IDF, EDP SPE, Enel SPI, oHub (OTIF).
- Benefício: renovação e reatribuição decididas com dado, não com memória.
  Esforço: M. Estende R4.
- Wave 15 concluída em 2026-11-25 como E024: nota derivada de E002/E003/E012/E017, sem tabela de avaliação manual. Leitura para admin e gestor; prestador não acessa a nota nesta épica.

## R10 — Checklist por tarefa — Pendente (novo, nov/2026)

- Formulário por tipo de serviço com itens obrigatórios e evidência por
  resposta (foto, assinatura, observação), preenchido na conclusão.
- Fecha a lacuna "checklists de conformidade" da avaliação V3
  (`specs/avaliacao-valor-v3.md`).
- Evidência: SafetyCulture, Geosite (15 tipos de campo), Checkmob; Capterra
  2026: compliance tracking entre os recursos mais valorizados.
- Benefício: padroniza a prova de execução além da foto final. Esforço: M.

## R11 — Itens P3 — Pendente (novo, nov/2026)

- Versão de documentos do contrato (aditivos versionados, comparação).
- SLA configurável por contrato (prazo de resposta por etapa).
- Link de relatório compartilhável com cliente/diretoria.
- Busca no conteúdo dos PDFs anexados (hoje só metadados, FR-016).
- Cada item em S; só entra se houver demanda registrada.

## R12 — Agenda de manutenção preventiva recorrente — Entregue

- Recorrência por contrato ou tipo de serviço que cria a tarefa na data certa, com aviso antecedente e geração idempotente.
- Terceiro item da pesquisa nov/2026, classificado como `Alto`: hoje E012 registra a manutenção, mas a recorrência depende da memória de alguém.
- Reaproveita `tasks` (E003), manutenção (E012) e o motor de alertas (E004); sem dependência de `PDD-008`.
- Entregue como E022, Wave 13, feature `specs/00024-agenda-de-manutencao-preventiva-recorrente`, QC PASS em 2026-11-24. Esforço: M.

## Decisões a revisar antes de implementar

- ~~`PDD-007` (importação CSV, R3)~~ revisada em 2026-11-23: importação
  aprovada pelo usuário e registrada como Wave 11 (E020). `HYP-002` segue
  aberta até validação com uso real.
- ~~`PDD-008` (WhatsApp, reajuste, mobile: R5 e R6)~~ revisada em 2026-11-25:
  WhatsApp como canal de terceiro e reajuste automático permanecem fora; o
  usuário escolheu app próprio (carrega o app web e recebe mensagens) no lugar
  do WhatsApp, e mobile (R6) entrou como épica P2 — E025 na Wave 16.
- `PDD-009` (assinatura ICP-Brasil): segue válida; assinatura continua
  integração com parceiro.

## Fora de escopo

Fiscal/NFS-e, empenho e Lei 14.133 (contratos públicos), redação e workflow
jurídico de cláusulas, assinatura eletrônica ICP-Brasil (integrar parceiro,
não construir), IA generativa externa (o extrator local determinístico de
E016 atende; o mercado exige revisão humana em 92% dos casos).

## Já coberto (não reescrever)

Domínios multi-tenant e papéis admin/gestor/prestador/visitante
(E001, E015), contrato com vigência, prorrogação, encerramento e perpétuo
(E002, E017), tarefas com fluxo, conclusão com foto, reabertura, aprovação e
manutenção (E003, E012), motor de alertas com dedup e janelas (E004), painel
de próximos vencimentos (E005), painéis por tema escuro e redesign
(E006, E013, E014), busca e filtros (E007), relatórios PDF/CSV (E008), tempo
real (E009), e-mail opt-in (E010), auditoria e classificação (E011), chat por
contrato com extração local (E016), indicadores do painel (E017),
financeiro com parcelas, pagamentos e alerta de atraso (E018), gestão
documental do contrato (E019), importação de acervo (E020), dossiê documental
do prestador (E021) e agenda de manutenção preventiva recorrente (E022).
