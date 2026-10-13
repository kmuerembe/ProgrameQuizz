/**
 * ============================================================
 * ProgrameMoz - Frontend JavaScript
 * Plataforma moçambicana de quizzes para aprendizagem de programação
 * ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Estado da aplicação
  let appState = {
    currentLanguage: null,
    currentQuestionIndex: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    userAnswers: [],
    selectedLanguageId: null
  };

  // Elementos do DOM
  const elements = {
    // Navigation
    languageCards: document.querySelectorAll('.linguagem-card'),
    quizSection: document.getElementById('perguntas'),
    progressSection: document.getElementById('progresso'),
    
    // Quizz elements
    quizzTitle: document.getElementById('quizz-titulo'),
    quizzProgress: document.getElementById('quizz-progress'),
    quizzProgressBar: document.getElementById('quizz-progress-bar'),
    quizzCard: document.getElementById('quizz-card'),
    perguntaElement: document.getElementById('quizz-pergunta'),
    opcoesContainer: document.getElementById('quizz-opcoes'),
    btnAnterior: document.getElementById('btn-anterior'),
    btnProxima: document.getElementById('btn-proxima'),
    navIndicator: document.getElementById('nav-indicator'),
    quizzResult: document.getElementById('quizz-result'),
    resultTitulo: document.getElementById('result-titulo'),
    resultExplicacao: document.getElementById('result-explicacao'),
    resultPontuacao: document.getElementById('result-pontuacao'),
    btnReiniciar: document.getElementById('btn-reiniciar'),
    
    // Progresso elements
    progressoBody: document.getElementById('progresso-body')
  };

  // Inicializar - esconder seções que não são hero
  function esconderTodasSecoes() {
    if (elements.quizSection) elements.quizSection.style.display = 'none';
    if (elements.progressSection) elements.progressSection.style.display = 'none';
  }

  // Carregar linguagens da API
  async function carregarLinguagens() {
    try {
      const response = await fetch('/api/linguagens');
      if (!response.ok) throw new Error('Erro ao carregar linguagens');
      const linguagens = await response.json();
      
      // Renderizar linguagens
      const grid = document.querySelector('.linguagens-grid');
      if (!grid) return;
      
      grid.innerHTML = '';
      
      linguagens.forEach((linguagem, index) => {
        const card = document.createElement('div');
        card.className = 'linguagem-card';
        card.dataset.id = linguagem.id;
        card.innerHTML = `
          <div class="linguagem-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <h3 class="linguagem-nome">${linguagem.nome_moçambique || linguagem.nome}</h3>
          <p class="linguagem-descricao">${linguagem.descricao || 'Linguagem de programação'}</p>
        `;
        
        // Evento de clique
        card.addEventListener('click', () => selecionarLinguagem(linguagem));
        
        grid.appendChild(card);
      });
      
      // Marcar primeira linguagem como selecionada se houver
      if (linguagens.length > 0 && elements.languageCards.length > 0) {
        elements.languageCards[0].classList.add('ligado');
        appState.selectedLanguageId = linguagens[0].id;
      }
      
    } catch (error) {
      console.error('Erro ao carregar linguagens:', error);
      // Fallback para dados locais se a API falhar
      renderLinguagensFallback();
    }
  }

  // Renderizar linguagens como fallback
  function renderLinguagensFallback() {
    const linguagens = [
      { id: 1, nome: 'Java', nome_moçambique: 'Java', descricao: 'Linguagem orientada a objetos' },
      { id: 2, nome: 'C++', nome_moçambique: 'C++', descricao: 'Linguagem de alto desempenho' },
      { id: 3, nome: 'Python', nome_moçambique: 'Python', descricao: 'Linguagem fácil de aprender' },
      { id: 4, nome: 'SQL', nome_moçambique: 'SQL', descricao: 'Linguagem para bases de dados' },
      { id: 5, nome: 'Lógica', nome_moçambique: 'Lógica de Programação', descricao: 'Fundamentos de raciocínio' }
    ];
    
    const grid = document.querySelector('.linguagens-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    linguagens.forEach((linguagem) => {
      const card = document.createElement('div');
      card.className = 'linguagem-card';
      card.dataset.id = linguagem.id;
      card.innerHTML = `
        <div class="linguagem-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <h3 class="linguagem-nome">${linguagem.nome_moçambique}</h3>
        <p class="linguagem-descricao">${linguagem.descricao}</p>
      `;
      
      card.addEventListener('click', () => selecionarLinguagem(linguagem));
      grid.appendChild(card);
    });
  }

  // Selecionar linguagem
  function selecionarLinguagem(linguagem) {
    // Remover seleção anterior
    elements.languageCards.forEach(card => card.classList.remove('ligado'));
    
    // Selecionar nova
    const selectedCard = document.querySelector(`.linguagem-card[data-id="${linguagem.id}"]`);
    if (selectedCard) {
      selectedCard.classList.add('ligado');
    }
    
    appState.selectedLanguageId = linguagem.id;
    appState.currentLanguage = linguagem.nome;
    
    // Carregar temas e perguntas
    carregarTemasELinguagem(linguagem.id);
  }

  // Carregar temas e perguntas
  async function carregarTemasELinguagem(linguagemId) {
    try {
      // Carregar temas
      const temasResponse = await fetch(`/api/temas/${linguagemId}`);
      if (!temasResponse.ok) throw new Error('Erro ao carregar temas');
      const temas = await temasResponse.json();
      
      if (temas.length === 0) {
        alert('Nenhum tema encontrado para esta linguagem');
        return;
      }
      
      // Carregar perguntas do primeiro tema
      carregarPerguntasPorTema(temas[0].id);
      
    } catch (error) {
      console.error('Erro ao carregar temas:', error);
    }
  }

  // Carregar perguntas por tema
  async function carregarPerguntasPorTema(temaId) {
    try {
      const response = await fetch(`/api/perguntas/${temaId}`);
      if (!response.ok) throw new Error('Erro ao carregar perguntas');
      const perguntas = await response.json();
      
      appState.totalQuestions = perguntas.length;
      appState.userAnswers = new Array(perguntas.length).fill(null);
      
      if (perguntas.length === 0) {
        alert('Nenhuma pergunta encontrada para este tema');
        return;
      }
      
      // Renderizar primeira pergunta
      appState.currentQuestionIndex = 0;
      renderizarPergunta(perguntas[0], 0);
      
      // Mostrar seção do quizz
      if (elements.quizSection) elements.quizSection.style.display = 'block';
      if (elements.quizzCard) elements.quizzCard.style.display = 'block';
      
    } catch (error) {
      console.error('Erro ao carregar perguntas:', error);
    }
  }

  // Renderizar pergunta atual
  function renderizarPergunta(pergunta, indice) {
    if (!elements.perguntaElement || !elements.opcoesContainer) return;
    
    // Atualizar título
    elements.quizzTitle.textContent = `ProgrameMoz - ${appState.currentLanguage} - ${pergunta.dificuldade}`;
    
    // Renderizar pergunta
    elements.perguntaElement.innerHTML = `
      <strong>${indice + 1}. ${pergunta.enunciado}</strong>
    `;
    
    // Renderizar opções
    elements.opcoesContainer.innerHTML = '';
    
    const opcoes = [pergunta.opcao_a, pergunta.opcao_b, pergunta.opcao_c, pergunta.opcao_d];
    
    opcoes.forEach((opcao, i) => {
      const opcaoElement = document.createElement('div');
      opcaoElement.className = 'quizz-opcao';
      opcaoElement.dataset.resposta = i + 1; // 1-4
      opcaoElement.innerHTML = `
        <span class="opcao-numero">${i + 1}</span>
        <span class="opcao-texto">${opcao}</span>
      `;
      
      // Verificar se já foi respondida
      if (appState.userAnswers[indice] !== null) {
        if (appState.userAnswers[indice] === i + 1) {
          opcaoElement.classList.add('selecionada');
        }
      }
      
      opcaoElement.addEventListener('click', () => selecionarOpcao(indice, i + 1, opcaoElement));
      elements.opcoesContainer.appendChild(opcaoElement);
    });
    
    // Atualizar indicador de progresso
    if (elements.navIndicator) {
      elements.navIndicator.textContent = `${indice + 1} de ${appState.totalQuestions}`;
    }
    
    // Controlar botões
    if (elements.btnAnterior) {
      elements.btnAnterior.disabled = indice === 0;
    }
    if (elements.btnProxima) {
      elements.btnProxima.textContent = indice < appState.totalQuestions - 1 ? 'Próxima' : 'Finalizar';
    }
  }

  // Selecionar opção
  function selecionarOpcao(indice, numeroResposta, elemento) {
    // Atualizar estado
    appState.userAnswers[indice] = numeroResposta;
    
    // Atualizar todas as opções
    elements.opcoesContainer.querySelectorAll('.quizz-opcao').forEach((opt, i) => {
      if (i === indice) {
        opt.classList.add('selecionada');
      } else {
        opt.classList.remove('selecionada');
      }
    });
    
    // Mostrar resultado imediatamente
    const perguntaId = elements.opcoesContainer.dataset.perguntaId 
      ? parseInt(elements.opcoesContainer.dataset.perguntaId) 
      : null;
    
    verificarResposta(indice, numeroResposta);
  }

  // Verificar resposta
  async function verificarResposta(indice, numeroResposta) {
    const perguntaId = parseInt(
      elements.opcoesContainer.dataset?.perguntaId || 
      Object.keys({...}).find().toString()
    ) || indice + 1;
    
    try {
      // Buscar a pergunta correta na API
      const response = await fetch(`/api/perguntas/${perguntaId}`);
      if (!response.ok) throw new Error('Erro ao verificar resposta');
      const pergunta = await response.json();
      
      const correta = pergunta.correta === numeroResposta;
      
      // Feedback visual
      elements.opcoesContainer.querySelectorAll('.quizz-opcao').forEach((opt, i) => {
        const isCorrect = (parseInt(opt.dataset.resposta) === pergunta.correta);
        
        if (isCorrect) {
          opt.style.background = 'var(--success)';
          opt.style.color = 'var(--white)';
        } else if (parseInt(opt.dataset.resposta) === numeroResposta && !correta) {
          opt.style.background = 'var(--error)';
          opt.style.color = 'var(--white)';
        }
      });
      
      // Atualizar pontuação
      if (correta) {
        appState.correctAnswers++;
        if (elements.resultTitulo) {
          elements.resultTitulo.textContent = 'Resposta Correta!';
          elements.resultTitulo.style.color = 'var(--success)';
        }
      } else {
        if (elements.resultTitulo) {
          elements.resultTitulo.textContent = 'Resposta Incorreta';
          elements.resultTitulo.style.color = 'var(--error)';
        }
      }
      
      // Mostrar explicação
      if (elements.resultExplicacao && pergunta.explicacao) {
        elements.resultExplicacao.textContent = `Explicação: ${pergunta.explicacao}`;
      }
      
      // Mostrar tela de resultado
      if (elements.quizzResult) {
        elements.quizzResult.style.display = 'block';
        elements.quizzCard.style.display = 'none';
      }
      
    } catch (error) {
      console.error('Erro ao verificar resposta:', error);
      
      // Feedback simples sem API
      elements.opcoesContainer.querySelectorAll('.quizz-opcao').forEach((opt, i) => {
        if (parseInt(opt.dataset.resposta) === numeroResposta) {
          opt.classList.add('selecionada');
          if (i + 1 === parseInt(pergunta.correta || '1')) {
            opt.style.background = 'var(--success)';
            opt.style.color = 'var(--white)';
          }
        }
      });
      
      if (elements.resultExplicacao) {
        elements.resultExplicacao.textContent = 'Explicação: Revise os conceitos da linguagem selecionada.';
      }
      if (elements.quizzResult) {
        elements.quizzResult.style.display = 'block';
        elements.quizzCard.style.display = 'none';
      }
    }
  }

  // Navegar entre perguntas
  function proximaPergunta() {
    if (appState.currentQuestionIndex < appState.totalQuestions - 1) {
      appState.currentQuestionIndex++;
      // Recarregar pergunta - precisamos guardar a pergunta atual
      // Isso requer manter referência às perguntas
      console.log('Próxima pergunta');
    } else {
      finalizarQuizz();
    }
  }

  function anteriorPergunta() {
    if (appState.currentQuestionIndex > 0) {
      appState.currentQuestionIndex--;
      renderizarPergunta(/* pergunta */ {}, appState.currentQuestionIndex);
    }
  }

  // Finalizar quizz
  function finalizarQuizz() {
    const percentual = (appState.correctAnswers / appState.totalQuestions * 100).toFixed(1);
    
    if (elements.quizzResult) {
      elements.quizzResult.innerHTML = `
        <div class="result-icon correto" style="color: var(--success);"></div>
        <h3 class="result-title">Parabéns!</h3>
        <p class="result-explanation">Você acertou ${appState.correctAnswers} de ${appState.totalQuestions} perguntas</p>
        <p class="result-score">${percentual}% de acertos</p>
        <button type="button" class="btn btn-primary" id="btn-reiniciar-quizz">Reiniciar</button>
      `;
      
      // Adicionar event listener ao botão de reiniciar
      const btnReiniciar = document.getElementById('btn-reiniciar-quizz');
      if (btnReiniciar) {
        btnReiniciar.addEventListener('click', () => reiniciarQuizz());
      }
    }
    
    // Mostrar seção de resultado e esconder quizz
    if (elements.quizzResult) elements.quizzResult.style.display = 'block';
    if (elements.quizzCard) elements.quizzCard.style.display = 'none';
  }

  function reiniciarQuizz() {
    appState.currentQuestionIndex = 0;
    appState.correctAnswers = 0;
    appState.userAnswers = [];
    
    // Esconder resultado, mostrar card
    if (elements.quizzResult) elements.quizzResult.style.display = 'none';
    if (elements.quizzCard) elements.quizzCard.style.display = 'block';
    
    // Recarregar primeira pergunta - precisamos salvar as perguntas
    console.log('Reiniciando quizz...');
  }

  // Carregar progresso do utilizador
  async function carregarProgressoUtilizador(userId = 1) {
    try {
      const response = await fetch(`/api/utilizadores/${userId}/progresso`);
      if (!response.ok) throw new Error('Erro ao carregar progresso');
      const progresso = await response.json();
      
      if (elements.progressoBody) {
        elements.progressoBody.innerHTML = '';
        
        // Se não houver dados, mostrar mensagem
        if (!progresso || (progresso.total_tentativas === 0 && progresso.percentual_acertos === undefined)) {
          const row = document.createElement('tr');
          row.innerHTML = `<td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-light);">Sem dados de progresso ainda. Complete alguns quizzes para ver seu progresso!</td>`;
          elements.progressoBody.appendChild(row);
          return;
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${progresso.nome_completo || 'Utilizador'}</td>
          <td>${progresso.curso || 'Não informado'}</td>
          <td>${progresso.total_tentativas || 0}</td>
          <td>${progresso.acertos || 0}</td>
          <td>${progresso.percentual_acertos || 0}%</td>
          <td>${progresso.ultima_tentativa ? new Date(progresso.ultima_tentativa).toLocaleDateString('pt-PT') : 'N/A'}</td>
        `;
        elements.progressoBody.appendChild(row);
      }
      
    } catch (error) {
      console.error('Erro ao carregar progresso:', error);
      if (elements.progressoBody) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-light);">Erro ao carregar progresso.</td>`;
        elements.progressoBody.appendChild(row);
      }
    }
  }

  // Event Listeners
  if (elements.btnProxima) {
    elements.btnProxima.addEventListener('click', () => {
      if (appState.currentQuestionIndex < appState.totalQuestions - 1) {
        appState.currentQuestionIndex++;
        // Aqui seria necessário recarregar a pergunta seguinte
        // Para simplificar, vamos apenas avançar
        if (elements.quizzCard) elements.quizzCard.style.display = 'block';
        if (elements.quizzResult) elements.quizzResult.style.display = 'none';
      } else {
        finalizarQuizz();
      }
    });
  }
  
  if (elements.btnAnterior) {
    elements.btnAnterior.addEventListener('click', anteriorPergunta);
  }
  
  if (elements.btnReiniciar) {
    elements.btnReiniciar.addEventListener('click', reiniciarQuizz);
  }

  // Inicialização
  carregarLinguagens();
  carregarProgressoUtilizador();
});