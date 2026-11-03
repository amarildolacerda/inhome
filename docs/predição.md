Com base em toda a nossa discussão — unindo o escopo do Sistema de Gestão de Contratos de Terceiros, a introdução do papel de Auditor, e os conceitos de Gestão Orientada a Dados e Preditiva (inspirados na obra de Mario H. Trentim) —, estruturei uma Base de Conhecimento (Knowledge Base) pronta para ser incorporada ao roadmap do produto.
Esta base serve para guiar o time de desenvolvimento, alinhar o escopo técnico e fundamentar as próximas releases (Evoluções e Epics).
Base de Conhecimento: Gestão Preditiva e Governança de Contratos
1. Visão Geral e Princípios
A evolução do Sistema de Gestão de Contratos de Terceiros migra de uma abordagem puramente operacional e reativa (registro de tarefas e alertas estáticos de vencimento) para uma abordagem orientada a valor e dados, fundamentada nos seguintes pilares:
 * Transparência e Rastreabilidade: Toda execução em campo exige evidências (fotos/textos) e validações multi-papéis (admin, gestor, prestador, auditor).
 * Gestão Preditiva de Riscos: Substituir avisos baseados apenas em prazos fixos por indicadores estatísticos de probabilidade de atraso e retrabalho.
 * Governança de Fornecedores: Avaliação quantitativa da qualidade das entregas por meio de auditorias e taxas de reabertura de tarefas.
2. Dicionário de Papéis e Permissões Atualizado (RBAC)
| Ação | system_admin | admin | gestor | prestador | auditor |
|---|---|---|---|---|---|
| Habilitar / Suspender Domínio | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gerenciar Usuários e Finalidades | ❌ | ✅ | ❌ | ❌ | ❌ |
| Criar Contratos, Prorrogar, Encerrar | ❌ | ✅ | ✅ | ❌ | ❌ |
| Criar e Atribuir Tarefas | ❌ | ✅ | ✅ | ❌ | ❌ |
| Concluir Tarefa com Texto e Fotos | ❌ | ❌ | ❌ | Apenas as suas | ❌ |
| Reabrir Tarefa com Motivo | ❌ | ✅ | ✅ | ❌ | ❌ |
| Registrar Parecer de Auditoria | ❌ | ✅ | ✅ | ❌ | ✅ |
| Gerar Relatório em PDF | ❌ | ✅ | ✅ | ❌ | ✅ |
| Dashboard | ❌ | Completo | Completo | Apenas as suas tarefas | Completo (Leitura) |
| Monitoramento de Vencimentos | ❌ | ✅ | ✅ | ❌ | ✅ (Leitura) |
3. Diretrizes de Ciclo de Vida da Tarefa & Auditoria
 * Fluxo Operacional:
   
 * Subfluxo de Conformidade (Pós-Conclusão):
   * Assim que a tarefa atinge o status Concluída, o Auditor pode emitir um parecer técnico na tarefa:
     * Satisfatório
     * Satisfatório com Ressalvas
     * Deficiente
   * Gatilho de Retrabalho: Se classificado como Deficiente, o sistema notifica o Gestor, que ganha embasamento para acionar a função de Reabrir Tarefa com motivo, gerando métricas de retrabalho para o fornecedor.
4. Requisitos para o Roadmap (Evoluções Futuras)
 * EPIC A: Índice de Risco Preditivo no Dashboard
   * Objetivo: Exibir um indicador de risco (Baixo, Médio, Alto) nos cards de contratos ativos.
   * Critérios: O cálculo considera a proporção de tarefas reabertas pelo gestor/auditor, o histórico de atrasos do prestador e a densidade de tarefas pendentes frente aos dias restantes da janela de vencimento.
 * EPIC B: Matriz de Qualidade de Prestadores
   * Objetivo: Consolidar o desempenho histórico dos prestadores com base nas avaliações de auditoria e índices de retrabalho.
   * Critérios: Disponibilizar visão analítica para apoiar renovações ou rescisões contratuais sem viés puramente subjetivo.
 * EPIC C: Relatórios Executivos Inteligentes (PDF)
   * Objetivo: Enriquecer o relatório em PDF com um resumo analítico gerado por regras de negócio (taxa de conformidade de evidências fotográficas, eficiência temporal e histórico de auditoria do contrato).

