/**
 * ============================================================
 * ProgrameMoz - Experiência de Lição Interactiva (Etapa 1)
 * - Ecrã único sem recarregar página
 * - Explicação inicial + perguntas de escolha múltipla
 * - Feedback animado (verde/vermelho) ao verificar
 * - Opções embaralhadas a cada pergunta
 * - Teclado: 1-4 para opções, Enter = Continuar/Verificar
 * - Acessibilidade: aria-live, foco visível, reduced-motion via CSS
 * - Segurança: usa textContent / createElement (evita XSS)
 * ============================================================
 */

(function () {
  'use strict';

  /* -----------------------------------------------------------
   * Estado da lição (em memória; persistência vem na Etapa 2)
   * --------------------------------------------------------- */
  const estado = {
    linguagem: null,      // { id, nome, nome_moçambique, descricao }
    tema: null,           // { id, nome, descricao, ordem }
    perguntas: [],        // perguntas do tema (ordem original preservada)
    indiceAtual: 0,       // índice da pergunta em exibição
    opcoesEmbaralhadas: [], // mapeia posição atual -> opção original (1..4)
    opcaoSelecionada: null, // índice atual (0..3) seleccionado
    respondida: false,    // se já clicou em VERIFICAR para a pergunta actual
    vidas: 5,             // vidas (visíveis; lógica completa na Etapa 2)
  };

  /* -----------------------------------------------------------
   * Elementos do DOM
   * --------------------------------------------------------- */
  const $ = (id) => document.getElementById(id);
  const el = {
    app: $('licao-app'),
    topo: document.querySelector('.licao-topo'),
    btnSair: $('btn-sair'),
    progressoPreench: $('progresso-preenchimento'),
    vidas: $('vidas'),
    contadorVidas: $('contador-vidas'),

    ecraLoading: $('ecra-loading'),
    ecraErro: $('ecra-erro'),
    erroMsg: $('erro-mensagem'),
    btnTentarNovamente: $('btn-tentar-novamente'),

    ecraExplicacao: $('ecra-explicacao'),
    explTitulo: $('explicacao-titulo'),
    explTexto: $('explicacao-texto'),
    explCodigo: $('explicacao-codigo'),
    btnContinuarExpl: $('btn-continuar-explicacao'),

    ecraPergunta: $('ecra-pergunta'),
    perguntaEtiqueta: $('pergunta-etiqueta'),
    perguntaEnunciado: $('pergunta-enunciado'),
    perguntaCodigo: $('pergunta-codigo'),
    opcoesLista: $('pergunta-opcoes'),
    btnVerificar: $('btn-verificar'),

    ecraSair: $('ecra-sair'),
    btnSairCancelar: $('btn-sair-cancelar'),
    btnSairConfirmar: $('btn-sair-confirmar'),

    painelFeedback: $('painel-feedback'),
    feedbackConteudo: $('feedback-conteudo'),
    feedbackTitulo: $('feedback-titulo'),
    feedbackExplicacao: $('feedback-explicacao'),
    btnContinuarDepois: $('btn-continuar-depois'),
  };

  /* -----------------------------------------------------------
   * Utilitários
   * --------------------------------------------------------- */

  /** Escapa texto (protecção básica contra XSS em atribuições). */
  function escapar(texto) {
    const d = document.createElement('div');
    d.textContent = texto == null ? '' : String(texto);
    return d.innerHTML;
  }

  /** Cria um elemento de texto com segurança. */
  function texto(tag, conteudo) {
    const node = document.createElement(tag);
    node.textContent = conteudo == null ? '' : String(conteudo);
    return node;
  }

  /** Embaralha um array (Fisher-Yates), sem mutar o original. */
  function embaralhar(array) {
    const copia = array.slice();
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  /** Mostra um ecrã e esconde os outros. */
  function mostrarEcra(alvo) {
    [el.ecraLoading, el.ecraErro, el.ecraExplicacao, el.ecraPergunta].forEach((ec) => {
      ec.hidden = (ec !== alvo);
    });
  }

  /** Voltar ao início (falta proteger a rota, mas o destino é o index). */
  function sairParaInicio() {
    window.location.href = '/index.html';
  }

  /* -----------------------------------------------------------
   * Barra de progresso
   * --------------------------------------------------------- */
  function atualizarProgresso() {
    const total = estado.perguntas.length || 1;
    // Consideramos a explicação como passo 0, cada pergunta como +1
    const passo = estado.indiceAtual + 1;
    const perc = Math.min(100, Math.round((passo / total) * 100));
    el.progressoPreench.style.width = perc + '%';
  }

  /* -----------------------------------------------------------
   * Vidas (render; lógica de game over vem na Etapa 2)
   * --------------------------------------------------------- */
  function renderVidas() {
    el.contadorVidas.textContent = String(estado.vidas);
    el.vidas.classList.remove('animado');
    // Força reflow para reiniciar a animação quando removida/adicionada
    void el.vidas.offsetWidth;
    el.vidas.classList.add('animado');
  }

  function perderVida() {
    estado.vidas = Math.max(0, estado.vidas - 1);
    renderVidas();
  }

  /* -----------------------------------------------------------
   * Carregamento de dados (reutiliza as rotas existentes)
   * --------------------------------------------------------- */
  async function obterJson(url) {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      throw new Error('Erro ' + res.status + ' ao carregar ' + url);
    }
    return res.json();
  }

  async function carregarLicao() {
    mostrarEcra(el.ecraLoading);

    try {
      const params = new URLSearchParams(window.location.search);
      let linguagemId = parseInt(params.get('linguagem') || params.get('linguagemId'), 10);
      let temaId = parseInt(params.get('tema') || params.get('temaId'), 10);

      // Se não houver parâmetros, escolhe a primeira linguagem e o primeiro tema
      if (!Number.isFinite(linguagemId)) {
        const linguagens = await obterJson('/api/linguagens');
        if (!linguagens || linguagens.length === 0) throw new Error('Ainda não existem cursos disponíveis.');
        estado.linguagem = linguagens[0];
        linguagemId = estado.linguagem.id;
      } else {
        const linguagens = await obterJson('/api/linguagens');
        estado.linguagem = linguagens.find((l) => Number(l.id) === Number(linguagemId)) || linguagens[0];
      }

      const temas = await obterJson('/api/temas/' + estado.linguagem.id);
      if (!temas || temas.length === 0) throw new Error('Ainda não há lições para este curso.');

      if (!Number.isFinite(temaId)) {
        estado.tema = temas[0];
      } else {
        estado.tema = temas.find((t) => Number(t.id) === Number(temaId)) || temas[0];
      }

      const perguntas = await obterJson('/api/perguntas/' + estado.tema.id);
      if (!perguntas || perguntas.length === 0) {
        throw new Error('Ainda não há perguntas nesta lição.');
      }

      estado.perguntas = perguntas;
      estado.indiceAtual = 0;
      estado.vidas = 5;

      renderVidas();
      atualizarProgresso();
      mostrarExplicacao();
    } catch (err) {
      console.error(err);
      el.erroMsg.textContent = err.message || 'Não foi possível carregar a lição.';
      mostrarEcra(el.ecraErro);
    }
  }

  /* -----------------------------------------------------------
   * Explicação inicial
   * --------------------------------------------------------- */
  function mostrarExplicacao() {
    const nomeLinguagem = estado.linguagem.nome_moçambique || estado.linguagem.nome;
    const nomeTema = estado.tema.nome;

    el.explTitulo.textContent = nomeTema;

    // Monta o texto com parágrafos (sem innerHTML; usa createElement)
    el.explTexto.innerHTML = '';
    const p1 = texto('p', `Bem-vindo à lição de ${nomeLinguagem}. Neste módulo vamos praticar "${nomeTema}".`);
    const p2 = texto('p', 'Leia o exemplo com atenção e depois responda às perguntas. Seleccione uma opção e carregue em VERIFICAR quando estiver pronto.');
    el.explTexto.appendChild(p1);
    el.explTexto.appendChild(p2);

    // Exemplo de código: escolhe um exemplo simples baseado na linguagem
    const exemplo = obterExemploCodigo(estado.linguagem.nome);
    if (exemplo) {
      const codeEl = el.explCodigo.querySelector('code');
      codeEl.textContent = exemplo.texto;
      el.explCodigo.hidden = false;
      // Realce simples de palavras-chave (seguro: opera sobre textContent)
      aplicarRealceSimples(codeEl, exemplo.palavrasChave);
    } else {
      el.explCodigo.hidden = true;
    }

    // Fecha painel de feedback se estiver visível
    fecharFeedback();
    mostrarEcra(el.ecraExplicacao);
    el.btnContinuarExpl.focus();
  }

  /** Devolve um exemplo de código adequado à linguagem (simples, ilustrativo). */
  function obterExemploCodigo(nomeLinguagem) {
    const base = (nomeLinguagem || '').toLowerCase();
    if (base.includes('python')) {
      return {
        texto: '# Exemplo em Python\ndef saudacao(nome):\n    return "Olá, " + nome\n\nprint(saudacao("Maputo"))',
        palavrasChave: ['def', 'return', 'print'],
      };
    }
    if (base.includes('java')) {
      return {
        texto: '// Exemplo em Java\npublic class Saudacao {\n  public static void main(String[] args){\n    System.out.println("Olá, Moçambique!");\n  }\n}',
        palavrasChave: ['public', 'class', 'static', 'void', 'String'],
      };
    }
    if (base.includes('c++') || base.includes('cpp')) {
      return {
        texto: '// Exemplo em C++\n#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Olá!" << endl;\n  return 0;\n}',
        palavrasChave: ['#include', 'using', 'namespace', 'int', 'return'],
      };
    }
    if (base.includes('sql')) {
      return {
        texto: '-- Exemplo em SQL\nSELECT nome, provincia\nFROM estudantes\nWHERE provincia = \'Maputo\';',
        palavrasChave: ['SELECT', 'FROM', 'WHERE'],
      };
    }
    if (base.includes('lógica') || base.includes('logica')) {
      return {
        texto: '// Exemplo de algoritmo\nse (idade >= 18) entao\n  escrever("Maior de idade")\nfimse',
        palavrasChave: ['se', 'entao', 'escrever', 'fimse'],
      };
    }
    return null;
  }

  /** Realce muito simples: envolve palavras reservadas em <span class="kw">. Seguro. */
  function aplicarRealceSimples(codeEl, palavrasChave) {
    const texto = codeEl.textContent;
    codeEl.textContent = '';

    // Cria regex que reconhece palavras inteiras
    const keys = (palavrasChave || []).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (keys.length === 0) {
      codeEl.textContent = texto;
      return;
    }
    const re = new RegExp('(' + keys.join('|') + ')|("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\')|(//[^\\n]*|--[^\\n]*|#[^\\n]*)', 'g');
    let ultimo = 0;
    let m;
    while ((m = re.exec(texto)) !== null) {
      if (m.index > ultimo) {
        codeEl.appendChild(document.createTextNode(texto.slice(ultimo, m.index)));
      }
      let cls = 'kw';
      if (m[2]) cls = 'str';
      else if (m[3]) cls = 'com';
      const span = document.createElement('span');
      span.className = cls;
      span.textContent = m[0];
      codeEl.appendChild(span);
      ultimo = m.index + m[0].length;
    }
    if (ultimo < texto.length) {
      codeEl.appendChild(document.createTextNode(texto.slice(ultimo)));
    }
  }

  /* -----------------------------------------------------------
   * Pergunta de escolha múltipla
   * --------------------------------------------------------- */
  function mostrarPergunta() {
    const pergunta = estado.perguntas[estado.indiceAtual];
    if (!pergunta) {
      // Acabaram as perguntas — ainda sem ecrã de resumo (Etapa 2),
      // mostramos uma mensagem simples.
      mostrarFimSimples();
      return;
    }

    estado.respondida = false;
    estado.opcaoSelecionada = null;
    estado.opcoesEmbaralhadas = embaralhar([1, 2, 3, 4]);

    // Etiqueta e enunciado
    const total = estado.perguntas.length;
    el.perguntaEtiqueta.textContent = `Pergunta ${estado.indiceAtual + 1} de ${total}`;
    el.perguntaEnunciado.textContent = pergunta.enunciado;

    // Bloco de código: se o enunciado contiver ```...```, separa
    const { textoLimpo, blocoCodigo } = extrairBlocoCodigo(pergunta.enunciado);
    if (blocoCodigo) {
      el.perguntaEnunciado.textContent = textoLimpo;
      const codeEl = el.perguntaCodigo.querySelector('code');
      codeEl.textContent = blocoCodigo;
      el.perguntaCodigo.hidden = false;
    } else {
      el.perguntaCodigo.hidden = true;
    }

    // Renderiza as opções
    el.opcoesLista.innerHTML = '';
    const opcoesOrig = [pergunta.opcao_a, pergunta.opcao_b, pergunta.opcao_c, pergunta.opcao_d];
    const letras = ['A', 'B', 'C', 'D'];

    estado.opcoesEmbaralhadas.forEach((numOpcao, idx) => {
      const li = document.createElement('li');
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'licao-opcao';
      botao.setAttribute('role', 'radio');
      botao.setAttribute('aria-checked', 'false');
      botao.dataset.idx = String(idx);
      botao.dataset.opcao = String(numOpcao);

      const letra = document.createElement('span');
      letra.className = 'licao-opcao-letra';
      letra.textContent = letras[idx];

      const txt = document.createElement('span');
      txt.className = 'licao-opcao-texto';
      txt.textContent = opcoesOrig[numOpcao - 1];

      botao.appendChild(letra);
      botao.appendChild(txt);
      botao.addEventListener('click', () => seleccionarOpcao(idx));
      li.appendChild(botao);
      el.opcoesLista.appendChild(li);
    });

    el.btnVerificar.textContent = 'VERIFICAR';
    el.btnVerificar.disabled = true;
    el.btnVerificar.setAttribute('aria-disabled', 'true');

    fecharFeedback();
    mostrarEcra(el.ecraPergunta);
    atualizarProgresso();
    // Coloca foco no contentor para permitir atalhos de teclado
    el.ecraPergunta.setAttribute('tabindex', '-1');
    el.ecraPergunta.focus();
  }

  /** Extrai um bloco de código ``` ... ``` do texto da pergunta, se existir. */
  function extrairBlocoCodigo(texto) {
    if (!texto || typeof texto !== 'string') return { textoLimpo: texto || '', blocoCodigo: null };
    const m = texto.match(/```([\s\S]*?)```/);
    if (!m) return { textoLimpo: texto, blocoCodigo: null };
    return {
      textoLimpo: texto.replace(m[0], '').trim(),
      blocoCodigo: m[1].trim(),
    };
  }

  function seleccionarOpcao(idx) {
    if (estado.respondida) return;
    estado.opcaoSelecionada = idx;
    const botoes = el.opcoesLista.querySelectorAll('.licao-opcao');
    botoes.forEach((b, i) => {
      const selecionada = i === idx;
      b.classList.toggle('licao-opcao-selecionada', selecionada);
      b.setAttribute('aria-checked', selecionada ? 'true' : 'false');
    });
    el.btnVerificar.disabled = false;
    el.btnVerificar.setAttribute('aria-disabled', 'false');
  }

  /* -----------------------------------------------------------
   * Verificar resposta e painel de feedback
   * --------------------------------------------------------- */
  function verificarResposta() {
    if (estado.respondida) return;
    if (estado.opcaoSelecionada == null) return;
    estado.respondida = true;

    const pergunta = estado.perguntas[estado.indiceAtual];
    const numCorreta = Number(pergunta.correta);
    const numEscolhida = Number(estado.opcoesEmbaralhadas[estado.opcaoSelecionada]);
    const acertou = numEscolhida === numCorreta;

    // Desactivar todos os botões de opção
    const botoes = el.opcoesLista.querySelectorAll('.licao-opcao');
    botoes.forEach((b) => {
      b.disabled = true;
      b.setAttribute('aria-disabled', 'true');
      const num = Number(b.dataset.opcao);
      b.classList.remove('licao-opcao-selecionada');
      if (num === numCorreta) b.classList.add('licao-opcao-correta');
      else if (num === numEscolhida && !acertou) b.classList.add('licao-opcao-errada');
    });

    if (!acertou) perderVida();

    el.btnVerificar.disabled = true;
    el.btnVerificar.setAttribute('aria-disabled', 'true');
    el.btnVerificar.textContent = acertou ? 'CORRETO!' : 'ERRADO';

    mostrarFeedback(acertou, pergunta.explicacao);
  }

  function mostrarFeedback(correto, explicacao) {
    el.painelFeedback.classList.remove('licao-feedback-correto', 'licao-feedback-errado');
    el.painelFeedback.classList.add(correto ? 'licao-feedback-correto' : 'licao-feedback-errado');

    el.feedbackTitulo.textContent = correto ? '✓ Correto!' : '✗ Resposta errada';
    el.feedbackExplicacao.textContent = explicacao || (correto
      ? 'Muito bem! Continue assim.'
      : 'Leia a explicação e tente novamente mais tarde.');

    el.btnContinuarDepois.textContent = 'CONTINUAR';
    el.painelFeedback.hidden = false;
    // Força reflow para a animação de entrada
    void el.painelFeedback.offsetWidth;
    el.painelFeedback.classList.add('visivel');

    setTimeout(() => el.btnContinuarDepois.focus(), 250);
  }

  function fecharFeedback() {
    el.painelFeedback.classList.remove('visivel');
    // Depois da transição, esconde
    setTimeout(() => {
      if (!el.painelFeedback.classList.contains('visivel')) {
        el.painelFeedback.hidden = true;
      }
    }, 380);
  }

  function avancar() {
    fecharFeedback();
    estado.indiceAtual += 1;
    if (estado.indiceAtual >= estado.perguntas.length) {
      mostrarFimSimples();
    } else {
      mostrarPergunta();
    }
  }

  function mostrarFimSimples() {
    // Etapa 2 vai substituir este ecrã pelo resumo final com XP.
    el.perguntaEnunciado.textContent = 'Lição concluída!';
    el.perguntaEtiqueta.textContent = 'Fim';
    el.opcoesLista.innerHTML = '';
    el.perguntaCodigo.hidden = true;
    const msg = document.createElement('p');
    msg.style.color = 'var(--texto-suave)';
    msg.style.fontSize = '1rem';
    msg.textContent = 'Parabéns — terminou esta lição. O resumo com XP e percentagem de acertos virá na próxima etapa.';
    el.opcoesLista.appendChild(msg);
    const voltar = document.createElement('a');
    voltar.className = 'btn btn-primary licao-btn-grande';
    voltar.href = '/index.html';
    voltar.textContent = 'VOLTAR AO INÍCIO';
    voltar.style.marginTop = '12px';
    el.opcoesLista.appendChild(voltar);
    el.btnVerificar.hidden = true;
    el.progressoPreench.style.width = '100%';
    mostrarEcra(el.ecraPergunta);
  }

  /* -----------------------------------------------------------
   * Diálogo de saída
   * --------------------------------------------------------- */
  function abrirSair() { el.ecraSair.hidden = false; el.btnSairCancelar.focus(); }
  function fecharSair() { el.ecraSair.hidden = true; }

  /* -----------------------------------------------------------
   * Atalhos de teclado
   * --------------------------------------------------------- */
  function tratarTeclado(e) {
    // Ignora se estiver num input (não há inputs nesta página por agora, mas previne)
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (e.key === 'Enter' || e.key === ' ') {
      if (!el.ecraSair.hidden) {
        e.preventDefault();
        sairParaInicio();
        return;
      }
      if (!el.ecraExplicacao.hidden) {
        e.preventDefault();
        mostrarPergunta();
        return;
      }
      if (!el.ecraPergunta.hidden) {
        e.preventDefault();
        if (estado.respondida) avancar();
        else if (!el.btnVerificar.disabled) verificarResposta();
        return;
      }
      if (!el.painelFeedback.hidden && el.painelFeedback.classList.contains('visivel')) {
        e.preventDefault();
        avancar();
      }
      return;
    }

    if (e.key === 'Escape') {
      if (!el.ecraSair.hidden) { fecharSair(); return; }
      abrirSair();
      return;
    }

    // Atalhos 1-4 para escolher opções (apenas na pergunta e ainda não respondida)
    if (!el.ecraPergunta.hidden && !estado.respondida) {
      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx !== -1 && idx < estado.opcoesEmbaralhadas.length) {
        e.preventDefault();
        seleccionarOpcao(idx);
      }
    }
  }

  /* -----------------------------------------------------------
   * Ligação de eventos e arranque
   * --------------------------------------------------------- */
  function init() {
    el.btnContinuarExpl.addEventListener('click', mostrarPergunta);
    el.btnVerificar.addEventListener('click', verificarResposta);
    el.btnContinuarDepois.addEventListener('click', avancar);

    el.btnSair.addEventListener('click', abrirSair);
    el.btnSairCancelar.addEventListener('click', fecharSair);
    el.btnSairConfirmar.addEventListener('click', sairParaInicio);
    el.btnTentarNovamente.addEventListener('click', carregarLicao);

    document.addEventListener('keydown', tratarTeclado);

    carregarLicao();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
