# Documentação Técnica — Project Manager

## Status do estado atual

- Repositório em desenvolvimento na branch `dev`.
- Última feature entregue: `E019` — gestão documental do contrato (biblioteca sobre `attachments`, filtros, categoria e conferência com autor/data).
- Feature anterior: `E018` — previsibilidade financeira por contrato (parcelas, pagamentos com comprovante, indicadores e exportação CSV/PDF).
- Situação: `E015`, `E016`, `E018` e `E019` concluídos e validados; `E019` com QC PASS em 2026-11-23. Nenhuma promoção `dev` → `main` neste ciclo.

## Arquitetura

```
project-manager/
├── backend/          # API RESTful (Node.js 22+)
├── frontend/         # Interface web (Flutter Web)
├── scripts/          # Scripts de validação SDD Pilot
├── specs/            # Artefatos de especificação
├── docs/             # Documentação institucional
├── data/             # Bancos SQLite por domínio e plataforma
├── uploads/          # Anexos em disco
└── TECHNICAL.md      # Documento técnico do projeto
```

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Flutter Web (Dart 3) |
| Backend | Node.js 22+ (Express) |
| Banco de dados | SQLite por domínio (`data/domains/<id>.db`) + `data/platform.db` |
| Real-time | Socket.io |
| Autenticação | JWT (`jsonwebtoken`) com `bcryptjs` |
| Uploads | arquivos em disco em `backend/uploads/` |

## API REST

### Endpoints principais

#### Autenticação e domínio
- `POST /api/v2/auth/login` — autenticação com domínio habilitado
- `POST /api/v2/domains/enable` — habilita um domínio novo
- `GET /api/v2/auth/me` — usuário autenticado

#### Contratos
- `GET /api/v2/contracts` — listar contratos do domínio/escopo
- `GET /api/v2/contracts/:id` — detalhes do contrato
- `POST /api/v2/contracts` — criar contrato
- `PUT /api/v2/contracts/:id` — atualizar contrato
- `DELETE /api/v2/contracts/:id` — remover contrato

Regras do E017:
- `perpetual` é um campo aditivo no contrato.
- `forecast_date` pode permanecer vazia quando `perpetual` for `true`.
- O valor `perpetual` é exportado no payload do dashboard e não dispara `a_vencer` / `incompleto`.

#### Documentos do contrato (E019)

- `GET /api/v2/contracts/:id/documents` — anexos do contrato com origem (`task`/`chat`/`payment`), categoria, análise e alertas; aceita `?category=` e `?source=`.
- `PATCH /api/v2/contracts/:id/documents/:attachmentId` — altera a categoria do anexo existente; 400 para categoria desconhecida.
- `POST /api/v2/contracts/:id/documents/:attachmentId/review` — marca como conferido com autor e data; idempotente.

Somente `admin` e `gestor` do domínio. Nenhuma tabela nova: `attachments` ganha `reviewed_by`/`reviewed_at` por rebuild guardado que preserva ids, categorias, `message_id` e `payment_id`.

#### Importação de acervo (E020)

- `GET /api/v2/contracts/import/template` — CSV versionado com as sete colunas aceitas (`name`, `start_date`, `forecast_date`, `object`, `purpose`, `provider`, `perpetual`).
- `POST /api/v2/contracts/import/preview` — recebe `fileName`, `dataBase64` e `mapping`; com `detectHeaders: true` devolve só os cabeçalhos. Caso contrário classifica cada linha e devolve `total`, `valid`, `invalid` e `errors` por campo. Não grava nada.
- `POST /api/v2/contracts/import/confirm` — revalida o mesmo payload, grava as linhas válidas em uma transação e anexa os PDFs recebidos em `pdfs[]` (`name` + `dataBase64`). Devolve `created`, `skipped`, `attached` e `skippedPdfs`.

Somente `admin` e `gestor` do domínio, com `authenticateToken → scopeDomain → requireRole` antes de ler o payload. CSV e XLSX são lidos por parser embutido (`zlib`), sem dependência nova. Limites: 500 linhas e 4 MB por planilha, 2 MB por PDF. `attachments.contract_id` entra por rebuild guardado; a transação remove do disco os PDFs escritos se o banco reverter.

#### Dossiê documental do prestador (E021)

- `GET /api/v2/providers/:id/dossier` — trabalhadores, documentos e conformidade; aceita `?purposeId=`. Prestador só lê o próprio registro.
- `POST /api/v2/providers/:id/workers` — cadastra trabalhador com `name` e `role`; `PATCH /api/v2/providers/:id/workers/:workerId` alterna `active`.
- `POST /api/v2/providers/:id/documents` — anexa ASO, NR-10, NR-35, certidão ou outro com `type`, `number`, `validUntil`, `fileName` e `dataBase64`; `workerId` opcional (ausente = documento do prestador).
- `PATCH /api/v2/providers/:id/documents/:docId` — altera `number`/`validUntil` e registra conferência com autor e data via `review: {}`; `DELETE` remove o documento e seus alertas.
- `GET|POST /api/v2/providers/requirements` e `DELETE /api/v2/providers/requirements/:reqId` — checklist por finalidade, com `type` e `appliesTo` (`provider` ou `worker`). Item sem `purposeId` é global.

Escrita restrita a `admin` e `gestor`; leitura também para `prestador` no próprio dossiê. Vínculo (`POST /api/v2/contracts/:id/providers`) e atribuição/reatribuição (`POST /api/v2/contracts/:id/tasks`, `PUT /api/v2/tasks/:id`) avaliam o checklist antes de gravar e respondem 400 com `code=PROVIDER_DOCUMENTS_MISSING` e `missing[]` quando falta documento vigente e conferido. Documento que vence depois não desfaz vínculo, tarefa ou histórico. A varredura de E004 publica alertas `provider_document` em `extracted_alerts` e os remove na regularização ou no fim do vínculo.

#### Tarefas
- `GET /api/v2/tasks` — listar tarefas
- `GET /api/v2/tasks/:id` — detalhe da tarefa
- `POST /api/v2/contracts/:id/tasks` — criar tarefa vinculada ao contrato
- `PATCH /api/v2/tasks/:id/status` — avançar no fluxo de status
- `POST /api/v2/tasks/:id/complete` — concluir tarefa com texto de evidência

#### Dashboard
- `GET /api/v2/dashboard/stats` — métricas do domínio, escopo por papel e contratos

Campos relevantes do contrato no payload:
- `perpetual`
- `tasks_total`
- `tasks_done`
- `tasks_overdue`
- `a_vencer`
- `effective_status`

#### Alertas e vencimentos
- `GET /api/v2/alerts/sweep` — varredura de vencimentos
- `GET /api/v2/alerts/panel` — painel agrupado por janelas
- `GET /api/v2/alerts/windows` — janelas do domínio
- `PUT /api/v2/alerts/windows` — atualização das janelas

### Headers de autenticação

Todas as rotas protegidas exigem:

```
Authorization: <token>
```

### Estrutura de resposta

```json
{
  "data": { ... },
  "error": null
}
```

## Modelos de dados

### Contrato
```json
{
  "id": 1,
  "name": "Contrato X",
  "start_date": "2026-10-01",
  "forecast_date": "",
  "perpetual": true,
  "status": "vigente",
  "effective_status": "vigente",
  "tasks_total": 2,
  "tasks_done": 1,
  "tasks_overdue": 1,
  "a_vencer": false
}
```

### Tarefa
```json
{
  "id": 1,
  "contract_id": 1,
  "title": "Entrega principal",
  "status": "A Fazer",
  "priority": "high",
  "assignee_id": 3,
  "due_date": "2026-11-12"
}
```

## Regras de negócio relevantes

- Contratos perpétuos não entram em `a_vencer` nem em `incompleto`.
- O card do dashboard usa texto explícito (`Perpétuo`) em vez de falso "Incompleto".
- Tarefas vencidas continuam sendo contadas para `tasks_overdue`, mesmo quando o contrato é perpétuo.
- O dashboard pega contagens por contrato diretamente de `tasks`, sem criar nova superfície de API.

## Setup

### Rápido (recomendado)

```bash
./run.sh            # detecta Docker e sobe backend (:3001) + frontend (:80)
./run.sh --local    # sem Docker: npm ci, flutter pub get/build, backend + proxy em :8080
./run.sh --status   # saúde dos serviços
./run.sh --down     # para tudo
```

O script cria `backend/.env` (JWT_SECRET gerado) quando ausente e só reinstala dependências quando `package-lock.json`/`pubspec.*` mudam.

### Pré-requisitos

- Node.js 22+
- Flutter SDK 3.x
- SQLite local por domínio

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
flutter pub get
flutter run -d chrome
```

### Variáveis de ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `PORT` | Porta do backend | `3001` |
| `JWT_SECRET` | Segredo dos tokens | — |
| `DATA_DIR` | Diretório de dados do projeto | `./data` |
| `APP_VERSION` | Versão da aplicação | `0.0.1` |

## Desenvolvimento

### Comandos úteis

```bash
# Backend
cd backend && node --test src/routes/dashboard.test.js
cd backend && npm test

# Frontend
cd frontend && flutter analyze
cd frontend && flutter test
```

### Estrutura do backend

```
backend/src/
├── config/
│   └── database.js      # DDL + migração por domínio
├── middleware/
│   └── auth.js          # JWT + autorização
├── models/
│   ├── Contract.js      # lógica de status e overdue
│   ├── Task.js          # fluxo de tarefas / histórico
│   └── User.js          # usuários do domínio
├── routes/
│   ├── auth.js          # auth + domínio
│   ├── contracts.js     # CRUD de contratos
│   ├── tasks.js         # CRUD de tarefas
│   ├── dashboard.js     # métricas do painel
│   └── alerts.js        # alertas e janelas
└── server.js            # entry point
```

### Estrutura do frontend

```
frontend/lib/
├── models/
│   ├── contract.dart
│   └── task.dart
├── screens/
│   ├── dashboard_screen.dart
│   ├── contracts_screen.dart
│   └── tasks_screen.dart
├── services/
│   └── api_service.dart
└── main.dart
```

## Git workflow

- **Branch `dev`**: desenvolvimento
- **Branch `main`**: produção
- Nenhuma promoção para `main` sem testes e aprovação explícita

## Atualização de documentação

- `TECHNICAL.md`: revisado para refletir o stack real e a feature E017 em desenvolvimento.
- `TECHNICAL.md`: status atualizado para `E015` em progresso em 2026-11-17, após refinamento do plano.
- `TECHNICAL.md`: status atualizado para `E016` em progresso em 2026-11-21, após refinamento do plano.
- `TECHNICAL.md`: status atualizado para `E016` concluído em 2026-11-21, após as suítes verdes e o QC.
- `TECHNICAL.md`: status atualizado para `E019` concluído em 2026-11-23, após as suítes verdes e o QC; endpoints documental adicionados.
- `README.md`: atualizado com o comportamento de contratos perpétuos e do painel.

---

**Voltar ao [README](./README.md)**
