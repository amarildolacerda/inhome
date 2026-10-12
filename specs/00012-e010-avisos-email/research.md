# Research: Avisos por e-mail — envio opt-in por evento (00012)

**Date**: 2026-10-11 | **Type**: product (CAP-009, verificação de canal)

## Opt-in por configuração de ambiente
Padrão de serviço transacional: o canal só existe quando configurado (host+porta), sem toggle por usuário nesta release. Porta fechada = recurso ausente, nunca erro de produto. Fontes: convenção SMTP transacional (Mailtrap/MailHog como servidor de teste local); documentação Nodemailer sobre pool/timeout.
Aplicação: manter `SMTP_HOST`/`SMTP_PORT` como gate único; sem eles nenhuma tentativa é feita.

## Falha engolida (fail-open) em ações do usuário
Regra de canal secundário: e-mail nunca pode transformar 2xx em 5xx nem travar fluxo. Envio é fire-and-forget com resultado registrado no domínio, não na resposta. Fontes: guias de notification hooks (outbox pattern sem retry = melhor esforço).
Aplicação: `notify()` nunca lança; timeout de 5 s é limite por envio; a resposta HTTP e a varredura seguem com o que houve.

## Servidor SMTP falso em teste
Validação end-to-end de e-mail sem provedor real: servidor TCP mínimo que aceita conexão, sauda e registra mensagens (padrão já usado em `backend/src/services/email.test.js`). Dedup prova-se rodando a rotina duas vezes e contando mensagens. Fontes: padrões de fake SMTP em suítes Node.
Aplicação: provar os quatro eventos e o modo inerte na própria suíte, sem dependência externa.

## Estado de envio legível no domínio
Quando o canal é opcional, o operador precisa distinguir "não enviado porque inerte" de "tentado e falhou": estado por registro (`skipped`/`sent`/`failed`), imutável após o fato, sem campo derivado na tela. Fontes: padrão de delivery status em outbox/event stores.
Aplicação: `alert_events.email_status` é a fonte; a leitura exposta é a do painel de alertas (mesma rota, sem endpoint novo).
