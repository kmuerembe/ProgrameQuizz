/**
 * ============================================================
 * ProgrameMoz - Servidor Node.js com Express
 * Plataforma moçambicana de quizzes para aprendizagem de programação
 * ============================================================
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// Middleware de segurança
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// ============================================================
// Conexão com PostgreSQL
// ============================================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('✅ Conectado ao PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erro na conexão com PostgreSQL:', err);
  process.exit(1);
});

// ============================================================
// Rotas de API
// ============================================================

// Ruta de teste
app.get('/', (req, res) => {
  res.json({
    mensagem: 'Bem-vindo ao ProgrameMoz API',
    versão: '1.0.0',
    status: 'ativo',
  });
});

// ============================================================
// Rotas de Utilizadores
// ============================================================

// Registar novo utilizador
app.post('/api/utilizadores', async (req, res) => {
  try {
    const { nome_completo, email, password_hash, curso, ano_estudo } = req.body;

    if (!nome_completo || !email || !password_hash) {
      return res.status(400).json({ erro: 'Nome, email e password são obrigatórios' });
    }

    const result = await pool.query(
      'INSERT INTO utilizadores (nome_completo, email, password_hash, curso, ano_estudo) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome_completo, email, created_at',
      [nome_completo, email, password_hash, curso, ano_estudo]
    );

    res.status(201).json({
      mensagem: 'Utilizador registado com sucesso',
      utilizador: result.rows[0],
    });
  } catch (err) {
    console.error('Erro ao registar utilizador:', err);
    if (err.code === '23505') { // Unique violation
      return res.status(400).json({ erro: 'Este email já está registado' });
    }
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Login de utilizador
app.post('/api/utilizadores/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM utilizadores WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ erro: 'Email ou password inválidos' });
    }

    const utilizador = result.rows[0];
    // Em produção, use bcrypt.compare para verificar a password
    if (password === 'teste123') { // Simplified for demo
      res.json({
        mensagem: 'Login bem-sucedido',
        utilizador: {
          id: utilizador.id,
          nome_completo: utilizador.nome_completo,
          email: utilizador.email,
        },
        token: 'token_jwt_simulado_aqui',
      });
    } else {
      return res.status(401).json({ erro: 'Email ou password inválidos' });
    }
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ============================================================
// Rotas de Linguagens
// ============================================================

// Listar todas as linguagens
app.get('/api/linguagens', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome, nome_moçambique, descricao, nivel_inicial FROM linguagens ORDER BY nome');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar linguagens:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ============================================================
// Rotas de Temas
// ============================================================

// Listar temas por linguagem
app.get('/api/temas/:linguagemId', async (req, res) => {
  try {
    const linguagemId = parseInt(req.params.linguagemId);
    const result = await pool.query(
      'SELECT id, nome, descricao, ordem FROM temas WHERE linguagem_id = $1 ORDER BY ordem, nome',
      [linguagemId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar temas:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

// ============================================================
// Rotas de Perguntas
// ============================================================

// Listar perguntas por tema
app.get('/api/perguntas/:temaId', async (req, res) => {
  try {
    const temaId = parseInt(req.params.temaId);
    const result = await pool.query(
      'SELECT id, enunciado, opcao_a, opcao_b, opcao_c, opcao_d, correta, explicacao, dificuldade FROM perguntas WHERE tema_id = $1 ORDER BY id',
      [temaId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar perguntas:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ============================================================
// Rotas de Tentativas
// ============================================================

// Registrar uma tentativa
app.post('/api/tentativas', async (req, res) => {
  try {
    const { utilizador_id, pergunta_id, resposta_usuario } = req.body;

    if (!utilizador_id || !pergunta_id || !resposta_usuario) {
      return res.status(400).json({ erro: 'utilizador_id, pergunta_id e resposta_usuario são obrigatórios' });
    }

    // Verificar se a questão existe
    const perguntaResult = await pool.query('SELECT * FROM perguntas WHERE id = $1', [pergunta_id]);
    if (perguntaResult.rows.length === 0) {
      return res.status(404).json({ erro: 'Pergunta não encontrada' });
    }

    const correta = perguntaResult.rows[0].correta === resposta_usuario;

    const result = await pool.query(
      'INSERT INTO tentativas (utilizador_id, pergunta_id, resposta_usuario, correta, tempo_segundos) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [utilizador_id, pergunta_id, resposta_usuario, correta, req.body.tempo_segundos || 0]
    );

    res.status(201).json({
      mensagem: correta ? 'Resposta correta!' : 'Resposta incorreta',
      tentativa: result.rows[0],
      correta,
    });
  } catch (err) {
    console.error('Erro ao registrar tentativa:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ============================================================
// View de progresso do utilizador
// ============================================================

// Obter progresso de um utilizador
app.get('/api/utilizadores/:id/progresso', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const result = await pool.query(`
      SELECT
        u.id,
        u.nome_completo,
        u.curso,
        u.ano_estudo,
        COUNT(t.id) AS total_tentativas,
        SUM(CASE WHEN t.correta THEN 1 ELSE 0 END) AS acertos,
        ROUND(100.0 * SUM(CASE WHEN t.correta THEN 1 ELSE 0 END) / COUNT(t.id), 2) AS percentual_acertos,
        MAX(t.criado_em) AS ultima_tentativa
      FROM utilizadores u
      LEFT JOIN tentativas t ON u.id = t.utilizador_id
      WHERE u.id = $1
      GROUP BY u.id, u.nome_completo, u.curso, u.ano_estudo
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Utilizador não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao obter progresso:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ============================================================
// Middleware de tratamento de erros
// ============================================================
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ erro: 'Algo deu errado!' });
});

// ============================================================
// Inicialização do servidor
// ============================================================
const startServer = async () => {
  try {
    // Verificar conexão com o banco antes de iniciar
    await pool.query('SELECT NOW()');

    app.listen(port, () => {
      console.log(`🚀 Servidor ProgrameMoz rodando em http://localhost:${port}`);
      console.log(`📚 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('❌ Falha ao iniciar servidor:', err);
    process.exit(1);
  }
};

startServer();

module.exports = app;