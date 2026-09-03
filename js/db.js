// Funções de acesso a dados, reaproveitadas pelas telas do painel e pela página pública do item.
// Tudo aqui conversa com o Supabase (Postgres) via supabase-js (window.sb, ver supabaseClient.js).
window.db = (function(){
  "use strict";

  function unwrap(res){
    if(res.error) throw res.error;
    return res.data;
  }

  return {
    // ---------- Categorias ----------
    getCategorias(){
      return sb.from('categorias').select('*').order('ordem').then(unwrap);
    },
    addCategoria(nome){
      return sb.from('categorias').insert({ nome: nome }).select().single().then(unwrap);
    },

    // ---------- Colaboradores ----------
    getColaboradores(){
      return sb.from('colaboradores').select('*').order('nome').then(unwrap);
    },
    addColaborador(colaborador){
      return sb.from('colaboradores').insert(colaborador).select().single().then(unwrap);
    },
    updateColaborador(id, patch){
      return sb.from('colaboradores').update(patch).eq('id', id).select().single().then(unwrap);
    },
    deleteColaborador(id){
      return sb.from('colaboradores').delete().eq('id', id).then(unwrap);
    },

    // ---------- Itens ----------
    getItens(){
      return sb.from('itens')
        .select('*, categoria:categorias(id,nome), colaborador:colaboradores(id,nome)')
        .order('created_at', { ascending:false })
        .then(unwrap);
    },
    getItensPorColaborador(colaboradorId){
      return sb.from('itens')
        .select('*, categoria:categorias(id,nome)')
        .eq('colaborador_id', colaboradorId)
        .then(unwrap);
    },
    addItem(item){
      return sb.from('itens').insert(item).select('*, categoria:categorias(id,nome), colaborador:colaboradores(id,nome)').single().then(unwrap);
    },
    updateItem(id, patch){
      return sb.from('itens').update(patch).eq('id', id)
        .select('*, categoria:categorias(id,nome), colaborador:colaboradores(id,nome)').single().then(unwrap);
    },
    deleteItem(id){
      return sb.from('itens').delete().eq('id', id).then(unwrap);
    },

    // ---------- Conferências ----------
    getConferencias(cicloMes){
      var q = sb.from('conferencias')
        .select('*, item:itens(id,codigo,nome), colaborador:colaboradores(id,nome)')
        .order('created_at', { ascending:false });
      if(cicloMes) q = q.eq('ciclo_mes', cicloMes);
      return q.then(unwrap);
    },
    getCiclos(){
      return sb.from('conferencias').select('ciclo_mes').then(function(res){
        var rows = unwrap(res);
        var set = new Set(rows.map(function(r){ return r.ciclo_mes; }));
        return Array.from(set).sort().reverse();
      });
    },
    async criarCicloConferencia(cicloMes){
      var itens = await sb.from('itens')
        .select('id,colaborador_id')
        .not('colaborador_id', 'is', null)
        .eq('status', 'Em uso')
        .then(unwrap);
      if(itens.length === 0) return { criados: 0, existentes: 0 };
      var rows = itens.map(function(i){
        return { ciclo_mes: cicloMes, item_id: i.id, colaborador_id: i.colaborador_id, status: 'Pendente', origem: 'manual' };
      });
      var res = await sb.from('conferencias').upsert(rows, { onConflict:'ciclo_mes,item_id', ignoreDuplicates:true }).select();
      var criados = unwrap(res).length;
      return { criados: criados, existentes: itens.length - criados };
    },
    updateConferencia(id, patch){
      patch = Object.assign({}, patch, { respondido_em: new Date().toISOString() });
      return sb.from('conferencias').update(patch).eq('id', id)
        .select('*, item:itens(id,codigo,nome), colaborador:colaboradores(id,nome)').single().then(unwrap);
    },

    // ---------- Página pública (QR Code, sem login) ----------
    getItemPublico(codigo){
      return sb.from('itens_publicos').select('*').eq('codigo', codigo).maybeSingle().then(unwrap);
    }
  };
})();
