import 'package:flutter/material.dart';

import 'canais_tab.dart';
import 'tarefas_tab.dart';

/// Shell de navegação: aba Canais (conversas por contrato) + aba Tarefas.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _aba = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _aba,
        children: const <Widget>[
          CanaisTab(),
          TarefasTab(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _aba,
        onDestinationSelected: (int index) {
          setState(() => _aba = index);
        },
        destinations: const <NavigationDestination>[
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline),
            selectedIcon: Icon(Icons.chat_bubble),
            label: 'Canais',
          ),
          NavigationDestination(
            icon: Icon(Icons.checklist_outlined),
            selectedIcon: Icon(Icons.checklist),
            label: 'Tarefas',
          ),
        ],
      ),
    );
  }
}
