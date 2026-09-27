# Roadmap

Priorização por benefício ao usuário: primeiro o que reduz perda de prazo e
perda de documento (as dores mais citadas na pesquisa, `docs/resources.md`),
depois adoção, depois diferenciais. Esforço em S/M/L. Prazos não são promessa,
ordem é.

## Base: o que a pesquisa diz que mais vale

1. Alertas escalonados de vigência (crítico, desejo nº 1).
2. Contrato + anexos + histórico num lugar só (crítico, desejos nº 2 e 5).
3. Painel do que vence primeiro (crítico, desejo nº 3).
4. Obrigações como tarefas com responsável (crítico, já coberto em essência).
5. Primeiro login com ganho visível: importar planilha (conversão de trial).

## R0 — Em andamento

| Item | Benefício | Esforço |
|------|-----------|---------|
| IA tipo Discord: domínio → contrato (canal) → tarefas do contrato | Tarefa deixa de ser lista plana; gestor entra no contrato e vê a execução | M (em execução) |

## R1 — Próximos vencimentos + alertas de vigência de contrato

Estender o que já existe: `runDueSweep` horário e `notify()` de
`backend/src/services/email.js` (FR-017) hoje avisam só tarefa com
`due_date` = hoje.

- Painel "vence primeiro" no dashboard (90/60/30/15 dias), por contrato.
- Sweep passa a avaliar `forecast_date` dos contratos vigentes com janelas
  configuráveis por domínio; reutiliza e-mail + `task_history` como trilha.
- Aviso in-app no socket (`domainEvents`, FR-020) para quem está logado.
- Status `atrasado` deixa de ser a única forma de descobrir o problema.

Benefício: atende os desejos nº 1 e 3, o motivo declarado de sair da planilha.
Esforço: M. Depende de: SMTP_* configurado para e-mail valer (sem isso, in-app
ainda funciona).

## R2 — Central documental por contrato

- Anexos no contrato (PDF assinado, aditivos) reaproveitando o upload de
  `middleware/upload.js` (hoje só tarefa tem anexos, FR-015).
- Ocorrências/comunicações do contrato (registro de e-mail, ligação, acordo).
- Trilha de alterações do contrato (quem mudou status/data, quando).

Benefício: desejos nº 2 e 5; mata "o contrato que some" e "dificuldade para
provar". Esforço: M.

## R3 — Onboarding de baixa fricção

- Importação de planilha CSV de contratos com mapeamento de colunas.
- Primeiro login já mostra o painel de vencimentos populado (depende de R1).

Benefício: converte quem migra do Excel; adoção. Esforço: M.

## R4 — Acompanhamento de prestadores

- Indicadores por prestador: contratos vinculados, tarefas em atraso,
  conclusão. Usa dados já existentes (`contract_prestadores`, tarefas).
- Kanban de execução por contrato (delighter citado).

Benefício: desejo nº 9 ampliado para a persona gestor. Esforço: S/M.

## R5 — Canais e automações

- WhatsApp como canal de aviso (26% dos brasileiros preferem para lembretes).
- Reajuste automático por IPCA/IGP-M/INPC e prorrogação como fluxo com alerta.
- Mobile para o prestador.

Benefício: diferenciais; não bloqueia o uso principal. Esforço: M/L.

## Fora de escopo

Fiscal/NFS-e, empenho e Lei 14.133 (contratos públicos), redação e workflow
jurídico de cláusulas, assinatura eletrônica ICP-Brasil (integrar parceiro,
não construir), IA de extração de cláusulas.

## Já coberto (não reescrever)

Contratos com datas/status (vigente/atrasado/encerrado), tarefas por contrato
com prazo, e-mail de tarefa (FR-017), busca (FR-016), relatórios PDF/CSV,
papéis admin/gestor/prestador/system_admin, tempo real (FR-020), domínios
multi-tenant (FR-001/FR-002), CRUD de usuários (FR-004).
