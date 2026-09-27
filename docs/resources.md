https://www.contraktor.com.br/clm-agentes-de-ia?utm_source=GoogleADS&utm_medium=PMAX&utm_campaign=CLM&utm_term=clm1&utm_content=nosignalV2&utm_device=c&utm_source=google&utm_medium=cpc&utm_campaign=CK-Pmax-leads_&gad_source=1&gad_campaignid=23097218875&gbraid=0AAAABAMwX2DQF_Wu9Yy33N4RNaUvir1-F&gclid=Cj0KCQjw2t3VBhD8ARIsAK0F6qzai7T2j7tKmPFyAN_35Jm5s4njsaBLTiDF_66oDrqaEMOq-SEBXNwaAvinEALw_wcB

## Pesquisa: desejos de quem busca um sistema de gestão de contratos (set/2026)

Base: 2 vídeos (Lauren Juliê | Papo de Contratualista), blogs de vendors BR
(Projuris, Contraktor, Sispro, AB-Contract), reviews Capterra/G2, fóruns
Reddit e referências internacionais sobre sair do Excel. Fontes completas no
final.

### Veredito

A demanda converge em três eixos:

1. **Não perder prazo** — alertas escalonados de vigência, renovação e reajuste.
2. **Não perder documento** — contrato + anexos + versões + histórico num lugar só.
3. **Saber quem deve o quê** — obrigações do contrato viram tarefas com
   responsável e prazo.

Assinar e arquivar não é gerir: é transformar o documento assinado em
obrigações, prazos e responsáveis que precisam ser acompanhados.

### Top desejos por criticidade

| # | Desejo | Severidade |
|---|--------|-----------|
| 1 | Alertas escalonados de vencimento/renovação/reajuste (janelas 90/60/30/15 dias) | Crítico |
| 2 | Repositório único: contrato + anexos + versões assinadas | Crítico |
| 3 | Status de vigência claros + painel do que vence primeiro | Crítico |
| 4 | Obrigações viram tarefas com responsável e prazo | Crítico |
| 5 | Histórico de comunicações, ocorrências e alterações | Desejável |
| 6 | Busca rápida por contrato, fornecedor e conteúdo | Desejável |
| 7 | Relatórios e indicadores exportáveis (PDF/CSV) | Desejável |
| 8 | Notificação por e-mail + WhatsApp (26% dos BRs preferem WhatsApp para lembretes, MoEngage) | Desejável |
| 9 | Visão e permissões por papel (gestor x admin x prestador) | Desejável |
| 10 | Assinatura eletrônica com validade jurídica (ICP-Brasil) | Bônus, integrar |

Delighters: Kanban da execução, timeline de marcos, reajuste automático
IPCA/IGP-M/INPC, extração de dados do PDF por IA, mobile, importação de CSV.

### Dores recorrentes

- A planilha não avisa: o prazo depende de alguém abrir o arquivo na data certa.
- Renovação automática sem janela de denúncia gera cobrança indevida (CDC discute isso).
- Contratos espalhados em e-mail, pastas e drives: "múltiplas verdades" sobre a base.
- Controle pessoal, não institucional: sai o responsável, sai o controle.
- Dificuldade para provar e cobrar sem histórico e anexos.
- Relatório que não sai na hora; reviews reclamam de indicadores genéricos.
- Ferramentas complexas não são adotadas: quem evalua foge de setup pesado.

### Gaps do nosso app (mapeamento sobre o escopo atual)

Coberto hoje: contratos com datas/status vigente/atrasado/encerrado; tarefas
por contrato com `due_date`; e-mail de tarefa (FR-017, `runDueSweep` horário,
inerte sem SMTP_*); busca (FR-016); relatórios PDF/CSV; papéis; tempo real
(socket, FR-020); multi-tenant por domínio.

Falta, em ordem de criticidade:

1. Alertas proativos de **vigência de contrato** em janelas configuráveis (o
   sweep atual só cobre vencimento de tarefa, não de contrato).
2. Anexos e ocorrências no nível do **contrato** (hoje só tarefa tem anexos, FR-015).
3. Importação de planilha CSV (barreira de adoção nº 1 de quem sai do Excel).
4. Painel "próximos vencimentos" no dashboard.
5. Reajuste automático por índice; prorrogação como fluxo com alerta.
6. Indicadores por prestador; WhatsApp; mobile.

Fora de escopo: fiscal/NFS-e, empenho e Lei 14.133 (público), redação e
workflow jurídico de cláusulas, assinatura ICP-Brasil (integrar, não
construir), IA de extração de cláusulas.

### Recomendações (top 3 por benefício)

1. **Motor de alertas escalonados por contrato** (e-mail + in-app, janelas
   90/60/30/15). Desejo nº 1 em todas as fontes; é o motivo declarado de sair
   da planilha. Sem isso, `atrasado` só aparece quando já é prejuízo.
2. **Central documental por contrato**: anexos do PDF assinado e aditivos +
   histórico de ocorrências. Mata "o contrato que some" e "dificuldade para
   cobrar o que foi combinado"; é pré-requisito de confiança.
3. **Onboarding de baixa fricção**: importar CSV + painel de vencimentos já
   populado. Quem migra do Excel precisa ver o ganho no primeiro login.

### Fontes principais

- Vídeos: youtube.com/watch?v=n-CNtBzvaeE (Guia para iniciantes, 17/03/2026),
  youtube.com/watch?v=lD98MkeKN88 (acompanhar a execução, 18/02/2026),
  canal @laurenjulieadvogada. Transcrições bloqueadas; usamos as descrições.
- BR: projuris.com.br (pain points, sinais de má gestão), contraktor.com.br,
  sispro.com.br/alerta-de-prazos, contractcenter.app (alertas 90/60/30/15,
  WhatsApp, IPCA, CSV), startgov.com.br (kanban, alertas progressivos),
  bndes.gov.br e fornecedores.caixa.gov.br (portais de fornecedor),
  jusbrasil.com.br (renovação automática e CDC), TCU (prorrogação, 14.133).
- Reviews/fóruns: capterra ContractWorks/ContractZen/Contractify/Gatekeeper,
  g2.com/contractbook, reddit r/SaaS, r/procurement, r/ITManagers, r/CRM.
- Excel/CLM: lumipact.com, contractlogix.com, onit.com, cobblestonesoftware.com.

Limitações: comentários e transcrições do YouTube inacessíveis; reviews
majoritariamente de ferramentas internacionais; números de vendor blog são
indicação qualitativa, não estatística.
