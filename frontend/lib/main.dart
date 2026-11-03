import 'package:flutter/material.dart';
import 'services/api_service.dart';
import 'models/user.dart' show hasAuditAccess;
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/projects_screen.dart';
import 'screens/tasks_screen.dart';
import 'screens/domains_screen.dart';
import 'screens/users_screen.dart';
import 'screens/finalidades_screen.dart';
import 'screens/vencimentos_screen.dart';
import 'screens/audit_screen.dart';
import 'services/theme_preference_store.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  // FR-027: web bootstrap entrypoint (Chrome, Edge, Firefox, Safari) —
  // frontend/web/index.html loads flutter_bootstrap.js which calls main().
  // FR-065: resolve a preferência antes do primeiro frame; falha de leitura
  // cai no escuro sem expor a interface clara.
  WidgetsFlutterBinding.ensureInitialized();
  ThemeMode initialThemeMode;
  try {
    initialThemeMode = await ThemePreferenceStore.load();
  } catch (_) {
    initialThemeMode = ThemeMode.dark;
  }
  runApp(ProjectManagerApp(initialThemeMode: initialThemeMode));
}

class ProjectManagerApp extends StatefulWidget {
  const ProjectManagerApp({
    super.key,
    this.initialThemeMode = ThemeMode.dark,
  });

  /// FR-064: default escuro na primeira execução, independente do SO.
  final ThemeMode initialThemeMode;

  @override
  State<ProjectManagerApp> createState() => _ProjectManagerAppState();
}

class _ProjectManagerAppState extends State<ProjectManagerApp> {
  late ThemeMode _themeMode = widget.initialThemeMode == ThemeMode.light
      ? ThemeMode.light
      : ThemeMode.dark;

  /// FR-066/FR-067: troca o tema em memória e grava a escolha local.
  Future<void> _toggleTheme() async {
    final next =
        _themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    setState(() => _themeMode = next);
    await ThemePreferenceStore.save(next);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Gestão de Contratos',
      debugShowCheckedModeBanner: false,
      // FR-028: accessible light/dark themes (contrast + touch targets).
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      // FR-067: a escolha do usuário vence o tema do sistema operacional.
      themeMode: _themeMode,
      home: AuthGate(onToggleTheme: _toggleTheme),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key, this.onToggleTheme});

  /// FR-066: callback opcional para a toolbar alternar o tema do app.
  final VoidCallback? onToggleTheme;

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  final api = ApiService();
  bool _loading = true;
  bool _authenticated = false;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    try {
      final token = await api.token;
      if (token != null) {
        await api.get('/auth/me');
        setState(() {
          _authenticated = true;
          _loading = false;
        });
      } else {
        setState(() {
          _loading = false;
        });
      }
    } catch (e) {
      await api.clearToken();
      setState(() {
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_authenticated) {
      return MainShell(
        // Sem papel resolvido o shell trata como logout e volta ao login.
        onLogout: () {
          if (!mounted) return;
          setState(() => _authenticated = false);
        },
        onToggleTheme: widget.onToggleTheme,
      );
    }

    return LoginScreen(
      onLogin: () {
        setState(() => _authenticated = true);
      },
    );
  }
}

/// Um destino do rail e a tela correspondente.
class _NavEntry {
  const _NavEntry(this.label, this.icon, this.selectedIcon, this.screen);

  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final Widget screen;

  NavigationRailDestination toDestination() => NavigationRailDestination(
        icon: Icon(icon),
        selectedIcon: Icon(selectedIcon),
        label: Text(label),
      );
}

class MainShell extends StatefulWidget {
  const MainShell({super.key, this.onLogout, this.onToggleTheme});

  /// Chamado quando o papel da sessão não pode ser resolvido em nenhum dos
  /// dois passos (preferências nem /auth/me) — tratado como logout, volta ao
  /// login.
  final VoidCallback? onLogout;

  /// FR-066: alternância claro/escuro na top toolbar. Nulo em testes do
  /// shell isolado; o app real sempre injeta o callback da raiz.
  final VoidCallback? onToggleTheme;

  @override
  State<MainShell> createState() => _MainShellState();
}

/// Papéis do domínio em PT — mesmo vocabulário de `users_screen.dart`.
String _roleLabel(String role) {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'gestor':
      return 'Gestor';
    case 'prestador':
      return 'Prestador';
    case 'auditor':
      return 'Auditor';
    case 'system_admin':
      return 'Admin. do sistema';
    default:
      return role;
  }
}

class _MainShellState extends State<MainShell> {
  final api = ApiService();

  int _selectedIndex = 0;
  bool _loading = true;
  List<_NavEntry> _entries = const [];

  /// Identificação da sessão exibida acima do "Sair" (nome e papel).
  String? _userName;
  String? _userRoleLabel;

  @override
  void initState() {
    super.initState();
    _resolveRole();
  }

  /// Resolve o papel em dois passos: preferências da sessão e, se vazias,
  /// GET /auth/me. O segundo passo cura token antigo salvo sem papel (estado
  /// legado que antes recaía em logout silêncio na recarga da página). Só sem
  /// papel nos dois passos a sessão é tratada como logout.
  Future<void> _resolveRole() async {
    String? role;
    try {
      role = await api.role;
    } catch (_) {
      role = null;
    }

    if (role == null) {
      try {
        // Escopos plataforma e domínio respondem {user: {..., role}}.
        final me = await api.get('/auth/me');
        final user = me['user'];
        if (user is Map && user['role'] is String) {
          role = user['role'] as String;
        }
      } catch (_) {
        role = null;
      }
    }

    if (!mounted) return;

    if (role == null) {
      // Sem papel (sessão expirada/limpa) — sai do shell como logout.
      widget.onLogout?.call();
      return;
    }
    final resolvedRole = role;

    // Nome do usuário logado para o rodapé do rail — opcional: sessão sem
    // 'auth_user' salvo (estado legado) só fica sem a identificação visual.
    String? userName;
    try {
      final user = await api.currentUser;
      final name = user?['name'];
      if (name is String && name.trim().isNotEmpty) {
        userName = name.trim();
      }
    } catch (_) {
      userName = null;
    }

    // [FR-020]: só sessão de domínio liga o Socket.io. system_admin não tem
    // 'auth_domain' salvo (domainId null) e fica fora; a falha de rede não
    // derruba o shell — o cliente tenta de novo na próxima sessão.
    try {
      final domain = await api.domainId;
      if (domain != null) {
        await api.connectSocket(domain);
      }
    } catch (_) {
      // Sem rede o app segue sem tempo real.
    }

    final entries = _entriesForRole(resolvedRole);
    setState(() {
      _entries = entries;
      _userName = userName;
      _userRoleLabel = _roleLabel(resolvedRole);
      // O papel pode encurtar a lista — volta ao início se fora de faixa.
      if (_selectedIndex >= entries.length) _selectedIndex = 0;
      _loading = false;
    });
  }

  /// Encerra a sessão local (sem servidor — JWT é stateless) e volta ao login.
  Future<void> _logout() async {
    await api.clearToken();
    if (!mounted) return;
    widget.onLogout?.call();
  }

  /// [FR-022] matriz de papéis: cada papel só vê telas cujas rotas o backend
  /// aceita para ele (system_admin só /api/v2/domains*; rotas de negócio respondem
  /// 403 para system_admin, e /api/v2/users aceita GET para admin+gestor).
  /// Tarefas: admin/gestor entram pelo canal do contrato (Projetos → detalhe);
  /// prestador mantém a fila pessoal 'Minhas Tarefas' (GET /tasks já escopa).
  ///
  /// [FR-007] / AD-005: gate único `hasAuditAccess` decide a entrada
  /// Auditoria (auditor, admin, gestor) — o base não a conhece.
  List<_NavEntry> _entriesForRole(String role) {
    final base = _baseEntriesForRole(role);
    if (!hasAuditAccess(role)) return base;
    return [
      ...base,
      const _NavEntry(
        'Auditoria',
        Icons.fact_check_outlined,
        Icons.fact_check,
        AuditScreen(),
      ),
    ];
  }

  List<_NavEntry> _baseEntriesForRole(String role) {
    switch (role) {
      case 'auditor':
        // Papel novo do E011: acesso somente à visão de auditoria — o gate
        // acima adiciona a única entrada que ele recebe.
        return const [];
      case 'system_admin':
        return const [
          _NavEntry(
            'Domínios',
            Icons.apartment_outlined,
            Icons.apartment,
            DomainsScreen(),
          ),
        ];
      case 'admin':
        return const [
          _NavEntry(
            'Dashboard',
            Icons.bar_chart_outlined,
            Icons.bar_chart,
            DashboardScreen(),
          ),
          _NavEntry(
            'Vencimentos',
            Icons.schedule_outlined,
            Icons.schedule,
            VencimentosScreen(),
          ),
          _NavEntry(
            'Projetos',
            Icons.folder_outlined,
            Icons.folder,
            ProjectsScreen(),
          ),
          _NavEntry(
            'Usuários',
            Icons.people_outline,
            Icons.people,
            UsersScreen(),
          ),
          _NavEntry(
            'Finalidades',
            Icons.sell_outlined,
            Icons.sell,
            FinalidadesScreen(),
          ),
        ];
      case 'gestor':
        return const [
          _NavEntry(
            'Dashboard',
            Icons.bar_chart_outlined,
            Icons.bar_chart,
            DashboardScreen(),
          ),
          _NavEntry(
            'Vencimentos',
            Icons.schedule_outlined,
            Icons.schedule,
            VencimentosScreen(),
          ),
          _NavEntry(
            'Projetos',
            Icons.folder_outlined,
            Icons.folder,
            ProjectsScreen(),
          ),
          _NavEntry(
            'Usuários',
            Icons.people_outline,
            Icons.people,
            UsersScreen(),
          ),
        ];
      default:
        // 'prestador' e papéis desconhecidos: apenas as telas de negócio.
        return const [
          _NavEntry(
            'Dashboard',
            Icons.bar_chart_outlined,
            Icons.bar_chart,
            DashboardScreen(),
          ),
          _NavEntry(
            'Projetos',
            Icons.folder_outlined,
            Icons.folder,
            ProjectsScreen(),
          ),
          _NavEntry(
            'Minhas Tarefas',
            Icons.task_outlined,
            Icons.task,
            TasksScreen(),
          ),
        ];
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_selectedIndex >= _entries.length) _selectedIndex = 0;

    return Scaffold(
      body: Column(
        children: [
          // Identificação da sessão + sair — barra full-width acima da
          // navegação, densidade compacta para não roubar altura das telas.
          _SessionToolbar(
            userName: _userName,
            roleLabel: _userRoleLabel,
            onLogout: _logout,
            onToggleTheme: widget.onToggleTheme,
          ),
          const Divider(height: 1, thickness: 1),
          Expanded(
            child: Row(
              children: [
                // FR-028: named navigation region for screen readers; each
                // destination exposes its Text label for semantics + keyboard use.
                Semantics(
                  container: true,
                  label: 'Navegação principal',
                  child: NavigationRail(
                    selectedIndex: _entries.isEmpty ? null : _selectedIndex,
                    onDestinationSelected: (index) {
                      setState(() => _selectedIndex = index);
                    },
                    leading: const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Icon(Icons.dashboard_rounded, size: 32),
                    ),
                    labelType: NavigationRailLabelType.all,
                    destinations: [
                      for (final entry in _entries) entry.toDestination(),
                    ],
                  ),
                ),
                const VerticalDivider(width: 1),
                Expanded(
                  child: _entries.isEmpty
                      ? const SizedBox.shrink()
                      : _entries[_selectedIndex].screen,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Barra superior do shell: nome + papel da sessão à esquerda e a ação de
/// sair à direita — a sessão saiu do trailing do rail para ficar visível em
/// qualquer largura. Sessão legada sem `auth_user` mostra só o papel (ou só
/// o botão Sair, quando nem o papel tem nome).
class _SessionToolbar extends StatelessWidget {
  const _SessionToolbar({
    required this.userName,
    required this.roleLabel,
    required this.onLogout,
    this.onToggleTheme,
  });

  final String? userName;
  final String? roleLabel;
  final VoidCallback onLogout;
  final VoidCallback? onToggleTheme;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final fullIdentity = [
      if (userName != null) userName,
      if (roleLabel != null) roleLabel,
    ].join(' · ');

    return Material(
      color: scheme.surfaceContainerLow,
      child: Semantics(
        container: true,
        label: 'Sessão',
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Row(
            children: [
              Icon(
                Icons.account_circle_outlined,
                size: 24,
                color: scheme.onSurfaceVariant,
              ),
              const SizedBox(width: 8),
              // Identificação visível (não só tooltip); em largura estreita o
              // nome corta com elipse e o tooltip mostra a identidade completa.
              if (fullIdentity.isNotEmpty)
                Flexible(
                  child: Tooltip(
                    message: fullIdentity,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (userName != null)
                          Flexible(
                            child: Text(
                              userName!,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.labelLarge?.copyWith(
                                fontWeight: FontWeight.w600,
                                color: scheme.onSurface,
                              ),
                            ),
                          ),
                        if (userName != null && roleLabel != null) ...[
                          const SizedBox(width: 6),
                          Text(
                            '·',
                            style: theme.textTheme.labelLarge
                                ?.copyWith(color: scheme.outline),
                          ),
                          const SizedBox(width: 6),
                        ],
                        if (roleLabel != null)
                          Text(
                            roleLabel!,
                            maxLines: 1,
                            style: theme.textTheme.labelLarge
                                ?.copyWith(color: scheme.onSurfaceVariant),
                          ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(width: 8),
              if (onToggleTheme != null)
                Tooltip(
                  message: isDark ? 'Usar tema claro' : 'Usar tema escuro',
                  child: Semantics(
                    container: true,
                    button: true,
                    label: 'Alternar tema',
                    child: IconButton(
                      onPressed: onToggleTheme,
                      icon: Icon(
                        isDark
                            ? Icons.light_mode_outlined
                            : Icons.dark_mode_outlined,
                      ),
                    ),
                  ),
                ),
              Tooltip(
                message: 'Encerrar sessão',
                child: TextButton.icon(
                  onPressed: onLogout,
                  icon: const Icon(Icons.logout_outlined, size: 20),
                  label: const Text('Sair'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
