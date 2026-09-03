// Cadastro rápido: cria o colaborador e já atribui os dispositivos escolhidos,
// tudo em um único envio (mesmo resultado de cadastrar manualmente em Colaboradores + Estoque).
window.uiCadastro = (function(){
  "use strict";
  var U = utils;
  var selecionados = [];

  function dispositivosDisponiveis(){
    return state.itens.filter(function(i){
      return i.status === 'Em estoque' && selecionados.indexOf(i.id) === -1;
    });
  }

  function renderSelect(){
    var select = document.getElementById('cad_deviceSelect');
    var addBtn = document.getElementById('cad_addDeviceBtn');
    var disponiveis = dispositivosDisponiveis();
    if(disponiveis.length === 0){
      select.innerHTML = '<option value="">Nenhum dispositivo em estoque</option>';
      select.disabled = true;
      addBtn.disabled = true;
      return;
    }
    select.disabled = false;
    addBtn.disabled = false;
    select.innerHTML = '<option value="">Selecione um dispositivo...</option>' + disponiveis.map(function(i){
      var cat = (i.categoria && i.categoria.nome) ? ' · ' + i.categoria.nome : '';
      return '<option value="'+i.id+'">#'+U.escapeHtml(i.codigo)+' — '+U.escapeHtml(i.nome)+cat+'</option>';
    }).join('');
  }

  function renderList(){
    var box = document.getElementById('cad_deviceList');
    if(selecionados.length === 0){
      box.innerHTML = '<p class="hint">Nenhum dispositivo adicionado ainda.</p>';
      return;
    }
    box.innerHTML = selecionados.map(function(id){
      var item = state.itens.find(function(i){ return i.id === id; });
      if(!item) return '';
      var cat = (item.categoria && item.categoria.nome) ? ' · ' + U.escapeHtml(item.categoria.nome) : '';
      return '<div class="device-pick-row">' +
        '<div class="info"><span class="code">#'+U.escapeHtml(item.codigo)+'</span>' +
          '<strong>'+U.escapeHtml(item.nome)+'</strong>' +
          '<span class="meta">'+cat+'</span></div>' +
        '<button type="button" class="icon-btn danger" title="Remover" data-remove="'+item.id+'">✕</button>' +
      '</div>';
    }).join('');
    box.querySelectorAll('[data-remove]').forEach(function(b){
      b.addEventListener('click', function(){
        selecionados = selecionados.filter(function(id){ return id !== b.dataset.remove; });
        renderSelect();
        renderList();
      });
    });
  }

  function limparSelecao(){
    selecionados = [];
    renderSelect();
    renderList();
  }

  function render(){
    limparSelecao();
    document.getElementById('cadastroForm').reset();
    document.getElementById('cadastroResumo').innerHTML = '';
    var linkEl = document.getElementById('linkFormularioPublico');
    var url = location.href.replace(/index\.html.*$/, '').replace(/\?.*$/, '');
    if(!/\/$/.test(url)) url += '/';
    linkEl.href = url + 'solicitacao.html';
    linkEl.textContent = url + 'solicitacao.html';
    renderSolicitacoes();
  }

  function renderSolicitacoes(){
    var box = document.getElementById('solicitacoesContent');
    box.innerHTML = '<div class="empty"><div class="big">⏳</div><p>Carregando...</p></div>';
    db.getSolicitacoesPendentes().then(function(rows){
      if(rows.length === 0){
        box.innerHTML = '<div class="empty"><div class="big">📭</div><p>Nenhuma solicitação pendente.</p></div>';
        return;
      }
      box.innerHTML = '';
      var grid = document.createElement('div');
      grid.className = 'tag-grid';
      rows.forEach(function(s){
        var deviceList = (s.dispositivos || []).map(function(d){
          return U.escapeHtml(d.categoria)+': '+U.escapeHtml(d.descricao);
        }).join('<br>') || '<em>nenhum equipamento informado</em>';
        var chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.innerHTML =
          '<div class="info">' +
            '<div class="nome">'+U.escapeHtml(s.nome)+'</div>' +
            '<div class="meta">'+(s.setor?U.escapeHtml(s.setor)+'<br>':'')+deviceList+'</div>' +
            '<div class="hint">'+U.fmtDate(s.created_at)+'</div>' +
            '<div class="form-actions" style="margin-top:10px;">' +
              '<button class="btn amber small" data-aprovar="'+s.id+'">Aprovar</button>' +
              '<button class="btn danger small" data-rejeitar="'+s.id+'">Rejeitar</button>' +
            '</div>' +
          '</div>';
        chip.querySelector('[data-aprovar]').addEventListener('click', function(e){ aprovar(s, e.target); });
        chip.querySelector('[data-rejeitar]').addEventListener('click', function(e){ rejeitar(s, e.target); });
        grid.appendChild(chip);
      });
      box.appendChild(grid);
    }).catch(function(err){
      box.innerHTML = '<p class="hint">'+U.escapeHtml(U.errMsg(err))+'</p>';
    });
  }

  function atribuirDispositivoNovo(d, colaboradorId){
    var cat = state.categorias.find(function(c){ return c.nome.toLowerCase() === (d.categoria||'').toLowerCase(); });
    var getCategoria = cat ? Promise.resolve(cat) : db.addCategoria(d.categoria).then(function(nova){
      state.categorias.push(nova);
      return nova;
    });
    return getCategoria.then(function(categoria){
      return db.addItem({
        nome: d.descricao,
        categoria_id: categoria.id,
        status: 'Em uso',
        colaborador_id: colaboradorId
      });
    }).then(function(novoItem){
      state.itens.unshift(novoItem);
    });
  }

  function aprovar(s, btn){
    btn.disabled = true;
    var duplicado = state.colaboradores.some(function(c){ return c.nome.toLowerCase() === s.nome.toLowerCase(); });
    if(duplicado){
      U.toast('Já existe um colaborador com esse nome — resolva manualmente antes de aprovar', 'err');
      btn.disabled = false;
      return;
    }
    db.addColaborador({ nome: s.nome, email: '', setor: s.setor || '', status: 'Ativo' }).then(function(colab){
      state.colaboradores.push(colab);
      state.colaboradores.sort(function(a,b){ return a.nome.localeCompare(b.nome); });
      var dispositivos = s.dispositivos || [];
      // sequencial (não paralelo) porque uma categoria "Outro" nova pode repetir entre dois
      // dispositivos da mesma solicitação, e não queremos criar a mesma categoria duas vezes
      var chain = Promise.resolve();
      dispositivos.forEach(function(d){
        chain = chain.then(function(){ return atribuirDispositivoNovo(d, colab.id); });
      });
      return chain.then(function(){ return colab; });
    }).then(function(){
      return db.atualizarStatusSolicitacao(s.id, 'Aprovado');
    }).then(function(){
      U.toast('Solicitação aprovada', 'ok');
      app.refreshSelects();
      app.refreshDashboardIfActive();
      renderSolicitacoes();
    }).catch(function(err){
      U.toast(U.errMsg(err), 'err');
      btn.disabled = false;
    });
  }

  function rejeitar(s, btn){
    btn.disabled = true;
    db.atualizarStatusSolicitacao(s.id, 'Rejeitado').then(function(){
      U.toast('Solicitação rejeitada', 'ok');
      renderSolicitacoes();
    }).catch(function(err){
      U.toast(U.errMsg(err), 'err');
      btn.disabled = false;
    });
  }

  function initForm(){
    document.getElementById('cad_addDeviceBtn').addEventListener('click', function(){
      var id = document.getElementById('cad_deviceSelect').value;
      if(!id) return;
      selecionados.push(id);
      renderSelect();
      renderList();
    });

    document.getElementById('cadastroForm').addEventListener('submit', function(e){
      e.preventDefault();
      var nome = document.getElementById('cad_nome').value.trim();
      var setor = document.getElementById('cad_setor').value.trim();
      if(!nome){ U.toast('Informe o nome do colaborador', 'err'); return; }
      var duplicado = state.colaboradores.some(function(c){ return c.nome.toLowerCase() === nome.toLowerCase(); });
      if(duplicado){ U.toast('Já existe um colaborador com esse nome', 'err'); return; }

      var submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      var idsParaAtribuir = selecionados.slice();

      db.addColaborador({ nome: nome, email: '', setor: setor, status: 'Ativo' }).then(function(colab){
        state.colaboradores.push(colab);
        state.colaboradores.sort(function(a,b){ return a.nome.localeCompare(b.nome); });
        return Promise.all(idsParaAtribuir.map(function(itemId){
          return db.updateItem(itemId, { colaborador_id: colab.id, status: 'Em uso' }).then(function(updated){
            var idx = state.itens.findIndex(function(i){ return i.id === itemId; });
            if(idx !== -1) state.itens[idx] = updated;
          });
        })).then(function(){ return colab; });
      }).then(function(colab){
        var qtd = idsParaAtribuir.length;
        document.getElementById('cadastroResumo').innerHTML =
          '<div class="new-tag-preview" style="border-color:var(--teal); background:rgba(47,111,107,.06);">' +
            '<div><strong>'+U.escapeHtml(colab.nome)+'</strong> cadastrado com sucesso, com '+qtd+' dispositivo'+(qtd===1?'':'s')+' atribuído'+(qtd===1?'':'s')+'.</div>' +
          '</div>';
        U.toast('Colaborador cadastrado', 'ok');
        limparSelecao();
        document.getElementById('cadastroForm').reset();
        app.refreshSelects();
        app.refreshDashboardIfActive();
      }).catch(function(err){
        U.toast(U.errMsg(err), 'err');
      }).finally(function(){
        submitBtn.disabled = false;
      });
    });
  }

  return { render: render, initForm: initForm };
})();
