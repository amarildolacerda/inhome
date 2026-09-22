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

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Dashboard',
            style: Theme.of(context).textTheme.headlineLarge,
          ),
          const SizedBox(height: 24),
          Wrap(
            spacing: 16,
            runSpacing: 16,
            children: [
              _StatCard(
                title: 'Projetos Ativos',
                value: '${stats['activeProjects'] ?? 0}',
                icon: Icons.folder,
                color: Colors.blue,
              ),
              _StatCard(
                title: 'Total Tarefas',
                value: '${stats['totalTasks'] ?? 0}',
                icon: Icons.task,
                color: Colors.orange,
              ),
              _StatCard(
                title: 'Concluídas',
                value: '${stats['completedTasks'] ?? 0}',
                icon: Icons.check_circle,
                color: Colors.green,
              ),
              _StatCard(
                title: 'Em Progresso',
                value: '${stats['inProgressTasks'] ?? 0}',
                icon: Icons.pending,
                color: Colors.purple,
              ),
              _StatCard(
                title: 'Urgentes',
                value: '${stats['urgentTasks'] ?? 0}',
                icon: Icons.warning,
                color: Colors.red,
              ),
              _StatCard(
                title: 'Taxa Conclusão',
                value: '${stats['completionRate'] ?? 0}%',
                icon: Icons.pie_chart,
                color: Colors.teal,
              ),
            ],
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
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 200,
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
