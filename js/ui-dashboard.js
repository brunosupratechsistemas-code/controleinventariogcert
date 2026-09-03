window.uiDashboard = (function(){
  "use strict";
  var U = utils;

  function render(){
    var el = document.getElementById('dashboardContent');
    var itens = state.itens, colabs = state.colaboradores;
    var porStatus = {};
    itens.forEach(function(i){ porStatus[i.status] = (porStatus[i.status]||0) + 1; });
    var ativos = colabs.filter(function(c){ return c.status === 'Ativo'; }).length;

    var cards = [
      { num: itens.length, lbl: 'Itens cadastrados' },
      { num: porStatus['Em uso'] || 0, lbl: 'Em uso' },
      { num: porStatus['Em estoque'] || 0, lbl: 'Em estoque' },
      { num: porStatus['Manutenção'] || 0, lbl: 'Em manutenção' },
      { num: porStatus['Baixado'] || 0, lbl: 'Baixados' },
      { num: ativos, lbl: 'Colaboradores ativos' }
    ];

    var html = '<div class="dash-grid">' + cards.map(function(c){
      return '<div class="stat-card"><div class="num mono">'+c.num+'</div><div class="lbl">'+c.lbl+'</div></div>';
    }).join('') + '</div>';

    var porCategoria = {};
    itens.forEach(function(i){
      var nome = (i.categoria && i.categoria.nome) || 'Sem categoria';
      porCategoria[nome] = (porCategoria[nome]||0) + 1;
    });
    var catRows = Object.keys(porCategoria).sort();
    html += '<div class="panel" style="margin-top:16px;"><h3>Itens por categoria</h3>';
    if(catRows.length === 0){
      html += '<p class="hint">Nenhum item cadastrado ainda.</p>';
    } else {
      html += '<div class="dash-grid">' + catRows.map(function(nome){
        return '<div class="stat-card"><div class="num mono">'+porCategoria[nome]+'</div><div class="lbl">'+U.escapeHtml(nome)+'</div></div>';
      }).join('') + '</div>';
    }
    html += '</div>';

    el.innerHTML = html;
  }

  return { render: render };
})();
