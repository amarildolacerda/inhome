# Research — E002 Contrato e vigência

Produto. Objetivo: informar prioridades de história, critérios de aceite e casos de borda da especificação.

## Ciclo de vida de contrato

Contrato comerciale normalmente nasce vigente, sofre extensão de prazo e termina por conclusão ou rescisão. O ponto de teste mais frágil nesse ciclo é a transição de datas: qualquer gravação manual de status cria duas fontes de verdade que divergem na primeira prorrogação atrasada. A recomendação é tratar status como projeção da data-base e exercitar todas as transições na regressão, incluindo salvar com previsão já vencida. O contrato deve aceitar a gravação mesmo vencido — bloquear a entrada de dados contraria a prática de sinalizar sem impedir.

Fontes: `specs/plan/E002.md` (escopo, casos de borda, plano de demonstração); `specs/prd.md` (CAP-002, métrica de previsão em 100% dos vigentes).

## Status derivado sem escrita de rotina

Padrão comum: calcular o status no momento da leitura a partir de uma data-base fixa e nunca persisti-lo. Isso elimina tarefa de reprocessamento, mantém o banco consistente quando o relógio avança e torna o teste determinístico se a consulta aceitar uma data-base injetável. O risco é o inverso — um job noturno regravando status — que a especificação deve proibir explicitamente. Prorrogação para data futura e encerramento são as duas transições que precisam de asserção de ida e volta.

Fontes: `specs/plan/E002.md` (status `atrasado` derivado, sem escrita); `specs/sad.md` (regra de status na fronteira de domínio).

## Regressão de isolamento e papéis

A regressão de um recurso já entregue deve cobrir a matriz inteira de recusa, não só o caminho feliz: token ausente, papel desabilitado, domínio suspenso e parâmetro `domainId` de outro domínio. A verificação de escopo pertence antes de qualquer consulta — se o parâmetro chega ao handler, o teste de cross-domain já perdeu. Papéis habilitados para contrato são admin e gestor; prestador só lê. Vale testar também a ordem dos guards em relação à validação de corpo, porque 403 deve preceder 400 quando há violação de escopo.

Fontes: `specs/plan/E002.md` (limites: 403 antes de qualquer leitura ou escrita); `specs/00002-e001-ciclo-dominio-papeis-e-acesso/spec.md` (matriz de guards de papel e escopo já verificada).

## Baseline de desempenho em SQLite por domínio

Medição local deve usar volume realístico (milhares de contratos) e repetição suficiente para tirar a primeira execução, que aquece o carregamento WASM do driver. Registrar mediana e p95 em vez de média evita que uma coleta ruim derrube ou infle o resultado. O índice de coluna usada pelo filtro de listagem é a primeira suspeita quando o p95 estoura; o orçamento de 2 s é generoso para SQLite em memória, então a regressão de ordenação e paginação importa mais que micro-otimizações.

Fontes: `specs/plan/E002.md` (p95 abaixo de 2 s em listagens); `project-instructions.md` (SQLite via sql.js, um arquivo por domínio).
