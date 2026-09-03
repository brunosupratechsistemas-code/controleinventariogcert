// Formulário público (sem login) para o colaborador informar nome, setor e os
// equipamentos que estão com ele (por categoria + descrição, já que o item pode
// ainda não existir no sistema). Fica pendente na aba "Cadastro Rápido" do painel
// até a equipe aprovar com um clique — aprovar já cria o item de verdade, com QR Code.
(function(){
  "use strict";
  var U = utils;
  var categorias = [];
  var selecionados = []; // array de {categoria, descricao}

  function renderCategoriaSelect(){
    var select = document.getElementById('s_categoria');
    select.innerHTML = categorias.map(function(c){
      return '<option value="'+U.escapeHtml(c.nome)+'">'+U.escapeHtml(c.nome)+'</option>';
    }).join('') + '<option value="__outro__">Outro (especificar)</option>';
  }

  function renderList(){
    var box = document.getElementById('s_deviceList');
    if(selecionados.length === 0){
      box.innerHTML = '<p class="hint">Nenhum equipamento adicionado ainda.</p>';
      return;
    }
    box.innerHTML = selecionados.map(function(d, idx){
      return '<div class="device-pick-row">' +
        '<div class="info"><span class="code">'+U.escapeHtml(d.categoria)+'</span>' +
          '<strong>'+U.escapeHtml(d.descricao)+'</strong></div>' +
        '<button type="button" class="icon-btn danger" title="Remover" data-remove="'+idx+'">✕</button>' +
      '</div>';
    }).join('');
    box.querySelectorAll('[data-remove]').forEach(function(b){
      b.addEventListener('click', function(){
        selecionados.splice(Number(b.dataset.remove), 1);
        renderList();
      });
    });
  }

  function init(){
    if(!window.SUPABASE_CONFIGURADO){
      document.getElementById('formArea').innerHTML = '<p class="hint">Formulário não configurado. Avise a TI.</p>';
      return;
    }

    document.getElementById('s_categoria').addEventListener('change', function(){
      document.getElementById('s_categoriaOutroWrap').hidden = (this.value !== '__outro__');
    });

    db.getCategorias().then(function(cats){
      categorias = cats;
      renderCategoriaSelect();
    }).catch(function(){
      document.getElementById('s_categoria').innerHTML = '<option value="__outro__">Outro (especificar)</option>';
      document.getElementById('s_categoriaOutroWrap').hidden = false;
    });
    renderList();

    document.getElementById('s_addDeviceBtn').addEventListener('click', function(){
      var catSelect = document.getElementById('s_categoria');
      var categoria = catSelect.value === '__outro__'
        ? document.getElementById('s_categoriaOutro').value.trim()
        : catSelect.value;
      var descricao = document.getElementById('s_descricao').value.trim();
      if(!categoria){ U.toast('Escolha ou digite a categoria', 'err'); return; }
      if(!descricao){ U.toast('Descreva o equipamento', 'err'); return; }
      selecionados.push({ categoria: categoria, descricao: descricao });
      document.getElementById('s_descricao').value = '';
      document.getElementById('s_categoriaOutro').value = '';
      renderList();
    });

    document.getElementById('solicitacaoForm').addEventListener('submit', function(e){
      e.preventDefault();
      var nome = document.getElementById('s_nome').value.trim();
      if(!nome){ U.toast('Informe seu nome', 'err'); return; }
      var setor = document.getElementById('s_setor').value.trim();
      var btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      db.enviarSolicitacaoPublica({ nome: nome, setor: setor, dispositivos: selecionados }).then(function(){
        document.getElementById('formArea').hidden = true;
        document.getElementById('okArea').hidden = false;
      }).catch(function(err){
        U.toast(U.errMsg(err), 'err');
        btn.disabled = false;
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
