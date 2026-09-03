// Login da equipe (Supabase Auth) — protege o painel admin (index.html).
// A criação dos primeiros usuários é feita pelo próprio dono do projeto em
// Supabase > Authentication > Users (ver README.md).
window.auth = (function(){
  "use strict";

  function showApp(session){
    document.getElementById('loginWrap').hidden = true;
    document.getElementById('appWrap').hidden = false;
    document.getElementById('userEmail').textContent = session.user.email;
    window.onAuthReady && window.onAuthReady();
  }
  function showLogin(){
    document.getElementById('loginWrap').hidden = false;
    document.getElementById('appWrap').hidden = true;
  }

  function init(){
    if(!window.SUPABASE_CONFIGURADO){
      document.getElementById('loginError').textContent =
        'Configure js/supabaseClient.js com a URL e a chave anon do seu projeto Supabase antes de entrar.';
    }

    sb.auth.getSession().then(function(res){
      if(res.data.session) showApp(res.data.session); else showLogin();
    });
    sb.auth.onAuthStateChange(function(event, session){
      if(session) showApp(session); else showLogin();
    });

    document.getElementById('loginForm').addEventListener('submit', function(e){
      e.preventDefault();
      var email = document.getElementById('loginEmail').value.trim();
      var senha = document.getElementById('loginSenha').value;
      var errEl = document.getElementById('loginError');
      errEl.textContent = '';
      sb.auth.signInWithPassword({ email: email, password: senha }).then(function(res){
        if(res.error) errEl.textContent = 'E-mail ou senha inválidos.';
      });
    });

    document.getElementById('logoutBtn').addEventListener('click', function(){
      sb.auth.signOut();
    });
  }

  return { init: init };
})();

document.addEventListener('DOMContentLoaded', window.auth.init);
