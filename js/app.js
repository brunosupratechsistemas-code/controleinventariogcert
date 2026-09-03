window.state = { categorias: [], colaboradores: [], itens: [], loaded: false };

window.app = (function(){
  "use strict";
  var U = utils;
  var views = { dashboard:'view-dashboard', cadastro:'view-cadastro', colaboradores:'view-colaboradores', estoque:'view-estoque', conferencias:'view-conferencias', scanner:'view-scanner', etiquetas:'view-etiquetas' };
  var initialized = false;

  function activeTab(){
    var t = document.querySelector('.tab.active');
    return t ? t.dataset.tab : 'dashboard';
  }

  function renderActive(){
    var tab = activeTab();
    if(tab === 'dashboard') uiDashboard.render();
    if(tab === 'cadastro') uiCadastro.render();
    if(tab === 'colaboradores') uiColaboradores.render();
    if(tab === 'estoque') uiEstoque.render();
    if(tab === 'conferencias') uiConferencias.load();
    if(tab === 'etiquetas') uiEtiquetas.render();
  }

  function refreshDashboardIfActive(){
    if(activeTab() === 'dashboard') uiDashboard.render();
  }

  function refreshSelects(){
    uiEstoque.refreshSelects();
  }

  function loadAll(){
    return Promise.all([
      db.getCategorias(), db.getColaboradores(), db.getItens()
    ]).then(function(res){
      state.categorias = res[0];
      state.colaboradores = res[1];
      state.itens = res[2];
      state.loaded = true;
    });
  }

  function bindTabs(){
    document.querySelectorAll('.tab').forEach(function(t){
      t.addEventListener('click', function(){
        document.querySelectorAll('.tab').forEach(function(x){ x.classList.remove('active'); });
        t.classList.add('active');
        Object.keys(views).forEach(function(k){
          document.getElementById(views[k]).style.display = (k === t.dataset.tab) ? '' : 'none';
        });
        if(t.dataset.tab !== 'scanner') uiScanner.stop();
        renderActive();
      });
    });
  }

  function init(){
    if(initialized) return;
    initialized = true;
    bindTabs();
    uiCadastro.initForm();
    uiColaboradores.initForm();
    uiEstoque.initForm();
    uiConferencias.initForm();
    uiEtiquetas.initForm();
    uiScanner.initForm();

    loadAll().then(function(){
      uiEstoque.fillStaticSelectsOnce();
      renderActive();
    }).catch(function(err){
      U.toast(U.errMsg(err), 'err');
    });
  }

  return { init: init, refreshSelects: refreshSelects, refreshDashboardIfActive: refreshDashboardIfActive };
})();

window.onAuthReady = window.app.init;
