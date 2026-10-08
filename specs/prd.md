---
document_type: product-requirements
product: "Gestão de Contratos de Terceiros"
created: 2026-09-26
updated: 2026-09-26
prd_maturity: planning-ready
---

# Product Requirements Document: Gestão de Contratos de Terceiros

> Canonical Product Document

## Product Overview

Sistema de administração de contratos de terceiros com gestão por contrato: cada cliente (domínio) opera isolado, com seus contratos, usuários e finalidades próprios. O produto reúne prazo, execução e prova num lugar só — o gestor cria o contrato, vincula prestadores e distribui tarefas; o prestador conclui documentando o que fez com texto e fotos; o administrador cuida de usuários, finalidades e andamento.

O valor entregue é prazo visível antes do vencimento, histórico que comprova a execução e responsabilidade que não sai junto com a pessoa.

## Vision and Why Now

A administração de contratos de terceiros ainda vive em planilhas e pastas: o prazo depende de alguém abrir o arquivo na data certa e a prova do que foi feito fica espalhada em e-mail e drive. A pesquisa de set/2026 (EVD-002) converge em três eixos — não perder prazo, não perder documento e saber quem deve o quê — e coloca o alerta de vigência como o desejo número um.

A base do produto já está entregue e validada (EVD-004, EVD-005), então este é o momento de transformar registro em aviso: a primeira release deixa de apenas controlar e passa a avisar antes do prejuízo.

## Problem Statement

Quem administra contratos de terceiros perde prazo e perde documento. A planilha não avisa: o vencimento só aparece quando já é prejuízo, e renovação automática sem janela de denúncia gera cobrança indevida. Contrato, aditivo e evidência de execução ficam em lugares diferentes, então várias versões da mesma verdade convivem sobre a mesma base.

A responsabilidade é pessoal: sai o responsável, sai o controle. Sem histórico e anexos, provar e cobrar o que foi combinado é trabalhoso e o relatório não sai na hora.

Sem ação, a empresa continua pagando período em que não usou, discute prestação de serviço sem prova e redescobre o próprio contrato a cada demanda.

## Background and Evidence

Evidência observada no repositório:

- **EVD-001** (observada, alta): escopo aprovado pelo owner em 2026-09-22 — visão, entidades, regras de negócio e limites do MVP.
- **EVD-004** (observada, alta): base entregue — 33 das 34 tarefas da primeira feature concluídas; resta uma pendência de acessibilidade e bootstrap web (T031).
- **EVD-005** (observada, alta): validação fim a fim 28/28 no stack publicado e 16/16 verificações de fumaça.
- **EVD-006** (observada, alta): 35 testes unitários verdes como gate de promoção.
- **EVD-007** (observada, alta): capacidades já implementadas — ciclo de domínio, usuários, finalidades, contrato, tarefa, comentários, anexos, busca, painel, e-mail e relatório.
- **EVD-008** (observada, alta): governança — implantação local, armazenamento por domínio, uploads em disco e promoção apenas com testes verdes.
- **EVD-009** (observada, alta): README — papéis, matriz de permissões e fluxo prático em cinco passos.

Evidência externa e de pesquisa:

- **EVD-002** (externa, média): pesquisa set/2026 com vídeos, blogs de fornecedores brasileiros, reviews e fóruns — três eixos de valor e os dez desejos mais citados, com alertas de vigência em primeiro lugar.
- **EVD-003** (observada, alta): roadmap com priorização por benefício e lista do que já está coberto.
- **EVD-010** (reportada, média): limitações da pesquisa — reviews majoritariamente internacionais e números de fornecedores qualitativos.

Evidência × hipótese: as afirmações de adoção e de compra não têm fonte local. `HYP-001` (alertas são o principal valor pago), `HYP-002` (importar planilha é a barreira de adoção), `HYP-003` (gestor é o usuário diário primário), `HYP-004` (implantação local atende os primeiros usuários) e `HYP-005` (comprador é o responsável pela operação em empresa de médio porte) permanecem abertas. A pesquisa externa foi dispensada nesta sessão por decisão explícita (PDD-001); nenhuma dessas hipóteses pode ser apresentada como consenso de mercado.

## Target Users, Stakeholders, and Core Personas

### Target Users

- Gestor de contrato — usuário primário diário; administra contratos, vincula prestadores, distribui e reabre tarefas.
- Prestador de serviço — executa e conclui tarefas com texto e fotos; maior frequência entre os executores.
- Administrador de domínio — gerencia usuários e o dicionário de finalidades do próprio cliente.
- system_admin da plataforma — habilita e suspende domínios; nunca acessa dados de contrato ou tarefa.

### Stakeholders

- Owner do projeto — aprova escopo e promoção; consenso explícito registrado apenas sobre o MVP aprovado em 2026-09-22 (EVD-001). As prioridades do roadmap seguem como visão individual, sem aprovação registrada (EVD-003).
- Comprador / decisor de compra — não identificado em nenhuma fonte local; tratado como hipótese `HYP-005`, sem consenso registrado.
- Usuários dos quatro papéis — visões registradas como evidência de uso (EVD-009), não como acordo formal.

### Core Personas

- **Gestor de contratos**: quer ver o que vence primeiro e provar o que foi feito; trabalha com vários contratos em paralelo; a dor é descobrir o atraso tarde demais e reconstruir histórico sob consulta.
- **Prestador de serviço**: quer clareza do que fazer e registrar a conclusão sem burocracia; a dor é conclusão cobrada depois sem evidência do que aconteceu.
- **Administrador de domínio**: quer manter pessoas e finalidades organizadas sem depender de suporte; a dor é controle pessoal que se perde quando alguém sai.

## User Needs / Jobs To Be Done

- Quando um contrato se aproxima do fim, avise-me com antecedência suficiente para decidir prorrogar ou encerrar.
- Quando alguém perguntar o que foi feito, mostre tarefa, execução, executor, data e fotos num documento só.
- Quando eu assumir um contrato ou substituir um colega, o histórico esteja no contrato e não na memória de alguém.
- Quando eu precisar saber quem deve o quê, cada obrigação tenha responsável e prazo.
- Quando eu procurar um contrato, fornecedor ou conteúdo, ache rápido sem abrir planilha paralela.
- Quando o time trabalhar ao longo do dia, a tela dos outros acompanhe sem recarregar.

## Product Principles or UX Principles

- **Aviso antes do prejuízo**: contrato atrasado é falha de alerta, não forma de gestão; o estado `atrasado` existe como lastro, não como rotina.
- **Evidência junto da execução**: conclusão sem documentação não existe; texto é obrigatório e fotos sustentam a prova.
- **Isolamento por domínio**: nada de um cliente aparece para outro, em qualquer tela ou relatório.
- **Permissão mínima por papel**: cada papel vê e faz apenas o que o papel exige; o prestador enxerga as próprias tarefas.
- **O produto funciona sem e-mail**: o aviso em aplicativo é sempre disponível; e-mail é canal opcional quando o cliente tem infraestrutura de envio.

## Scope Summary

Primeira release canônica (PDD-003): a base já entregue e validada mais o motor de alertas de vigência. Fronteira de validação: uso em ambiente local, quatro papéis e múltiplos domínios isolados. Não entra nesta release nada que exija integração externa, canal de mensagens, aplicativo mobile ou escopo regulado.

### In-Scope Capabilities

- Ciclo de domínio, papéis e acesso (CAP-001)
- Contrato e vigência: cadastro, vínculo de prestadores, prorrogação e encerramento (CAP-002)
- Execução de tarefas com evidência: fluxo, conclusão documentada, reabertura justificada, comentários e anexos (CAP-003)
- Alertas de vigência e painel de próximos vencimentos (CAP-004)
- Painel por papel (CAP-005)
- Busca e filtros (CAP-006)
- Relatório de serviços executados em PDF e CSV (CAP-007)
- Comunicação em tempo real entre sessões (CAP-008)
- Avisos por e-mail quando o cliente tem envio configurado (CAP-009)

### Out-of-Scope Items

- Importação de planilha CSV — adiada para a release seguinte (PDD-007); `HYP-002` aberta para validação.
- Central documental no nível do contrato: anexos de contrato, ocorrências e trilha de alterações — próxima release.
- Indicadores por prestador e quadro de execução por contrato.
- WhatsApp, reajuste automático por índice e aplicativo mobile — fora por decisão (PDD-008).
- Escopo regulado: contratos públicos, empenho, Lei 14.133, NFS-e e fiscal, redação e fluxo jurídico de cláusulas, assinatura eletrônica ICP-Brasil — fora por decisão (PDD-009); assinatura, se um dia for necessária, entra por integração com parceiro.
- Itens já excluídos no MVP aprovado: subtarefas, um usuário em múltiplos domínios, acesso de fornecedor além do papel prestador, acessibilidade formal nível AA, publicação e integração contínua em produção.

## Product Capability Map

Only decided in-scope capability clusters receive stable IDs.

| Capability ID | Capability | Priority | Outcome |
|---------------|------------|----------|---------|
| CAP-001 | Ciclo de domínio, papéis e acesso | P1 | Cada cliente opera isolado, com usuários e permissões corretos, e a suspensão bloqueia acesso sem apagar dados |
| CAP-002 | Contrato e vigência: cadastro, vínculo de prestadores, prorrogação e encerramento | P1 | O gestor controla o contrato do início ao fim e o atraso fica sinalizado sem travar a execução |
| CAP-003 | Execução de tarefas com evidência: fluxo, conclusão documentada, reabertura justificada, comentários e anexos | P1 | O que foi feito fica provado com texto, fotos e histórico de quem reabriu e por quê |
| CAP-004 | Alertas de vigência e painel de próximos vencimentos | P1 | O gestor descobre o vencimento antes do prejuízo, com janelas de 90/60/30/15 dias configuráveis por domínio |
| CAP-005 | Painel por papel | P1 | Admin e gestor veem o andamento do domínio; o prestador vê só as próprias tarefas |
| CAP-006 | Busca e filtros | P1 | Contrato, status, prioridade, prestador, finalidade e prazo são encontrados em segundos |
| CAP-007 | Relatório de serviços executados em PDF e CSV | P1 | O gestor comprova o que foi feito, quem executou, quando e com que evidência, por contrato |
| CAP-008 | Comunicação em tempo real entre sessões | P2 | O que um usuário atualiza aparece para os outros sem recarregar a tela |
| CAP-009 | Avisos por e-mail quando o cliente tem envio configurado | P2 | Atribuição, conclusão, reabertura e vencimento geram e-mail quando existe infraestrutura de envio |

As capacidades P1 descrevem sozinhas o resultado viável da primeira release. P2 são canais de conveniência que acompanham a base, mas não sustentam o resultado isoladamente.

## Success Metrics / KPIs / Desired Outcomes

| Metric | Target | Why It Matters | Measurement Window |
|--------|--------|----------------|--------------------|
| Contratos vigentes com previsão de finalização cadastrada | 100% | É a base que permite qualquer alerta de vigência | Primeiros 90 dias de uso, leitura manual |
| Contratos que entram em atraso sem aviso prévio registrado | 0 | Mede se o produto resolve a dor número um: não perder prazo | Contínua, leitura manual a cada 90 dias |
| Tarefas concluídas com texto de documentação | 100% | Mantém a prova de execução íntegra | Contínua, leitura manual a cada 90 dias |
| Promoções de versão com suíte verde (28 verificações fim a fim e 35 unitárias) | 100% das promoções | Release só recebe código verificado | A cada promoção para produção |

Não existe telemetria no produto: a coleta é manual, a partir de relatórios e consulta ao banco do domínio, e essa é uma limitação assumida desta release.

## Assumptions

- `HYP-001`: alertas escalonados de vigência são o principal valor que faz o usuário deixar a planilha — base da prioridade da CAP-004, sem validação de uso real.
- `HYP-002`: importar planilha CSV é a barreira decisiva de adoção — usada para justificar o adiamento (PDD-007), não a inclusão.
- `HYP-003`: gestor é o usuário primário diário e prestador o secundário — define a hierarquia das telas.
- `HYP-004`: implantação local atende os primeiros usuários — define a fronteira de validação.
- `HYP-005`: comprador é o responsável pela operação em empresa de médio porte de serviços terceirizados — não verificado; nenhuma fonte local identifica quem compra.
- Assume-se que a base entregue permanece disponível: o que já está validado não é refeito nesta release.

## Constraints

- Uso e validação acontecem primeiro em ambiente local, acessado em `http://localhost/`; publicação e integração contínua em produção ficam fora.
- A medição das métricas é manual durante os primeiros 90 dias, sem telemetria.
- Aviso por e-mail depende de infraestrutura de envio do cliente; sem ela, o produto segue completo pelo aviso em aplicativo.
- A suíte de verificações deve estar verde antes de qualquer promoção de versão.
- Navegadores atuais em desktop: Chrome, Edge, Firefox e Safari.
- Volume esperado: milhares de contratos por cliente, com respostas em menos de 2 segundos em ambiente local.
- Acessibilidade de nível formal AA não é meta desta release; permanece o básico: rótulos, contraste razoável e navegação por teclado nas telas principais.

## Dependencies

- Infraestrutura de envio de e-mail do cliente (opcional; ativa a CAP-009).
- Ambiente Docker local para subir o stack completo.
- Aprovação do owner para promoção de versão, condicionada à suíte verde.
- Pesquisa de mercado de set/2026 (`docs/resources.md`) como base de prioridade — fonte qualitativa com limitações registradas (EVD-010).
- Dados cadastrados pelos próprios usuários: contratos, tarefas e histórico por domínio.

## Risks

- **Hipótese de valor não validada (HYP-001)**: os alertas podem não ser o motivo de compra. Resposta: observar o uso do painel de vencimentos com gestores antes de ampliar escopo.
- **Canal de e-mail indisponível**: sem envio configurado, parte dos avisos não chega. Resposta: aviso em aplicativo sempre ativo e leitura clara do estado de envio.
- **Escopo crescente**: as releases seguintes pressionam a frente de trabalho. Resposta: fronteira fixada em PDD-003; qualquer mudança passa por nova decisão registrada.
- **Sem telemetria**: métricas manuais podem não ser coletadas. Resposta: lembrete de coleta a cada 90 dias e relatórios por contrato como fonte.
- **Comprador desconhecido (HYP-005)**: posicionamento e adoção podem estar desalinhados com quem decide a compra. Resposta: manter como hipótese até haver conversa com usuário real.
- **Pendência na base entregue**: a única lacuna de interface (T031, acessibilidade e bootstrap) restringe a cobertura acessível. Resposta: concluir antes de divulgar a release.

## Open Questions

Nenhuma pergunta de produto bloqueante permanece: `PDQ-001` a `PDQ-009` foram respondidas em `PDD-001` a `PDD-009`. Itens abertos, não bloqueantes:

- Qual janela de alerta padrão os gestores realmente usam — 90/60/30/15 é a hipótese inicial vinda da pesquisa (EVD-002) e deve ser confirmada em uso real. Owner: usuário.
- `HYP-005` — quem compra a ferramenta e em qual segmento. Owner: usuário.
- `HYP-002` — se a importação de planilha é mesmo decisiva para quem sai do Excel. Owner: usuário, release seguinte.
- Qual meta de adesão vale após os primeiros 90 dias, quando houver uso real. Owner: usuário.

## Release or Validation Approach

1. Subir o stack local e percorrer o caminho completo: habilitar domínio, cadastrar usuários e finalidades, criar contrato, vincular prestadores, distribuir tarefas, concluir com evidência, reabrir com motivo e gerar o relatório.
2. Manter as verificações automatizadas verdes (28 fim a fim, 35 unitárias e 16 de fumaça) antes de qualquer promoção.
3. Entregar o painel de próximos vencimentos e observar com gestores reais se o aviso chega a tempo de decidir — é o teste de `HYP-001`.
4. Coletar manualmente as quatro métricas em 90 dias, a partir de relatórios e consulta por domínio.
5. Só então decidir a release seguinte entre central documental e importação de planilha, com a evidência coletada.

## Domain Glossary / Terminology

- **Domínio**: unidade de um cliente; concentra contratos, usuários, finalidades e dados isolados dos demais domínios.
- **Contrato**: vínculo com objeto, finalidade, data de início, previsão de finalização e status operacional — `em vigência`, `atrasado` ou `encerrado`.
- **Finalidade**: dicionário de motivos do contrato, gerenciado pelo administrador do domínio; cada contrato tem exatamente uma.
- **Prestador**: profissional vinculado a contratos e responsável por executar tarefas.
- **Tarefa**: unidade de execução dentro de um contrato, com fluxo `A Fazer → Em Progresso → Revisão → Concluída` e reabertura opcional.
- **Conclusão documentada**: encerramento da tarefa com texto obrigatório e fotos opcionais como evidência.
- **Reabertura**: devolução da tarefa ao prestador pelo gestor, com motivo obrigatório registrado no histórico.
- **Atrasado**: contrato que passou da previsão de finalização; sinalização sem bloqueio automático da execução.
- **Alerta de vigência**: aviso em janela configurável antes da previsão de finalização, enviado em aplicativo e, quando disponível, por e-mail.
- **system_admin**: operador da plataforma; habilita e suspende domínios e não acessa dados de negócio.

## Handoff Guidance

- **Product intent to preserve**: avisar do vencimento antes do prejuízo e provar a execução com evidência — qualquer evolução serve a esses dois resultados.
- **Scope boundaries to respect**: central documental, importação de planilha, indicadores por prestador, WhatsApp, reajuste automático e mobile estão fora; escopo regulado permanece fora; adiamentos só entram por decisão registrada.
- **Critical constraints**: uso validado em ambiente local; medição manual sem telemetria; e-mail é canal opcional; suíte verde antes de promoção; isolamento por domínio é inegociável.
- **Open decisions needing technical input**: como configurar as janelas de alerta por domínio sem exigir setup do usuário; como registrar que um aviso já foi enviado para não repetir; até onde a janela padrão 90/60/30/15 pode mudar sem quebrar a expectativa do gestor.

## Project Context Baseline Updates

- A base entregue cobre CAP-001, CAP-002, CAP-003, CAP-005, CAP-006 e CAP-007; resta uma pendência de acessibilidade e bootstrap web (T031) antes de considerar a interface completa.
- CAP-004 parte da varredura de vencimento e do notificador já existentes: o alvo de produto é janela de 90/60/30/15 dias configurável por domínio, aviso em aplicativo sempre e e-mail quando houver envio.
- A prioridade do alerta vem da pesquisa de set/2026 (`docs/resources.md`), fonte qualitativa com limitações registradas em EVD-010; nenhuma afirmação de mercado dessa pesquisa vale como consenso.
- Fronteira de release fixada em PDD-003 (Opção B), com adiamentos em PDD-007, PDD-008 e PDD-009.
- Prova de isolamento por domínio e de permissão mínima por papel exige dois domínios ativos em uso simultâneo e os quatro papéis; execução em domínio único não demonstra nenhuma das duas restrições inegociáveis.
