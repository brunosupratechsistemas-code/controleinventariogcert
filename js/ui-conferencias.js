window.uiConferencias = (function(){
  "use strict";
  var U = utils;
  var STATUSES = ['Pendente','Confirmado','Não localizado','Divergente'];
  var current = [];

  function cicloAtualInputValue(){
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
  }

  function inputToIso(monthVal){
    return monthVal ? (monthVal + '-01') : null;
  }

  function load(){
    var monthVal = document.getElementById('confMes').value;
    var ciclo = inputToIso(monthVal);
    var el = document.getElementById('conferenciasContent');
    el.innerHTML = '<div class="empty"><div class="big">⏳</div><p>Carregando...</p></div>';
    db.getConferencias(ciclo).then(function(rows){
      current = rows;
      renderList();
    }).catch(function(err){
      el.innerHTML = '<div class="empty"><p>'+U.escapeHtml(U.errMsg(err))+'</p></div>';
    });
  }

  function renderList(){
    var el = document.getElementById('conferenciasContent');
    if(current.length === 0){
      el.innerHTML = '<div class="empty"><div class="big">🗓️</div><p><strong>Nenhuma conferência neste ciclo.</strong></p>' +
        '<p>Clique em "Nova conferência" para gerar os itens pendentes do mês, a partir dos equipamentos em uso.</p></div>';
      return;
    }
    var grid = document.createElement('div');
    grid.className = 'tag-grid';
    current.forEach(function(row){
      var chip = document.createElement('div');
      chip.className = 'tag-chip';
      chip.style.paddingLeft = '14px';
      chip.innerHTML =
        '<div class="info">' +
          '<div class="code">#'+U.escapeHtml(row.item ? row.item.codigo : '?')+' · '+U.escapeHtml(row.origem)+'</div>' +
          '<div class="nome">'+U.escapeHtml(row.item ? row.item.nome : 'Item removido')+'</div>' +
          '<div class="meta">👤 '+U.escapeHtml(row.colaborador ? row.colaborador.nome : '—')+'</div>' +
          '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">' +
            '<select class="field" style="width:auto;" data-role="status">' +
              STATUSES.map(function(s){ return '<option '+(s===row.status?'selected':'')+'>'+s+'</option>'; }).join('') +
            '</select>' +
            '<input type="text" class="mono" style="width:110px;padding:8px 10px;border:1px solid var(--line);border-radius:6px;" data-role="condicao" placeholder="Condição" value="'+U.escapeHtml(row.condicao||'')+'">' +
          '</div>' +
          '<textarea data-role="obs" placeholder="Observações" style="margin-top:8px;min-height:40px;">'+U.escapeHtml(row.observacoes||'')+'</textarea>' +
          '<div class="form-actions" style="margin-top:8px;"><button class="btn small amber" data-role="save">Salvar</button></div>' +
        '</div>';
      chip.querySelector('[data-role="save"]').addEventListener('click', function(){
        var patch = {
          status: chip.querySelector('[data-role="status"]').value,
          condicao: chip.querySelector('[data-role="condicao"]').value.trim(),
          observacoes: chip.querySelector('[data-role="obs"]').value.trim()
        };
        db.updateConferencia(row.id, patch).then(function(updated){
          Object.assign(row, updated);
          U.toast('Conferência atualizada', 'ok');
        }).catch(function(err){ U.toast(U.errMsg(err), 'err'); });
      });
      grid.appendChild(chip);
    });
    el.innerHTML = '';
    el.appendChild(grid);
  }

  function initForm(){
    document.getElementById('confMes').value = cicloAtualInputValue();
    document.getElementById('confMes').addEventListener('change', load);
    document.getElementById('novoCicloBtn').addEventListener('click', function(){
      var ciclo = inputToIso(document.getElementById('confMes').value);
      if(!ciclo){ U.toast('Escolha um mês', 'err'); return; }
      db.criarCicloConferencia(ciclo).then(function(res){
        if(res.criados === 0 && res.existentes === 0){
          U.toast('Nenhum item em uso para conferir', 'err');
        } else {
          U.toast(res.criados + ' item(ns) adicionados à conferência de ' + U.fmtMes(ciclo), 'ok');
        }
        load();
      }).catch(function(err){ U.toast(U.errMsg(err), 'err'); });
    });
  }

  return { initForm: initForm, load: load };
})();
