// Edge Function: recebe a sincronização automática vinda do Google Apps Script
// (o mesmo script que já automatiza o ClickUp) sempre que um equipamento é
// CRIADO pelo formulário de Cadastro, ou tem seu STATUS ou COLABORADOR
// RESPONSÁVEL alterado no ClickUp. Cria ou atualiza o colaborador, a categoria
// e o item correspondente aqui no sistema — é assim que um equipamento
// cadastrado pelo formulário do ClickUp passa a aparecer sozinho em Estoque e
// Etiquetas, com o MESMO identificador usado na conferência mensal do ClickUp
// (nenhuma numeração paralela).
//
// Quem chama esta função é o Google Apps Script (função sincronizarItemNoSistema_
// em conferencia_inventario.gs) — não é o ClickUp diretamente, então não precisa
// da automação paga "Call a webhook" (Business+); é só uma chamada HTTP comum
// feita pelo script, igual às que ele já faz com a API do ClickUp.
//
// Deploy: supabase functions deploy clickup-sync-item
// Secret necessário (reaproveita o mesmo da clickup-webhook):
//   WEBHOOK_SHARED_SECRET     -> a mesma senha compartilhada já usada lá
//   SUPABASE_SERVICE_ROLE_KEY -> já existe automaticamente no ambiente da function
//   SUPABASE_URL              -> idem

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("secret") !== Deno.env.get("WEBHOOK_SHARED_SECRET")) {
      return new Response("Não autorizado", { status: 401 });
    }

    const body = await req.json();
    const {
      clickup_task_id,
      nome,
      categoria,
      marca_modelo,
      codigo,
      status, // "Em estoque" ou "Em uso" (já traduzido pelo Apps Script)
      colaborador_nome,
      colaborador_email,
    } = body;

    if (!clickup_task_id) {
      return new Response("clickup_task_id ausente no payload", { status: 400 });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ---------- Colaborador (encontra pelo e-mail, senão pelo nome, senão cria) ----------
    let colaboradorId: string | null = null;
    const nomeColaborador = (colaborador_nome || "").toString().trim();
    const emailColaborador = (colaborador_email || "").toString().trim().toLowerCase();

    if (nomeColaborador) {
      let colaborador: { id: string } | null = null;

      if (emailColaborador) {
        const { data } = await sb
          .from("colaboradores")
          .select("id")
          .ilike("email", emailColaborador)
          .maybeSingle();
        colaborador = data;
      }
      if (!colaborador) {
        const { data } = await sb
          .from("colaboradores")
          .select("id")
          .ilike("nome", nomeColaborador)
          .maybeSingle();
        colaborador = data;
      }
      if (!colaborador) {
        const { data, error } = await sb
          .from("colaboradores")
          .insert({ nome: nomeColaborador, email: emailColaborador || null })
          .select("id")
          .single();
        if (error) throw error;
        colaborador = data;
      }
      colaboradorId = colaborador.id;
    }

    // ---------- Categoria (encontra pelo nome, senão cria) ----------
    let categoriaId: string | null = null;
    const nomeCategoria = (categoria || "Outro").toString().trim() || "Outro";
    {
      const { data: existente } = await sb
        .from("categorias")
        .select("id")
        .ilike("nome", nomeCategoria)
        .maybeSingle();

      if (existente) {
        categoriaId = existente.id;
      } else {
        const { data: maxOrdem } = await sb
          .from("categorias")
          .select("ordem")
          .order("ordem", { ascending: false })
          .limit(1)
          .maybeSingle();
        const proximaOrdem = ((maxOrdem && maxOrdem.ordem) || 0) + 1;
        const { data: nova, error } = await sb
          .from("categorias")
          .insert({ nome: nomeCategoria, ordem: proximaOrdem })
          .select("id")
          .single();
        if (error) throw error;
        categoriaId = nova.id;
      }
    }

    // ---------- Item (upsert por clickup_task_id — nunca duplica) ----------
    const statusSistema = status === "Em uso" ? "Em uso" : "Em estoque";
    const codigoLimpo = (codigo || "").toString().trim();

    const patchItem: Record<string, unknown> = {
      nome: nome || nomeCategoria,
      categoria_id: categoriaId,
      marca_modelo: marca_modelo || null,
      status: statusSistema,
      colaborador_id: colaboradorId,
      clickup_task_id: String(clickup_task_id),
    };

    const { data: itemExistente } = await sb
      .from("itens")
      .select("id, codigo")
      .eq("clickup_task_id", String(clickup_task_id))
      .maybeSingle();

    let item;
    if (itemExistente) {
      const { data, error } = await sb
        .from("itens")
        .update(patchItem)
        .eq("id", itemExistente.id)
        .select()
        .single();
      if (error) throw error;
      item = data;
    } else {
      // Se o ClickUp já tem um identificador (ex.: GC-0001), usa ele como código
      // aqui também — assim a etiqueta impressa bate com o que será digitado na
      // conferência mensal do ClickUp. Se vier vazio, usa o gerador automático
      // do sistema (GCERT-000x).
      if (codigoLimpo) patchItem.codigo = codigoLimpo;
      const { data, error } = await sb
        .from("itens")
        .insert(patchItem)
        .select()
        .single();
      if (error) throw error;
      item = data;
    }

    return new Response(
      JSON.stringify({ ok: true, item_id: item.id, codigo: item.codigo }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(`Erro: ${err.message}`, { status: 500 });
  }
});
