# Roadmap

Priorização por benefício ao usuário: primeiro o que reduz perda de prazo e
perda de documento, depois adoção, depois diferenciais. Esforço em S/M/L.
Prazos não são promessa, ordem é.

Base de pesquisa: `docs/resources.md` (set/2026) e
`docs/pesquisa-mercado-2026-11.md` (nov/2026, atualiza a anterior). Itens
R0–R6 preservam os IDs originais; R7–R11 são os novos desejos da pesquisa
de nov/2026.

## Status geral

| Item | Tema | Status |
|------|------|--------|
| R0 | Chat por contrato | Entregue — E016, QC PASS 2026-11-21 |
| R1 | Alertas de vigência + painel "vence primeiro" | Entregue — E004, E005, E010 |
| R2 | Central documental do contrato | Em execução — E019 (`specs/00021-gestao-documental-contrato`) |
| R3 | Onboarding de baixa fricção | Wave 11 registrada — E020 (importação de acervo); `PDD-007` revisada em 2026-11-23 |
| R4 | Acompanhamento de prestadores | Pendente |
| R5 | Canais e automações | Pendente — WhatsApp e reajuste dependem de `PDD-008` |
| R6 | Mobile do prestador | Pendente — depende de `PDD-008` |
| R7 | Dossiê documental do prestador | Wave 12 registrada — E021 (documentos, vigências e bloqueio) |
| R8 | Régua de notificação (frequência e canal) | Pendente — novo da pesquisa nov/2026 |
| R9 | Desempenho do prestador (nota e ocorrências) | Pendente — novo, estende R4 |
| R10 | Checklist por tarefa | Pendente — novo, fecha lacuna da avaliação V3 |
| R11 | Itens P3 (versão, SLA, link de relatório, busca nos PDFs) | Pendente — novo da pesquisa nov/2026 |

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

## R2 — Central documental do contrato — Em execução

- Biblioteca por contrato com os anexos já existentes (chat, tarefa, pagamento)
  com filtro e conferência — E019 em execução, feature
  `specs/00021-gestao-documental-contrato`.
- Ocorrências/comunicações: cobertas em essência pelo chat (E016).
- Trilha de alterações do contrato (quem mudou status/data, quando): segue
  pendente; a auditoria de acesso (E010/E011) não cobre mudança de cadastro.

## R3 — Onboarding de baixa fricção — Parcial

- Painel de vencimentos já populado no primeiro login: entregue (E005).
- Importação de planilha CSV/XLSX de contratos com mapeamento de colunas e
  upload em massa de PDFs: aprovada pelo usuário em 2026-11-23 como Wave 11
  (E020, `specs/plan/E020.md`). `PDD-007` revisada; `HYP-002` segue aberta até
  validação com uso real.

## R4 — Acompanhamento de prestadores — Pendente

- Indicadores por prestador: contratos vinculados, tarefas em atraso,
  conclusão. Usa dados já existentes (`contract_providers`, tarefas).
- Kanban de execução por contrato (delighter citado em set/2026).
- Extensão nova: nota de desempenho ver R9.

## R5 — Canais e automações — Pendente

- WhatsApp como canal de aviso: padrão de ERP brasileiro em nov/2026 (Conta
  Azul, Woovi, Nu Empresas) com preço público por mensagem. Depende de
  revisão de `PDD-008`.
- Reajuste automático por IPCA/IGP-M/INPC e prorrogação como fluxo com alerta:
  segue adiado por `PDD-008`; nenhum achado novo mudou o custo/benefício.

## R6 — Mobile (prestador) — Pendente

- App que faz login e acessa os serviços web (Android é prioridade).
- Usa a câmera para as imagens do serviço realizado.
- Recebe notificações das tarefas atribuídas e stats das atribuições.
- Acessa documentos públicos das suas atribuições.
- Depende de `PDD-008`. Benefício: diferenciais; não bloqueia o uso principal.
  Esforço: M/L.

## R7 — Dossiê documental do prestador — Pendente (novo, nov/2026)

- Documentos por prestador e por trabalhador: ASO, treinamentos de NR,
  certidões e regularidade, com vigência individual.
- Alerta antes de vencer e bloqueio de vinculação/tarefa quando vencido.
- Evidência: sistemasgap, Apollus (NR-01), Insoft4, GWS — todos jul–nov/2026.
- Registrada como Wave 12 (E021, `specs/plan/E021.md`) em 2026-11-23.
- Benefício: fecha o maior eixo novo da pesquisa; reduz risco trabalhista da
  contratante. Esforço: M/L. Depende de decisão de escopo: o que é
  obrigatório por tipo de serviço.

## R8 — Régua de notificação (frequência e canal) — Pendente (novo, nov/2026)

- As janelas 90/60/30/15 já são configuráveis (E004); falta régua no estilo
  cobrança: quantas vezes, em que momentos e por qual canal cada aviso sai,
  por domínio ou tipo de evento.
- WhatsApp entra aqui como canal, condicionado à revisão de `PDD-008`.
- Evidência: Conta Azul, Woovi, ForSign, Nu Empresas (out–nov/2026).
- Benefício: elimina "lembrete único" como limite do motor atual. Esforço: M.

## R9 — Desempenho do prestador (nota e ocorrências) — Pendente (novo, nov/2026)

- Nota periódica por prestador: pontualidade, conclusões no prazo e
  ocorrências registradas (modelo simplificado de IDF/OTIF).
- Usa dados de E003 (conclusão), E012 (aprovação/manutenção) e E017
  (indicadores do painel); sem tabela nova de avaliações manuais no MVP.
- Evidência: Petrobras IDF, EDP SPE, Enel SPI, oHub (OTIF).
- Benefício: renovação e reatribuição decididas com dado, não com memória.
  Esforço: M. Estende R4.

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

## Decisões a revisar antes de implementar

- ~~`PDD-007` (importação CSV, R3)~~ revisada em 2026-11-23: importação
  aprovada pelo usuário e registrada como Wave 11 (E020). `HYP-002` segue
  aberta até validação com uso real.
- `PDD-008` (WhatsApp, reajuste, mobile: R5 e R6): rejeitada em 2026-09-26;
  WhatsApp voltou como padrão de mercado BR.
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
financeiro com parcelas, pagamentos e alerta de atraso (E018).
