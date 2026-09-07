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

    // ---------- Página pública (QR Code, sem login) ----------
    getItemPublico(codigo){
      return sb.from('itens_publicos').select('*').eq('codigo', codigo).maybeSingle().then(unwrap);
    },

    // ---------- Formulário público de cadastro (sem login) ----------
    getItensDisponiveisPublico(){
      return sb.from('itens_publicos').select('*').eq('status', 'Em estoque').then(unwrap);
    },
    enviarSolicitacaoPublica(dados){
      return sb.from('solicitacoes_cadastro').insert(dados).select().single().then(unwrap);
    },

    // ---------- Revisão das solicitações (equipe autenticada) ----------
    getSolicitacoesPendentes(){
      return sb.from('solicitacoes_cadastro').select('*').eq('status', 'Pendente').order('created_at').then(unwrap);
    },
    atualizarStatusSolicitacao(id, status){
      return sb.from('solicitacoes_cadastro').update({ status: status, processado_em: new Date().toISOString() }).eq('id', id)
        .select().single().then(unwrap);
    }
  };
})();
