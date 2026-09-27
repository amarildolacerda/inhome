---
artifact: prd-discovery
product: "Gestão de Contratos de Terceiros"
status: completed
created: 2026-09-26
updated: 2026-09-26
target_prd: specs/prd.md
awaiting_user: false
current_stage: none
next_stage: none
complexity_score: 8
routing: discovery
base_capability_digest: ""
---

# PRD Discovery: Gestão de Contratos de Terceiros

Valid `status`: `active`, `ready-to-synthesize`, `completed`, `abandoned`. Valid stages: `framing`, `evidence`, `research+stakeholders`, `scope-options`, `decision-checkpoints`, `readiness`, `synthesis`, `none`. A user pause keeps `status: active` and sets `awaiting_user: true`.

## Session Log

| Date | Path | Start Stage | Outcome |
|------|------|-------------|---------|
| 2026-09-26 | discover | framing | completed — `PDQ-001`–`PDQ-009` answered (`PDD-001`–`PDD-009`); PRD sintetizado, validado (candidato + live) e registrado em `specs/prd.md` |

## Framing

- **Intent**: Administrar contratos de terceiros num único lugar: prazos de vigência visíveis antes do prejuízo, execução registrada com evidência e histórico que comprova o que foi combinado — plataforma multi-domínio, implantação local primeiro.
- **Primary actors**: `system_admin` (opera a plataforma), `admin` de domínio (usuários e finalidades), `gestor` (administra contratos e tarefas — usuário primário), `prestador` (executa e conclui tarefas com fotos).
- **Problem**: a planilha não avisa; contrato e evidência ficam espalhados em e-mail/pasta/drive; a responsabilidade sai junto com a pessoa; provar e cobrar exige histórico que ninguém tem.
- **Constraints**: implantação local via Docker Compose (backend 3001, frontend em `http://localhost/`); SQLite por domínio via `sql.js` (`data/domains/<id>.db` + `data/platform.db`); frontend Flutter Web, backend Express + Socket.io; promoção `dev` → `main` exige suíte unitária verde; escopo MVP já aprovado exclui subtarefas, multi-domínio por usuário, WCAG AA formal, deploy/CI e acesso de fornecedor além do papel `prestador`.

## Complexity Profile

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Product framing | 2/2 | Visão, atores, problema e valor registrados em `docs/approved-scope-draft.md` (aprovado) e `README.md` |
| Evidence | 1/2 | Pesquisa qualitativa set/2026 (`docs/resources.md`) com limitações declaradas; sem telemetria ou feedback de uso real; pesquisa externa dispensada (PDD-001) |
| Stakeholders | 1/2 | Decisor único (owner) com aprovação explícita só do MVP; papéis de usuário mapeados, sem dissidência registrada |
| Consequence | 1/2 | Impacto operacional e valor probatório (provar execução); escopo regulado (público/fiscal) está fora |
| Scope coupling | 1/2 | MVP entregue e itens de roadmap (R1–R5) acoplados a capacidades já existentes |
| Existing impact | 2/2 | Feature `specs/00001-contratos-mvp` entregue com 33/34 tasks `[X]`; o mapa de capacidades do PRD descreverá base já em uso |

- **Hard triggers**: impacto de épico concluído (feature 00001) — qualquer capacidade nova precisa ser reconciliada com o que já está implementado e validado; sem pluralidade de stakeholders registrada para decisões além do MVP; evidência externa indisponível nesta sessão (PDD-001), então afirmações de mercado permanecem como `HYP-###`.
- **Discovery depth**: full — score 8/12, escopo brownfield com base entregue e decisões de release em aberto.

## Evidence Ledger

| Evidence ID | Type | Claim or Observation | Source | Date | Confidence | Relevance |
|-------------|------|----------------------|--------|------|------------|-----------|
| EVD-001 | observed | Escopo aprovado pelo owner em 2026-09-22: visão, entidades, regras de negócio, MVP dentro/fora | `docs/approved-scope-draft.md` | 2026-09-22 | high | Delimita visão, escopo MVP e regras |
| EVD-002 | external | Pesquisa set/2026 converge em 3 eixos: não perder prazo, não perder documento, saber quem deve o quê; desejo nº 1 = alertas escalonados (90/60/30/15) | `docs/resources.md` | 2026-09 | medium | Prioridade de capacidades e métricas |
| EVD-003 | observed | Roadmap prioriza R1 alertas de vigência, R2 central documental, R3 importação CSV; lista "Já coberto" do que o app já faz | `docs/roadmap.md` | 2026-09 | high | Fronteira de release e capacidades P2/P3 |
| EVD-004 | observed | Feature 00001 entregue: 33 de 34 tasks `[X]`; pendente apenas T031 (bootstrap web + labels de a11y) | `specs/00001-contratos-mvp/tasks.md` | 2026-09-26 | high | Base existente; impacto no capability map |
| EVD-005 | observed | Validação E2E 28/28 no stack publicado (`http://localhost/`) e `backend/test.sh` 16/16 checks | `TODO.md`, `backend/test.sh` | 2026-09-26 | high | Confiança no MVP atual |
| EVD-006 | observed | Suíte unitária backend com 35 testes passando (`node:test`) — gate de promoção | `TODO.md` | 2026-09 | high | Restrição de qualidade |
| EVD-007 | observed | Rotas implementadas: domínios, usuários, finalidades, contratos (+prorrogação, encerramento, PDF/CSV), tarefas (+conclusão, reabertura), comentários, anexos, busca, dashboard, e-mail, relatório | `backend/src/routes/*.js` | 2026-09-26 | high | Capacidades já existentes vs. gaps |
| EVD-008 | observed | Governança v2: SQLite por domínio, uploads em disco, `dev` → `main` com testes | `project-instructions.md` | 2026-09-22 | high | Restrições de produto e não-funcionais |
| EVD-009 | observed | README define papéis, matriz de permissões e fluxo prático em 5 passos | `README.md` | 2026-09 | high | Personas e fluxo de uso |
| EVD-010 | reported | Limitações da pesquisa: reviews majoritariamente internacionais, números de vendor qualitativos, transcrições de vídeo bloqueadas | `docs/resources.md` | 2026-09 | medium | Peso das evidências externas |

Não foi criado `specs/prd-research.md`: pesquisa externa não rodou (PDD-001).

## Hypothesis Ledger

| Hypothesis ID | Hypothesis | Basis | Validation Needed | Status |
|---------------|------------|-------|-------------------|--------|
| HYP-001 | Alertas escalonados de vigência são o principal valor que faz o usuário sair da planilha | EVD-002, EVD-003 | Uso real e feedback de gestores na primeira release | open |
| HYP-002 | Importar planilha CSV é a barreira decisiva de adoção de quem sai do Excel | EVD-002, EVD-003 | Onboarding de usuários reais com e sem importação | open |
| HYP-003 | `gestor` é o usuário primário diário; `prestador` é o usuário secundário de maior frequência | EVD-007, EVD-009 | Observação ou telemetria de uso | open |
| HYP-004 | Implantação local via Docker Compose atende os primeiros usuários | EVD-008, EVD-005 | Demanda real de acesso fora da máquina local | open |
| HYP-005 | O comprador é uma empresa de médio porte que contrata serviços terceirizados e decide por ganho de controle de prazo | EVD-002, EVD-009 | Evidência de compra; nenhuma fonte local identifica o decisor | open |

## Stakeholder Map

| Stakeholder | Role | View or Need | Evidence | Agreement Status |
|-------------|------|--------------|----------|------------------|
| Owner do projeto | approver | Define escopo e aprova promoção `dev` → `main` | EVD-001, EVD-008 | explicit-consensus (somente sobre o MVP aprovado em 2026-09-22) |
| Owner do projeto | approver | Prioridades do roadmap R0–R5 sem registro de aprovação | EVD-003 | individual |
| Gestor | user | Ver prazos, execução e provar o que foi feito | EVD-002, EVD-009 | individual |
| Prestador | user | Executar e concluir com texto e fotos | EVD-009 | individual |
| Admin de domínio | operator | Gerir usuários e dicionário de finalidades | EVD-009 | individual |
| system_admin | operator | Habilitar/suspender domínios sem ver dados de negócio | EVD-001, EVD-009 | individual |
| Comprador / decisor de compra | buyer | Sem registro no repositório: quem avalia e paga a ferramenta (HYP-005) | — | unknown |

## Scope Options

### Option A: Consolidação do MVP entregue

- **Outcome**: primeira release igual à base já validada (E2E 28/28), fechando a lacuna de acessibilidade T031 — risco mínimo, nenhuma capacidade nova.
- **Provisional capabilities**: ciclo de domínio e papéis; contrato com vínculo, vigência e encerramento; tarefa com fluxo, conclusão documentada e reabertura; comentários e anexos; busca e filtros; relatório PDF/CSV; dashboard; e-mail opt-in; tempo real; isolamento multi-domínio; a11y básico concluído.
- **Excluded**: todo o roadmap R1–R5 (alertas de vigência, central documental, CSV, indicadores, WhatsApp/mobile).
- **Evidence**: EVD-004, EVD-005, EVD-007.
- **Tradeoffs and risks**: entrega imediata, mas não atende o desejo nº 1 da pesquisa (EVD-002) — `atrasado` só aparece quando já é prejuízo; risco de o produto não diferir de uma planilha melhorada.

### Option B: MVP + alertas de vigência (R1)

- **Outcome**: o gestor descobre o vencimento antes dele — painel "vence primeiro" (90/60/30/15) e avisos por e-mail e in-app, com janelas configuráveis por domínio.
- **Provisional capabilities**: tudo da Opção A; painel de próximos vencimentos; varredura de previsão de contrato com janelas configuráveis; aviso in-app e e-mail; reuso do histórico de tarefas como trilha de avisos.
- **Excluded**: central documental (R2), importação CSV (R3), indicadores por prestador (R4), WhatsApp/reajuste/mobile (R5).
- **Evidence**: EVD-002 (desejo nº 1 e nº 3), EVD-003 (R1 já mapeado sobre `runDueSweep`/`notify()` existentes).
- **Tradeoffs and risks**: esforço médio antes de novas capacidades; e-mail depende de `SMTP_*` configurado (sem isso, só in-app); HYP-001 segue sem validação até o uso real.

### Option C: MVP + alertas + central documental (R2)

- **Outcome**: cobre os dois primeiros eixos da pesquisa — prazo e documento — com anexos de contrato, ocorrências e trilha de alterações.
- **Provisional capabilities**: tudo da Opção B; anexos no contrato (PDF assinado, aditivos); ocorrências/comunicações; trilha de alterações do contrato.
- **Excluded**: importação CSV (R3), indicadores (R4), WhatsApp/mobile (R5).
- **Evidence**: EVD-002 (desejos nº 2 e nº 5), EVD-003 (R2).
- **Tradeoffs and risks**: escopo maior e release mais demorada; mais superfície para testar antes de ter usuários reais.

### Option D: MVP + alertas + importação CSV (R3)

- **Outcome**: conversão de quem sai do Excel — painel de vencimentos já populado logo no primeiro login.
- **Provisional capabilities**: tudo da Opção B; importação de planilha CSV de contratos com mapeamento de colunas.
- **Excluded**: central documental (R2), indicadores (R4), WhatsApp/mobile (R5).
- **Evidence**: EVD-002 (recomendação nº 3), EVD-003 (R3), HYP-002.
- **Tradeoffs and risks**: prioriza adoção sobre profundidade documental; HYP-002 não tem evidência externa validada nesta sessão (PDD-001).

## Decision Ledger

| Decision ID | Decision | State | Outcome | Decision Maker | Evidence / Rationale | Date |
|-------------|----------|-------|---------|----------------|----------------------|------|
| PDD-001 | Como obter evidência externa | accepted | Somente evidência local (`docs/resources.md`, `docs/roadmap.md`, escopo aprovado); delegação `sddp-technical-researcher` não reexecutada; lacunas mantidas como `HYP-###`/`PDQ-###` | User | PDQ-001; limite de profundidade de subagente; EVD-010 | 2026-09-26 |
| PDD-002 | Quem executa a validação do PRD | accepted | O orquestrador humano executa `node scripts/validate-prd.mjs` e devolve o JSON; o agente entrega o caminho exato e só grava/registra após PASS no candidato e no PRD live | User | PDQ-002; bash negado para o agente | 2026-09-26 |
| PDD-003 | Fronteira da primeira release canônica | accepted | Opção B: MVP já entregue + alertas de vigência (painel "vence primeiro" 90/60/30/15, avisos in-app e e-mail); R2, R3, R4 e R5 deferidos | User | PDQ-003; EVD-002, EVD-003 | 2026-09-26 |
| PDD-004 | Nome canônico do produto | accepted | `product: Gestão de Contratos de Terceiros`; "InHome" permanece como nome do repositório/projeto | User | PDQ-004; README, EVD-001 | 2026-09-26 |
| PDD-005 | Comprador e segmento-alvo | accepted | Mantido como hipótese não verificada `HYP-005`: empresa de médio porte com serviços terceirizados; comprador = responsável pela operação; usuário primário `gestor`, secundário `prestador` | User | PDQ-005; ausência de fonte local | 2026-09-26 |
| PDD-006 | Métricas de sucesso da primeira release | accepted | 4 métricas com leitura manual nos primeiros 90 dias: previsão cadastrada em 100% dos contratos vigentes, zero atraso sem aviso prévio, 100% das conclusões documentadas, suíte verde em 100% das promoções | User | PDQ-006 | 2026-09-26 |
| PDD-007 | Importação de planilha CSV (R3) | deferred | Deferida para a release seguinte; `HYP-002` permanece aberta | User | PDQ-007; EVD-003 | 2026-09-26 |
| PDD-008 | WhatsApp, reajuste automático e mobile (R5) | rejected | Fora de escopo da primeira release | User | PDQ-008; EVD-003 | 2026-09-26 |
| PDD-009 | Escopo regulado (contratos públicos, fiscal/NFS-e, Lei 14.133, ICP-Brasil) | rejected | Fora de escopo; assinatura, se necessária, entra por integração com parceiro | User | PDQ-009; EVD-003 | 2026-09-26 |

## Question Ledger

| Question ID | Question | Why It Matters | Owner | Status | Resolution |
|-------------|----------|----------------|-------|--------|------------|
| PDQ-001 | A evidência externa pode ser obtida agora? A delegação `sddp-technical-researcher` falhou (limite de profundidade de subagente neste sessão) | Define se o PRD se apoia em evidência externa ou só na pesquisa local de set/2026 | User | answered | PDD-001 |
| PDQ-002 | Como executar `node scripts/validate-prd.mjs` (candidato e live)? O bash está negado nesta sessão (somente `echo` é permitido) | Sem PASS do validador o PRD não pode ser gravado nem registrado na config | User | answered | PDD-002 |
| PDQ-003 | Qual a fronteira da primeira release canônica: MVP entregue, MVP + alertas de vigência (R1), ou mais? | Define escopo, prioridades P1/P2 e métricas | User | answered | PDD-003 |
| PDQ-004 | Qual nome de produto canônico no PRD? | Preenche `product` no frontmatter e o título do documento | User | answered | PDD-004 |
| PDQ-005 | Quem é o comprador/decisor primário e qual segmento-alvo (porte/setor)? | Sessão Target Users / Stakeholders e abordagem de validação | User | answered | PDD-005 (hipótese `HYP-005`) |
| PDQ-006 | Quais métricas de sucesso mensuráveis para a primeira release, dado que não há telemetria hoje? | Seção Success Metrics exigida pelo validador em `planning-ready` | User | answered | PDD-006 |
| PDQ-007 | Importação de planilha CSV (R3) entra ou fica deferida? | Fronteira de escopo; hipótese de adoção sem validação | User | answered | PDD-007 |
| PDQ-008 | WhatsApp, reajuste automático e mobile (R5) ficam fora da primeira release? | Evita expansão silenciosa de escopo | User | answered | PDD-008 |
| PDQ-009 | Contratos públicos, fiscal/NFS-e e Lei 14.133 permanecem fora de escopo? | Evita escopo regulado não planejado | User | answered | PDD-009 |

## Readiness

| Area | Status | Evidence or Gap |
|------|--------|-----------------|
| Vision and problem | ready | EVD-001, EVD-002; Framing |
| Primary users and stakeholders | ready | EVD-009; PDD-005 registra o comprador como `HYP-005` não bloqueante |
| Evidence and hypotheses | ready | EVD-001–EVD-010; `HYP-001`–`HYP-005` abertas como limitações assumidas (PDD-001) |
| Scope and exclusions | ready | PDD-003 (Opção B), PDD-007, PDD-008, PDD-009 |
| Outcomes and measures | ready | PDD-006 (4 métricas, janela de 90 dias, leitura manual) |
| Constraints, dissent, and open decisions | ready | Sem dissidência registrada; `PDQ-001`–`PDQ-009` answered |

## Synthesis Record

- **Canonical candidate**: specs/prd.candidate.md → specs/prd.md (bytes idênticos, confirmados por `cmp`)
- **Final scope decisions**: PDD-003, PDD-004, PDD-005, PDD-006, PDD-007, PDD-008, PDD-009
- **Assigned capabilities**: CAP-001–CAP-009 (7 em P1, 2 em P2)
- **Validator result**: PASS — candidato e live com `--profile planning-ready`, ambos `"valid": true`, exit 0
- **Registration result**: registered — `.github/sddp-config.md` → `## Product Document` → `**Path**: specs/prd.md`
