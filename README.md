# Sistema de Gestão de Contratos de Terceiros

Organize contratos de terceiros, acompanhe o trabalho contratado e mantenha a execução documentada — tudo em um só lugar.

## Para quem é

- **Gestores** que administram contratos e precisam ver prazos, prestadores e o que está em andamento
- **Prestadores de serviço** que executam as tarefas do contrato e registram a conclusão com fotos
- **Administradores** que controlam usuários, finalidades e o andamento geral do contrato

## O que você pode fazer

### Contratos sob controle
- Cadastre o contrato com objeto, finalidade, data de início e previsão de término
- Vincule os prestadores que participam do contrato
- Prorrogue ou encerre quando necessário
- Contrato vencido aparece sinalizado como atrasado — sem travar o trabalho em andamento

### Tarefas com registro do que foi feito
- Crie tarefas no contrato e atribua a quem vai executar
- Acompanhe o fluxo: **A Fazer → Em Progresso → Revisão → Concluída**
- Na conclusão, o prestador descreve o que feito e anexa fotos como evidência
- Precisou refazer? O gestor reabre a tarefa com o motivo registrado no histórico
- Comentários e anexos ficam junto da tarefa

### Visão clara do que importa
- **Busca e filtros** por contrato, status, prioridade, prestador, finalidade e prazo
- **Painel (dashboard)** com o andamento do domínio; cada prestador vê só o que é seu
- **Relatório em PDF** por contrato: o que foi feito, quem executou, datas e fotos

### Trabalho em equipe no mesmo ritmo
- Atualizações aparecem na tela dos outros na hora, sem precisar recarregar
- Avisos por e-mail (opcional) em atribuição, conclusão, reabertura e vencimento

## Como funciona na prática

1. O administrador da plataforma habilita o **domínio** (área de cada cliente) e cria o primeiro usuário administrador
2. O admin do domínio cadastra usuários e o dicionário de finalidades
3. O gestor cria o contrato, vincula prestadores e distribui as tarefas
4. O prestador executa e conclui com texto e fotos
5. O gestor acompanha pelo painel, reabre se preciso e gera o relatório do contrato

## Quem pode o quê

| Ação | system_admin | admin | gestor | prestador |
|------|:---:|:---:|:---:|:---:|
| Habilitar/suspender domínio | ✅ | ❌ | ❌ | ❌ |
| Gerenciar usuários e finalidades | ❌ | ✅ | ❌ | ❌ |
| Criar contratos, prorrogar, encerrar | ❌ | ✅ | ✅ | ❌ |
| Criar e atribuir tarefas | ❌ | ✅ | ✅ | ❌ |
| Concluir tarefa com texto e fotos | ❌ | ✅ | ✅ | só as suas |
| Reabrir tarefa com motivo | ❌ | ✅ | ✅ | ❌ |
| Relatório PDF | ❌ | ✅ | ✅ | ❌ |
| Dashboard | ❌ | completo | completo | só as suas tarefas |

Cada cliente (domínio) tem os dados separados: o que acontece em um domínio não aparece em outro. Suspender um domínio bloqueia o acesso, mas **nunca apaga** os dados.

## Documentação

- [Escopo aprovado](docs/approved-scope-draft.md) — regras de negócio em detalhe
- [Documentação técnica](TECHNICAL.md) — para a equipe de desenvolvimento
- [Workflow SDD](docs/sdd-pilot.md) — processo de desenvolvimento deste repositório
