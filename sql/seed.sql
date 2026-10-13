-- ============================================================
-- CódigoMZ / ProgrameMoz - Dados de Demonstração (Seeds)
-- Nota: Utiliza ON CONFLICT DO NOTHING para não apagar nem sobrescrever dados existentes.
-- ============================================================

-- 1. Linguagens de Programação
INSERT INTO linguagens (id, nome, nome_moçambique, descricao, nivel_inicial) VALUES
  (1, 'Java', 'Java', 'Linguagem orientada a objetos muito usada nas universidades moçambicanas (UEM, UP, ISCTEM) e banca.', 'Intermédio'),
  (2, 'C++', 'C++', 'Linguagem de alto desempenho para algoritmos, estruturas de dados e sistemas.', 'Intermédio'),
  (3, 'Python', 'Python', 'Linguagem versátil e clara para automação, ciência de dados e desenvolvimento web.', 'Iniciante'),
  (4, 'SQL', 'SQL', 'Linguagem estruturada de consulta para gestão de bases de dados relacionais como PostgreSQL.', 'Iniciante'),
  (5, 'Lógica', 'Lógica de Programação', 'Fundamentos de algoritmos, fluxogramas e raciocínio lógico para iniciantes.', 'Iniciante')
ON CONFLICT (nome) DO NOTHING;

SELECT setval(pg_get_serial_sequence('linguagens', 'id'), COALESCE((SELECT MAX(id) FROM linguagens), 1));

-- 2. Temas por Linguagem
INSERT INTO temas (id, linguagem_id, nome, descricao, ordem) VALUES
  (1, 1, 'Programação Orientada a Objetos em Java', 'Classes, objetos, herança, polimorfismo e encapsulamento.', 1),
  (2, 2, 'Apontadores e Estruturas em C++', 'Gestão de memória, ciclos e funções em C++.', 1),
  (3, 3, 'Fundamentos e Estruturas de Dados em Python', 'Listas, dicionários, ciclos e funções em Python.', 1),
  (4, 4, 'Consultas Relacionais e PostgreSQL', 'SELECT, JOIN, GROUP BY e integridade referencial.', 1),
  (5, 5, 'Algoritmos e Estruturas de Controlo', 'Condicionais, ciclos de repetição e variáveis.', 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('temas', 'id'), COALESCE((SELECT MAX(id) FROM temas), 1));

-- 3. Perguntas de Quizz (com contexto moçambicano)
INSERT INTO perguntas (id, tema_id, enunciado, opcao_a, opcao_b, opcao_c, opcao_d, correta, explicacao, dificuldade) VALUES
  (1, 1, 'Em Java, qual palavra-chave é utilizada para uma classe herdar comportamentos de outra classe?', 'implements', 'extends', 'inherits', 'super', 2, 'Em Java, a palavra-chave "extends" é usada para estabelecer herança entre classes, enquanto "implements" é usada para interfaces.', 'Fácil'),
  (2, 1, 'Num sistema de gestão de propinas da UEM em Java, qual modificador garante que o atributo "saldoMeticais" só é acedido dentro da própria classe?', 'public', 'protected', 'private', 'package', 3, 'O modificador "private" restringe o acesso ao atributo apenas aos métodos da própria classe, garantindo o encapsulamento.', 'Fácil'),
  (3, 1, 'Qual é o ponto de entrada padrão para a execução de uma aplicação Java?', 'public void start()', 'public static void main(String[] args)', 'static int main()', 'void init(String[] args)', 2, 'A JVM procura sempre o método com a assinatura exata "public static void main(String[] args)" para iniciar o programa.', 'Médio'),

  (4, 2, 'Em C++, qual operador é utilizado para obter o endereço de memória de uma variável?', '*', '&', '->', '::', 2, 'O operador "&" (address-of) devolve o endereço de memória onde a variável está guardada.', 'Fácil'),
  (5, 2, 'Qual biblioteca padrão em C++ deve ser incluída para utilizar "std::cout" e "std::cin"?', '<stdio.h>', '<iostream>', '<conio.h>', '<fstream>', 2, 'A biblioteca <iostream> fornece os fluxos padrão de entrada e saída (cin e cout) em C++.', 'Fácil'),
  (6, 2, 'O que acontece se alocarmos memória com "new" em C++ e nunca utilizarmos "delete"?', 'O compilador apaga automaticamente no fim da função', 'Ocorre uma fuga de memória (memory leak)', 'O programa não compila', 'A memória é convertida para estática', 2, 'Em C++, a memória alocada dinamicamente no heap com "new" deve ser libertada com "delete" para evitar fugas de memória.', 'Médio'),

  (7, 3, 'Em Python, qual é a saída de: len(["Maputo", "Beira", "Nampula", "Pemba"])?', '3', '4', '24', 'Erro de sintaxe', 2, 'A função len() devolve o número de elementos presentes na lista, que neste caso são 4 cidades moçambicanas.', 'Fácil'),
  (8, 3, 'Qual estrutura de dados em Python armazena pares chave-valor, ideal para associar o NUIT ao nome de um cidadão?', 'Lista (list)', 'Tuplo (tuple)', 'Dicionário (dict)', 'Conjunto (set)', 3, 'O dicionário (dict) permite mapear chaves únicas (como o NUIT) aos respetivos valores com acesso rápido O(1).', 'Fácil'),
  (9, 3, 'Como se define corretamente uma função em Python que calcula a taxa de IVA (16%) em Moçambique?', 'function calcular_iva(valor):', 'def calcular_iva(valor):', 'void calcular_iva(valor):', 'fn calcular_iva(valor) =>', 2, 'Em Python, utiliza-se a palavra-chave "def" seguida do nome da função, parênteses e dois pontos (:).', 'Fácil'),

  (10, 4, 'Em SQL (PostgreSQL), qual cláusula é utilizada para filtrar registos de estudantes da província de Gaza?', 'ORDER BY provincia = ''Gaza''', 'WHERE provincia = ''Gaza''', 'GROUP BY provincia = ''Gaza''', 'HAVING provincia = ''Gaza''', 2, 'A cláusula WHERE filtra linhas antes de qualquer agrupamento, selecionando apenas os registos que cumprem a condição.', 'Fácil'),
  (11, 4, 'Qual comando SQL permite adicionar uma coluna sem apagar dados existentes numa tabela PostgreSQL?', 'ALTER TABLE utilizadores ADD COLUMN IF NOT EXISTS pontuacao INT DEFAULT 0;', 'DROP TABLE utilizadores;', 'TRUNCATE TABLE utilizadores;', 'CREATE TABLE utilizadores;', 1, 'O comando ALTER TABLE ... ADD COLUMN IF NOT EXISTS adapta o esquema da tabela preservando todos os dados já guardados.', 'Médio'),
  (12, 4, 'Para combinar os dados da tabela "utilizadores" com a tabela "tentativas" mantendo utilizadores mesmo sem tentativas, qual JOIN usamos?', 'INNER JOIN', 'LEFT JOIN', 'CROSS JOIN', 'RIGHT EXCLUSIVE JOIN', 2, 'O LEFT JOIN retorna todos os registos da tabela à esquerda (utilizadores) mesmo quando não há correspondência na tabela à direita (tentativas).', 'Médio'),

  (13, 5, 'Num algoritmo de validação de recenseamento, qual é o resultado da expressão lógica: (idade >= 18) E (nacionalidade == "Moçambicana") para alguém com 20 anos e nacionalidade Moçambicana?', 'Falso', 'Verdadeiro', 'Nulo', 'Indefinido', 2, 'No operador lógico E (AND), o resultado é Verdadeiro quando ambas as condições são verdadeiras.', 'Fácil'),
  (14, 5, 'Qual estrutura de repetição garante que o bloco de código seja executado pelo menos uma vez antes de testar a condição?', 'enquanto (while)', 'para (for)', 'repita ... até / faça ... enquanto (do-while)', 'escolha (switch)', 3, 'A estrutura "do-while" (faça...enquanto) verifica a condição apenas no final de cada iteração.', 'Fácil'),
  (15, 5, 'O que é uma variável num algoritmo de programação?', 'Um valor fixo que nunca pode ser alterado', 'Um espaço nomeado na memória para guardar dados que podem variar durante a execução', 'Um erro de compilação', 'O nome do ficheiro do código-fonte', 2, 'Uma variável identifica uma posição de memória cujo valor pode ser lido e modificado ao longo da execução do algoritmo.', 'Fácil')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('perguntas', 'id'), COALESCE((SELECT MAX(id) FROM perguntas), 1));

-- 4. Utilizador de Demonstração (Palavra-passe com hash bcrypt seguro para "Estudante123!")
INSERT INTO utilizadores (id, nome_completo, email, password_hash, curso, ano_estudo, pontuacao) VALUES
  (1, 'Amélia Mondlane', 'amelia.mondlane@uem.mz', '$2a$12$30AqxTpd5Blpgz4SokIf8.LZG2fjOARNqYe8ymnShimY6u1mPpJFC', 'Engenharia Informática', 3, 20)
ON CONFLICT (email) DO NOTHING;

SELECT setval(pg_get_serial_sequence('utilizadores', 'id'), COALESCE((SELECT MAX(id) FROM utilizadores), 1));

-- 5. Tentativas de Demonstração para o Utilizador 1
INSERT INTO tentativas (id, utilizador_id, pergunta_id, resposta_usuario, correta, tempo_segundos) VALUES
  (1, 1, 1, 2, TRUE, 14),
  (2, 1, 7, 2, TRUE, 11)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('tentativas', 'id'), COALESCE((SELECT MAX(id) FROM tentativas), 1));
