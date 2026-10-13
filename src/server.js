/**
 * ============================================================
 * ProgrameMoz - Servidor Node.js com Express
 * Plataforma moçambicana de quizzes para aprendizagem de programação
 * ============================================================
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { Pool } = require('pg');

const {
  gerarTokenSessao,
  definirCookieSessao,
  limparCookieSessao,
  criarMiddlewareAutenticacao,
  autorizarProprioUtilizador,
} = require('./middleware/auth');

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';

// ============================================================
// Middleware de Segurança e Configuração
// ============================================================
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Garante que o esquema da base de dados está inicializado antes de processar pedidos
app.use(async (req, res, next) => {
  try {
    await inicializarBaseDeDados();
    next();
  } catch (err) {
    next(err);
  }
});

// ============================================================
// Conexão com PostgreSQL
// ============================================================
const connectionString =
  process.env.DATABASE_URL || 'postgres://utilizador:senha_segura@127.0.0.1:5432/programe_moz';

const pool = new Pool({
  connectionString,
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'test') {
    console.log('✅ Conectado ao PostgreSQL');
  }
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado na pool do PostgreSQL:', err);
});

const autenticarUtilizador = criarMiddlewareAutenticacao(pool);

/**
 * Inicializa e adapta o esquema da base de dados de forma não destrutiva
 * Preserva sempre tabelas e dados já existentes.
 */
let dbInitPromise = null;
async function inicializarBaseDeDados() {
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    const schemaPath = path.join(__dirname, '../sql/schema.sql');
    const seedPath = path.join(__dirname, '../sql/seed.sql');

    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
    }

    // Se a base de dados ainda não tiver linguagens carregadas, aplica o seed inicial
    const langCount = await pool.query('SELECT COUNT(*)::int AS total FROM linguagens');
    if (langCount.rows[0].total === 0 && fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await pool.query(seedSql);
    }

    // Garante que nenhuma palavra-passe antiga na tabela utilizadores fique em texto simples
    const usersResult = await pool.query('SELECT id, password_hash FROM utilizadores');
    for (const row of usersResult.rows) {
      if (row.password_hash && !row.password_hash.startsWith('$2')) {
        const novoHash = await bcrypt.hash(String(row.password_hash), 12);
        await pool.query('UPDATE utilizadores SET password_hash = $1 WHERE id = $2', [
          novoHash,
          row.id,
        ]);
      }
    }
  })();

  return dbInitPromise;
}

/**
 * Calcula o nível do estudante com base na pontuação acumulada
 */
function calcularNivelUtilizador(pontuacao) {
  const pts = Number(pontuacao || 0);
  if (pts >= 100) return 'Mestre ProgrameMoz';
  if (pts >= 50) return 'Programador Avançado';
  if (pts >= 20) return 'Estudante Praticante';
  return 'Estudante Iniciante';
}

/**
 * Obtém os dados completos de perfil, pontuação, progresso por linguagem e histórico de um utilizador
 */
async function obterDadosCompletosPerfil(userId) {
  const resumoResult = await pool.query(
    `
    SELECT
      u.id,
      u.nome_completo,
      u.email,
      u.curso,
      u.ano_estudo,
      u.ultimo_login,
      u.created_at,
      GREATEST(COALESCE(u.pontuacao, 0), COALESCE(SUM(CASE WHEN t.correta THEN 10 ELSE 0 END), 0))::int AS pontuacao,
      COUNT(t.id)::int AS total_tentativas,
      COALESCE(SUM(CASE WHEN t.correta THEN 1 ELSE 0 END), 0)::int AS acertos,
      COALESCE(
        ROUND(100.0 * SUM(CASE WHEN t.correta THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id), 0), 2),
        0
      )::float AS percentual_acertos,
      MAX(t.criado_em) AS ultima_tentativa
    FROM utilizadores u
    LEFT JOIN tentativas t ON u.id = t.utilizador_id
    WHERE u.id = $1
    GROUP BY u.id, u.nome_completo, u.email, u.curso, u.ano_estudo, u.ultimo_login, u.created_at, u.pontuacao
    `,
    [userId]
  );

  if (resumoResult.rows.length === 0) {
    return null;
  }

  const perfil = resumoResult.rows[0];
  perfil.nivel = calcularNivelUtilizador(perfil.pontuacao);

  const linguagensProgressResult = await pool.query(
    `
    SELECT
      l.id AS linguagem_id,
      COALESCE(l.nome_moçambique, l.nome) AS linguagem,
      COUNT(DISTINCT tm.id)::int AS total_temas,
      COUNT(DISTINCT p.id)::int AS total_perguntas,
      COUNT(t.id)::int AS tentativas,
      COALESCE(SUM(CASE WHEN t.correta THEN 1 ELSE 0 END), 0)::int AS acertos,
      COALESCE(
        ROUND(100.0 * SUM(CASE WHEN t.correta THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id), 0), 1),
        0
      )::float AS percentual_acertos,
      COALESCE(
        ROUND(100.0 * COUNT(DISTINCT CASE WHEN t.correta THEN p.id END) / NULLIF(COUNT(DISTINCT p.id), 0), 1),
        0
      )::float AS progresso_conclusao,
      MAX(t.criado_em) AS ultima_tentativa
    FROM linguagens l
    LEFT JOIN temas tm ON tm.linguagem_id = l.id
    LEFT JOIN perguntas p ON p.tema_id = tm.id
    LEFT JOIN tentativas t ON t.pergunta_id = p.id AND t.utilizador_id = $1
    GROUP BY l.id, l.nome, l.nome_moçambique
    ORDER BY l.id
    `,
    [userId]
  );

  const historicoResult = await pool.query(
    `
    SELECT
      t.id,
      t.pergunta_id,
      p.enunciado,
      p.dificuldade,
      tm.nome AS tema,
      COALESCE(l.nome_moçambique, l.nome) AS linguagem,
      t.resposta_usuario,
      t.correta,
      t.tempo_segundos,
      t.criado_em
    FROM tentativas t
    JOIN perguntas p ON p.id = t.pergunta_id
    JOIN temas tm ON tm.id = p.tema_id
    JOIN linguagens l ON l.id = tm.linguagem_id
    WHERE t.utilizador_id = $1
    ORDER BY t.criado_em DESC, t.id DESC
    LIMIT 50
    `,
    [userId]
  );

  return {
    ...perfil,
    progresso_por_linguagem: linguagensProgressResult.rows,
    historico: historicoResult.rows,
  };
}

// ============================================================
// Rota Raiz e Ficheiros Estáticos (Frontend)
// ============================================================
app.get('/', (req, res, next) => {
  const accept = req.headers.accept || '';
  if (accept.includes('text/html')) {
    return res.sendFile(path.join(__dirname, '../public/index.html'));
  }
  return res.json({
    mensagem: 'Bem-vindo à API ProgrameMoz',
    versão: '1.0.0',
    status: 'ativo',
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    mensagem: 'Bem-vindo à API ProgrameMoz',
    versão: '1.0.0',
    status: 'ativo',
  });
});

app.use(express.static(path.join(__dirname, '../public')));

// ============================================================
// Rotas de Autenticação e Utilizadores (Registo, Login, Logout, Perfil)
// ============================================================

/**
 * Normaliza os campos do corpo do pedido de registo/login
 */
function normalizarCamposAuth(req, res, next) {
  if (req.body) {
    if (!req.body.nome_completo && req.body.nome) {
      req.body.nome_completo = req.body.nome;
    }
    if (!req.body.password) {
      req.body.password =
        req.body.palavra_passe || req.body.senha || req.body.password_hash || '';
    }
    if (req.body.ano_estudo === '') {
      req.body.ano_estudo = null;
    }
  }
  next();
}

const validacoesRegisto = [
  normalizarCamposAuth,
  body('nome_completo')
    .trim()
    .notEmpty()
    .withMessage('Por favor, introduza o seu nome completo.')
    .isLength({ min: 3, max: 150 })
    .withMessage('O nome completo deve ter entre 3 e 150 caracteres.'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Por favor, introduza o seu endereço de e-mail.')
    .isEmail()
    .withMessage('Por favor, introduza um endereço de e-mail válido (ex: nome@dominio.mz).')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password')
    .notEmpty()
    .withMessage('Por favor, crie uma palavra-passe.')
    .isLength({ min: 6, max: 128 })
    .withMessage('A palavra-passe deve ter pelo menos 6 caracteres.'),
  body('confirmar_password')
    .optional({ values: 'falsy' })
    .custom((val, { req }) => {
      if (val !== req.body.password) {
        throw new Error('A confirmação da palavra-passe não coincide com a palavra-passe.');
      }
      return true;
    }),
  body('curso')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('O nome do curso não pode exceder 100 caracteres.'),
  body('ano_estudo')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 10 })
    .withMessage('O ano de estudo deve ser um número entre 1 e 10.'),
];

async function registarUtilizadorHandler(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const listaErros = errors.array();
      return res.status(400).json({
        erro: listaErros[0].msg,
        detalhes: listaErros.map((e) => ({ campo: e.path, mensagem: e.msg })),
      });
    }

    const nomeCompleto = req.body.nome_completo.trim();
    const email = req.body.email.trim().toLowerCase();
    const password = String(req.body.password);
    const curso = req.body.curso ? req.body.curso.trim() : null;
    const anoEstudo = req.body.ano_estudo ? parseInt(req.body.ano_estudo, 10) : null;

    // Verificar se o e-mail já se encontra registado
    const existente = await pool.query(
      'SELECT id FROM utilizadores WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (existente.rows.length > 0) {
      return res.status(409).json({
        erro: 'Este endereço de e-mail já está registado. Tente iniciar sessão ou utilize outro e-mail.',
      });
    }

    // Guardar palavra-passe com hash bcrypt seguro (nunca em texto simples)
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO utilizadores (nome_completo, email, password_hash, curso, ano_estudo, pontuacao, token_versao, ultimo_login)
       VALUES ($1, $2, $3, $4, $5, 0, 1, CURRENT_TIMESTAMP)
       RETURNING id, nome_completo, email, curso, ano_estudo, pontuacao, token_versao, created_at`,
      [nomeCompleto, email, passwordHash, curso, anoEstudo]
    );

    const novoUtilizador = result.rows[0];
    const token = gerarTokenSessao(novoUtilizador);
    definirCookieSessao(res, token);

    return res.status(201).json({
      mensagem: 'Conta criada com sucesso! Bem-vindo ao ProgrameMoz.',
      utilizador: {
        id: novoUtilizador.id,
        nome_completo: novoUtilizador.nome_completo,
        email: novoUtilizador.email,
        curso: novoUtilizador.curso,
        ano_estudo: novoUtilizador.ano_estudo,
        pontuacao: Number(novoUtilizador.pontuacao || 0),
        nivel: calcularNivelUtilizador(0),
        created_at: novoUtilizador.created_at,
      },
      token,
    });
  } catch (err) {
    console.error('Erro ao registar utilizador:', err);
    if (err.code === '23505') {
      return res.status(409).json({
        erro: 'Este endereço de e-mail já está registado. Tente iniciar sessão ou utilize outro e-mail.',
      });
    }
    return res.status(500).json({ erro: 'Erro interno do servidor ao criar a conta.' });
  }
}

app.post('/api/utilizadores', validacoesRegisto, registarUtilizadorHandler);
app.post('/api/auth/registo', validacoesRegisto, registarUtilizadorHandler);

const validacoesLogin = [
  normalizarCamposAuth,
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Por favor, introduza o seu endereço de e-mail.')
    .isEmail()
    .withMessage('Por favor, introduza um endereço de e-mail válido.'),
  body('password')
    .notEmpty()
    .withMessage('Por favor, introduza a sua palavra-passe.'),
];

async function loginUtilizadorHandler(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const listaErros = errors.array();
      return res.status(400).json({
        erro: listaErros[0].msg,
        detalhes: listaErros.map((e) => ({ campo: e.path, mensagem: e.msg })),
      });
    }

    const email = req.body.email.trim().toLowerCase();
    const password = String(req.body.password);

    const result = await pool.query(
      'SELECT * FROM utilizadores WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        erro: 'Credenciais incorretas. Verifique o seu e-mail e a sua palavra-passe.',
      });
    }

    const utilizador = result.rows[0];
    const senhaValida = await bcrypt.compare(password, utilizador.password_hash);

    if (!senhaValida) {
      return res.status(401).json({
        erro: 'Credenciais incorretas. Verifique o seu e-mail e a sua palavra-passe.',
      });
    }

    await pool.query(
      'UPDATE utilizadores SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1',
      [utilizador.id]
    );

    const token = gerarTokenSessao(utilizador);
    definirCookieSessao(res, token);

    const dadosPerfil = await obterDadosCompletosPerfil(utilizador.id);

    return res.json({
      mensagem: 'Sessão iniciada com sucesso!',
      utilizador: {
        id: utilizador.id,
        nome_completo: utilizador.nome_completo,
        email: utilizador.email,
        curso: utilizador.curso,
        ano_estudo: utilizador.ano_estudo,
        pontuacao: dadosPerfil ? dadosPerfil.pontuacao : Number(utilizador.pontuacao || 0),
        nivel: dadosPerfil ? dadosPerfil.nivel : calcularNivelUtilizador(utilizador.pontuacao),
      },
      token,
    });
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor ao iniciar sessão.' });
  }
}

app.post('/api/utilizadores/login', validacoesLogin, loginUtilizadorHandler);
app.post('/api/auth/login', validacoesLogin, loginUtilizadorHandler);

async function logoutUtilizadorHandler(req, res) {
  try {
    if (req.utilizador && req.utilizador.id) {
      await pool.query(
        'UPDATE utilizadores SET token_versao = COALESCE(token_versao, 1) + 1 WHERE id = $1',
        [req.utilizador.id]
      );
    }
    limparCookieSessao(res);
    return res.json({ mensagem: 'Sessão terminada com segurança.' });
  } catch (err) {
    console.error('Erro ao terminar sessão:', err);
    limparCookieSessao(res);
    return res.status(500).json({ erro: 'Erro interno ao terminar a sessão.' });
  }
}

app.post('/api/utilizadores/logout', autenticarUtilizador, logoutUtilizadorHandler);
app.post('/api/auth/logout', autenticarUtilizador, logoutUtilizadorHandler);

// Obter perfil do utilizador autenticado
async function obterPerfilAtualHandler(req, res) {
  try {
    const dadosPerfil = await obterDadosCompletosPerfil(req.utilizador.id);
    if (!dadosPerfil) {
      return res.status(404).json({ erro: 'Utilizador não encontrado.' });
    }
    return res.json(dadosPerfil);
  } catch (err) {
    console.error('Erro ao obter perfil do utilizador:', err);
    return res.status(500).json({ erro: 'Erro interno ao carregar o perfil.' });
  }
}

app.get('/api/auth/perfil', autenticarUtilizador, obterPerfilAtualHandler);
app.get('/api/utilizadores/perfil', autenticarUtilizador, obterPerfilAtualHandler);

// ============================================================
// Rotas de Progresso e Histórico Pessoal (Protegidas por Utilizador)
// ============================================================

app.get(
  '/api/utilizadores/:id/progresso',
  autenticarUtilizador,
  autorizarProprioUtilizador,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const dadosPerfil = await obterDadosCompletosPerfil(userId);

      if (!dadosPerfil) {
        return res.status(404).json({ erro: 'Utilizador não encontrado.' });
      }

      return res.json(dadosPerfil);
    } catch (err) {
      console.error('Erro ao obter progresso:', err);
      return res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
  }
);

app.get(
  '/api/utilizadores/:id/historico',
  autenticarUtilizador,
  autorizarProprioUtilizador,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const dadosPerfil = await obterDadosCompletosPerfil(userId);

      if (!dadosPerfil) {
        return res.status(404).json({ erro: 'Utilizador não encontrado.' });
      }

      return res.json({
        utilizador_id: userId,
        nome_completo: dadosPerfil.nome_completo,
        pontuacao: dadosPerfil.pontuacao,
        total_tentativas: dadosPerfil.total_tentativas,
        acertos: dadosPerfil.acertos,
        percentual_acertos: dadosPerfil.percentual_acertos,
        historico: dadosPerfil.historico,
      });
    } catch (err) {
      console.error('Erro ao obter histórico:', err);
      return res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
  }
);

// ============================================================
// Rotas de Linguagens, Temas e Perguntas
// ============================================================

app.get('/api/linguagens', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nome, nome_moçambique, descricao, nivel_inicial FROM linguagens ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar linguagens:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

app.get('/api/temas/:linguagemId', async (req, res) => {
  try {
    const linguagemId = parseInt(req.params.linguagemId, 10);
    if (Number.isNaN(linguagemId)) {
      return res.status(400).json({ erro: 'Identificador de linguagem inválido.' });
    }
    const result = await pool.query(
      'SELECT id, nome, descricao, ordem FROM temas WHERE linguagem_id = $1 ORDER BY ordem, nome',
      [linguagemId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar temas:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

app.get('/api/perguntas/:temaId', async (req, res) => {
  try {
    const temaId = parseInt(req.params.temaId, 10);
    if (Number.isNaN(temaId)) {
      return res.status(400).json({ erro: 'Identificador de tema inválido.' });
    }
    const result = await pool.query(
      'SELECT id, tema_id, enunciado, opcao_a, opcao_b, opcao_c, opcao_d, correta, explicacao, dificuldade FROM perguntas WHERE tema_id = $1 ORDER BY id',
      [temaId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar perguntas:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ============================================================
// Rotas de Tentativas (Protegidas - Apenas Utilizadores Autenticados)
// ============================================================

app.post(
  '/api/tentativas',
  autenticarUtilizador,
  [
    body('pergunta_id')
      .notEmpty()
      .withMessage('O identificador da pergunta é obrigatório.')
      .isInt({ min: 1 })
      .withMessage('O identificador da pergunta deve ser um número inteiro válido.'),
    body('resposta_usuario')
      .notEmpty()
      .withMessage('A resposta escolhida é obrigatória.')
      .isInt({ min: 1, max: 4 })
      .withMessage('A resposta deve ser uma opção entre 1 e 4.'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          erro: errors.array()[0].msg,
          detalhes: errors.array().map((e) => ({ campo: e.path, mensagem: e.msg })),
        });
      }

      // Garante que cada utilizador só pode registar tentativas para a sua própria conta
      if (
        req.body.utilizador_id !== undefined &&
        parseInt(req.body.utilizador_id, 10) !== Number(req.utilizador.id)
      ) {
        return res.status(403).json({
          erro: 'Acesso negado. Não é permitido registar tentativas em nome de outro utilizador.',
        });
      }

      const utilizadorId = req.utilizador.id;
      const perguntaId = parseInt(req.body.pergunta_id, 10);
      const respostaUsuario = parseInt(req.body.resposta_usuario, 10);
      const tempoSegundos = parseInt(req.body.tempo_segundos, 10) || 0;

      const perguntaResult = await pool.query('SELECT * FROM perguntas WHERE id = $1', [
        perguntaId,
      ]);
      if (perguntaResult.rows.length === 0) {
        return res.status(404).json({ erro: 'Pergunta não encontrada.' });
      }

      const pergunta = perguntaResult.rows[0];
      const correta = Number(pergunta.correta) === respostaUsuario;
      const pontosGanhos = correta ? 10 : 0;

      const result = await pool.query(
        `INSERT INTO tentativas (utilizador_id, pergunta_id, resposta_usuario, correta, tempo_segundos)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [utilizadorId, perguntaId, respostaUsuario, correta, tempoSegundos]
      );

      let pontuacaoTotal = Number(req.utilizador.pontuacao || 0);
      if (correta) {
        const updatePts = await pool.query(
          'UPDATE utilizadores SET pontuacao = COALESCE(pontuacao, 0) + 10 WHERE id = $1 RETURNING pontuacao',
          [utilizadorId]
        );
        if (updatePts.rows.length > 0) {
          pontuacaoTotal = Number(updatePts.rows[0].pontuacao);
        }
      }

      return res.status(201).json({
        mensagem: correta
          ? 'Resposta correta! Ganhou +10 pontos.'
          : 'Resposta incorreta. Continue a praticar!',
        tentativa: result.rows[0],
        correta,
        correta_opcao: Number(pergunta.correta),
        explicacao: pergunta.explicacao,
        pontos_ganhos: pontosGanhos,
        pontuacao_total: pontuacaoTotal,
      });
    } catch (err) {
      console.error('Erro ao registar tentativa:', err);
      return res.status(500).json({ erro: 'Erro interno do servidor ao registar tentativa.' });
    }
  }
);

// ============================================================
// Middleware de Tratamento de Erros
// ============================================================
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ erro: 'Ocorreu um erro inesperado no servidor.' });
});

// ============================================================
// Inicialização do Servidor
// ============================================================
const startServer = async () => {
  try {
    await pool.query('SELECT NOW()');
    await inicializarBaseDeDados();

    app.listen(port, host, () => {
      console.log(`🚀 Servidor ProgrameMoz a correr em http://${host}:${port}`);
      console.log(`📚 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('❌ Falha ao iniciar servidor:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

app.app = app;
app.pool = pool;
app.inicializarBaseDeDados = inicializarBaseDeDados;

module.exports = app;
