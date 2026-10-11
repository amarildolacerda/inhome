# Research — E003 Execução de tarefas com evidência

## Evidência de conclusão em campo (produto)

Prestadores relatam conclusão sem prova quando o texto é opcional: o gestor aceita "feito" sem artefato e a cobrança vira palavra contra palavra. Exigir texto obrigatório na conclusão e manter fotos opcionais resolve o custo de digitação em celular sem abrir mão da prova. Registrar autor, motivo e data em toda reabertura evita disputa de responsabilidade. Fontes: prd.md CAP-003; `specs/plan/E003.md`.

## Upload seguro de mídia

Validar tipo por assinatura de arquivo (magic bytes), não só por extensão, e limitar tamanho antes de gravar. Gerar nome opaco no servidor impede enumeração e path traversal. Ordem gravação arquivo antes da referência no banco evita apontador morto; o inverso deixa registro órfão apontando para nada. Falha de banco após gravar deixa arquivo órfão aceito e documentado nesta release. Fontes: `backend/src/middleware/upload.js`; `specs/sad.md`.

## Proxy same-origin de arquivos estáticos

Encaminhar um prefixo dedicado ao serviço de aplicação evita que o fallback de rota SPA devolva HTML no lugar da imagem. `location ^~ /uploads/` com `proxy_pass` mantém cache e cookies coerentes com o restante da API no mesmo host. Arquivos servidos sem token exigem nomes não adivinháveis e revisão de segurança datada. Fontes: `specs/sad.md` (Deployment and Trust Topology); `frontend/nginx.conf`.

## Teste da superfície

Cobrir recusa de conclusão sem texto (400 sem escrita), reabertura sem motivo (400 antes de qualquer escrita), upload inválido (400 sem arquivo nem registro), escopo cruzado (403) e renderização de `GET /uploads/<arquivo>` com status e content-type de imagem em vez de HTML. Regressão do caminho feliz fim a fim mantém a suíte verde existente como base. Fontes: `backend/test.sh`; `specs/00004-e002-contrato-vigencia/qc-report.md`.
