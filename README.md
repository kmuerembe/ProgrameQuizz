# ProgrameMoz - Plataforma de Quizzes para Aprendizagem de Programação

![ProgrameMoz](https://img.shields.io/badge/ProgrameMoz-Plataforma%20Mozambicana-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-yellow)

> Uma plataforma moçambicana de quizzes interativos para estudantes universitários aprenderem programação de forma prática e divertida.

## 📋 Sobre o Projeto

O **ProgrameMoz** é uma plataforma educacional desenvolvida especificamente para estudantes universitários de Moçambique, com o objetivo de facilitar o aprendizado de programação através de quizzes interativos. A plataforma suporta múltiplas linguagens de programação e tópicos educacionais relevantes para o contexto académico moçambicano.

### Funcionalidades Principais

- **Seleção de Linguagens**: Java, C++, Python, SQL e Lógica de Programação
- **Quizzes de Múltipla Escolha**: Com explicações detalhadas após cada resposta
- **Prática de Tópicos**: Condicionais, ciclos, funções, POO e bases de dados
- **Histórico de Progresso**: Acompanhamento do desempenho ao longo do tempo
- **Interface Responsiva**: Funciona perfeitamente em telemóveis e desktop
- **Conteúdo em Português de Moçambique**: Terminologia e exemplos locais

## 🛠️ Tecnologias Utilizadas

### Frontend
- HTML5 semântico
- CSS3 com variáveis personalizadas
- JavaScript vanilla (fetch API)

### Backend
- Node.js com Express
- PostgreSQL para base de dados
- JWT para autenticação
- bcryptjs para hash de passwords

### Ferramentas
- dotenv para configuração de ambiente
- helmet para segurança HTTP
- cors para acesso cross-origin
- morgan para logging de requests

## 📦 Instalação

### Pré-requisitos

- Node.js (versão 14 ou superior)
- PostgreSQL (versão 12 ou superior)
- Git

### Passo a Passo

1. **Clone o repositório**
   ```bash
   git clone https://github.com/seu-usuario/ProgrameQuizz.git
   cd ProgrameQuizz
   ```

2. **Crie um branch de funcionalidade**
   ```bash
   git checkout -b feature/programe-moz
   ```

3. **Instale as dependências**
   ```bash
   npm install
   ```

4. **Configure a base de dados**

   - Instale e inicie o PostgreSQL
   - Crie um banco de dados: `CREATE DATABASE programe_moz;`
   - Execute o script de schema:
     ```bash
     psql -U seu_usuario -d programe_moz -f sql/schema.sql
     ```
   - Execute o script de seeds (dados de demonstração):
     ```bash
     psql -U seu_usuario -d programe_moz -f sql/seed.sql
     ```

5. **Configure as variáveis de ambiente**

   Copie o ficheiro `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```

   Edite o ficheiro `.env` com as suas credenciais:
   ```env
   DATABASE_URL=postgres://utilizador:senha_segura@localhost:5432/programe_moz
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=sua_chave_secreta_aqui
   CORS_ORIGIN=http://localhost:3000
   ```

6. **Inicie o servidor**
   ```bash
   npm run dev
   ```

   O servidor estará disponível em `http://localhost:3000`

## 🗄️ Estrutura da Base de Dados

O projeto inclui os seguintes tabelas:

| Tabela | Descrição |
|--------|-----------|
| `utilizadores` | Conta de utilizadores (estudantes) |
| `linguagens` | Linguagens de programação disponíveis |
| `temas` | Tópicos/sub-dentro de cada linguagem |
| `perguntas` | Perguntas de quiz com múltipla escolha |
| `tentativas` | Histórico de tentativas dos utilizadores |

### Scripts SQL

- `sql/schema.sql` - Criação das tabelas com chaves estrangeiras e restrições
- `sql/seed.sql` - Inserção de 20+ registos de demonstração por tabela

## 🌐 Endpoints da API

### Utilizadores
- `GET /` - Teste da API
- `POST /api/utilizadores` - Registar novo utilizador
- `POST /api/utilizadores/login` - Login de utilizador
- `GET /api/utilizadores/:id/progresso` - Obter progresso do utilizador

### Linguagens
- `GET /api/linguagens` - Listar todas as linguagens

### Temas
- `GET /api/temas/:linguagemId` - Listar temas por linguagem

### Perguntas
- `GET /api/perguntas/:temaId` - Listar perguntas por tema

### Tentativas
- `POST /api/tentativas` - Registrar uma tentativa de quiz

## 📱 Interface e Experiência do Utilizador

- **Design Responsivo**: Otimizado para telemóveis (ecrãs pequenos) e desktop
- **Português de Moçambique**: Todos os textos e terminologia em português moçambicano
- **Acessível**: Contraste adequado, navegação por teclado, labels descritivas
- **Leve**: Funciona com conexões de internet limitadas, sem requisitos de hardware elevado
- **Offline-first**: Estrutura básica funciona; conteúdo carregado dinamically via API

## 🤝 Como Contribuir

1. Faça um fork do repositório
2. Crie um branch para a sua feature: `git checkout -b feature/nova-functionalidade`
3. Commit das suas alterações: `git commit -m 'Adiciona nova funcionalidade'`
4. Push para o branch: `git push origin feature/nova-functionalidade`
5. Abra um Pull Request para revisão

### Guidelines para Commits

- Use mensagens de commit claras e descritivas
- Separe problemas de funcionalidades em commits distintos
- Include referências ao número do issue quando aplicável
- Teste as suas alterações antes de fazer commit

## 📜 Licença

Este projeto está licenciado sob a licença MIT - veja o ficheiro [LICENSE](LICENSE) para detalhes.

## 📞 Contacte-nos

- **Email**: contacto@programe.maz
- **GitHub**: [https://github.com/seu-usuario/ProgrameQuizz](https://github.com/seu-usuario/ProgrameQuizz)