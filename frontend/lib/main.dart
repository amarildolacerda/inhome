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
import 'theme/app_theme.dart';

void main() {
  // FR-027: web bootstrap entrypoint (Chrome, Edge, Firefox, Safari) —
  // frontend/web/index.html loads flutter_bootstrap.js which calls main().
  runApp(const ProjectManagerApp());
}

class ProjectManagerApp extends StatelessWidget {
  const ProjectManagerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Gestão de Contratos',
      debugShowCheckedModeBanner: false,
      // FR-028: accessible light/dark themes (contrast + touch targets).
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.system,
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

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
  const MainShell({super.key, this.onLogout});

  /// Chamado quando o papel da sessão não pode ser resolvido em nenhum dos
  /// dois passos (preferências nem /auth/me) — tratado como logout, volta ao
  /// login.
  final VoidCallback? onLogout;

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  final api = ApiService();

  int _selectedIndex = 0;
  bool _loading = true;
  List<_NavEntry> _entries = const [];

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

    final entries = _entriesForRole(role);
    setState(() {
      _entries = entries;
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
      body: Row(
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
              // Ação de sessão — bottom-pinned, fora da lista de destinos.
              trailingAtBottom: true,
              trailing: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: TextButton(
                  onPressed: _logout,
                  child: const Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.logout_outlined),
                      SizedBox(height: 4),
                      Text('Sair'),
                    ],
                  ),
                ),
              ),
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
    );
  }
}
