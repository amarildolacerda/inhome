# Research: Régua de notificação configurável

> E023 · 2026-11-24 · Informar prioridade, critérios e limites da régua sem introduzir canais novos.

## Cadência configurável

- **Decision**: Régua por domínio e tipo de evento com etapas contáveis, intervalo configurável e janelas derivadas das janelas de E004, com limite pequeno de etapas.
- **Rationale**: ERPs brasileiros já ofertam lembretes em série por perfil ou fase; um teto baixo evita setup pesado.
- **Rejected**: cadência ilimitada e configuração por contrato — aumentam custo de operação sem evidência local.
- **Pitfalls**: confundir janela do motor com etapa da régua e reenviar aviso ao alterar a configuração.
- **Sources**: https://ajuda.contaazul.com, https://ajuda.woovi.com

## Eventos cobertos

- **Decision**: Manter os tipos de evento já detectáveis pelo motor atual e deixar o catálogo da régua extensível sem criar novos detectores nesta entrega.
- **Rationale**: Projuris aponta vencimento, renovação, reajuste, denúncia, entrega e assinatura como eventos desejados, mas E004 cobre vigência.
- **Rejected**: detectar novos eventos agora — reabriria escopo de extração e reajuste, fora do E023.
- **Pitfalls**: prometer lembrete sem origem de dados confiável.
- **Sources**: https://www.projuris.com.br, ../../docs/pesquisa-mercado-2026-11.md

## Canais e custo

- **Decision**: Usar apenas in-app e e-mail opt-in existentes; WhatsApp continua fora por PDD-008.
- **Rationale**: WhatsApp tem preço por mensagem e decisão anterior de escopo, enquanto in-app e e-mail já estão entregues.
- **Rejected**: SMS, push externo e WhatsApp nesta wave — exigem revisão de PDD-008 e novo canal.
- **Pitfalls**: duplicar envio entre canal e etapa; falha de SMTP não pode bloquear o aviso interno.
- **Sources**: ../../docs/pesquisa-mercado-2026-11.md, https://www.conga.com

## Robustez e adoção

- **Decision**: Configuração por admin/gestor, com histórico preservado e sem apagar eventos já gerados ao desativar a régua.
- **Rationale**: Reclamações de mercado citam setup pesado, permissões rígidas e notificações fracas como causas de perda de prazo.
- **Rejected**: exigir configuração por contrato ou reprocessar histórico — aumentariam adoção e risco.
- **Pitfalls**: perder autoria da alteração e apagar trilha ao ajustar a régua.
- **Sources**: https://www.g2.com, https://www.capterra.com.br

## Summary

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Cadência configurável | Etapas contáveis com intervalo e janelas derivadas de E004 | Padrão de ERP BR com teto baixo |
| Eventos cobertos | Tipos já detectáveis, catálogo extensível | Evita reabrir extração e reajuste |
| Canais e custo | In-app e e-mail opt-in; WhatsApp fora | Canais entregues e PDD-008 mantida |
| Robustez e adoção | Admin/gestor, histórico preservado | Reduz setup e evita perda de prazo |

## Sources Index

| URL | Topic | Fetched |
|-----|-------|---------|
| https://ajuda.contaazul.com | Cadência configurável | cached 2026-11-23 |
| https://ajuda.woovi.com | Cadência configurável | cached 2026-11-23 |
| https://www.projuris.com.br | Eventos cobertos | cached 2026-11-23 |
| ../../docs/pesquisa-mercado-2026-11.md | Eventos cobertos, Canais e custo | cached 2026-11-23 |
| https://www.conga.com | Canais e custo | cached 2026-11-23 |
| https://www.g2.com | Robustez e adoção | cached 2026-11-23 |
| https://www.capterra.com.br | Robustez e adoção | cached 2026-11-23 |
