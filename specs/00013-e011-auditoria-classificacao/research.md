# Research: Acesso de auditoria e classificação de tarefas executadas (00013)

**Date**: 2026-10-11 | **Type**: product (CAP-003, auditoria)

## Papel de auditor com menor privilégio (separação de funções)
Prática de separação de duties: quem audita não executa; o papel nasce com o menor privilégio que sustenta a tarefa — ler o resultado executado e registrar apreciação, sem poder alterar fluxo, evidência ou cadastro. Fontes: guias de least-privilege em RBAC (OWASP); convenção de papéis de revisão em sistemas de prestação de serviço.
Aplicação: `auditor` entra no enum como papel de negócio com rotas próprias de leitura e classificação; escrita de tarefa, upload e cadastro continuam respondendo 403.

## Escala ordinal de classificação de atendimento
Padrão de escala curta e ordinal (três estados) com nota opcional de remediação: categoria estável, sem estado em texto livre, porque relatórios futuros precisam agregar por estado. "Deficiente (a corrigir)" embute o próximo passo sem criar fluxo de trabalho novo. Fontes: escalas categóricas de qualidade de serviço com comentário; convenções de aceitação com defeito registrado.
Aplicação: três estados fixos validados na API, nota opcional com limite de tamanho, nenhuma tela oferece estado livre.

## Trilha de auditoria de quem classificou
Expectativa clássica de audit trail: toda apreciação responde quem, quando e sobre o quê; a reclassificação substitui o estado corrente mantendo autor e carimbo de tempo legíveis — o registro pertence à tarefa, não à sessão. Fontes: padrões de audit log (ator e timestamp por evento).
Aplicação: a classificação guarda estado, nota, autor e data; a visão de auditoria e o detalhe da tarefa exibem os quatro campos.

## Fila de revisão para classificação
Padrão de fila de trabalho: lista do domínio já filtrada ao que foi executado, estado atual visível e ação de classificar no próprio item; lista vazia é estado normal, não erro. Fontes: UX de review queues (triagem de revisão e QA).
Aplicação: a tela do auditor lista as tarefas em Revisão/Concluída do domínio, permite classificar sem sair da lista e mostra estado vazio quando não há executadas.
