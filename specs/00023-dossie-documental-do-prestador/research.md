# Research: dossiê documental do prestador

## Conformidade de terceiros no Brasil

Gestão de terceiros no Brasil trata ASO, treinamentos de NR e certidões como condição para o prestador entrar em campo. A consequência de negligenciar o tema é passivo trabalhista para a contratante, não apenas multa contratual. Isso explica por que o tema apareceu como o eixo novo de maior severidade na pesquisa de novembro de 2026. Para o produto, significa que vigência precisa ser dado de primeira classe por documento, e não texto livre no contrato. Fontes: sistemasgap.com.br (jul/2026), apollusehs.com.br (jun/2026), ambas consolidadas em `docs/pesquisa-mercado-2026-11.md`.

## Alerta antes do vencimento

O valor do alerta está em antecedência, não no aviso no dia. A pesquisa anterior já mostrou que 23% dos compradores querem obrigações aparecendo antes do problema, e fornecedores brasileiros pedem avisos para vencimento, renovação e entrega. O motor de E004 já oferece janelas 90/60/30/15 configuráveis e dedup por `(contract_id, source_kind, source_id)`. O dossiê deve reaproveitar esse painel com um `source_kind` novo, sem criar segundo centro de notificação. Fontes: pramata.com Contract Intelligence Index 2026, projuris.com.br (abr/2026), via `docs/pesquisa-mercado-2026-11.md`.

## Checklist por tipo de serviço

NR-01 e ferramentas de gestão de terceiros tratam a obrigatoriedade como função do serviço executado: o mesmo prestador pode estar apto para serviço administrativo e impedido para trabalho em altura. Isso pede checklist configurável por finalidade, com tipo de documento e abrangência por prestador ou trabalhador, em vez de uma regra global rígida. O dicionário de finalidades de E002 já é a chave natural para essa configuração. Fontes: apollusehs.com.br (NR-01, jun/2026), insoft4.com.br (out/nov/2026), via `docs/pesquisa-mercado-2026-11.md`.

## Bloqueio com motivo explícito

Recusar a operação sem dizer qual documento falta gera retrabalho e contorno fora do sistema. Reclamações de usuários sobre permissões rígidas mostram que o bloqueio precisa ser compreensível e reversível pelo gestor: a recusa informa o documento ausente ou vencido, e o gestor regulariza conferindo a nova versão. A trilha de auditoria é um dos recursos mais valorizados da categoria, então conferência e alteração precisam registrar autor e data. Fontes: Capterra 2026 (audit trail), Webdox/Juro via `docs/pesquisa-mercado-2026-11.md`.

## Integração no código existente

O repositório já tem os pontos necessários: `contract_providers` liga prestador a contrato, `tasks.assignee_id` recebe o prestador, `purposes` é o dicionário de serviços, `extracted_alerts` é o painel com dedup tripla, e `saveToUploads` grava bytes em disco com limite de 2 MB. A implementação deve acrescentar tabelas para trabalhador, documento e requisito por finalidade, além de uma guarda chamada antes de vincular e antes de atribuir. Nenhum integrador externo, catraca ou eSocial entra nesta feature. Fontes: `backend/src/config/database.js`, `backend/src/services/financeAlerts.js`.
