---
name: design-system
description: "Padrões visuais do app Flutter 'Gestão de Contratos de Terceiros'. Usar em qualquer trabalho de UI/UX no frontend Flutter — layout, componentes, tema, acessibilidade, feedback e testes de tela."
---

# Design System do Frontend Flutter

Referência canônica do visual do app. Toda tela nova ou alteração de UI no
`frontend/` segue estas regras; quando houver conflito com outro documento,
este skill vale para decisão de UI. Caminhos citados são exemplos reais do
código, não templates para copiar literalmente.

## 1. Tokens e tema

`frontend/lib/theme/app_theme.dart` é a única fonte de cor e estilo.

- Cor sempre via `ThemeData.colorScheme` (`primary`, `secondary`, `tertiary`,
  `error`, `surface`, `onSurfaceVariant`, `outlineVariant`…). Hex literal só
  dentro de `app_theme.dart` (ex.: `seedColor` indigo `0xFF4338CA`,
  `scaffoldBackgroundColor` `0xFFF8FAFC`); em tela ou widget, nunca.
- API de texto Material 3: `titleLarge`, `titleMedium`, `bodyMedium`,
  `bodySmall`, `labelMedium`. APIs antigas (`headline6`, `bodyText2`,
  `subtitle1`) foram removidas do SDK — usar é erro de compilação.
- Novo estilo ou regra de componente entra em `app_theme.dart`
  (`filledButtonTheme`, `inputDecorationTheme` já seguem esse padrão). Nunca
  criar arquivo de tema paralelo nem `ThemeData(...)` local em tela.
- Existem `AppTheme.light` e `AppTheme.dark`. O `main.dart` hoje amarra
  `theme`/`darkTheme` com `ThemeMode.system`; o épico E014
  (`specs/plan/E014.md`) torna o escuro o default com toggle para o claro.
  Qualquer cor nova precisa ficar legível nos dois modos — testar nos dois.
- Contraste: texto sobre cor >= WCAG AA (4.5:1), já documentado no topo de
  `app_theme.dart` e verificado por `frontend/test/a11y_labels_test.dart`.
  Botões primários com mínimo 48x48 (`filledButtonTheme`).

## 2. Componentes e padrões

- **Primário**: `FilledButton` (ex.: "Criar" em
  `contract_detail_screen.dart`, ações do `task_detail_sheet.dart`).
- **Secundário**: `OutlinedButton` (ex.: ações de arquivo e destrutivas
  leves no `task_detail_sheet.dart:398`).
- **Ação leve em linha**: `TextButton.icon` — o caso canônico é
  "Desvincular" na lista de prestadores (`contract_detail_screen.dart:296`).
- **Diálogo**: confirmação/cancelamento com `FilledButton`
  (confirmar) + `TextButton` (cancelar), como em
  `contract_detail_screen.dart:541`.
- **Card**: `Card` com shape/raio herdado do tema, margem zero quando
  encadeado (`_ProjectCard` do `dashboard_screen.dart`).
- **Card clicável**: `InkWell` + `MouseRegion` (cursor `click`, vira `wait`
  durante carregamento), `CircularProgressIndicator` no lugar do ícone de
  ação enquanto voa, flag local bloqueando duplo-tap, e `SnackBar` de erro
  sem derrubar a tela. Modelo: `_ProjectCardState` em
  `dashboard_screen.dart:776-799`.
- **Chips**: status e papéis via `Chip` com label pronto em PT
  (`users_screen.dart:176` com `_roleLabel`, `_statusChip` do
  `suggestion_panel.dart`). Não montar bolinhas de cor solta sem texto.
- **Ícone com significado**: `IconButton.tooltip` (ex.: "Atualizar painel"
  no dashboard) ou `Tooltip` envolvendo o ícone (`suggestion_panel.dart:1058`).

## 3. Acessibilidade e teclado

- Todo alvo de toque tem `Semantics`. Corpo de tela usa `Semantics(container:
  true, label: …)` (visto em todas as telas: `audit_screen.dart`,
  `projects_screen.dart`, `task_detail_sheet.dart:298`).
- `container: true` é **obrigatório** em `Semantics(button: true)`. Sem ele
  o nó se funde ao nó de texto vizinho (ex.: o label do card virou
  `"Dashboard\nAbrir tarefas…"` no dashboard) e quebra leitores de tela e
  finders de teste.
- Labels em PT, exatos e estáveis — viram finder de teste, então mudar a
  string é breaking change nos testes: `'Painel do domínio'`,
  `'Abrir tarefas do projeto <nome>'` (`dashboard_screen.dart:797`),
  `'Prestador vinculado <nome>'` (`contract_detail_screen.dart:279`),
  `'Detalhe da tarefa'` (`task_detail_sheet.dart:299`).
- Rolagem por teclado: o scrollable precisa de foco dentro dele — padrão
  `Focus(autofocus: true, skipTraversal: true, …)` envolvendo o conteúdo
  dentro do `SingleChildScrollView` (`dashboard_screen.dart:150`).
  `skipTraversal` mantém o Tab indo direto aos controles focáveis.
- Atalhos de rolagem variam por plataforma: na **web** as setas puras rolam;
  no mapa de teste/Android/desktop (que é o que o `flutter test` usa) rolam
  **Ctrl+seta** e **PageUp/PageDown**. **Home/End não têm atalho de rolagem
  em nenhum mapa** — não depender deles nem escrever teste que espere isso.

## 4. Responsividade

- `LayoutBuilder` + `ConstrainedBox`/`BoxConstraints` com breakpoints
  numéricos, como já usado no app:
  - coluna estreita de KPIs quando `maxWidth >= 720` (`dashboard_screen.dart:163`);
  - grid de stats com largura mínima de card 200px e divisão por `perRow`
    (`dashboard_screen.dart:450`);
  - limites de largura 400 (login), 420 (form de erro do dashboard),
    `ConstrainedBox` no corpo do contrato (`contract_detail_screen.dart:209`).
- Sem pacote novo de UI/layout sem decisão explícita do usuário. `fl_chart`
  e `responsive_framework` já foram rejeitados como padrão; `pubspec.yaml` é
  fechado (http, shared_preferences, flutter_secure_storage, provider,
  socket_io_client, intl, go_router).
- Testar larguras de tela estreitas: `flutter analyze` não pega overflow —
  só teste com superfície reduzida ou inspeção pega.

## 5. Estados e feedback

- **Loading**: `CircularProgressIndicator` (spinner inline ou no lugar do
  ícone de ação; nunca bloquear a tela inteira sem sinal).
- **Erro**: texto em `colorScheme.error` quando é estado da tela; erro de
  ação via `SnackBar` com retry quando fizer sentido. Helper `_errorText`
  (`dashboard_screen.dart`) remove o invólucro `Exception: ` para não vazar
  jargão de framework para o usuário.
- **Vazio**: card/mensagem com ação (`_EmptyProjectsCard` do dashboard) —
  nunca só uma linha cinza.
- **Confirmação e resultado**: `SnackBar` via `_snack(...)`. Mensagem de
  erro do backend vem do campo `code` estável, traduzida para PT: ver
  `OPEN_TASKS_BLOCK_UNLINK`, `PRESTADOR_NOT_LINKED` em
  `contract_detail_screen.dart:145-191` e `PURPOSE_RETIRED` em
  `projects_screen.dart:78`. Nunca exibir `code` cru nem mensagem EN do
  backend na UI.
- **Ícones de status/urgência**: `Tooltip` com frase de significado
  (ex.: `'Tarefas com prioridade urgente em aberto'` no dashboard).

## 6. Copy

- PT-BR, frases curtas e concretas. Nada de jargão de framework ("widget",
  "state", "provider") nem termo inglês na UI.
- Plural/singular corretos em mensagens de contagem, no formato "N …
  impedem …": `'1 tarefa em aberto impede desvincular'` vs
  `'$open tarefas em aberto impedem desvincular'`
  (`contract_detail_screen.dart:187-191`). Se a contagem vier do backend
  (`e.details['open_tasks']`), montar a frase localmente; se vier sem número,
  usar a forma sem contagem.
- Verbos de ação diretos no botão ("Criar", "Salvar", "Desvincular"),
  substantivos no cabeçalho. Mensagens de sucesso curtas ("Prestador
  desvinculado").

## 7. Testes de UI

- Finder por `Semantics` label **exato** (`find.bySemanticsLabel('…')`);
  nunca por trecho de texto que possa estar fundido a outro label. Se o
  finder falhar com label "inesperado", o problema costuma ser um
  `Semantics` sem `container: true` (seção 3), não o teste.
- Teste de teclado usa Ctrl+seta/PageDown (helper `scrollByLine` em
  `test/dashboard_projects_nav_test.dart`), nunca Home/End e nunca seta pura
  fora do cenário web.
- Superfície e API via injeção: telas aceitam seam de `ApiService`
  (`DashboardScreen(api:)`, `ContractDetailScreen(api:)`), e o teste define
  um `_FakeApi extends ApiService` sobrepondo `role`/`get`. Preferir esse
  padrão a mock de canal HTTP.
- `SharedPreferences.setMockInitialValues` para estado de sessão
  (`auth_role`, `auth_token`) — ver `dashboard_projects_nav_test.dart`.
- Rodada de verificação: `docker run --rm -v "$PWD/frontend":/app -w /app
  ghcr.io/cirruslabs/flutter:stable sh -c "flutter pub get && flutter analyze
  && flutter test"`. Se falhar por artefato/concorrência de `.dart_tool`
  (outra lane rodando no mesmo diretório), esperar ~60s e repetir uma vez.

## Quando este skill NÃO se aplica

Backend (`backend/`), artefados SDD (`specs/`, `checklists/`) e scripts seguem
seus próprios documentos (`artifact-conventions` cobre os artefatos). Mudanças
de tema base ou de tokens só através de `app_theme.dart` e, quando afetarem
todas as telas, com revisão explícita do usuário.
