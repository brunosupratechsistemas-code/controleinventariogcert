window.uiEtiquetas = (function(){
  "use strict";
  var U = utils;
  var selected = new Set();

  function render(){
    var el = document.getElementById('etiquetasContent');
    if(state.itens.length === 0){
      el.innerHTML = '<div class="empty"><div class="big">🏷️</div><p>Nenhum item cadastrado ainda.</p></div>';
      return;
    }
    var grid = document.createElement('div');
    grid.className = 'tag-grid';
    state.itens.forEach(function(item){
      var chip = document.createElement('label');
      chip.className = 'tag-chip';
      chip.style.cursor = 'pointer';
      chip.innerHTML =
        '<input type="checkbox" class="etq-check" data-id="'+item.id+'" style="position:absolute;top:12px;right:12px;width:16px;height:16px;" '+(selected.has(item.id)?'checked':'')+'>' +
        '<div class="qr-box" id="qr-etq-'+item.id+'"></div>' +
        '<div class="info">' +
          '<div class="code">#'+U.escapeHtml(item.codigo)+'</div>' +
          '<div class="nome">'+U.escapeHtml(item.nome)+'</div>' +
          '<div class="meta">'+((item.categoria&&item.categoria.nome)?U.escapeHtml(item.categoria.nome):'<em>sem categoria</em>')+'</div>' +
        '</div>';
      grid.appendChild(chip);
    });
    el.innerHTML = '';
    el.appendChild(grid);
    state.itens.forEach(function(item){
      var box = document.getElementById('qr-etq-'+item.id);
      if(box) U.renderQrInto(box, U.itemPublicUrl(item.codigo), 64);
    });
    el.querySelectorAll('.etq-check').forEach(function(cb){
      cb.addEventListener('change', function(){
        if(cb.checked) selected.add(cb.dataset.id); else selected.delete(cb.dataset.id);
      });
    });
  }

  function initForm(){
    document.getElementById('selectAllBtn').addEventListener('click', function(){
      state.itens.forEach(function(i){ selected.add(i.id); });
      render();
    });
    document.getElementById('selectNoneBtn').addEventListener('click', function(){
      selected.clear();
      render();
    });
    document.getElementById('printBtn').addEventListener('click', function(){
      var chosen = state.itens.filter(function(i){ return selected.has(i.id); });
      if(chosen.length === 0) chosen = state.itens.slice();
      var printGrid = document.getElementById('printGrid');
      printGrid.innerHTML = '';
      chosen.forEach(function(item){
        var tag = document.createElement('div');
        tag.className = 'print-tag';
        tag.innerHTML =
          '<div class="head"><img src="img/favicon.png" alt=""><span>Patrimônio · GCERT</span></div>' +
          '<div class="body">' +
            '<div class="qr" id="qr-print-'+item.id+'"></div>' +
            '<div class="txt">' +
              '<div class="nome">'+U.escapeHtml(item.nome)+'</div>' +
              '#'+U.escapeHtml(item.codigo)+'<br>' +
              ((item.categoria&&item.categoria.nome)?U.escapeHtml(item.categoria.nome):'') +
            '</div>' +
          '</div>';
        printGrid.appendChild(tag);
      });
      chosen.forEach(function(item){
        var box = document.getElementById('qr-print-'+item.id);
        if(box) U.renderQrInto(box, U.itemPublicUrl(item.codigo), 84);
      });
      setTimeout(function(){ window.print(); }, 150);
    });
  }

  return { render: render, initForm: initForm };
})();
