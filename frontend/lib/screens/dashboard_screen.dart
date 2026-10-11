import 'package:flutter/material.dart';
import '../services/api_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final api = ApiService();
  Map<String, dynamic>? _data;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    try {
      final result = await api.get('/dashboard/stats');
      setState(() {
        _data = result;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    final stats = _data?['stats'] ?? {};
    final recentProjects = _data?['recentProjects'] ?? [];

    return Semantics(
      container: true,
      label: 'Painel do domínio',
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Dashboard',
              style: Theme.of(context).textTheme.headlineLarge,
            ),
            const SizedBox(height: 24),
            LayoutBuilder(
            builder: (context, constraints) {
              const double spacing = 16;
              const double minCardWidth = 200;
              final double availableWidth = constraints.maxWidth.isFinite
                  ? constraints.maxWidth
                  : minCardWidth;

              int perRow = ((availableWidth + spacing) /
                      (minCardWidth + spacing))
                  .floor();
              if (perRow < 1) perRow = 1;

              final statCards = <Widget Function(double width)>[
                (width) => _StatCard(
                      title: 'Projetos Ativos',
                      value: '${stats['activeProjects'] ?? 0}',
                      icon: Icons.folder,
                      color: Colors.blue,
                      width: width,
                    ),
                (width) => _StatCard(
                      title: 'Total Tarefas',
                      value: '${stats['totalTasks'] ?? 0}',
                      icon: Icons.task,
                      color: Colors.orange,
                      width: width,
                    ),
                (width) => _StatCard(
                      title: 'Concluídas',
                      value: '${stats['completedTasks'] ?? 0}',
                      icon: Icons.check_circle,
                      color: Colors.green,
                      width: width,
                    ),
                (width) => _StatCard(
                      title: 'Em Progresso',
                      value: '${stats['inProgressTasks'] ?? 0}',
                      icon: Icons.pending,
                      color: Colors.purple,
                      width: width,
                    ),
                (width) => _StatCard(
                      title: 'Urgentes',
                      value: '${stats['urgentTasks'] ?? 0}',
                      icon: Icons.warning,
                      color: Colors.red,
                      width: width,
                    ),
                (width) => _StatCard(
                      title: 'Taxa Conclusão',
                      value: '${stats['completionRate'] ?? 0}%',
                      icon: Icons.pie_chart,
                      color: Colors.teal,
                      width: width,
                    ),
              ];

              final rows = <List<Widget>>[];
              for (var i = 0; i < statCards.length; i += perRow) {
                final int end = i + perRow < statCards.length
                    ? i + perRow
                    : statCards.length;
                final int count = end - i;
                final double cardWidth =
                    (availableWidth - spacing * (count - 1)) / count;
                rows.add([
                  for (var j = i; j < end; j++) statCards[j](cardWidth),
                ]);
              }

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  for (var r = 0; r < rows.length; r++)
                    ...[
                      if (r > 0) const SizedBox(height: spacing),
                      Row(
                        children: [
                          for (var c = 0; c < rows[r].length; c++)
                            ...[
                              if (c > 0) const SizedBox(width: spacing),
                              rows[r][c],
                            ],
                        ],
                      ),
                    ],
                ],
              );
            },
          ),
          const SizedBox(height: 32),
          Text(
            'Projetos Recentes',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),
          if (recentProjects.isEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Center(
                  child: Text(
                    'Nenhum projeto encontrado. Crie seu primeiro projeto!',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                ),
              ),
            )
          else
              ...recentProjects.map<Widget>((project) => Card(
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Colors.blue.shade100,
                        child: const Icon(Icons.folder, color: Colors.blue),
                      ),
                      title: Text(project['name']),
                      subtitle: Text(
                        '${project['task_count'] ?? 0} tarefas · ${project['completed_count'] ?? 0} concluídas',
                      ),
                      trailing: Text(project['status']),
                    ),
                  )),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final double width;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    required this.width,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: color, size: 32),
              const SizedBox(height: 12),
              Text(
                value,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                title,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
