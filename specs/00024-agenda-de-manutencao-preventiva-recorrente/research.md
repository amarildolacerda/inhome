# Research: agenda de manutenção preventiva recorrente

> Feature | 2026-11-24 | Definir prioridades, limites e padrões da E022 — recorrência que cria a tarefa sozinha, sem dependência externa.

## Grade fixa e regra separada da tarefa

- **Decision**: manter regra (plano) distinta da tarefa (ordem), com grade ancorada na data de início; conclusão não reancora a série.
- **Rationale**: modelos de manutenção preventiva separam plano, ordem datada e conclusão; editar a ordem não altera o plano.
- **Rejected**: modo "floating" ancorado na última execução — exige horímetro, ausente neste produto.
- **Pitfalls**: reancorar após a conclusão acumula atrasos e reduz as ocorrências do ano.
- **Sources**: https://www.fabrico.io/blog/preventive-maintenance-plan-data-model/

## Chave estável e idempotência

- **Decision**: gravar a ocorrência com UNIQUE por `(regra, data)` antes de criar a tarefa.
- **Rationale**: geração de ordens deve ser idempotente; chave estável permite reconciliar retry e execuções concorrentes.
- **Rejected**: consultar e inserir sem constraint de unicidade — duas varreduras criam cópias indistinguíveis.
- **Pitfalls**: só verificar em memória não protege contra sweeps em processos distintos.
- **Sources**: https://datamesh.com/factverse-docs/modules/cmms-operator-workflow/, https://ones.com/blog/how-to-define-scope-and-success-criteria-for-an-inspection-to-maintenance-initiative/

## Horizonte e aviso antecedente

- **Decision**: gerar até 90 dias antes e avisar pelas janelas do domínio acrescidas da antecedência da regra; ignorar datas passadas.
- **Rationale**: levantar a ordem no vencimento menos `lead_time` preserva a antecedência; E004 já deduplica `extracted_alerts`.
- **Rejected**: gerar o ano inteiro de uma vez ou esperar o dia do vencimento — fila grande ou aviso tardio.
- **Pitfalls**: janela customizada sem 15 dias pode impedir o aviso prometido se a antecedência da regra não for incluída.
- **Sources**: https://www.fabrico.io/blog/preventive-maintenance-plan-data-model/, `docs/pesquisa-mercado-2026-11.md`

## Integração no repositório

- **Decision**: tabelas de regra/ocorrência por domínio; varredura no boot/hora ao lado de `runExpirySweep`; tarefa via `Task.create`; alerta `maintenance_schedule` em `extracted_alerts`; regras no detalhe do contrato.
- **Rationale**: `server.js` já registra sweeps; `providerDocumentAlerts.js` mostra dedup tripla; `database.js` centraliza DDL.
- **Rejected**: novo agendador externo, segundo centro de notificação ou acoplamento com `PDD-008`.
- **Pitfalls**: falha em um domínio não pode abortar o ciclo dos demais — isolar por domínio.
- **Sources**: `backend/src/server.js`, `backend/src/services/providerDocumentAlerts.js`

## Summary

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Grade | fixa, ancorada no início | evita acúmulo de atraso |
| Idempotência | UNIQUE por regra/data | sweeps concorrentes sem duplicata |
| Horizonte | 90 dias + janelas do domínio e da regra | aviso antecedente sem fila grande |
| Integração | reuso de sweeps, tasks e alerts | zero novas dependências |

## Sources Index

| URL | Topic | Fetched |
|-----|-------|---------|
| https://www.fabrico.io/blog/preventive-maintenance-plan-data-model/ | grade, geração | 2026-11-24 |
| https://datamesh.com/factverse-docs/modules/cmms-operator-workflow/ | idempotência | 2026-11-24 |
| https://ones.com/blog/how-to-define-scope-and-success-criteria-for-an-inspection-to-maintenance-initiative/ | chave, retry | 2026-11-24 |
