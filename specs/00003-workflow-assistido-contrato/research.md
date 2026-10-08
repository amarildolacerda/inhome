# Research — Workflow assistido por OpenCode

## Domain best practices
- Elicitação estruturada antes da geração: pedir ao usuário objetivos, restrições e critérios de aceitação reduz sugestões fora de escopo (comum em fluxos de "spec → task list").
- Human-in-the-loop é padrão em assistência de planejamento: proposta do assistente, revisão humana, aprovação explícita antes de virar estado oficial.
- Rastreabilidade: toda sugestão deve carregar justificativa e referência à definição que a originou; facilita auditoria e refinamento.
- Revisão na vigência: propor mudanças como nova versão do workflow e aplicar só após aprovação, preservando o que já foi executado.

## UX patterns
- Mostrar proposta como checklist editável (remover/editar/reordenar) antes da aprovação.
- Estados claros: rascunho → analisando → sugerido → aprovado; falha com retry.
- Histórico de versões para definições e sugestões evita perda de contexto entre rodadas.
- Geração e revisão assíncronas com estado visível (pendente → concluída/falha) e retry, sem bloquear a tela do contrato.

## Edge cases
- Assistente indisponível ou resposta não estruturada: preservar entrada, marcar falha, permitir retry manual.
- Aprovação com lista vazia: bloquear.
- Redefinições após aprovação: nova sugestão não substitui workflow ativo sem nova aprovação.
- Revisão com tarefas concluídas: aplicação preserva conclusões, evidências e histórico e sinaliza conflitos ao gestor; revisão durante análise em andamento aguarda a anterior.

## Acceptance criteria
- Critérios mensuráveis por papel: gestor consegue submeter, revisar e aprovar; prestador vê apenas o aprovado; falhas não destroem dados.

Sources: docs internas do projeto (specs/prd.md, specs/sad.md); convenções de workflow human-in-the-loop em assistentes de planejamento.
