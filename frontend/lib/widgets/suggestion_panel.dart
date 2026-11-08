import 'dart:async';

import 'package:flutter/material.dart';

import '../services/api_service.dart';

part 'suggestion_panel_logic.dart';
part 'suggestion_panel_ui.dart';
part 'suggestion_panel_support.dart';

/// Cartões de geração da lista (US2) e de revisão da sugestão (US3) do
/// contrato, montados no painel de workflow assistido.
///
/// [FR-021]: o estado `pendente | analisando | sugerido | falha` vem de
/// GET /contracts/:id/analysis e muda sem recarregar a tela — polling de 1 s
/// durante o job (teto de 60 s, como o plano de execução) mais o evento de
/// domínio `analysis_state`. Falha mostra o motivo e libera retry manual
/// [FR-018], sem repetição automática.
///
/// [FR-007]/[FR-008]/[FR-009]: cada item traz título, justificativa e ordem;
/// item editável e removível enquanto a sugestão está em revisão (remoção é
/// estado, com "Desfazer" no aviso); refinamento abre diálogo com as
/// orientações livres obrigatórias; aprovação exige ao menos um item ativo e
/// a recusa marca todos os itens restantes como removidos.
///
/// O painel inteiro é de gestor — a tela de contrato só o monta para esse
/// papel, então nenhuma ação visível termina em 403.
class SuggestionPanel extends StatefulWidget {
  const SuggestionPanel({super.key, required this.contractId, this.onApproved});

  final int contractId;

  /// Chamado depois de uma aprovação aceita — a tela de contrato recarrega as
  /// tarefas que o workflow materializou.
  final VoidCallback? onApproved;

  @override
  State<SuggestionPanel> createState() => _SuggestionPanelState();
}

class _SuggestionPanelState extends State<SuggestionPanel>
    with SuggestionPanelLogic, SuggestionPanelUi {
  final api = ApiService();

  bool _analysisLoading = true;
  Map<String, dynamic>? _analysis;
  String? _analysisLoadError;
  bool _analysisBusy = false;
  Timer? _analysisPoll;
  bool _pollInFlight = false;

  bool _suggestionsLoading = true;
  List<Map<String, dynamic>> _suggestions = const [];
  int? _knownAnalysisSuggestion;

  int? _selectedId;
  bool _itemsLoading = false;
  Map<String, dynamic>? _selected;
  List<Map<String, dynamic>> _items = const [];
  String? _itemsError;
  bool _busy = false;

  StreamSubscription<Map<String, dynamic>>? _eventsSub;
}
