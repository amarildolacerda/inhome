# Research: Desempenho do prestador

> E024 · 2026-11-25 · Definir nota e ocorrências sem criar avaliação manual, SLA ou canal novo.

## Formato da nota

- **Decision**: Nota de 0 a 100 por prestador e período, com componentes explícitos de pontualidade, conclusão no prazo e ocorrências; prestador sem tarefas no período aparece como "sem dados".
- **Rationale**: IDF da Petrobras usa escala 1–6 com macrocritérios; SPE da EDP e SPI da Enel agregam indicadores em índice único. Uma nota agregada com componentes visíveis dá a mesma utilidade sem exigir configuração de pesos.
- **Rejected**: escala 1–6 com pesos configuráveis e avaliação manual — aumentam setup e reabrem a reclamação de configuração pesada.
- **Pitfalls**: nota zero para prestador sem dados; usar "nota" como sinônimo de KPI global do domínio.
- **Sources**: https://canalfornecedor.petrobras.com.br, https://www.edp.com

## Ocorrências como evidência

- **Decision**: Derivar ocorrências de eventos já registrados no fluxo de tarefas: reabertura, manutenção com motivo, rejeição do gestor e conclusão após o prazo, com origem rastreável.
- **Rationale**: O produto já guarda histórico de estados e decisões em E003/E012; OTIF e índice de não conformidade do oHub medem exatamente entrega no prazo e falhas.
- **Rejected**: tabela nova de ocorrências digitadas pelo gestor — duplica fonte e cria trabalho de preenchimento.
- **Pitfalls**: perder a ligação entre a ocorrência e a tarefa de origem; contar a mesma reabertura duas vezes.
- **Sources**: https://base.ohub.com.br, ../../docs/pesquisa-mercado-2026-11.md

## Consistência e isolamento

- **Decision**: Calcular sob demanda com data de referência explícita; mesma entrada produz a mesma nota; agregação restrita ao domínio corrente.
- **Rationale**: A arquitetura já isola cada domínio em banco próprio, e o painel de E017 já trabalha com janelas de tempo. Recalcular evita cache inválido sem job novo.
- **Rejected**: persistir nota calculada e ranqueamento entre domínios — exigiriam invalidação e quebrariam o isolamento.
- **Pitfalls**: usar a data de hoje como referência silenciosa; misturar prestadores de domínios diferentes.
- **Sources**: ../../docs/sad.md, ../../docs/pesquisa-mercado-2026-11.md

## Leitura e adoção

- **Decision**: Somente admin e gestor leem a nota; o prestador não acessa a pontuação nesta épica.
- **Rationale**: A nota apoia renovação e reatribuição, decisões internas; o mercado cita permissões rígidas como reclamação, mas aqui a restrição evita disputa sobre dados ainda não revisados por humano.
- **Rejected**: publicar nota para o prestador e abrir disputa — exigiria fluxo de contestação fora do escopo.
- **Pitfalls**: tratar a nota como decisão automática de renovação; exibir componentes sem explicar a origem.
- **Sources**: https://www.g2.com, https://www.capterra.com.br

## Summary

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Formato da nota | 0–100 com três componentes e estado "sem dados" | Agrega sem configurar pesos |
| Ocorrências | Derivadas do histórico de tarefas | Fonte única e rastreável |
| Consistência | Cálculo sob demanda por domínio | Sem cache/job e sem mistura de tenants |
| Leitura | Admin e gestor apenas | Decisão interna, sem contestação no MVP |

## Sources Index

| URL | Topic | Fetched |
|-----|-------|---------|
| https://canalfornecedor.petrobras.com.br | Formato da nota | cached 2026-11-23 |
| https://www.edp.com | Formato da nota | cached 2026-11-23 |
| https://base.ohub.com.br | Ocorrências como evidência | cached 2026-11-23 |
| ../../docs/pesquisa-mercado-2026-11.md | Ocorrências, consistência | cached 2026-11-23 |
| ../../docs/sad.md | Consistência e isolamento | local 2026-11-25 |
| https://www.g2.com | Leitura e adoção | cached 2026-11-23 |
| https://www.capterra.com.br | Leitura e adoção | cached 2026-11-23 |
