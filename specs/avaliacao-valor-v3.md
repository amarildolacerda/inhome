# Avaliação V3 — entregas × canvas de valor

**Data**: 2026-11-22 · **Referência**: `specs/canvas_valor_usuario.png` · **Escopo**: épicas E001–E017 do `specs/project-plan.md`
**Método**: leitura do canvas por OCR (o arquivo é uma imagem gerada por IA, sem versão textual) e mapeamento de cada recurso para as épicas com QC PASS que o implementam. O canvas é uma referência de produto, não um contrato: itens que o PRD excluiu explicitamente aparecem como "fora de escopo", não como pendência.

## Resultado

Das 17 épicas planejadas, 17 estão `[X]` com QC PASS. No vocabulário do canvas:

- **7 de 15 recursos (47%) entregues por completo.**
- **5 de 15 (33%) com cobertura parcial.**
- **2 de 15 (13%) não entregues.**
- **1 de 15 (7%) fora de escopo por decisão registrada no PRD.**
- Considerando cobertura parcial como presença, o produto toca **12 de 15 recursos (80%)**.

Os desejos do usuário com melhor atendimento são eficiência operacional, transparência e confiabilidade na execução. A lacuna de maior impacto é previsibilidade financeira: o canvas pede controle de pagamentos e relatórios de custos, enquanto a entrega cobre só o registro do que foi executado.

## Recursos do app × entregas

| Recurso (canvas) | Cobertura | Épicas | Evidência |
|------------------|-----------|--------|-----------|
| Centralização | Completo | E001, E002 | domínios isolados, cadastro e vínculo de prestadores |
| Controle de contratos | Completo | E002, E015, E017 | vigência, prorrogação, encerramento, convite e indicadores |
| Alertas e renovação | Completo | E004, E005, E016, E017 | varredura com dedup, janelas 90/60/30/15, extração de prazos e alertas no painel |
| Assinatura eletrônica | Fora de escopo | — | PDD-009 exclui ICP-Brasil; se necessária, entra por parceiro |
| Controle de versões | Parcial | E003, E011, E012 | `task_history` registra reabertura, decisão e manutenção; não há versionamento de contrato ou documento |
| Checklists de conformidade | Não entregue | — | os checklists do repositório são do ciclo SDD, não uma feature de conformidade do produto |
| Agenda de obrigações | Parcial | E003, E004 | tarefas com prazo e alertas de vigência cobrem a função, sem uma agenda dedicada |
| Gestão de documentos | Parcial | E003, E012, E016 | anexos categorizados e documentos no chat; a central documental do contrato está fora da release (PDD) |
| Monitoramento de SLA/KPIs | Parcial | E013, E017 | KPIs por status e indicadores de risco no painel; sem SLA contratual configurável |
| Indicadores de status de risco | Completo | E016, E017 | riscos extraídos de documentos e indicadores do painel |
| Painel de status de risco | Completo | E005, E013, E017 | fila por urgência, janelas de vencimento e exclusão de perpétuos |
| Controle de pagamentos | Não entregue | — | ausente do PRD; reajuste automático por índice foi excluído em PDD-008 |
| Registro de entregas | Completo | E003, E011, E012 | conclusão documentada com fotos, auditoria e aprovação do gestor |
| Relatórios de custos | Parcial | E008 | PDF e CSV por contrato descrevem serviços executados, não custos |
| Canal com executores | Completo | E009, E016 | sala `domain_<id>` e chat por contrato com cards e notificação in-app |

## Desejos do usuário × atendimento

| Desejo (canvas) | Atendimento | Base |
|-----------------|-------------|------|
| Segurança jurídica | Parcial | auditoria e prova de execução (E003, E011); sem assinatura ou checklist documental |
| Eficiência operacional | Completo | busca, filtros, painéis por papel e UX do dashboard (E006, E007, E013, E014) |
| Assinatura eletrônica | Fora de escopo | PDD-009 |
| Previsibilidade financeira | Parcial | alertas de vigência e relatório de serviços (E004, E005, E008); sem pagamentos ou custos |
| Transparência | Completo | visões por papel, avisos e histórico de acesso (E006, E010, E015) |
| Confiabilidade na execução | Completo | fluxo com evidência, manutenção, visitante e chat (E003, E012, E015, E016) |

## Valor entregue no canvas

| Valor | Situação | Leitura |
|-------|----------|---------|
| Redução de custos | Indireto | eficiência operacional e alertas evitam retrabalho e prejuízo, mas não há medição de custo |
| Redução de riscos | Completo | motor de alertas, auditoria e extração local de riscos, multas e seguros |
| Agilidade na comunicação | Completo | tempo real, chat por contrato e avisos por e-mail (E009, E016, E010) |
| Controle de gastos | Não entregue | nenhuma épica cobre pagamentos, faturamento ou custo |
| Comunicação clara | Completo | cards por papel, rótulos de status e temas claro/escuro |

## Lacunas e recomendação

1. **Previsibilidade financeira (maior valor pendente).** Nova épica P1 para controle de pagamentos e relatório de custos por contrato, usando a base de contratos e tarefas já entregue. Depende de decisão de produto sobre o que é "custo" no domínio.
2. **Gestão documental do contrato.** A central documental foi adiada no PRD; o chat já entrega anexos e extração. Reavaliar como P2 com reuso de `attachments` e `document_analyses`.
3. **Checklists de conformidade e agenda de obrigações.** As duas aparecem no canvas sem cobertura equivalente no PRD. Melhor tratadas como extensão de CAP-003, não como feature nova isolada.
4. **Controle de versões e SLA.** Cobertura parcial hoje; promover só se houver demanda, pois o valor declarado no canvas já é atendido por auditoria e indicadores.

Os itens fora de escopo por PDD-008 e PDD-009 não devem entrar no próximo ciclo sem revisão explícita dessas decisões.
