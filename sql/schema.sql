-- ============================================================
-- CódigoMZ / ProgrameMoz - Esquema da Base de Dados PostgreSQL
-- Nota: Utiliza CREATE TABLE IF NOT EXISTS e ALTER TABLE ... ADD COLUMN IF NOT EXISTS
-- para preservar todas as tabelas e dados existentes sem duplicação.
-- ============================================================

-- 1. Tabela de Utilizadores (Autenticação e Perfil integrados)
CREATE TABLE IF NOT EXISTS utilizadores (
  id SERIAL PRIMARY KEY,
  nome_completo VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  curso VARCHAR(100),
  ano_estudo INTEGER,
  pontuacao INTEGER NOT NULL DEFAULT 0,
  token_versao INTEGER NOT NULL DEFAULT 1,
  ultimo_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adaptação segura da tabela "utilizadores" caso já exista num esquema anterior
ALTER TABLE utilizadores ADD COLUMN IF NOT EXISTS nome_completo VARCHAR(150);
ALTER TABLE utilizadores ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE utilizadores ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE utilizadores ADD COLUMN IF NOT EXISTS curso VARCHAR(100);
ALTER TABLE utilizadores ADD COLUMN IF NOT EXISTS ano_estudo INTEGER;
ALTER TABLE utilizadores ADD COLUMN IF NOT EXISTS pontuacao INTEGER NOT NULL DEFAULT 0;
ALTER TABLE utilizadores ADD COLUMN IF NOT EXISTS token_versao INTEGER NOT NULL DEFAULT 1;
ALTER TABLE utilizadores ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP;
ALTER TABLE utilizadores ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS idx_utilizadores_email_lower ON utilizadores (LOWER(email));

-- 2. Tabela de Linguagens de Programação
CREATE TABLE IF NOT EXISTS linguagens (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(80) UNIQUE NOT NULL,
  nome_moçambique VARCHAR(100),
  descricao TEXT,
  nivel_inicial VARCHAR(50) DEFAULT 'Iniciante',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Temas por Linguagem
CREATE TABLE IF NOT EXISTS temas (
  id SERIAL PRIMARY KEY,
  linguagem_id INTEGER NOT NULL REFERENCES linguagens(id) ON DELETE CASCADE,
  nome VARCHAR(120) NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 1,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de Perguntas de Quizz
CREATE TABLE IF NOT EXISTS perguntas (
  id SERIAL PRIMARY KEY,
  tema_id INTEGER NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
  enunciado TEXT NOT NULL,
  opcao_a TEXT NOT NULL,
  opcao_b TEXT NOT NULL,
  opcao_c TEXT NOT NULL,
  opcao_d TEXT NOT NULL,
  correta INTEGER NOT NULL CHECK (correta BETWEEN 1 AND 4),
  explicacao TEXT,
  dificuldade VARCHAR(40) DEFAULT 'Médio',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabela de Tentativas / Histórico de Quizzes dos Utilizadores
CREATE TABLE IF NOT EXISTS tentativas (
  id SERIAL PRIMARY KEY,
  utilizador_id INTEGER NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
  pergunta_id INTEGER NOT NULL REFERENCES perguntas(id) ON DELETE CASCADE,
  resposta_usuario INTEGER NOT NULL CHECK (resposta_usuario BETWEEN 1 AND 4),
  correta BOOLEAN NOT NULL DEFAULT FALSE,
  tempo_segundos INTEGER DEFAULT 0,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tentativas_utilizador_id ON tentativas (utilizador_id);
CREATE INDEX IF NOT EXISTS idx_tentativas_pergunta_id ON tentativas (pergunta_id);
