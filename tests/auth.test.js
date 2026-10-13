/**
 * ============================================================
 * CódigoMZ / ProgrameMoz - Testes de Integração (Autenticação e Proteção)
 * ============================================================
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/server');
const { pool, inicializarBaseDeDados } = app;

describe('Sistema de Login, Registo, Perfil e Proteção - CódigoMZ', () => {
  const emailUtilizadorA = `estudante.a.${Date.now()}@uem.mz`;
  const emailUtilizadorB = `estudante.b.${Date.now()}@up.mz`;
  let tokenUtilizadorA = null;
  let idUtilizadorA = null;
  let tokenUtilizadorB = null;
  let idUtilizadorB = null;

  beforeAll(async () => {
    await inicializarBaseDeDados();
  });

  afterAll(async () => {
    await pool.query('DELETE FROM utilizadores WHERE email IN ($1, $2)', [
      emailUtilizadorA,
      emailUtilizadorB,
    ]);
    await pool.end();
  });

  describe('1. Registo de Utilizadores', () => {
    test('Deve rejeitar registo com campos inválidos ou em falta', async () => {
      const res = await request(app).post('/api/utilizadores').send({
        nome_completo: 'Ab',
        email: 'email-invalido',
        password: '123',
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('erro');
      expect(Array.isArray(res.body.detalhes)).toBe(true);
    });

    test('Deve criar uma nova conta com nome completo, e-mail e palavra-passe e guardar hash bcrypt', async () => {
      const res = await request(app).post('/api/utilizadores').send({
        nome_completo: 'Eduardo Chissano',
        email: emailUtilizadorA,
        password: 'SenhaSegura2026!',
        confirmar_password: 'SenhaSegura2026!',
        curso: 'Engenharia Informática',
        ano_estudo: 2,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.utilizador).toMatchObject({
        nome_completo: 'Eduardo Chissano',
        email: emailUtilizadorA,
        curso: 'Engenharia Informática',
        ano_estudo: 2,
        pontuacao: 0,
      });
      expect(res.body.utilizador).not.toHaveProperty('password_hash');
      expect(res.body).toHaveProperty('token');
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('codigomz_sessao=');
      expect(res.headers['set-cookie'][0]).toContain('HttpOnly');

      idUtilizadorA = res.body.utilizador.id;
      tokenUtilizadorA = res.body.token;

      // Verificar na base de dados que a palavra-passe nunca está em texto simples
      const dbUser = await pool.query(
        'SELECT password_hash FROM utilizadores WHERE id = $1',
        [idUtilizadorA]
      );
      expect(dbUser.rows[0].password_hash).not.toBe('SenhaSegura2026!');
      expect(dbUser.rows[0].password_hash.startsWith('$2')).toBe(true);
      const hashCorreto = await bcrypt.compare(
        'SenhaSegura2026!',
        dbUser.rows[0].password_hash
      );
      expect(hashCorreto).toBe(true);
    });

    test('Deve impedir o registo de um e-mail já registado', async () => {
      const res = await request(app).post('/api/utilizadores').send({
        nome_completo: 'Outro Utilizador',
        email: emailUtilizadorA.toUpperCase(),
        password: 'OutraPassword123!',
      });

      expect(res.statusCode).toBe(409);
      expect(res.body.erro).toMatch(/já está registado/i);
    });
  });

  describe('2. Login de Utilizadores', () => {
    test('Deve rejeitar login com palavra-passe incorreta', async () => {
      const res = await request(app).post('/api/utilizadores/login').send({
        email: emailUtilizadorA,
        password: 'PasswordErrada123',
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.erro).toMatch(/Credenciais incorretas/i);
    });

    test('Deve rejeitar login com e-mail inexistente', async () => {
      const res = await request(app).post('/api/utilizadores/login').send({
        email: 'nao.existe.moz@uem.mz',
        password: 'SenhaSegura2026!',
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.erro).toMatch(/Credenciais incorretas/i);
    });

    test('Deve permitir login com e-mail e palavra-passe corretos', async () => {
      const res = await request(app).post('/api/utilizadores/login').send({
        email: emailUtilizadorA,
        password: 'SenhaSegura2026!',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.utilizador.email).toBe(emailUtilizadorA);
      expect(res.body.utilizador.nome_completo).toBe('Eduardo Chissano');
      expect(res.body).toHaveProperty('token');
      tokenUtilizadorA = res.body.token;
    });
  });

  describe('3. Perfil, Pontuação, Progresso e Proteção de Rotas', () => {
    test('Deve bloquear acesso não autenticado ao perfil e progresso', async () => {
      const resPerfil = await request(app).get('/api/auth/perfil');
      expect(resPerfil.statusCode).toBe(401);

      const resProgresso = await request(app).get(`/api/utilizadores/${idUtilizadorA}/progresso`);
      expect(resProgresso.statusCode).toBe(401);

      const resTentativa = await request(app).post('/api/tentativas').send({
        pergunta_id: 1,
        resposta_usuario: 2,
      });
      expect(resTentativa.statusCode).toBe(401);
    });

    test('Deve registar tentativa de quizz, atualizar pontuação e refletir no perfil', async () => {
      // Responder corretamente à pergunta 1 (correta = 2)
      const resTentativa = await request(app)
        .post('/api/tentativas')
        .set('Authorization', `Bearer ${tokenUtilizadorA}`)
        .send({
          pergunta_id: 1,
          resposta_usuario: 2,
          tempo_segundos: 12,
        });

      expect(resTentativa.statusCode).toBe(201);
      expect(resTentativa.body.correta).toBe(true);
      expect(resTentativa.body.pontos_ganhos).toBe(10);
      expect(resTentativa.body.pontuacao_total).toBe(10);

      // Consultar perfil atualizado
      const resPerfil = await request(app)
        .get('/api/auth/perfil')
        .set('Authorization', `Bearer ${tokenUtilizadorA}`);

      expect(resPerfil.statusCode).toBe(200);
      expect(resPerfil.body.nome_completo).toBe('Eduardo Chissano');
      expect(resPerfil.body.pontuacao).toBe(10);
      expect(resPerfil.body.total_tentativas).toBe(1);
      expect(resPerfil.body.acertos).toBe(1);
      expect(resPerfil.body.percentual_acertos).toBe(100);
      expect(Array.isArray(resPerfil.body.progresso_por_linguagem)).toBe(true);
      expect(resPerfil.body.historico.length).toBe(1);
    });

    test('Deve impedir que um utilizador consulte o histórico de outro utilizador', async () => {
      // Registar segundo utilizador (Utilizador B)
      const regB = await request(app).post('/api/utilizadores').send({
        nome_completo: 'Graça Simbine',
        email: emailUtilizadorB,
        password: 'SenhaSeguraB2026!',
      });
      expect(regB.statusCode).toBe(201);
      idUtilizadorB = regB.body.utilizador.id;
      tokenUtilizadorB = regB.body.token;

      // Utilizador B tenta consultar o progresso e histórico do Utilizador A
      const resProgressoAlheio = await request(app)
        .get(`/api/utilizadores/${idUtilizadorA}/progresso`)
        .set('Authorization', `Bearer ${tokenUtilizadorB}`);
      expect(resProgressoAlheio.statusCode).toBe(403);

      const resHistoricoAlheio = await request(app)
        .get(`/api/utilizadores/${idUtilizadorA}/historico`)
        .set('Authorization', `Bearer ${tokenUtilizadorB}`);
      expect(resHistoricoAlheio.statusCode).toBe(403);

      // Utilizador B tenta submeter tentativa em nome do Utilizador A
      const resTentativaAlheia = await request(app)
        .post('/api/tentativas')
        .set('Authorization', `Bearer ${tokenUtilizadorB}`)
        .send({
          utilizador_id: idUtilizadorA,
          pergunta_id: 1,
          resposta_usuario: 1,
        });
      expect(resTentativaAlheia.statusCode).toBe(403);
    });
  });

  describe('4. Logout Seguro e Invalidação de Sessão', () => {
    test('Deve terminar a sessão e invalidar imediatamente o token anterior', async () => {
      const resLogout = await request(app)
        .post('/api/utilizadores/logout')
        .set('Authorization', `Bearer ${tokenUtilizadorA}`);

      expect(resLogout.statusCode).toBe(200);
      expect(resLogout.body.mensagem).toMatch(/Sessão terminada com segurança/i);

      // Tentar reutilizar o token antigo após logout deve falhar com 401
      const resAposLogout = await request(app)
        .get('/api/auth/perfil')
        .set('Authorization', `Bearer ${tokenUtilizadorA}`);

      expect(resAposLogout.statusCode).toBe(401);
    });
  });

  describe('5. Páginas da Interface (Login, Registo e Painel)', () => {
    test('Deve servir as páginas HTML de login, registo e painel principal', async () => {
      const resLogin = await request(app).get('/login.html');
      expect(resLogin.statusCode).toBe(200);
      expect(resLogin.text).toContain('Iniciar Sessão');

      const resRegisto = await request(app).get('/registo.html');
      expect(resRegisto.statusCode).toBe(200);
      expect(resRegisto.text).toContain('Registo de Novo Utilizador');

      const resIndex = await request(app).get('/index.html');
      expect(resIndex.statusCode).toBe(200);
      expect(resIndex.text).toContain('Perfil do Estudante');
    });
  });
});
