/**
 * ============================================================
 * ProgrameMoz - Módulo de Autenticação Frontend
 * Gestão de Registo, Login, Logout, Sessão e Validação de Formulários
 * ============================================================
 */

const CodigoMZAuth = {
  STORAGE_USER_KEY: 'codigomz_utilizador',
  STORAGE_TOKEN_KEY: 'codigomz_token',

  guardarSessaoLocal(utilizador, token) {
    if (utilizador) {
      localStorage.setItem(this.STORAGE_USER_KEY, JSON.stringify(utilizador));
    }
    if (token) {
      localStorage.setItem(this.STORAGE_TOKEN_KEY, token);
    }
  },

  limparSessaoLocal() {
    localStorage.removeItem(this.STORAGE_USER_KEY);
    localStorage.removeItem(this.STORAGE_TOKEN_KEY);
  },

  obterUtilizadorLocal() {
    try {
      const raw = localStorage.getItem(this.STORAGE_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  obterTokenLocal() {
    return localStorage.getItem(this.STORAGE_TOKEN_KEY) || null;
  },

  obterCabecalhos(extra = {}) {
    const token = this.obterTokenLocal();
    const headers = {
      'Content-Type': 'application/json',
      ...extra,
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  },

  async verificarSessaoServidor() {
    try {
      const response = await fetch('/api/auth/perfil', {
        method: 'GET',
        headers: this.obterCabecalhos(),
        credentials: 'include',
      });

      if (!response.ok) {
        this.limparSessaoLocal();
        return null;
      }

      const dadosPerfil = await response.json();
      this.guardarSessaoLocal(
        {
          id: dadosPerfil.id,
          nome_completo: dadosPerfil.nome_completo,
          email: dadosPerfil.email,
          curso: dadosPerfil.curso,
          ano_estudo: dadosPerfil.ano_estudo,
          pontuacao: dadosPerfil.pontuacao,
          nivel: dadosPerfil.nivel,
        },
        this.obterTokenLocal()
      );
      return dadosPerfil;
    } catch (err) {
      console.error('Erro ao verificar sessão:', err);
      return null;
    }
  },

  async terminarSessao(redirecionarPara = '/login.html') {
    try {
      await fetch('/api/utilizadores/logout', {
        method: 'POST',
        headers: this.obterCabecalhos(),
        credentials: 'include',
      });
    } catch (err) {
      console.error('Erro ao comunicar logout ao servidor:', err);
    } finally {
      this.limparSessaoLocal();
      if (redirecionarPara) {
        window.location.href = redirecionarPara;
      }
    }
  },
};

window.CodigoMZAuth = CodigoMZAuth;

document.addEventListener('DOMContentLoaded', () => {
  // Alternar visibilidade da palavra-passe (Mostrar / Ocultar)
  document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-toggle-password');
      const input = document.getElementById(targetId);
      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = 'Ocultar';
      } else {
        input.type = 'password';
        btn.textContent = 'Mostrar';
      }
    });
  });

  // Utilitários de validação e alertas
  function mostrarAlerta(elemento, mensagem, tipo = 'erro') {
    if (!elemento) return;
    elemento.textContent = mensagem;
    elemento.className = `auth-alert visivel ${tipo}`;
  }

  function limparAlerta(elemento) {
    if (!elemento) return;
    elemento.textContent = '';
    elemento.className = 'auth-alert';
  }

  function definirErroCampo(inputEl, erroEl, mensagem) {
    if (inputEl) {
      if (mensagem) {
        inputEl.classList.add('invalido');
      } else {
        inputEl.classList.remove('invalido');
      }
    }
    if (erroEl) {
      if (mensagem) {
        erroEl.textContent = mensagem;
        erroEl.classList.add('visivel');
      } else {
        erroEl.textContent = '';
        erroEl.classList.remove('visivel');
      }
    }
  }

  function emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  }

  // ============================================================
  // Lógica da Página de Login (login.html)
  // ============================================================
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const erroEmail = document.getElementById('erro-login-email');
    const erroPassword = document.getElementById('erro-login-password');
    const loginAlert = document.getElementById('login-alert');
    const btnSubmit = document.getElementById('btn-submit-login');
    const btnDemo = document.getElementById('btn-preencher-demo');

    // Se já estiver autenticado, redireciona para o painel principal
    CodigoMZAuth.verificarSessaoServidor().then((perfil) => {
      if (perfil) {
        window.location.href = '/index.html#perfil';
      }
    });

    if (btnDemo) {
      btnDemo.addEventListener('click', () => {
        if (emailInput) emailInput.value = 'amelia.mondlane@uem.mz';
        if (passwordInput) passwordInput.value = 'Estudante123!';
        definirErroCampo(emailInput, erroEmail, '');
        definirErroCampo(passwordInput, erroPassword, '');
        limparAlerta(loginAlert);
      });
    }

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      limparAlerta(loginAlert);
      definirErroCampo(emailInput, erroEmail, '');
      definirErroCampo(passwordInput, erroPassword, '');

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';
      let temErro = false;

      if (!email) {
        definirErroCampo(emailInput, erroEmail, 'Por favor, introduza o seu endereço de e-mail.');
        temErro = true;
      } else if (!emailValido(email)) {
        definirErroCampo(
          emailInput,
          erroEmail,
          'Por favor, introduza um endereço de e-mail válido (ex: estudante@uem.mz).'
        );
        temErro = true;
      }

      if (!password) {
        definirErroCampo(passwordInput, erroPassword, 'Por favor, introduza a sua palavra-passe.');
        temErro = true;
      }

      if (temErro) {
        mostrarAlerta(
          loginAlert,
          'Verifique os campos assinalados antes de iniciar sessão.',
          'erro'
        );
        return;
      }

      try {
        if (btnSubmit) {
          btnSubmit.disabled = true;
          btnSubmit.textContent = 'A autenticar...';
        }

        const response = await fetch('/api/utilizadores/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          mostrarAlerta(
            loginAlert,
            data.erro || 'Credenciais incorretas. Verifique o seu e-mail e a sua palavra-passe.',
            'erro'
          );
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Entrar na Conta';
          }
          return;
        }

        CodigoMZAuth.guardarSessaoLocal(data.utilizador, data.token);
        mostrarAlerta(
          loginAlert,
          'Sessão iniciada com sucesso! A redirecionar para o painel principal...',
          'sucesso'
        );

        setTimeout(() => {
          window.location.href = '/index.html#perfil';
        }, 600);
      } catch (err) {
        console.error('Erro ao iniciar sessão:', err);
        mostrarAlerta(
          loginAlert,
          'Não foi possível comunicar com o servidor. Verifique a sua ligação e tente novamente.',
          'erro'
        );
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Entrar na Conta';
        }
      }
    });
  }

  // ============================================================
  // Lógica da Página de Registo (registo.html)
  // ============================================================
  const registoForm = document.getElementById('registo-form');
  if (registoForm) {
    const nomeInput = document.getElementById('registo-nome');
    const emailInput = document.getElementById('registo-email');
    const cursoInput = document.getElementById('registo-curso');
    const anoInput = document.getElementById('registo-ano');
    const passwordInput = document.getElementById('registo-password');
    const confirmarInput = document.getElementById('registo-confirmar');

    const erroNome = document.getElementById('erro-registo-nome');
    const erroEmail = document.getElementById('erro-registo-email');
    const erroPassword = document.getElementById('erro-registo-password');
    const erroConfirmar = document.getElementById('erro-registo-confirmar');
    const registoAlert = document.getElementById('registo-alert');
    const btnSubmit = document.getElementById('btn-submit-registo');

    const strengthFill = document.getElementById('strength-fill');
    const strengthText = document.getElementById('strength-text');

    if (passwordInput && strengthFill && strengthText) {
      passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        let score = 0;
        if (val.length >= 6) score += 35;
        if (val.length >= 10) score += 25;
        if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score += 20;
        if (/[0-9]/.test(val) || /[^A-Za-z0-9]/.test(val)) score += 20;

        strengthFill.style.width = `${Math.min(score, 100)}%`;
        if (val.length === 0) {
          strengthFill.style.width = '0%';
          strengthText.textContent = 'Segurança da palavra-passe';
        } else if (val.length < 6) {
          strengthFill.style.backgroundColor = '#DC3545';
          strengthText.textContent = 'Fraca (mínimo de 6 caracteres)';
        } else if (score < 70) {
          strengthFill.style.backgroundColor = '#F39C12';
          strengthText.textContent = 'Razoável';
        } else {
          strengthFill.style.backgroundColor = '#28A745';
          strengthText.textContent = 'Forte e segura';
        }
      });
    }

    registoForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      limparAlerta(registoAlert);
      definirErroCampo(nomeInput, erroNome, '');
      definirErroCampo(emailInput, erroEmail, '');
      definirErroCampo(passwordInput, erroPassword, '');
      definirErroCampo(confirmarInput, erroConfirmar, '');

      const nome_completo = nomeInput ? nomeInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const curso = cursoInput ? cursoInput.value.trim() : '';
      const ano_estudo = anoInput && anoInput.value ? parseInt(anoInput.value, 10) : null;
      const password = passwordInput ? passwordInput.value : '';
      const confirmar_password = confirmarInput ? confirmarInput.value : '';

      let temErro = false;

      if (!nome_completo || nome_completo.length < 3) {
        definirErroCampo(
          nomeInput,
          erroNome,
          'Por favor, introduza o seu nome completo (mínimo de 3 caracteres).'
        );
        temErro = true;
      }

      if (!email) {
        definirErroCampo(emailInput, erroEmail, 'Por favor, introduza o seu endereço de e-mail.');
        temErro = true;
      } else if (!emailValido(email)) {
        definirErroCampo(
          emailInput,
          erroEmail,
          'Por favor, introduza um endereço de e-mail válido (ex: nome@dominio.mz).'
        );
        temErro = true;
      }

      if (!password || password.length < 6) {
        definirErroCampo(
          passwordInput,
          erroPassword,
          'A palavra-passe deve ter pelo menos 6 caracteres.'
        );
        temErro = true;
      }

      if (!confirmar_password) {
        definirErroCampo(confirmarInput, erroConfirmar, 'Por favor, confirme a sua palavra-passe.');
        temErro = true;
      } else if (password !== confirmar_password) {
        definirErroCampo(
          confirmarInput,
          erroConfirmar,
          'As palavras-passe introduzidas não coincidem.'
        );
        temErro = true;
      }

      if (temErro) {
        mostrarAlerta(
          registoAlert,
          'Por favor, corrija os campos inválidos assinalados abaixo.',
          'erro'
        );
        return;
      }

      try {
        if (btnSubmit) {
          btnSubmit.disabled = true;
          btnSubmit.textContent = 'A criar conta...';
        }

        const response = await fetch('/api/utilizadores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            nome_completo,
            email,
            password,
            confirmar_password,
            curso: curso || undefined,
            ano_estudo: ano_estudo || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 409 && emailInput) {
            definirErroCampo(emailInput, erroEmail, data.erro);
          }
          mostrarAlerta(
            registoAlert,
            data.erro || 'Não foi possível concluir o registo. Verifique os dados introduzidos.',
            'erro'
          );
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Criar Conta no ProgrameMoz';
          }
          return;
        }

        CodigoMZAuth.guardarSessaoLocal(data.utilizador, data.token);
        mostrarAlerta(
          registoAlert,
          'Conta criada com sucesso! A redirecionar para o painel principal...',
          'sucesso'
        );

        setTimeout(() => {
          window.location.href = '/index.html#perfil';
        }, 700);
      } catch (err) {
        console.error('Erro ao registar conta:', err);
        mostrarAlerta(
          registoAlert,
          'Erro de comunicação com o servidor. Tente novamente dentro de instantes.',
          'erro'
        );
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Criar Conta no ProgrameMoz';
        }
      }
    });
  }
});
