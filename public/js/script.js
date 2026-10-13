/**
 * ============================================================
 * ProgrameMoz - Lógica Principal do Painel e Quizzes
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  const appState = {
    utilizador: null,
    currentLanguage: null,
    selectedLanguageId: null,
    perguntas: [],
    currentQuestionIndex: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    userAnswers: [],
  };

  const elements = {
    navbarAuth: document.getElementById('navbar-auth'),
    heroTitle: document.getElementById('hero-title'),
    heroSubtitle: document.getElementById('hero-subtitle'),
    heroButtons: document.getElementById('hero-buttons'),

    // Perfil
    perfilProtegido: document.getElementById('perfil-protegido'),
    perfilAutenticado: document.getElementById('perfil-autenticado'),
    perfilIniciais: document.getElementById('perfil-iniciais'),
    perfilNome: document.getElementById('perfil-nome'),
    perfilEmail: document.getElementById('perfil-email'),
    perfilCurso: document.getElementById('perfil-curso'),
    perfilNivel: document.getElementById('perfil-nivel'),
    perfilPontuacao: document.getElementById('perfil-pontuacao'),
    perfilTentativas: document.getElementById('perfil-tentativas'),
    perfilAcertos: document.getElementById('perfil-acertos'),
    perfilPercentual: document.getElementById('perfil-percentual'),
    perfilLinguagensProgresso: document.getElementById('perfil-linguagens-progresso'),
    btnLogoutPerfil: document.getElementById('btn-logout-perfil'),

    // Linguagens e Quizz
    linguagensGrid: document.getElementById('linguagens-grid'),
    quizSection: document.getElementById('perguntas'),
    quizzTitle: document.getElementById('quizz-titulo'),
    quizzProgressBar: document.getElementById('quizz-progress-bar'),
    quizzCard: document.getElementById('quizz-card'),
    perguntaElement: document.getElementById('quizz-pergunta'),
    opcoesContainer: document.getElementById('quizz-opcoes'),
    quizzFeedback: document.getElementById('quizz-feedback'),
    btnAnterior: document.getElementById('btn-anterior'),
    btnProxima: document.getElementById('btn-proxima'),
    navIndicator: document.getElementById('nav-indicator'),
    quizzResult: document.getElementById('quizz-result'),
    resultTitulo: document.getElementById('result-titulo'),
    resultExplicacao: document.getElementById('result-explicacao'),
    resultPontuacao: document.getElementById('result-pontuacao'),
    btnReiniciar: document.getElementById('btn-reiniciar'),

    // Histórico
    progressoProtegido: document.getElementById('progresso-protegido'),
    progressoAutenticado: document.getElementById('progresso-autenticado'),
    progressoBody: document.getElementById('progresso-body'),
  };

  function obterIniciais(nome) {
    if (!nome) return 'MZ';
    const partes = String(nome).trim().split(/\s+/);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  function escaparHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto == null ? '' : String(texto);
    return div.innerHTML;
  }

  // ============================================================
  // Gestão de Sessão, Perfil e Progresso Pessoal
  // ============================================================
  async function carregarPerfilEProgresso() {
    if (!window.CodigoMZAuth) return;

    const dadosPerfil = await window.CodigoMZAuth.verificarSessaoServidor();
    appState.utilizador = dadosPerfil;

    if (!dadosPerfil) {
      renderizarVistaVisitante();
      return;
    }

    renderizarVistaAutenticada(dadosPerfil);
  }

  function renderizarVistaVisitante() {
    if (elements.navbarAuth) {
      elements.navbarAuth.innerHTML = `
        <a href="/login.html" class="btn btn-secondary btn-sm">Entrar</a>
        <a href="/registo.html" class="btn btn-primary btn-sm">Criar Conta</a>
      `;
    }

    if (elements.perfilProtegido) elements.perfilProtegido.style.display = 'block';
    if (elements.perfilAutenticado) elements.perfilAutenticado.style.display = 'none';
    if (elements.progressoProtegido) elements.progressoProtegido.style.display = 'block';
    if (elements.progressoAutenticado) elements.progressoAutenticado.style.display = 'none';
  }

  function renderizarVistaAutenticada(perfil) {
    const iniciais = obterIniciais(perfil.nome_completo);
    const primeiroNome = String(perfil.nome_completo || 'Estudante').split(' ')[0];

    // Atualizar Navbar
    if (elements.navbarAuth) {
      elements.navbarAuth.innerHTML = `
        <a href="#perfil" class="user-pill" title="Ver o meu perfil">
          <span class="user-avatar-sm">${escaparHtml(iniciais)}</span>
          <span>${escaparHtml(primeiroNome)}</span>
          <span class="user-score-badge">${Number(perfil.pontuacao || 0)} pts</span>
        </a>
        <button type="button" class="btn btn-danger-outline btn-sm" id="nav-btn-logout">
          Sair
        </button>
      `;

      const navLogout = document.getElementById('nav-btn-logout');
      if (navLogout) {
        navLogout.addEventListener('click', () => window.CodigoMZAuth.terminarSessao('/login.html'));
      }
    }

    // Atualizar Hero
    if (elements.heroTitle) {
      elements.heroTitle.textContent = `Olá, ${primeiroNome}! Bem-vindo ao seu Painel ProgrameMoz`;
    }
    if (elements.heroButtons) {
      elements.heroButtons.innerHTML = `
        <a href="#linguagens" class="btn btn-accent">Praticar Quizzes</a>
        <a href="#perfil" class="btn btn-outline-light">Ver Meu Perfil (${Number(perfil.pontuacao || 0)} pts)</a>
      `;
    }

    // Mostrar Perfil Autenticado
    if (elements.perfilProtegido) elements.perfilProtegido.style.display = 'none';
    if (elements.perfilAutenticado) elements.perfilAutenticado.style.display = 'block';

    if (elements.perfilIniciais) elements.perfilIniciais.textContent = iniciais;
    if (elements.perfilNome) elements.perfilNome.textContent = perfil.nome_completo;
    if (elements.perfilEmail) elements.perfilEmail.textContent = perfil.email;
    if (elements.perfilCurso) {
      const infoCurso = perfil.curso
        ? `${perfil.curso}${perfil.ano_estudo ? ` (${perfil.ano_estudo}.º Ano)` : ''}`
        : 'Estudante ProgrameMoz';
      elements.perfilCurso.textContent = infoCurso;
    }
    if (elements.perfilNivel) {
      elements.perfilNivel.textContent = perfil.nivel || 'Estudante Iniciante';
    }

    if (elements.perfilPontuacao) {
      elements.perfilPontuacao.textContent = `${Number(perfil.pontuacao || 0)} pts`;
    }
    if (elements.perfilTentativas) {
      elements.perfilTentativas.textContent = Number(perfil.total_tentativas || 0);
    }
    if (elements.perfilAcertos) {
      elements.perfilAcertos.textContent = Number(perfil.acertos || 0);
    }
    if (elements.perfilPercentual) {
      elements.perfilPercentual.textContent = `${Number(perfil.percentual_acertos || 0)}%`;
    }

    // Renderizar progresso por linguagem
    if (elements.perfilLinguagensProgresso) {
      const lista = Array.isArray(perfil.progresso_por_linguagem)
        ? perfil.progresso_por_linguagem
        : [];
      elements.perfilLinguagensProgresso.innerHTML = lista
        .map((item) => {
          const perc = Math.min(100, Math.max(0, Number(item.progresso_conclusao || 0)));
          return `
            <div class="linguagem-progresso-item">
              <div class="linguagem-progresso-topo">
                <span>${escaparHtml(item.linguagem)}</span>
                <span>${perc}% concluído</span>
              </div>
              <div class="linguagem-progresso-barra">
                <div class="linguagem-progresso-preenchimento" style="width: ${perc}%"></div>
              </div>
              <div class="linguagem-progresso-detalhe">
                <span>${Number(item.acertos || 0)} acertos em ${Number(item.tentativas || 0)} tentativas</span>
                <span>Taxa: ${Number(item.percentual_acertos || 0)}%</span>
              </div>
            </div>
          `;
        })
        .join('');
    }

    // Mostrar Histórico Pessoal Autenticado
    if (elements.progressoProtegido) elements.progressoProtegido.style.display = 'none';
    if (elements.progressoAutenticado) elements.progressoAutenticado.style.display = 'block';

    if (elements.progressoBody) {
      const historico = Array.isArray(perfil.historico) ? perfil.historico : [];
      if (historico.length === 0) {
        elements.progressoBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-light);">
              Ainda não realizou nenhuma tentativa de quizz. Escolha uma linguagem acima para começar!
            </td>
          </tr>
        `;
      } else {
        elements.progressoBody.innerHTML = historico
          .map((h) => {
            const dataFormatada = h.criado_em
              ? new Date(h.criado_em).toLocaleString('pt-PT', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recente';
            return `
              <tr>
                <td><strong>${escaparHtml(h.linguagem)}</strong></td>
                <td>${escaparHtml(h.tema)}</td>
                <td>${escaparHtml(h.enunciado)}</td>
                <td>
                  <span class="status-pill ${h.correta ? 'correta' : 'incorreta'}">
                    ${h.correta ? '✓ Correta (+10 pts)' : '✗ Incorreta'}
                  </span>
                </td>
                <td>${escaparHtml(dataFormatada)}</td>
              </tr>
            `;
          })
          .join('');
      }
    }
  }

  if (elements.btnLogoutPerfil) {
    elements.btnLogoutPerfil.addEventListener('click', () => {
      if (window.CodigoMZAuth) {
        window.CodigoMZAuth.terminarSessao('/login.html');
      }
    });
  }

  // ============================================================
  // Carregamento de Linguagens e Quizzes
  // ============================================================
  async function carregarLinguagens() {
    try {
      const response = await fetch('/api/linguagens');
      if (!response.ok) throw new Error('Erro ao carregar linguagens');
      const linguagens = await response.json();

      if (!elements.linguagensGrid) return;
      elements.linguagensGrid.innerHTML = '';

      linguagens.forEach((linguagem) => {
        const card = document.createElement('div');
        card.className = 'linguagem-card';
        card.dataset.id = linguagem.id;
        card.innerHTML = `
          <div class="linguagem-icon">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
          </div>
          <h3 class="linguagem-nome">${escaparHtml(linguagem.nome_moçambique || linguagem.nome)}</h3>
          <p class="linguagem-descricao">${escaparHtml(linguagem.descricao || 'Pratique conceitos fundamentais desta linguagem.')}</p>
        `;

        card.addEventListener('click', () => selecionarLinguagem(linguagem));
        elements.linguagensGrid.appendChild(card);
      });
    } catch (error) {
      console.error('Erro ao carregar linguagens:', error);
    }
  }

  async function selecionarLinguagem(linguagem) {
    document.querySelectorAll('.linguagem-card').forEach((card) => {
      card.classList.toggle('ligado', Number(card.dataset.id) === Number(linguagem.id));
    });

    // Abre a nova experiência de lição interativa (ProgrameMoz)
    window.location.href = `/licao.html?linguagem=${encodeURIComponent(linguagem.id)}`;
  }

  async function carregarPerguntasPorTema(temaId) {
    try {
      const response = await fetch(`/api/perguntas/${temaId}`);
      if (!response.ok) throw new Error('Erro ao carregar perguntas');
      const perguntas = await response.json();

      appState.perguntas = perguntas;
      appState.totalQuestions = perguntas.length;
      appState.currentQuestionIndex = 0;
      appState.correctAnswers = 0;
      appState.userAnswers = new Array(perguntas.length).fill(null);

      if (perguntas.length === 0) return;

      if (elements.quizzResult) elements.quizzResult.style.display = 'none';
      if (elements.quizzCard) elements.quizzCard.style.display = 'block';

      renderizarPerguntaAtual();
      if (elements.quizSection) {
        elements.quizSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (error) {
      console.error('Erro ao carregar perguntas:', error);
    }
  }

  function renderizarPerguntaAtual() {
    const indice = appState.currentQuestionIndex;
    const pergunta = appState.perguntas[indice];
    if (!pergunta || !elements.perguntaElement || !elements.opcoesContainer) return;

    elements.quizzTitle.textContent = `Quizz de ${appState.currentLanguage} • Nível ${pergunta.dificuldade || 'Médio'}`;

    const progressoPerc = Math.round(((indice + 1) / appState.totalQuestions) * 100);
    if (elements.quizzProgressBar) {
      elements.quizzProgressBar.style.width = `${progressoPerc}%`;
    }

    elements.perguntaElement.innerHTML = `<strong>${indice + 1}. ${escaparHtml(pergunta.enunciado)}</strong>`;
    elements.opcoesContainer.innerHTML = '';

    if (elements.quizzFeedback) {
      elements.quizzFeedback.className = 'quizz-feedback';
      elements.quizzFeedback.innerHTML = '';
    }

    const opcoes = [pergunta.opcao_a, pergunta.opcao_b, pergunta.opcao_c, pergunta.opcao_d];
    const respostaGuardada = appState.userAnswers[indice];

    opcoes.forEach((opcao, i) => {
      const numeroOpcao = i + 1;
      const opcaoElement = document.createElement('div');
      opcaoElement.className = 'quizz-opcao';
      opcaoElement.dataset.resposta = numeroOpcao;
      opcaoElement.innerHTML = `
        <span class="opcao-numero">${numeroOpcao}</span>
        <span class="opcao-texto">${escaparHtml(opcao)}</span>
      `;

      if (respostaGuardada !== null) {
        if (numeroOpcao === Number(pergunta.correta)) {
          opcaoElement.classList.add('correta');
        } else if (numeroOpcao === respostaGuardada.escolha && !respostaGuardada.correta) {
          opcaoElement.classList.add('incorreta');
        }
      } else {
        opcaoElement.addEventListener('click', () =>
          responderPergunta(indice, numeroOpcao, pergunta)
        );
      }

      elements.opcoesContainer.appendChild(opcaoElement);
    });

    if (respostaGuardada && elements.quizzFeedback) {
      elements.quizzFeedback.className = `quizz-feedback ${respostaGuardada.correta ? 'sucesso' : 'erro'}`;
      elements.quizzFeedback.innerHTML = `
        <strong>${respostaGuardada.correta ? '✓ Resposta Correta!' : '✗ Resposta Incorreta.'}</strong>
        ${pergunta.explicacao ? `<br>${escaparHtml(pergunta.explicacao)}` : ''}
      `;
    }

    if (elements.navIndicator) {
      elements.navIndicator.textContent = `Pergunta ${indice + 1} de ${appState.totalQuestions}`;
    }
    if (elements.btnAnterior) {
      elements.btnAnterior.disabled = indice === 0;
    }
    if (elements.btnProxima) {
      elements.btnProxima.textContent =
        indice < appState.totalQuestions - 1 ? 'Próxima Pergunta' : 'Ver Resultado Final';
    }
  }

  async function responderPergunta(indice, numeroResposta, pergunta) {
    if (appState.userAnswers[indice] !== null) return;

    const corretaLocal = Number(pergunta.correta) === numeroResposta;
    appState.userAnswers[indice] = { escolha: numeroResposta, correta: corretaLocal };
    if (corretaLocal) {
      appState.correctAnswers++;
    }

    // Se o utilizador estiver autenticado, guarda a tentativa e atualiza a pontuação na BD
    if (appState.utilizador && window.CodigoMZAuth) {
      try {
        const response = await fetch('/api/tentativas', {
          method: 'POST',
          headers: window.CodigoMZAuth.obterCabecalhos(),
          credentials: 'include',
          body: JSON.stringify({
            pergunta_id: pergunta.id,
            resposta_usuario: numeroResposta,
            tempo_segundos: 10,
          }),
        });

        if (response.ok) {
          await carregarPerfilEProgresso();
        }
      } catch (err) {
        console.error('Erro ao registar tentativa:', err);
      }
    }

    renderizarPerguntaAtual();

    if (!appState.utilizador && elements.quizzFeedback) {
      elements.quizzFeedback.innerHTML += `
        <div style="margin-top: 0.5rem; font-size: 0.86rem;">
          💡 <a href="/login.html" style="font-weight: 700; color: inherit;">Inicie sessão</a> para guardar os seus pontos e histórico no seu perfil pessoal.
        </div>
      `;
    }
  }

  function finalizarQuizz() {
    const percentual =
      appState.totalQuestions > 0
        ? Math.round((appState.correctAnswers / appState.totalQuestions) * 100)
        : 0;

    if (elements.quizzCard) elements.quizzCard.style.display = 'none';
    if (elements.quizzResult) {
      elements.quizzResult.style.display = 'block';
    }
    if (elements.resultTitulo) {
      elements.resultTitulo.textContent =
        percentual >= 60 ? 'Excelente Trabalho! 🎉' : 'Quizz Concluído! Continue a Praticar 💪';
    }
    if (elements.resultExplicacao) {
      elements.resultExplicacao.textContent = `Acertou ${appState.correctAnswers} de ${appState.totalQuestions} perguntas no quizz de ${appState.currentLanguage}.`;
    }
    if (elements.resultPontuacao) {
      elements.resultPontuacao.textContent = `Aproveitamento: ${percentual}%`;
    }
  }

  function reiniciarQuizz() {
    appState.currentQuestionIndex = 0;
    appState.correctAnswers = 0;
    appState.userAnswers = new Array(appState.totalQuestions).fill(null);

    if (elements.quizzResult) elements.quizzResult.style.display = 'none';
    if (elements.quizzCard) elements.quizzCard.style.display = 'block';
    renderizarPerguntaAtual();
  }

  if (elements.btnProxima) {
    elements.btnProxima.addEventListener('click', () => {
      if (appState.currentQuestionIndex < appState.totalQuestions - 1) {
        appState.currentQuestionIndex++;
        renderizarPerguntaAtual();
      } else {
        finalizarQuizz();
      }
    });
  }

  if (elements.btnAnterior) {
    elements.btnAnterior.addEventListener('click', () => {
      if (appState.currentQuestionIndex > 0) {
        appState.currentQuestionIndex--;
        renderizarPerguntaAtual();
      }
    });
  }

  if (elements.btnReiniciar) {
    elements.btnReiniciar.addEventListener('click', reiniciarQuizz);
  }

  // Inicializar Aplicação
  carregarPerfilEProgresso();
  carregarLinguagens();
});
