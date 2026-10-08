---
name: dashboard-admin
description: "Design reference for the domain-admin dashboard: visual tokens, fb-* layout and component classes, hierarchy rules, and interaction patterns. Use when building or reviewing admin-domain screens (painel, contratos, vencimentos, tarefas, usuários) in the Flutter web frontend or in HTML/CSS references."
---

# Dashboard Admin — Design Skill

## Quando usar

Use esta skill ao construir ou revisar telas do administrador de domínio: painel
de visão geral, lista de contratos, próximos vencimentos, tarefas e usuários do
domínio. Ela responde por layout, espaçamento, hierarquia e tokens visuais — o
conteúdo (domínio, papéis, regras) continua vindo de `specs/prd.md`.

Também use ao propor componente novo que precise dialogar com o que já existe:
antes de criar uma classe paralela, verifique a tabela de componentes abaixo.

Fora do alcance desta skill: tela de login, painel do `system_admin` da
plataforma, relatório em PDF/CSV, tema escuro, estados vazios e de erro.

## Arquivos

| Arquivo | Responsabilidade | Regra |
|---|---|---|
| `SKILL.md` | documentação: tokens, layout, componentes, interação | sem CSS nem HTML |
| `style.css` | tokens em `:root` + todos os componentes `fb-*` | sem markup nem prosa |
| `index.html` | página de referência executável do painel | sem `<style>`, sem `<script>` |

Abra `index.html` direto no navegador (`file://`): a folha é relativa, sem rede,
sem build. Os ícones são um sprite inline no próprio HTML.

## Estrutura de layout

```
fb-page-layout  (altura: 100vh)
└─ fb-flex-row
   ├─ fb-sidebar 240px
   │    fb-sidebar-account-and-notifications   conta + sino de notificações
   │    fb-sidebar-searchbar                   busca do domínio
   │    fb-sidebar-nav                         fb-sidebar-row + fb-divider
   │    fb-sidebar-footer                      domínio ativo (tenant)
   └─ fb-page  (border-left)
      ├─ fb-toolbar-48  48px                   trilha (caminho) + ações
      └─ fb-page-content-columns  (flex row, overflow hidden)
         ├─ fb-page-content  flex 1 · overflow-y: auto  ← rolagem da coluna
         │    fb-viewbar      64px · sticky top:0        h1 + filtros
         │    fb-fading-content  margin-left: 32px       bloco rolante
         │      fb-stat-grid   → fb-card fb-stat
         │      fb-section     → fb-tile-grid → fb-card  vencimentos
         │      fb-section     → fb-list                 tarefas
         └─ fb-page-right-column  304px · rolagem própria
              fb-page-right-column-header   título do rail
              fb-page-right-column-rows     janelas 90/60/30/15 + atrasados
              fb-page-right-column-lower    usuários do domínio
```

Espaçamentos que não mudam: 32px entre a coluna central e o rail, 32px de
margem esquerda do conteúdo, 24px de topo no rail, 32px de gap na grade de
cards, 32px de padding da toolbar. Tudo deriva da escala `--space-*` (múltiplos
de 4px).

Duas colunas rolando em conjunto: só a coluna central e o rail têm
`overflow-y`. O wrapper das colunas nunca rola, senão o `fb-viewbar` sticky
perde o eixo.

## Tokens

Vivem em `:root` no topo do `style.css`. O seed de cor é o mesmo de
`frontend/lib/theme/app_theme.dart` (`#4338CA`), então referência web e app
Flutter enxergam a mesma marca.

**Cor**

| Grupo | Tokens | Uso |
|---|---|---|
| Superfície | `--color-bg` `#f8fafc`, `--color-surface` `#fff`, `--color-bg-secondary` `#f1f5f9` | fundo da área de conteúdo, cards/sidebar, hover e esqueleto |
| Linha e texto | `--color-border` `--color-border-strong`, `--color-text` `--color-text-muted` `--color-text-subtle` | divisores, texto principal/apoio/metadata |
| Marca | `--color-primary` `--color-primary-strong` `--color-primary-soft` `--color-primary-border` | botão primário, navegação ativa, links, foco |
| Semânticas sólidas | `--color-success` `--color-info` `--color-warning` `--color-danger` `--color-neutral` | pontos, número em alerta, acento de card |
| Semânticas suaves | `--color-*-soft` `-fg` `-border` | badges, fundo do card atrasado |

Mapeamento de urgência de vigência (é o coração da tela):

| Situação | Classe | Cor |
|---|---|---|
| atrasado (previsão vencida) | `fb-card--danger` + `fb-card--overdue`, `fb-badge--danger` | vermelho, corpo do card tingido |
| janela de 15 dias | `fb-card--danger`, `fb-window-row--danger` | vermelho |
| janela de 30 dias | `fb-card--warning`, `fb-window-row--warning` | âmbar |
| janela de 60 dias | `fb-card--info`, `fb-window-row--info` | azul |
| janela de 90 dias | `fb-card--neutral`, `fb-window-row` (default) | cinza |
| em vigência / concluída | `fb-badge--success` | verde |

**Tipografia** — três famílias com papéis fixos:

| Papel | Token | Onde entra |
|---|---|---|
| display (serifada) | `--font-display` | `h1` da tela, títulos de seção, título do rail |
| interface (sans) | `--font-sans` | corpo, navegação, botões, badges, títulos de card |
| dado (mono) | `--font-mono` | número de contrato, data, prazo, contagem |

Escala `--text-xs` 12 → `--text-3xl` 34 (base 14). Pesos 400/500/600/700. Números
do resumo usam `font-variant-numeric: tabular-nums`.

A serifada é local (`Iowan Old Style` / `Palatino` / `Georgia`): não há fonte
remota no projeto, porque o uso validado é em ambiente local. Se o app embutir
uma família própria, troque só `--font-display`.

**Forma, sombra, movimento** — `--radius-sm/md/lg` (6/10/13; o 13 é o raio
original do `fb-card`), `--shadow-sm/md` para repouso e elevação,
`--dur-fast/base` 120/180ms com `--ease`.

## Hierarquia

1. `h1` serifado 28 — nome da tela (`fb-viewbar`).
2. Títulos de seção serifados 18 (`fb-section-title`, `fb-rail-title`).
3. Título de card sans 16 semibold (`fb-card-title`).
4. Corpo 14 e metadados 12–13 em `--color-text-subtle`.

Regra de cor: neutro por padrão, cor só onde há significado operacional. Os
quatro números do resumo ficam sem acento de cor; apenas "Contratos atrasados"
fica vermelho. Se tudo estiver colorido, nada está urgente.

Regra de leitura: a coluna central responde "o que vence e o que está em
andamento"; o rail responde "quantos entraram em cada janela e quem está no
domínio". Não repita a mesma informação nos dois lados.

## Componentes

| Classe | Papel |
|---|---|
| `fb-page-layout` `fb-flex-row` `fb-page` | casca: 100vh, linha, coluna com borda esquerda |
| `fb-sidebar` `fb-sidebar-account-and-notifications` `fb-sidebar-searchbar` `fb-sidebar-nav` `fb-sidebar-row` `fb-sidebar-footer` | lateral de 240px com conta, sino, busca, navegação e rodapé do tenant |
| `fb-toolbar-48` `fb-toolbar-crumbs` `fb-toolbar-actions` | barra superior: caminho + data + ação primária |
| `fb-viewbar` `fb-viewbar-heading` `fb-viewbar-filters` `fb-chip` | título da tela + filtros (sticky) |
| `fb-stat-grid` `fb-card` `fb-stat` `fb-stat-label` `fb-stat-value` `fb-stat-foot` | números do domínio |
| `fb-section` `fb-section-header` `fb-section-title` `fb-section-link` | bloco com título e atalho "ver todos" |
| `fb-tile-grid` | grade responsiva de cards, `minmax(272px, 1fr)`, gap 32 |
| `fb-card-body` `fb-card-kicker` `fb-card-title` `fb-card-meta` `fb-card-tags` `fb-tag` | dentro do card: contrato, objeto, prestador, finalidade |
| `fb-file-card-footer` `fb-file-card-footer-text-container` `fb-card-date` | rodapé do card com data de finalização + badge de urgência |
| `fb-badge` `fb-badge-dot` `fb-badge--danger/warning/info/success/neutral` | estado operacional e urgência |
| `fb-list` `fb-list-head` `fb-list-row` `fb-list-main` `fb-list-title` `fb-list-meta` `fb-list-side` `fb-list-prazo` | tabela leve de tarefas |
| `fb-page-right-column` `…-header` `…-rows` `…-lower` `…-user-list` `…-user` | rail de alertas e usuários |
| `fb-window-row` `fb-window-dot` `fb-window-label` `fb-window-count` | uma janela de alerta com contagem |
| `fb-avatar` (`--sm` `--xs`), `fb-count`, `fb-icon-btn`, `fb-btn` `fb-btn--primary`, `fb-chip`, `fb-icon`, `fb-mono` | utilitários |
| `fb-circle-16/24` `fb-rectangle-16/24/32/36` `fb-width-*` `fb-shrink-0` `fb-file-thumbnail` | esqueleto de carregamento |
| `fb-breadcrumb` `fb-header` `fb-toolbar-64/84` `fb-tile-grid-top-padding` `fb-border-radius-8` | primitivos para as demais telas |

Modificador: sufixo `--` para variante de cor ou forma (`fb-card--danger`),
`fb-is-` para estado (`fb-is-active`). Todo seletor carrega prefixo `fb-` para
não colidir com outras folhas quando o CSS entra no app.

## Padrões de interação

- **Entrada**: blocos da `fb-fading-content` sobem 12px com 60/150/240ms de
  atraso (`fb-rise`). Uma coreografia só — nada de animar item por item.
- **Repouso → hover**: card sobe 2px com `--shadow-md`; linha de lista e linha
  do rail ganham `--color-bg-secondary`; botão primário escurece para
  `--color-primary-strong`. Transições de 120/180ms.
- **Foco**: anel de 2px em `--color-primary` com offset 2px em todo
  `a`, `button` e `input`. Nunca remover.
- **Carregamento**: mesma marcação do estado pronto, com `is-loading` em
  `fb-fading-content` (ativa o degradê sobre o conteúdo), em `fb-sidebar` (últimas
  linhas a 50%) ou em `fb-page-right-column-user-list` (linhas a 60% e 30%),
  preenchida com `fb-rectangle-*`, `fb-circle-*` e `fb-width-*`.
- **Sem JavaScript**: filtros, botões e atalhos da referência são estáticos.
  Comportamento vivo é papel do Flutter; o HTML serve para validar layout e
  tokens.

Movimento é desligado por `prefers-reduced-motion: reduce`.

## Responsividade

| Largura | Comportamento |
|---|---|
| ≤1180px | rail encolhe para 268px, colunas da lista para 128/88px |
| ≤1000px | rail desce para baixo do conteúdo, com borda superior |
| ≤860px | `fb-viewbar` quebra em duas linhas; cabeçalho da lista some e as linhas empilham status/prazo |
| ≤760px | sidebar vira faixa horizontal rolável (busca + navegação em linha), rodapé do domínio escondido |
| ≤645px | grade de cards em 1 coluna, padding de 16px, rótulo do botão oculto (ícone + `aria-label`) |

## Acessibilidade (FR-028)

Labels, contraste e teclado. Os tokens de texto passam AA sobre as superfícies
definidas (texto sutil `#64748b` sobre branco ≈ 4.8:1; branco sobre
`--color-primary` ≈ 7.9:1). Navegação com `aria-current="page"`, títulos em
ordem `h1 → h2 → h3`, busca com `aria-label`, datas em `<span>` mono com
contraste de tabular.

O botão da referência tem 40px de altura para caber na toolbar de 48px; no
Flutter o `FilledButton` mantém 48×48 (`app_theme.dart`). O alvo de clique web
fica ≥40px com anel de foco visível.

## Conteúdo

Copy em português do domínio, sem jargão de design: contrato, objeto,
finalidade, prestador, tarefa, vigência, janela de alerta, atrasado. Datas no
formato `dd/mm/aaaa` em mono. O que é demonstração (nomes, contratos
`CTR ###/2026`, contagens) é dado fake plausível e deve ser trocado por dado
real na tela de verdade.

## Não extraído do exemplo de origem

- Shell do Figma (`specs/modelo_dashboard_admin_do_dominio.html`): 115
  `<script>` de figma.com, preloads, bootstrap e metas — descartado.
- `@font-face` de Apercu/Figma Sans apontando para `static.figma.com` —
  descartado; a skill usa pilha de fontes locais.
- Classes sem correspondência no domínio: `fb-file-tile-DEPRECATED`,
  `fb-project-tile*`, `fb-project-preview-grid`, `fb-team-tile`,
  `fb-profile-grid-header`.
- Degradê de esmaecimento do esqueleto e as linhas que perdem opacidade: só
  com `is-loading`, senão o conteúdo real ficaria apagado.

## Verificação

```sh
wc -c .github/skills/dashboard-admin/{SKILL.md,style.css,index.html}
grep -c '<style\|<script' .github/skills/dashboard-admin/index.html   # esperado: 0
# toda classe fb- do HTML existe no CSS
python3 - <<'PY'
import re
h = open('.github/skills/dashboard-admin/index.html').read()
c = open('.github/skills/dashboard-admin/style.css').read()
used = {x for m in re.finditer(r'class="([^"]+)"', h) for x in m.group(1).split() if x.startswith('fb-')}
defined = {x for s in re.findall(r'([^{}]+)\{', c) for p in s.split(',') for x in re.findall(r'\.([a-zA-Z0-9_-]+)', p)}
print('faltando:', sorted(used - defined) or 'nenhuma')
PY
```
