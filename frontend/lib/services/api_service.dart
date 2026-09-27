import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:socket_io_client/socket_io_client.dart' show Socket;

class ApiService {
  static const String baseUrl = '/api';

  /// [FR-020]: singleton Socket.io do domínio. Criado sem auto-connect —
  /// só liga em [connectSocket], quando a sessão tem domainId.
  static final Socket? socket = io.io(
    Uri.base.origin,
    io.OptionBuilder()
        .setTransports(['websocket'])
        .disableAutoConnect()
        .build(),
  );

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
      try {
        socket?.disconnect();
      } catch (_) {
        // Sessão já encerrada — desconexão falha em silêncio.
      }
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
    try {
      final current = socket;
      if (current == null) return;

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

  /// [FR-020]: payloads do evento de domínio emitido pelo servidor
  /// (server.js faz push de 'task:updated' para a sala domain_<id>).
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
}
