# Research — E013 Redesign visual do dashboard

## M3 dashboard / KPI patterns

- KPI como `Card` (ou `surfaceContainerHigh`) com colunas `Wrap`/`Row` de contadores; cor por status mapeada só para tokens do `ColorScheme` existente: `atrasado`→`error`/`errorContainer`, `vigente`→`primary`/`primaryContainer`, `encerrado`→`outline`/`onSurfaceVariant` (neutro), `a vencer`→`tertiary`/`secondary`. Todos os pares `on*` para texto garantem 4,5:1 por construção do M3.
- M3 define 26+ papéis de cor com pares `on-*` algoriticamente contrastantes e superfícies tone-based (`surfaceContainer*`) que substituem tons fixos. Padrão de domínio: `ThemeExtension` para papéis de status quando o `ColorScheme` não cobre — aqui não é preciso: `error`/`tertiary`/`outline` cobrem os três status.
- Evitar: hex copiado do mockup (risco registrado em E013 Assumptions); comunicar status só por cor — usar ícone/texto alongside (WCAG 1.4.1).
- Responsivo: `LayoutBuilder` + `constraints.maxWidth` com breakpoints 600/840dp é o caminho documentado do Flutter para reflow local. `Wrap` com childAspectRatio calculado evita overflow horizontal sem dependência nova. O `dashboard_screen.dart` atual já usa `LayoutBuilder` em `_StatGrid` — reutilizar a técnica.

## Urgência de vencimento

- Ordenação por `forecast_date` ascendente (mais urgente primeiro), cápsula de janela (90/60/30/15) reutilizando a semântica de E005; contrato `atrasado` no topo com `errorContainer`; sem previsão → chip "incompleto" neutro (não some — regra de E005 SC-005).
- Agrupamento por bucket de prazo com ordenação interna ascendente já é o padrão adotado em `specs/00011-e005-painel-vencimentos/research.md`; dashboards usam cor semântica (traffic-light) apenas com rótulo textual explícito.
- Evitar: ordenar por status depois por data (esconde o vencimento crítico); mostrar "a vencer" sem indicar a janela ativa de E005.

## Edge cases

- Domínio vazio: KPIs zerados + empty state dedicado (E005/E006 já tratam "painel zera sem erro e sem cartões quebrados").
- Viewport estreito: reflow via `LayoutBuilder` sem overflow horizontal; testar com resize de janela no Chrome.
- Prestador: visão restrita às próprias tarefas, sem KPIs de domínio (FR-002 de E006 — não vazar contadores); `system_admin` segue 403 (FR-003).
- Contrato alertado e prorrogado: volta a contar na janela atingida (estado de `alert_events`).
- Filtro no corpo: KPIs e cards refletem filtro sem nova requisição.

## Acceptance criteria patterns para visual redesign

- SCs mensuráveis e observáveis em tela, não "visual agradável": (a) contagem por status correta em domínio de teste com cor distinta por status e diff sem hex; (b) ordenação visível 20d > 90d com vencimento e responsável no card; (c) reflow sem overflow em viewport estreito; (d) prestador sem KPIs de domínio lado a lado; (e) `flutter analyze` limpo, sem dependência nova em `pubspec.yaml`, sem `headline6`/`bodyText2`.
- Padrão do projeto em E006/E005 (SC-00x Given/When/Then comparáveis lado a lado) e restrições de E013 Acceptance Criteria.
- Evitar: critérios subjetivos ("segue o mockup") sem verificação executável; esquecer regressão de a11y (rótulos/teclado de E006 FR-005, risco registrado em E013).

## Sources

| URL | Topic |
|-----|-------|
| https://api.flutter.dev/flutter/material/ColorScheme-class.html | ColorScheme roles/tokens |
| https://docs.flutter.dev/ui/adaptive-responsive/general | LayoutBuilder vs MediaQuery, breakpoints |
| https://m3.material.io/styles/color/system | M3 color roles |
| https://dashboarddesignpatterns.github.io/patterns.html | semantic color in dashboards |

## Summary

3 decisões para a spec: (1) mapeamento status→tokens `ColorScheme` acima elimina o risco de hex; (2) ordenação por data com janela de E005 reusa semântica já entregue; (3) SCs devem ser Given/When/Then observáveis com diff sem hex e reflow verificável. Lacuna: mockup HTML inutilizável — layout segue plano E013 e padrões M3.
