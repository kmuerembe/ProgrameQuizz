/**
 * ============================================================
 * CódigoMZ / ProgrameMoz - Middleware de Autenticação e Sessão
 * Gestão de tokens JWT, cookies HttpOnly seguros e controlo de acesso
 * ============================================================
 */

const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'codigomz_sessao';
const JWT_SECRET = process.env.JWT_SECRET || 'codigomz_segredo_jwt_mocambique_2026_seguro_32chars';
const SESSION_MAX_AGE = process.env.SESSION_MAX_AGE || '24h';
const COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Faz o parse do cabeçalho Cookie do pedido HTTP
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return cookies;

  cookieHeader.split(';').forEach((pair) => {
    const index = pair.indexOf('=');
    if (index > -1) {
      const key = pair.slice(0, index).trim();
      const val = pair.slice(index + 1).trim();
      try {
        cookies[key] = decodeURIComponent(val);
      } catch {
        cookies[key] = val;
      }
    }
  });

  return cookies;
}

/**
 * Extrai o token de sessão do cookie HttpOnly ou do cabeçalho Authorization
 */
function extrairToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token && token !== 'null' && token !== 'undefined') {
      return token;
    }
  }

  const cookies = parseCookies(req.headers.cookie);
  if (cookies[COOKIE_NAME]) {
    return cookies[COOKIE_NAME];
  }

  return null;
}

/**
 * Gera um token JWT assinado para a sessão do utilizador
 */
function gerarTokenSessao(utilizador) {
  return jwt.sign(
    {
      id: utilizador.id,
      email: utilizador.email,
      nome_completo: utilizador.nome_completo,
      token_versao: Number(utilizador.token_versao || 1),
    },
    JWT_SECRET,
    { expiresIn: SESSION_MAX_AGE }
  );
}

/**
 * Define o cookie HttpOnly seguro na resposta HTTP
 */
function definirCookieSessao(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

/**
 * Limpa o cookie de sessão na resposta HTTP
 */
function limparCookieSessao(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

/**
 * Cria o middleware que exige utilizador autenticado com sessão ativa na base de dados
 */
function criarMiddlewareAutenticacao(pool) {
  return async function autenticarUtilizador(req, res, next) {
    try {
      const token = extrairToken(req);

      if (!token) {
        return res.status(401).json({
          erro: 'Autenticação necessária. Por favor, inicie sessão para aceder a esta funcionalidade.',
        });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        limparCookieSessao(res);
        return res.status(401).json({
          erro: 'Sessão inválida ou expirada. Por favor, inicie sessão novamente.',
        });
      }

      const result = await pool.query(
        `SELECT id, nome_completo, email, curso, ano_estudo,
                COALESCE(pontuacao, 0) AS pontuacao,
                COALESCE(token_versao, 1) AS token_versao,
                ultimo_login, created_at
         FROM utilizadores
         WHERE id = $1`,
        [decoded.id]
      );

      if (result.rows.length === 0) {
        limparCookieSessao(res);
        return res.status(401).json({
          erro: 'Utilizador não encontrado. Por favor, inicie sessão novamente.',
        });
      }

      const utilizador = result.rows[0];

      // Verifica se a sessão foi terminada (logout invalidou a versão do token)
      if (Number(decoded.token_versao || 1) !== Number(utilizador.token_versao || 1)) {
        limparCookieSessao(res);
        return res.status(401).json({
          erro: 'A sua sessão foi terminada. Por favor, inicie sessão novamente.',
        });
      }

      req.utilizador = utilizador;
      next();
    } catch (err) {
      console.error('Erro na verificação de autenticação:', err);
      res.status(500).json({ erro: 'Erro interno ao validar a sessão.' });
    }
  };
}

/**
 * Middleware que garante que cada utilizador só acede aos seus próprios recursos (:id)
 */
function autorizarProprioUtilizador(req, res, next) {
  const idParam = parseInt(req.params.id, 10);
  if (Number.isNaN(idParam)) {
    return res.status(400).json({ erro: 'Identificador de utilizador inválido.' });
  }

  if (!req.utilizador || Number(req.utilizador.id) !== idParam) {
    return res.status(403).json({
      erro: 'Acesso negado. Cada utilizador só pode consultar o seu próprio histórico e progresso.',
    });
  }

  next();
}

module.exports = {
  COOKIE_NAME,
  JWT_SECRET,
  parseCookies,
  extrairToken,
  gerarTokenSessao,
  definirCookieSessao,
  limparCookieSessao,
  criarMiddlewareAutenticacao,
  autorizarProprioUtilizador,
};
