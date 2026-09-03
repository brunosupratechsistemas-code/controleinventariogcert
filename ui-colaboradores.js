window.uiColaboradores = (function(){
  "use strict";
  var U = utils;

  function render(){
    var q = (document.getElementById('colabSearch').value || '').toLowerCase();
    var list = state.colaboradores.filter(function(c){
      return !q || (c.nome + ' ' + (c.email||'') + ' ' + (c.setor||'')).toLowerCase().indexOf(q) !== -1;
    });
    var el = document.getElementById('colaboradoresContent');

    if(state.colaboradores.length === 0){
      el.innerHTML = '<div class="empty"><div class="big">👤</div><p><strong>Nenhum colaborador cadastrado.</strong></p><p>Use o formulário acima para cadastrar o primeiro.</p></div>';
      return;
    }
    if(list.length === 0){
      el.innerHTML = '<div class="empty"><div class="big">🔍</div><p>Nenhum colaborador encontrado.</p></div>';
      return;
    }

    var grid = document.createElement('div');
    grid.className = 'tag-grid';
    list.forEach(function(c){
      var qtd = state.itens.filter(function(i){ return i.colaborador_id === c.id; }).length;
      var chip = document.createElement('div');
      chip.className = 'tag-chip';
      chip.style.cursor = 'pointer';
      chip.innerHTML =
        '<div class="info">' +
          '<div class="nome">'+U.escapeHtml(c.nome)+'</div>' +
          '<div class="meta">' +
            (c.setor ? U.escapeHtml(c.setor) + ' · ' : '') +
            qtd + ' dispositivo' + (qtd === 1 ? '' : 's') +
            (c.email ? '<br>✉️ ' + U.escapeHtml(c.email) : '') +
          '</div>' +
          '<span class="status-pill '+U.statusClass(c.status)+'">'+c.status+'</span>' +
        '</div>' +
        '<div class="chip-actions">' +
          '<button class="icon-btn" title="Editar" data-edit="'+c.id+'">✎</button>' +
          '<button class="icon-btn danger" title="Excluir" data-delete="'+c.id+'">✕</button>' +
        '</div>';
      chip.addEventListener('click', function(e){
        if(e.target.closest('[data-edit]') || e.target.closest('[data-delete]')) return;
        openDetail(c);
      });
      grid.appendChild(chip);
    });
    el.innerHTML = '';
    el.appendChild(grid);
    el.querySelectorAll('[data-edit]').forEach(function(b){
      b.addEventListener('click', function(e){ e.stopPropagation(); openEdit(state.colaboradores.find(function(c){return c.id===b.dataset.edit;})); });
    });
    el.querySelectorAll('[data-delete]').forEach(function(b){
      b.addEventListener('click', function(e){ e.stopPropagation(); confirmDelete(state.colaboradores.find(function(c){return c.id===b.dataset.delete;})); });
    });
  }

  function confirmDelete(c){
    var qtd = state.itens.filter(function(i){ return i.colaborador_id === c.id; }).length;
    var overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML =
      '<div class="modal" style="max-width:380px;">' +
        '<h2>Excluir colaborador?</h2>' +
        '<p>Isso vai remover <strong>'+U.escapeHtml(c.nome)+'</strong> definitivamente. Essa ação não pode ser desfeita.</p>' +
        (qtd > 0 ? '<p class="hint">'+qtd+' dispositivo'+(qtd===1?'':'s')+' atribuído'+(qtd===1?'':'s')+' a ele volta'+(qtd===1?'':'m')+' para o estoque, sem responsável.</p>' : '') +
        '<div class="form-actions">' +
          '<button class="btn danger" id="confirmDelColabBtn">Excluir</button>' +
          '<button class="btn ghost" id="cancelDelColabBtn">Cancelar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e){ if(e.target === overlay) overlay.remove(); });
    overlay.querySelector('#cancelDelColabBtn').addEventListener('click', function(){ overlay.remove(); });
    overlay.querySelector('#confirmDelColabBtn').addEventListener('click', function(){
      db.deleteColaborador(c.id).then(function(){
        state.colaboradores = state.colaboradores.filter(function(x){ return x.id !== c.id; });
        state.itens.forEach(function(i){ if(i.colaborador_id === c.id){ i.colaborador_id = null; i.colaborador = null; } });
        U.toast('Colaborador excluído', 'ok');
        overlay.remove();
        render();
      }).catch(function(err){ U.toast(U.errMsg(err), 'err'); });
    });
  }

  function openDetail(c){
    var itens = state.itens.filter(function(i){ return i.colaborador_id === c.id; });
    var overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML =
      '<div class="modal">' +
        '<h2>'+U.escapeHtml(c.nome)+'</h2>' +
        '<p class="hint">'+(c.setor?U.escapeHtml(c.setor):'')+(c.email?' · '+U.escapeHtml(c.email):'')+'</p>' +
        '<div class="divider"></div>' +
        '<h3>Dispositivos atribuídos</h3>' +
        (itens.length === 0
          ? '<p class="hint">Nenhum dispositivo atribuído a este colaborador no momento.</p>'
          : '<div class="tag-grid">' + itens.map(function(i){
              return '<div class="tag-chip" style="padding:12px 14px;"><div class="info">' +
                '<div class="code">#'+U.escapeHtml(i.codigo)+'</div>' +
                '<div class="nome">'+U.escapeHtml(i.nome)+'</div>' +
                '<div class="meta">'+((i.categoria&&i.categoria.nome)?U.escapeHtml(i.categoria.nome):'')+'</div>' +
                '<span class="status-pill '+U.statusClass(i.status)+'">'+i.status+'</span>' +
              '</div></div>';
            }).join('') + '</div>') +
        '<div class="form-actions"><button class="btn ghost" id="closeDetailBtn">Fechar</button></div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e){ if(e.target === overlay) overlay.remove(); });
    overlay.querySelector('#closeDetailBtn').addEventListener('click', function(){ overlay.remove(); });
  }

  function openEdit(c){
    var overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML =
      '<div class="modal">' +
        '<h2>Editar colaborador</h2>' +
        '<div class="form-grid">' +
          '<div class="field-group full"><label>Nome</label><input type="text" id="ec_nome" value="'+U.escapeHtml(c.nome)+'"></div>' +
          '<div class="field-group"><label>E-mail</label><input type="text" id="ec_email" value="'+U.escapeHtml(c.email||'')+'"></div>' +
          '<div class="field-group"><label>Setor</label><input type="text" id="ec_setor" value="'+U.escapeHtml(c.setor||'')+'"></div>' +
          '<div class="field-group"><label>Status</label><select class="field" id="ec_status">' +
            ['Ativo','Inativo'].map(function(s){ return '<option '+(s===c.status?'selected':'')+'>'+s+'</option>'; }).join('') +
          '</select></div>' +
        '</div>' +
        '<div class="form-actions">' +
          '<button class="btn amber" id="saveColabBtn">Salvar</button>' +
          '<button class="btn ghost" id="cancelColabBtn">Cancelar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e){ if(e.target === overlay) overlay.remove(); });
    overlay.querySelector('#cancelColabBtn').addEventListener('click', function(){ overlay.remove(); });
    overlay.querySelector('#saveColabBtn').addEventListener('click', function(){
      var patch = {
        nome: overlay.querySelector('#ec_nome').value.trim() || c.nome,
        email: overlay.querySelector('#ec_email').value.trim(),
        setor: overlay.querySelector('#ec_setor').value.trim(),
        status: overlay.querySelector('#ec_status').value
      };
      db.updateColaborador(c.id, patch).then(function(updated){
        Object.assign(c, updated);
        U.toast('Colaborador atualizado', 'ok');
        overlay.remove();
        render();
      }).catch(function(err){ U.toast(U.errMsg(err), 'err'); });
    });
  }

  function initForm(){
    document.getElementById('novoColabForm').addEventListener('submit', function(e){
      e.preventDefault();
      var nome = document.getElementById('nc_nome').value.trim();
      if(!nome){ U.toast('Informe o nome do colaborador', 'err'); return; }
      var email = document.getElementById('nc_email').value.trim();
      var duplicado = state.colaboradores.some(function(c){
        return c.nome.toLowerCase() === nome.toLowerCase() || (email && c.email && c.email.toLowerCase() === email.toLowerCase());
      });
      if(duplicado){ U.toast('Já existe um colaborador com esse nome ou e-mail', 'err'); return; }
      var novo = {
        nome: nome,
        email: email,
        setor: document.getElementById('nc_setor').value.trim(),
        status: 'Ativo'
      };
      db.addColaborador(novo).then(function(c){
        state.colaboradores.push(c);
        state.colaboradores.sort(function(a,b){ return a.nome.localeCompare(b.nome); });
        U.toast('Colaborador cadastrado', 'ok');
        e.target.reset();
        render();
        app.refreshSelects();
      }).catch(function(err){ U.toast(U.errMsg(err), 'err'); });
    });
    document.getElementById('colabSearch').addEventListener('input', render);
  }

  return { render: render, initForm: initForm };
})();
