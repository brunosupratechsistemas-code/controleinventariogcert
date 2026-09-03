(function(){
  "use strict";
  var U = utils;

  function render(item){
    var el = document.getElementById('itemPublicContent');
    if(!item){
      el.innerHTML =
        '<div class="item-public-card">' +
          '<img class="brand-logo" src="img/logo-gcert.png" alt="GCERT">' +
          '<div class="empty"><div class="big">❓</div><p><strong>Item não encontrado.</strong></p>' +
          '<p class="hint">Verifique se o QR Code / link está correto.</p></div>' +
        '</div>';
      return;
    }
    el.innerHTML =
      '<div class="item-public-card">' +
        '<img class="brand-logo" src="img/logo-gcert.png" alt="GCERT">' +
        '<div class="code mono">#'+U.escapeHtml(item.codigo)+'</div>' +
        '<div class="nome">'+U.escapeHtml(item.nome)+'</div>' +
        '<div class="row"><span class="k">Categoria</span><span>'+U.escapeHtml(item.categoria || '—')+'</span></div>' +
        '<div class="row"><span class="k">Status</span><span class="status-pill '+U.statusClass(item.status)+'" style="margin-top:0;">'+U.escapeHtml(item.status)+'</span></div>' +
        '<div class="row" style="border-bottom:none;"><span class="k">Responsável</span><span>'+U.escapeHtml(item.colaborador_nome || '—')+'</span></div>' +
      '</div>';
  }

  function init(){
    if(!window.SUPABASE_CONFIGURADO){
      render(null);
      document.getElementById('itemPublicContent').innerHTML =
        '<div class="item-public-card"><p class="hint">Configure js/supabaseClient.js com os dados do seu projeto Supabase para esta página funcionar.</p></div>';
      return;
    }
    var params = new URLSearchParams(location.search);
    var codigo = params.get('codigo');
    if(!codigo){ render(null); return; }
    db.getItemPublico(codigo).then(render).catch(function(){ render(null); });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
