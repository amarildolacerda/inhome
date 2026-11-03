/// Dados mock locais da casca do chat colaborativo por contrato.
///
/// Nada aqui fala com rede: os widgets leem apenas estes objetos enquanto o
/// backend de chat da spec 00017 não existe. Vocabulário em PT no mesmo
/// sentido do domínio (gestor, prestador, contrato, cláusula, tarefa, anexo).
library;

/// Papéis do domínio.
enum Papel { gestor, prestador }

/// Rótulo PT do papel, como no restante do produto.
extension PapelRotulo on Papel {
  String get rotulo {
    switch (this) {
      case Papel.gestor:
        return 'Gestor';
      case Papel.prestador:
        return 'Prestador';
    }
  }
}

/// Usuário logado da simulação.
class UsuarioAtual {
  const UsuarioAtual({required this.nome, required this.papel});

  final String nome;
  final Papel papel;
}

/// Contrato do domínio, recortado para a casca.
class Contrato {
  const Contrato({
    required this.id,
    required this.nome,
    required this.status,
    required this.prazo,
  });

  final String id;

  final String nome;

  /// 'vigente' | 'atrasado' | 'encerrado' — literais PT do domínio.
  final String status;
  final String prazo;
}

/// Anexo de mensagem (PDF, DOCX ou imagem).
class Anexo {
  const Anexo({
    required this.nome,
    required this.tipo,
    required this.tamanho,
  });

  final String nome;

  /// 'pdf' | 'docx' | 'imagem'
  final String tipo;
  final String tamanho;
}

/// Linha do canal com autor, papel, data e vínculo opcional a cláusula.
class Mensagem {
  const Mensagem({
    required this.id,
    required this.autor,
    required this.papel,
    required this.texto,
    required this.hora,
    required this.doUsuarioAtual,
    this.vinculo,
    this.anexos = const [],
  });

  final String id;
  final String autor;
  final Papel papel;
  final String texto;

  /// Hora fake do mock, no formato HH:mm.
  final String hora;
  final bool doUsuarioAtual;

  /// Ex.: 'Cláusula 5.2 — Multas'.
  final String? vinculo;
  final List<Anexo> anexos;
}

/// Tarefa do workflow atual, vista a partir do chat.
class Tarefa {
  const Tarefa({
    required this.id,
    required this.titulo,
    required this.contratoId,
    required this.status,
    required this.prazo,
    this.responsavel,
  });

  final String id;
  final String titulo;
  final String contratoId;

  /// 'A Fazer' | 'Em andamento' | 'Concluída'
  final String status;
  final String prazo;
  final String? responsavel;
}

/// Alerta do contrato, o mesmo vocabulário do menu "ver alertas".
class Alerta {
  const Alerta({
    required this.titulo,
    required this.detalhe,
    required this.contratoId,
    required this.tipo,
  });

  final String titulo;
  final String detalhe;
  final String contratoId;

  /// 'prazo' | 'multa' | 'risco'
  final String tipo;
}

/// Conversa do canal: canal geral do contrato ou thread vinculada a cláusula.
class Conversa {
  const Conversa({
    required this.id,
    required this.contratoId,
    required this.titulo,
    required this.mensagens,
    this.clausula,
    this.naoLidas = 0,
  });

  final String id;
  final String contratoId;
  final String titulo;

  /// Número da cláusula quando a conversa é uma thread de cláusula.
  final String? clausula;
  final int naoLidas;
  final List<Mensagem> mensagens;

  Mensagem get ultimaMensagem => mensagens.last;
}

/// Simulação do usuário logado: Ana Beatriz, gestora do domínio.
const UsuarioAtual usuarioAtual = UsuarioAtual(
  nome: 'Ana Beatriz',
  papel: Papel.gestor,
);

/// Dois contratos da carteira.
const List<Contrato> contratosMock = <Contrato>[
  Contrato(
    id: 'C-2026-014',
    nome: 'Reforma do Galpão Norte',
    status: 'vigente',
    prazo: '31/12/2026',
  ),
  Contrato(
    id: 'C-2026-021',
    nome: 'Manutenção Elétrica — Bloco B',
    status: 'atrasado',
    prazo: '15/09/2026',
  ),
];

/// Três conversas: canal geral de cada contrato e uma thread de cláusula.
const List<Conversa> conversasMock = <Conversa>[
  Conversa(
    id: 'CV-01',
    contratoId: 'C-2026-014',
    titulo: 'Canal do contrato',
    naoLidas: 2,
    mensagens: <Mensagem>[
      Mensagem(
        id: 'M-01',
        autor: 'Carlos Mendes',
        papel: Papel.prestador,
        texto:
            'Bom dia! Iniciamos a demolição da laje conforme o cronograma aprovado.',
        hora: '08:12',
        doUsuarioAtual: false,
      ),
      Mensagem(
        id: 'M-02',
        autor: 'Ana Beatriz',
        papel: Papel.gestor,
        texto:
            'Bom dia, Carlos. Confirmo o início. Registro aqui a cláusula 5.2 sobre multas por atraso.',
        hora: '08:30',
        doUsuarioAtual: true,
      ),
      Mensagem(
        id: 'M-03',
        autor: 'Carlos Mendes',
        papel: Papel.prestador,
        texto: 'Ciente. Segue o memorial descritivo atualizado para registro.',
        hora: '09:05',
        doUsuarioAtual: false,
        anexos: <Anexo>[
          Anexo(nome: 'memorial-descritivo.pdf', tipo: 'pdf', tamanho: '480 KB'),
        ],
      ),
      Mensagem(
        id: 'M-04',
        autor: 'Ana Beatriz',
        papel: Papel.gestor,
        texto: 'Recebido. Vou vincular ao contrato.',
        hora: '09:20',
        doUsuarioAtual: true,
      ),
      Mensagem(
        id: 'M-05',
        autor: 'Carlos Mendes',
        papel: Papel.prestador,
        texto: 'Obrigado! Qualquer atualização eu sigo por este canal.',
        hora: '10:02',
        doUsuarioAtual: false,
      ),
    ],
  ),
  Conversa(
    id: 'CV-02',
    contratoId: 'C-2026-014',
    titulo: 'Cláusula 5.2 — Multas',
    clausula: '5.2',
    mensagens: <Mensagem>[
      Mensagem(
        id: 'M-06',
        autor: 'Ana Beatriz',
        papel: Papel.gestor,
        texto:
            'Abrindo a thread da cláusula 5.2 para acompanhar multas e prazos contratuais.',
        hora: '14:10',
        doUsuarioAtual: true,
        vinculo: 'Cláusula 5.2 — Multas',
      ),
      Mensagem(
        id: 'M-07',
        autor: 'Carlos Mendes',
        papel: Papel.prestador,
        texto: 'Até agora a obra segue com 10 dias de folga no cronograma.',
        hora: '14:28',
        doUsuarioAtual: false,
        vinculo: 'Cláusula 5.2 — Multas',
      ),
      Mensagem(
        id: 'M-08',
        autor: 'Ana Beatriz',
        papel: Papel.gestor,
        texto: 'Ótimo. Vou acompanhar pelo painel de vencimentos também.',
        hora: '14:41',
        doUsuarioAtual: true,
        vinculo: 'Cláusula 5.2 — Multas',
      ),
    ],
  ),
  Conversa(
    id: 'CV-03',
    contratoId: 'C-2026-021',
    titulo: 'Canal do contrato',
    mensagens: <Mensagem>[
      Mensagem(
        id: 'M-09',
        autor: 'Ana Beatriz',
        papel: Papel.gestor,
        texto:
            'O relatório mensal da manutenção está atrasado. Conseguem enviar até sexta?',
        hora: '16:40',
        doUsuarioAtual: true,
      ),
      Mensagem(
        id: 'M-10',
        autor: 'Carlos Mendes',
        papel: Papel.prestador,
        texto: 'Sim, gestora. A equipe fecha o relatório até sexta-feira.',
        hora: '16:55',
        doUsuarioAtual: false,
      ),
    ],
  ),
];

/// Tarefas mock para a aba Tarefas e para os cards do menu do chat.
const List<Tarefa> tarefasMock = <Tarefa>[
  Tarefa(
    id: 'T-101',
    titulo: 'Demolição da laje',
    contratoId: 'C-2026-014',
    status: 'Concluída',
    prazo: '18/10/2026',
    responsavel: 'Carlos Mendes',
  ),
  Tarefa(
    id: 'T-102',
    titulo: 'Instalação da estrutura metálica',
    contratoId: 'C-2026-014',
    status: 'Em andamento',
    prazo: '30/11/2026',
    responsavel: 'Carlos Mendes',
  ),
  Tarefa(
    id: 'T-103',
    titulo: 'Revisão do memorial descritivo',
    contratoId: 'C-2026-014',
    status: 'A Fazer',
    prazo: '28/10/2026',
    responsavel: 'Carlos Mendes',
  ),
  Tarefa(
    id: 'T-104',
    titulo: 'Relatório mensal de manutenção',
    contratoId: 'C-2026-021',
    status: 'A Fazer',
    prazo: '30/10/2026',
    responsavel: 'Carlos Mendes',
  ),
  Tarefa(
    id: 'T-105',
    titulo: 'Termografia do quadro principal',
    contratoId: 'C-2026-021',
    status: 'Em andamento',
    prazo: '05/11/2026',
    responsavel: 'Carlos Mendes',
  ),
  Tarefa(
    id: 'T-106',
    titulo: 'Vistoria inicial do Bloco B',
    contratoId: 'C-2026-021',
    status: 'Concluída',
    prazo: '12/09/2026',
    responsavel: 'Carlos Mendes',
  ),
];

/// Alertas mock, os mesmos que o menu "ver alertas" exibe.
const List<Alerta> alertasMock = <Alerta>[
  Alerta(
    titulo: 'Seguro do contrato vence em 15 dias',
    detalhe:
        'Apólice contratual vence em 30/10/2026. Renovação pendente de aprovação do gestor.',
    contratoId: 'C-2026-014',
    tipo: 'prazo',
  ),
  Alerta(
    titulo: 'Multa por atraso acima do limite',
    detalhe:
        'Cláusula 5.2: atraso projetado de 12 dias gera multa de R\$ 8.400,00.',
    contratoId: 'C-2026-014',
    tipo: 'multa',
  ),
  Alerta(
    titulo: 'Relatório mensal em atraso',
    detalhe:
        'Prestador não enviou o relatório de outubro; o prazo era 20/10/2026.',
    contratoId: 'C-2026-021',
    tipo: 'risco',
  ),
];
