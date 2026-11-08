# compact.MD — contexto compactado da sessão

> Atualizado em [07/11 21:30] para restauração de contexto. Repo `/mnt/windows/git/inhome`, branch `dev`.
> Estado atual: há alterações locais pendentes e a feature E017 está ativa no workspace de desenvolvimento.

## Objetivo

- Continuar a feature `E017` em `specs/00019-dashboard-indicadores-de-contrato-perpetuo`, focada em indicadores do painel de contratos (`perpetuo`, conclusão e tarefas atrasadas).
- Manter a branch `dev` e os artefatos SDD alinhados ao estado real do repositório sem reescrever a prosa histórica de specs antigas.
- Preservar os documentos de governança e o fluxo de validação de promoção (`dev` → `main`) conforme `project-instructions.md`.

## Estado do repositório

- Branch ativa: `dev`.
- Mudanças locais pendentes: `AGENTS.md`, `TECHNICAL.md`, `TODO.md`, `specs/prd.md`, `specs/project-plan.md`, `specs/sad.md`, `specs/plan/E017.md`, `specs/00019-dashboard-indicadores-de-contrato-perpetuo/`.
- Feature ativa: `00019-dashboard-indicadores-de-contrato-perpetuo` (`E017`) com plano em `specs/00019-dashboard-indicadores-de-contrato-perpetuo/plan.md`.
- Sem push adicional confirmado nesta sessão; o worktree continua local e sem commit de consolidação.

## Contexto operacional

- `TODO.md` registra `E017` em execução.
- O epic `E017` estende o painel do dashboard e a tabela de contratos com a coluna `perpetual`, sem criar endpoint novo.
- O comportamento alvo é: distinguir contrato perpétuo, evitar falsos “Incompleto”, e contabilizar tarefas atrasadas sem contaminar KPIs e alertas de vigência.
- O estado atual foi validado em testes do dashboard, e a documentação técnica/README foi alinhada ao comportamento real e ao stack em uso.
- A lógica de status e de filtro continua compatível com o contrato existente e com a interface do dashboard já em uso.

## Regras e decisões ativas

- API e UI seguem o padrão atual do projeto: `/api/v2/*`, sem retorno a `/api/*` e sem introdução de nova superfície de endpoint.
- `contracts.perpetual` é um ajuste aditivo em `migrateSchema()`/DDL compatível com o domínio, sem backfill obrigatório.
- A regra de negócio do indicador de atraso e de "sem previsão" deve ignorar contratos perpétuos; o alertador e o dashboard devem compartilhar o mesmo predicado.
- O arquivo `TECHNICAL.md` está desatualizado em relação ao stack real e deve ser revisado após a implementação, conforme a política de documentação do projeto.

## Pendências / riscos

1. `E017` foi validado no ponto de regressão principal do dashboard; o ajuste de teste foi alinhado com a regra de vínculo do prestador ao contrato.
2. `project-plan.md`, `specs/prd.md` e `specs/sad.md` estão com alterações locais e precisam ser conferidas antes de fechar a feature.
3. O estado de `TECHNICAL.md` e do plano do workspace precisa ser reconciliado com a implementação real sem reescrever a prosa histórica de specs antigas.

## Trabalho operacional

- Preferir ajustes no workspace da feature atual e em arquivos vivos; não reescrever prosa histórica em specs fechadas.
- Validar com testes pequenos e específicos antes de promover a branch em qualquer ciclo de `dev` → `main`.
- Continuar usando o preflight SDD quando for necessário delegar ou validar fases do pipeline.
