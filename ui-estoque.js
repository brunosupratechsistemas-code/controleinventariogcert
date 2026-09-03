window.uiEstoque = (function(){
  "use strict";
  var U = utils;
  var STATUSES = ['Em estoque','Em uso','Manutenção','Baixado'];

  function colaboradorOptions(selectedId){
    var opts = '<option value="">— Nenhum (fica em estoque) —</option>';
    state.colaboradores.filter(function(c){ return c.status === 'Ativo'; }).forEach(function(c){
      opts += '<option value="'+c.id+'" '+(c.id===selectedId?'selected':'')+'>'+U.escapeHtml(c.nome)+'</option>';
    });
    return opts;
  }
  function categoriaOptions(selectedId){
    var opts = '<option value="">Selecione...</option>';
    state.categorias.forEach(function(cat){
      opts += '<option value="'+cat.id+'" '+(cat.id===selectedId?'selected':'')+'>'+U.escapeHtml(cat.nome)+'</option>';
    });
    return opts;
  }

  function matches(item, q, status, catId){
    var hay = [item.codigo, item.nome, item.marca_modelo, item.numero_serie, (item.categoria&&item.categoria.nome), (item.colaborador&&item.colaborador.nome)].join(' ').toLowerCase();
    var qOk = !q || hay.indexOf(q) !== -1;
    var sOk = !status || item.status === status;
    var cOk = !catId || (item.categoria_id === catId);
    return qOk && sOk && cOk;
  }

  function render(){
    var q = (document.getElementById('estSearch').value || '').toLowerCase();
    var status = document.getElementById('estStatusFilter').value;
    var catId = document.getElementById('estCategoriaFilter').value;
    var list = state.itens.filter(function(i){ return matches(i, q, status, catId); });
    var el = document.getElementById('estoqueContent');

    if(state.itens.length === 0){
      el.innerHTML = '<div class="empty"><div class="big">📦</div><p><strong>Nenhum item cadastrado ainda.</strong></p><p>Use "+ Novo item" para começar.</p></div>';
      return;
    }
    if(list.length === 0){
      el.innerHTML = '<div class="empty"><div class="big">🔍</div><p>Nenhum item encontrado com esse filtro.</p></div>';
      return;
    }

    var groups = {};
    var order = [];
    state.categorias.forEach(function(c){ groups[c.id] = []; order.push(c.id); });
    groups['__sem__'] = []; order.push('__sem__');
    list.forEach(function(i){ (groups[i.categoria_id] || groups['__sem__']).push(i); });

    var html = '';
    order.forEach(function(catId2){
      var itens = groups[catId2];
      if(!itens || itens.length === 0) return;
      var nomeCat = catId2 === '__sem__' ? 'Sem categoria' : (state.categorias.find(function(c){return c.id===catId2;})||{}).nome;
      html += '<div class="cat-section"><div class="cat-section-title">'+U.escapeHtml(nomeCat)+' <span class="n">'+itens.length+'</span></div>';
      html += '<div class="tag-grid">';
      itens.forEach(function(item){
        html +=
          '<div class="tag-chip">' +
            '<div class="qr-box" id="qr-'+item.id+'"></div>' +
            '<div class="info">' +
              '<div class="code">#'+U.escapeHtml(item.codigo)+'</div>' +
              '<div class="nome">'+U.escapeHtml(item.nome)+'</div>' +
              '<div class="meta">' +
                (item.marca_modelo ? U.escapeHtml(item.marca_modelo)+'<br>' : '') +
                (item.colaborador ? '👤 '+U.escapeHtml(item.colaborador.nome) : '<em>em estoque</em>') +
              '</div>' +
              '<span class="status-pill '+U.statusClass(item.status)+'">'+item.status+'</span>' +
            '</div>' +
            '<div class="chip-actions">' +
              '<button class="icon-btn" title="Editar" data-edit="'+item.id+'">✎</button>' +
              '<button class="icon-btn danger" title="Excluir" data-delete="'+item.id+'">✕</button>' +
            '</div>' +
          '</div>';
      });
      html += '</div></div>';
    });
    el.innerHTML = html;
    list.forEach(function(item){
      var box = document.getElementById('qr-'+item.id);
      if(box) U.renderQrInto(box, U.itemPublicUrl(item.codigo), 64);
    });
    el.querySelectorAll('[data-edit]').forEach(function(b){
      b.addEventListener('click', function(){ openEdit(state.itens.find(function(i){return i.id===b.dataset.edit;})); });
    });
    el.querySelectorAll('[data-delete]').forEach(function(b){
      b.addEventListener('click', function(){ confirmDelete(state.itens.find(function(i){return i.id===b.dataset.delete;})); });
    });
  }

  function confirmDelete(item){
    var overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML =
      '<div class="modal" style="max-width:380px;">' +
        '<h2>Excluir item?</h2>' +
        '<p>Isso vai remover <strong>'+U.escapeHtml(item.nome)+'</strong> (#'+U.escapeHtml(item.codigo)+') definitivamente, junto com o histórico de conferências desse item. Essa ação não pode ser desfeita.</p>' +
        '<div class="form-actions">' +
          '<button class="btn danger" id="confirmDelItemBtn">Excluir</button>' +
          '<button class="btn ghost" id="cancelDelItemBtn">Cancelar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e){ if(e.target === overlay) overlay.remove(); });
    overlay.querySelector('#cancelDelItemBtn').addEventListener('click', function(){ overlay.remove(); });
    overlay.querySelector('#confirmDelItemBtn').addEventListener('click', function(){
      db.deleteItem(item.id).then(function(){
        state.itens = state.itens.filter(function(i){ return i.id !== item.id; });
        U.toast('Item excluído', 'ok');
        overlay.remove();
        render();
        app.refreshDashboardIfActive();
      }).catch(function(err){ U.toast(U.errMsg(err), 'err'); });
    });
  }

  function readForm(prefix){
    return {
      nome: document.getElementById(prefix+'_nome').value.trim(),
      categoria_id: document.getElementById(prefix+'_categoria').value || null,
      marca_modelo: document.getElementById(prefix+'_marca').value.trim(),
      numero_serie: document.getElementById(prefix+'_serie').value.trim(),
      status: document.getElementById(prefix+'_status').value,
      colaborador_id: document.getElementById(prefix+'_colaborador').value || null,
      data_aquisicao: document.getElementById(prefix+'_data').value || null,
      observacoes: document.getElementById(prefix+'_obs').value.trim()
    };
  }

  function initForm(){
    document.getElementById('novoItemForm').addEventListener('submit', function(e){
      e.preventDefault();
      var data = readForm('ni');
      if(!data.nome){ U.toast('Informe o nome do item', 'err'); return; }
      if(!data.categoria_id){ U.toast('Selecione uma categoria', 'err'); return; }
      db.addItem(data).then(function(item){
        state.itens.unshift(item);
        U.toast('Item cadastrado: #' + item.codigo, 'ok');
        showNewTagPreview(item);
        e.target.reset();
        document.getElementById('ni_status').value = 'Em estoque';
        render();
        app.refreshDashboardIfActive();
      }).catch(function(err){ U.toast(U.errMsg(err), 'err'); });
    });
    document.getElementById('estSearch').addEventListener('input', render);
    document.getElementById('estStatusFilter').addEventListener('change', render);
    document.getElementById('estCategoriaFilter').addEventListener('change', render);

    document.getElementById('novaCategoriaBtn').addEventListener('click', function(){
      var nome = prompt('Nome da nova categoria (ex.: Webcam):');
      if(!nome || !nome.trim()) return;
      db.addCategoria(nome.trim()).then(function(cat){
        state.categorias.push(cat);
        U.toast('Categoria criada', 'ok');
        app.refreshSelects();
      }).catch(function(err){ U.toast(U.errMsg(err), 'err'); });
    });
  }

  function showNewTagPreview(item){
    var box = document.getElementById('newItemTagPreview');
    box.innerHTML =
      '<div class="new-tag-preview">' +
        '<div class="qr-box" id="qr-new-item"></div>' +
        '<div>' +
          '<div class="code mono">#'+U.escapeHtml(item.codigo)+'</div>' +
          '<div class="nome" style="font-weight:600;font-size:15px;margin:2px 0;">'+U.escapeHtml(item.nome)+'</div>' +
          '<div class="hint">Etiqueta pronta. Vá em "Etiquetas p/ impressão" para imprimir.</div>' +
        '</div>' +
      '</div>';
    U.renderQrInto(document.getElementById('qr-new-item'), U.itemPublicUrl(item.codigo), 100);
  }

  function refreshSelects(){
    ['ni_categoria'].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.innerHTML = categoriaOptions(el.value);
    });
    ['ni_colaborador'].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.innerHTML = colaboradorOptions(el.value);
    });
    var filterCat = document.getElementById('estCategoriaFilter');
    var current = filterCat.value;
    filterCat.innerHTML = '<option value="">Todas categorias</option>' + state.categorias.map(function(c){
      return '<option value="'+c.id+'" '+(c.id===current?'selected':'')+'>'+U.escapeHtml(c.nome)+'</option>';
    }).join('');
  }

  function fillStaticSelectsOnce(){
    document.getElementById('ni_categoria').innerHTML = categoriaOptions();
    document.getElementById('ni_colaborador').innerHTML = colaboradorOptions();
    document.getElementById('ni_status').innerHTML = STATUSES.map(function(s){ return '<option>'+s+'</option>'; }).join('');
    document.getElementById('estStatusFilter').innerHTML = '<option value="">Todos os status</option>' + STATUSES.map(function(s){ return '<option>'+s+'</option>'; }).join('');
    refreshSelects();
  }

  function openEdit(item){
    var overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML =
      '<div class="modal">' +
        '<h2>Editar item — #'+U.escapeHtml(item.codigo)+'</h2>' +
        '<div class="form-grid">' +
          '<div class="field-group full"><label>Nome</label><input type="text" id="ei_nome" value="'+U.escapeHtml(item.nome)+'"></div>' +
          '<div class="field-group"><label>Categoria</label><select class="field" id="ei_categoria">'+categoriaOptions(item.categoria_id)+'</select></div>' +
          '<div class="field-group"><label>Status</label><select class="field" id="ei_status">' +
            STATUSES.map(function(s){ return '<option '+(s===item.status?'selected':'')+'>'+s+'</option>'; }).join('') +
          '</select></div>' +
          '<div class="field-group"><label>Marca / modelo</label><input type="text" id="ei_marca" value="'+U.escapeHtml(item.marca_modelo||'')+'"></div>' +
          '<div class="field-group"><label>Nº de série</label><input type="text" id="ei_serie" value="'+U.escapeHtml(item.numero_serie||'')+'"></div>' +
          '<div class="field-group"><label>Atribuído a</label><select class="field" id="ei_colaborador">'+colaboradorOptions(item.colaborador_id)+'</select></div>' +
          '<div class="field-group"><label>Data de aquisição</label><input type="date" id="ei_data" value="'+(item.data_aquisicao||'')+'"></div>' +
          '<div class="field-group full"><label>Observações</label><textarea id="ei_obs">'+U.escapeHtml(item.observacoes||'')+'</textarea></div>' +
        '</div>' +
        '<div class="divider"></div>' +
        '<div style="display:flex;align-items:center;gap:16px;">' +
          '<div class="qr-box" id="qr-edit-'+item.id+'" style="flex:0 0 90px;width:90px;height:90px;"></div>' +
          '<div class="hint">QR desta etiqueta aponta para:<br><span class="mono">'+U.escapeHtml(U.itemPublicUrl(item.codigo))+'</span></div>' +
        '</div>' +
        '<div class="form-actions">' +
          '<button class="btn amber" id="saveItemBtn">Salvar alterações</button>' +
          '<button class="btn ghost" id="cancelItemBtn">Cancelar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    U.renderQrInto(overlay.querySelector('#qr-edit-'+item.id), U.itemPublicUrl(item.codigo), 90);
    overlay.addEventListener('click', function(e){ if(e.target === overlay) overlay.remove(); });
    overlay.querySelector('#cancelItemBtn').addEventListener('click', function(){ overlay.remove(); });
    overlay.querySelector('#saveItemBtn').addEventListener('click', function(){
      var patch = readForm('ei');
      if(!patch.nome){ U.toast('Informe o nome do item', 'err'); return; }
      db.updateItem(item.id, patch).then(function(updated){
        Object.assign(item, updated);
        U.toast('Item atualizado', 'ok');
        overlay.remove();
        render();
        app.refreshDashboardIfActive();
      }).catch(function(err){ U.toast(U.errMsg(err), 'err'); });
    });
  }

  return { render: render, initForm: initForm, refreshSelects: refreshSelects, fillStaticSelectsOnce: fillStaticSelectsOnce, openEdit: openEdit };
})();
