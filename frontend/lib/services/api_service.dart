import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:socket_io_client/socket_io_client.dart' show Socket;

class ApiService {
  static const String baseUrl = '/api';

  /// [FR-020]: singleton Socket.io do domínio. Criado sem auto-connect e com
  /// o JWT da sessão no handshake — o servidor recusa conexão sem token e só
  /// aceita a sala que o token carrega (T021/F-01).
  static Socket? get socket => _socket;

  static Socket? _socket;
  static String? _socketToken;

  static final StreamController<Map<String, dynamic>> _domainEventController =
      StreamController<Map<String, dynamic>>.broadcast();
  static bool _socketWired = false;
  static int? _domainRoom;

  String? _token;
  Map<String, dynamic>? _currentUser;
  String? _currentRole;
  int? _currentDomainId;

  Future<String?> get token async {
    if (_token == null) {
      final prefs = await SharedPreferences.getInstance();
      _token = prefs.getString('auth_token');
    }
    return _token;
  }

  /// [FR-002]: usuário da sessão corrente — memória, depois SharedPreferences.
  Future<Map<String, dynamic>?> get currentUser async {
    if (_currentUser != null) return _currentUser;
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('auth_user');
    if (raw == null) return null;
    final decoded = _decode(raw);
    if (decoded == null) return null;
    _currentUser = decoded;
    return _currentUser;
  }

  /// Papel da sessão: 'admin' | 'gestor' | 'prestador' | 'system_admin'.
  Future<String?> get role async {
    if (_currentRole != null) return _currentRole;
    final user = await currentUser;
    final value = user?['role'];
    if (value is String) {
      _currentRole = value;
      return _currentRole;
    }
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_role');
  }

  /// Domínio da sessão — null para system_admin (sem 'auth_domain' salvo).
  Future<int?> get domainId async {
    if (_currentDomainId != null) return _currentDomainId;
    final prefs = await SharedPreferences.getInstance();
    _currentDomainId = prefs.getInt('auth_domain');
    return _currentDomainId;
  }

  Future<Map<String, String>> _headers() async {
    final t = await token;
    return {
      'Content-Type': 'application/json',
      if (t != null) 'Authorization': 'Bearer $t',
    };
  }

  Future<Map<String, dynamic>> get(String endpoint) async {
    final response = await http.get(
      Uri.parse('$baseUrl$endpoint'),
      headers: await _headers(),
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> post(String endpoint, {Map<String, dynamic>? body}) async {
    final response = await http.post(
      Uri.parse('$baseUrl$endpoint'),
      headers: await _headers(),
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> put(String endpoint, {Map<String, dynamic>? body}) async {
    final response = await http.put(
      Uri.parse('$baseUrl$endpoint'),
      headers: await _headers(),
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleResponse(response);
  }

  /// [FR-010]: PATCH cobre /tasks/:id/status, que o Express só registra em patch.
  Future<Map<String, dynamic>> patch(String endpoint, {Map<String, dynamic>? body}) async {
    final response = await http.patch(
      Uri.parse('$baseUrl$endpoint'),
      headers: await _headers(),
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> delete(String endpoint) async {
    final response = await http.delete(
      Uri.parse('$baseUrl$endpoint'),
      headers: await _headers(),
    );
    return _handleResponse(response);
  }

  Map<String, dynamic> _handleResponse(http.Response response) {
    final body = _decode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body ?? <String, dynamic>{};
    }
    throw Exception(body?['error'] ?? 'Request failed');
  }

  Map<String, dynamic>? _decode(String source) {
    if (source.isEmpty) return null;
    try {
      final decoded = jsonDecode(source);
      if (decoded is Map<String, dynamic>) return decoded;
      if (decoded is Map) return Map<String, dynamic>.from(decoded);
    } catch (_) {
      // Resposta não-JSON (proxy/HTML) — o chamador trata pelo status.
    }
    return null;
  }

  Future<void> saveToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  Future<void> clearToken() async {
    _token = null;
    _currentUser = null;
    _currentRole = null;
    _currentDomainId = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('auth_user');
    await prefs.remove('auth_role');
    await prefs.remove('auth_domain');
    if (_socketWired) {
      _domainRoom = null;
      _socketWired = false;
      try {
        _socket?.disconnect();
      } catch (_) {
        // Sessão já encerrada — desconexão falha em silêncio.
      }
      // Sem sessão não há token para o handshake; o próximo domínio recria.
      _socket = null;
      _socketToken = null;
    }
  }

  /// [FR-002]: POST /auth/login — grava token + sessão e devolve o usuário.
  /// Sem domainId o backend autentica o system_admin da plataforma.
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
    int? domainId,
  }) async {
    final result = await post(
      '/auth/login',
      body: {
        'email': email,
        'password': password,
        if (domainId != null) 'domainId': domainId,
      },
    );

    final sessionToken = result['token'];
    if (sessionToken is String && sessionToken.isNotEmpty) {
      await saveToken(sessionToken);
    }

    final user = _asMap(result['user']);
    final sessionDomain = result['domainId'];
    final domain = sessionDomain is num ? sessionDomain.toInt() : null;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_user', jsonEncode(user));
    final sessionRole = user['role'];
    if (sessionRole is String) {
      await prefs.setString('auth_role', sessionRole);
    } else {
      await prefs.remove('auth_role');
    }
    if (domain != null) {
      await prefs.setInt('auth_domain', domain);
    } else {
      await prefs.remove('auth_domain');
    }

    _currentUser = user;
    _currentRole = sessionRole is String ? sessionRole : null;
    _currentDomainId = domain;
    return user;
  }

  /// [FR-016]: GET /search/contracts — q, status, finalidade, prestador e paging.
  Future<List<Map<String, dynamic>>> searchContracts({
    String? q,
    String? status,
    int? finalidadeId,
    int? prestadorId,
    int? limit,
    int? offset,
  }) async {
    final result = await get('/search/contracts${_query({
      'q': q,
      'status': status,
      'finalidade_id': finalidadeId,
      'prestador_id': prestadorId,
      'limit': limit,
      'offset': offset,
    })}');
    return _mapList(result['contracts']);
  }

  /// [FR-016]: GET /search/tasks — q, status, prioridade, prestador, contrato,
  /// janela de prazo (due_after/due_before) e paging.
  Future<List<Map<String, dynamic>>> searchTasks({
    String? q,
    String? status,
    String? priority,
    int? prestadorId,
    int? contractId,
    String? dueAfter,
    String? dueBefore,
    int? limit,
    int? offset,
  }) async {
    final result = await get('/search/tasks${_query({
      'q': q,
      'status': status,
      'priority': priority,
      'prestador_id': prestadorId,
      'contract_id': contractId,
      'due_after': dueAfter,
      'due_before': dueBefore,
      'limit': limit,
      'offset': offset,
    })}');
    return _mapList(result['tasks']);
  }

  // ---- Workflow assistido por OpenCode (E0003, T029) ---------------------

  /// [FR-001]: GET /contracts/:id/definitions — última versão salva; null
  /// quando o contrato ainda não tem definições (404 Definitions not found).
  Future<Map<String, dynamic>?> getDefinitions(int contractId) async {
    try {
      final result = await get('/contracts/$contractId/definitions');
      return _asNullableMap(result['definitions']);
    } catch (e) {
      if (e.toString().contains('Definitions not found')) return null;
      rethrow;
    }
  }

  /// [FR-002]: PUT /contracts/:id/definitions — anexa uma nova versão com os
  /// 6 campos obrigatórios; 400 devolve a lista `missing`.
  Future<Map<String, dynamic>> saveDefinitions(
    int contractId, {
    required String finalidade,
    required String limitacoes,
    required String alvo,
    required String escopo,
    required String premissas,
    required String entregaveis,
  }) async {
    final result = await put(
      '/contracts/$contractId/definitions',
      body: {
        'finalidade': finalidade,
        'limitacoes': limitacoes,
        'alvo': alvo,
        'escopo': escopo,
        'premissas': premissas,
        'entregaveis': entregaveis,
      },
    );
    return _asMap(result['definitions']);
  }

  /// [FR-017]: GET /contracts/:id/definitions/history — versões com autor e
  /// data, mais nova primeiro.
  Future<List<Map<String, dynamic>>> getDefinitionsHistory(int contractId) async {
    final result = await get('/contracts/$contractId/definitions/history');
    return _mapList(result['history']);
  }

  /// [FR-024]: POST /contracts/:id/review — gatilho manual do gestor (202,
  /// entra na fila durante uma análise em andamento, sem reanálise).
  Future<Map<String, dynamic>> startReview(int contractId) async {
    final result = await post('/contracts/$contractId/review');
    return _asMap(result['review']);
  }

  /// [FR-022]: GET /contracts/:id/review — resumos das revisões, mais nova
  /// primeiro.
  Future<List<Map<String, dynamic>>> listReviews(int contractId) async {
    final result = await get('/contracts/$contractId/review');
    return _mapList(result['reviews']);
  }

  /// [FR-023]: GET /contracts/:id/review/:reviewId — contexto, propostas e
  /// conflitos da revisão.
  Future<Map<String, dynamic>> getReview(int contractId, int reviewId) async {
    final result = await get('/contracts/$contractId/review/$reviewId');
    return _asMap(result['review']);
  }

  /// [FR-023]: POST /contracts/:id/review/:reviewId/apply — só tarefas 'A
  /// Fazer'; devolve {review, applied:{edited,created}, conflicts}.
  Future<Map<String, dynamic>> applyReview(int contractId, int reviewId) {
    return post('/contracts/$contractId/review/$reviewId/apply');
  }

  /// [FR-024]: POST /contracts/:id/review/:reviewId/retry — liberado só após
  /// falha (409 em qualquer outro estado).
  Future<Map<String, dynamic>> retryReview(int contractId, int reviewId) async {
    final result = await post('/contracts/$contractId/review/$reviewId/retry');
    return _asMap(result['review']);
  }

  /// [FR-015]: GET /tasks/:id/execution-plan — null enquanto a tarefa não tem
  /// plano (shell 'pendente' da ativação também conta como plano).
  Future<Map<String, dynamic>?> getExecutionPlan(int taskId) async {
    final result = await get('/tasks/$taskId/execution-plan');
    return _asNullableMap(result['plan']);
  }

  /// [FR-014]: POST /tasks/:id/execution-plan — 202 e geração assíncrona; o
  /// caller acompanha o status pelo GET.
  Future<Map<String, dynamic>> requestExecutionPlan(int taskId) async {
    final result = await post('/tasks/$taskId/execution-plan');
    return _asMap(result['plan']);
  }

  /// [FR-015]: POST /tasks/:id/execution-plan/regenerate — liberado só após
  /// falha.
  Future<Map<String, dynamic>> regenerateExecutionPlan(int taskId) async {
    final result = await post('/tasks/$taskId/execution-plan/regenerate');
    return _asMap(result['plan']);
  }

  // ---- Análise e sugestão (E0003, T039) -----------------------------------

  /// [FR-021]: GET /contracts/:id/analysis — estado da geração; null quando o
  /// contrato ainda não tem análise (404 Analysis not found).
  Future<Map<String, dynamic>?> getAnalysis(int contractId) async {
    try {
      final result = await get('/contracts/$contractId/analysis');
      return _asNullableMap(result['analysis']);
    } catch (e) {
      if (e.toString().contains('Analysis not found')) return null;
      rethrow;
    }
  }

  /// [FR-004]: POST /contracts/:id/analysis — 202 com o estado recém-enfileirado.
  Future<Map<String, dynamic>> startAnalysis(int contractId) async {
    final result = await post('/contracts/$contractId/analysis');
    return _asMap(result['analysis']);
  }

  /// [FR-018]: POST /contracts/:id/analysis/retry — liberado só após falha.
  Future<Map<String, dynamic>> retryAnalysis(int contractId) async {
    final result = await post('/contracts/$contractId/analysis/retry');
    return _asMap(result['analysis']);
  }

  /// [FR-017]: GET /contracts/:id/suggestions — versões da sugestão, mais
  /// recente primeiro.
  Future<List<Map<String, dynamic>>> listSuggestions(int contractId) async {
    final result = await get('/contracts/$contractId/suggestions');
    return _mapList(result['suggestions']);
  }

  /// [FR-005]: GET /suggestions/:sid — detalhe com os itens (id de cada um,
  /// base da edição); null quando a sugestão não existe mais.
  Future<Map<String, dynamic>?> getSuggestion(int suggestionId) async {
    try {
      final result = await get('/suggestions/$suggestionId');
      return _asNullableMap(result['suggestion']);
    } catch (e) {
      if (e.toString().contains('Suggestion not found')) return null;
      rethrow;
    }
  }

  /// [FR-007]: PATCH /suggestions/:sid/items/:itemId — envia só o que mudou;
  /// `removed: true` marca a remoção (não existe DELETE) e `removed: false`
  /// restaura.
  Future<Map<String, dynamic>> updateSuggestionItem(
    int suggestionId,
    int itemId, {
    String? titulo,
    String? descricao,
    String? justificativa,
    bool? removed,
  }) async {
    final result = await patch(
      '/suggestions/$suggestionId/items/$itemId',
      body: {
        if (titulo != null) 'titulo': titulo,
        if (descricao != null) 'descricao': descricao,
        if (justificativa != null) 'justificativa': justificativa,
        if (removed != null) 'removed': removed,
      },
    );
    return _asMap(result['item']);
  }

  /// [FR-008]: POST /suggestions/:sid/refine — `instrucoes` obrigatório; a
  /// chamada é síncrona no backend e devolve a nova versão (201).
  Future<Map<String, dynamic>> refineSuggestion(
    int suggestionId, {
    required String instrucoes,
  }) async {
    final result = await post(
      '/suggestions/$suggestionId/refine',
      body: {'instrucoes': instrucoes},
    );
    return _asMap(result['suggestion']);
  }

  /// [FR-009]: POST /suggestions/:sid/approve — ativa o workflow com os itens
  /// mantidos; lista vazia responde 400 (a tela avisa antes de chamar).
  Future<Map<String, dynamic>> approveSuggestion(int suggestionId) {
    return post('/suggestions/$suggestionId/approve');
  }

  /// [FR-018]: baixa report.pdf/report.csv como bytes com o mesmo Authorization.
  Future<List<int>> downloadFile(String endpoint) async {
    final response = await http.get(
      Uri.parse('$baseUrl$endpoint'),
      headers: await _headers(),
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.bodyBytes;
    }
    final body = _decode(response.body);
    throw Exception(body?['error'] ?? 'Download failed');
  }

  /// [FR-023]: base64 do arquivo para o JSON {filename, dataBase64} aceito por
  /// /tasks/:id/complete e /tasks/:id/attachments (o backend não usa multipart).
  Future<String> fileToBase64(Uint8List bytes, String filename) async {
    return base64Encode(bytes);
  }

  /// [FR-020]: conecta ao Socket.io e entra na sala do domínio. Sem domínio
  /// não conecta; falha de rede não derruba o app (o cliente tenta de novo).
  Future<void> connectSocket(int domainId) async {
    if (domainId <= 0) return;
    final sessionToken = await token;
    if (sessionToken == null || sessionToken.isEmpty) return;
    try {
      final current = _ensureSocket(sessionToken);

      final previous = _domainRoom;
      _domainRoom = domainId;
      if (!_socketWired) {
        _wireSocket(current);
        _socketWired = true;
      }

      if (previous != null && previous != domainId) {
        current.emit('leave_domain', previous);
      }
      if (current.connected) {
        current.emit('join_domain', domainId);
      } else {
        current.connect();
      }
    } catch (_) {
      // Sem rede o app segue sem tempo real; o cliente tenta de novo.
    }
  }

  /// Handshake autenticado (T021): o socket leva o JWT da sessão corrente.
  /// Token novo (troca de sessão) → socket antigo sai de cena e o novo é
  /// criado com o token atual.
  static Socket _ensureSocket(String sessionToken) {
    final existing = _socket;
    if (existing != null && _socketToken == sessionToken) return existing;
    if (existing != null) {
      try {
        existing.disconnect();
        existing.dispose();
      } catch (_) {
        // Sessão antiga já derrubada — segue com o socket novo.
      }
      _socketWired = false;
    }
    _socket = io.io(
      Uri.base.origin,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': sessionToken})
          .disableAutoConnect()
          .build(),
    );
    _socketToken = sessionToken;
    return _socket!;
  }

  /// [FR-020]/[FR-021]: payloads dos eventos de domínio emitidos pelo
  /// servidor (server.js faz push de 'task:updated' e 'analysis_state' para a
  /// sala domain_<id>). Consumidor distingue pelo payload: `taskId` marca
  /// tarefa, `status` sem `taskId` marca estado da geração.
  Stream<Map<String, dynamic>> get domainEvents => _domainEventController.stream;

  static void _wireSocket(Socket current) {
    current.onConnect((_) {
      final domain = _domainRoom;
      if (domain != null) current.emit('join_domain', domain);
    });
    current.on('task:updated', (payload) {
      if (payload is Map) {
        _domainEventController.add(Map<String, dynamic>.from(payload));
      }
    });
    // [FR-021]: transições do job de análise na mesma sala do domínio — o
    // painel de geração atualiza sem recarregar a tela.
    current.on('analysis_state', (payload) {
      if (payload is Map) {
        _domainEventController.add(Map<String, dynamic>.from(payload));
      }
    });
    current.on('connect_error', (_) {});
    current.on('error', (_) {});
    current.on('disconnect', (_) {});
  }

  String _query(Map<String, dynamic> params) {
    final parts = <String>[];
    params.forEach((key, value) {
      if (value == null) return;
      final text = value.toString();
      if (text.isEmpty) return;
      parts.add('${Uri.encodeQueryComponent(key)}=${Uri.encodeQueryComponent(text)}');
    });
    return parts.isEmpty ? '' : '?${parts.join('&')}';
  }

  List<Map<String, dynamic>> _mapList(dynamic value) {
    if (value is! List) return <Map<String, dynamic>>[];
    return value
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return <String, dynamic>{};
  }

  Map<String, dynamic>? _asNullableMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return null;
  }
}
