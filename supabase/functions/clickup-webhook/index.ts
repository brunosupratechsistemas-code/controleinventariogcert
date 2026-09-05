// Edge Function: recebe o webhook da Automação do ClickUp quando o formulário
// mensal de conferência é preenchido, compara os códigos informados com o que
// está registrado no sistema, e grava o resultado direto na tabela `conferencias`.
//
// Deploy: supabase functions deploy clickup-webhook
// Secrets necessários (supabase secrets set NOME=valor):
//   CLICKUP_API_TOKEN        -> token pessoal do ClickUp (Settings > Apps)
//   WEBHOOK_SHARED_SECRET    -> uma senha aleatória sua, só pra validar que a
//                                chamada realmente veio da automação do ClickUp
//   SUPABASE_SERVICE_ROLE_KEY -> já existe automaticamente no ambiente da function
//   SUPABASE_URL              -> idem
//
// Nomes dos campos customizados esperados no ClickUp (ajuste aqui se usar outros nomes):
const CAMPO_EMAIL = "E-mail do colaborador";
const CAMPO_CODIGOS = "Códigos dos equipamentos que você tem";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function mesAtualISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function extrairCodigos(texto: string): string[] {
  return texto
    .split(/[\n,;]+/)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
}

async function buscarTaskDoClickUp(taskId: string, token: string) {
  const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
    headers: { Authorization: token },
  });
  if (!res.ok) throw new Error(`ClickUp API retornou ${res.status}`);
  return res.json();
}

function valorDoCampo(customFields: any[], nomeCampo: string): string {
  const campo = (customFields || []).find(
    (f: any) => (f.name || "").trim().toLowerCase() === nomeCampo.toLowerCase()
  );
  if (!campo) return "";
  // campos de texto do ClickUp trazem o valor direto em `value`
  return (campo.value || "").toString();
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("secret") !== Deno.env.get("WEBHOOK_SHARED_SECRET")) {
      return new Response("Não autorizado", { status: 401 });
    }

    const body = await req.json();
    // aceita tanto o payload padrão do webhook nativo (event/task_id) quanto
    // um payload customizado de "Automation > Call a webhook" com {task_id: ...}
    const taskId = body.task_id || body.taskId || body.id || body?.task?.id;
    if (!taskId) return new Response("task_id ausente no payload", { status: 400 });

    const clickupToken = Deno.env.get("CLICKUP_API_TOKEN")!;
    const task = await buscarTaskDoClickUp(taskId, clickupToken);

    const email = valorDoCampo(task.custom_fields, CAMPO_EMAIL).trim().toLowerCase();
    const codigosTexto = valorDoCampo(task.custom_fields, CAMPO_CODIGOS);
    const codigosInformados = extrairCodigos(codigosTexto);

    if (!email) return new Response("E-mail não preenchido na task", { status: 200 });

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: colaborador } = await sb
      .from("colaboradores")
      .select("id, nome, email")
      .ilike("email", email)
      .maybeSingle();

    if (!colaborador) {
      return new Response(
        `Nenhum colaborador encontrado com o e-mail ${email}. Cadastre o e-mail dele no sistema e reenvie.`,
        { status: 200 }
      );
    }

    const { data: itensDoColaborador } = await sb
      .from("itens")
      .select("id, codigo")
      .eq("colaborador_id", colaborador.id)
      .eq("status", "Em uso");

    const cicloMes = mesAtualISO();
    const linhas: any[] = [];

    // itens que ele TEM no sistema
    for (const item of itensDoColaborador || []) {
      const confirmou = codigosInformados.includes(item.codigo.toUpperCase());
      linhas.push({
        ciclo_mes: cicloMes,
        item_id: item.id,
        colaborador_id: colaborador.id,
        status: confirmou ? "Confirmado" : "Não localizado",
        origem: "clickup",
        clickup_task_id: String(taskId),
        respondido_em: new Date().toISOString(),
      });
    }

    // códigos que ele informou mas que NÃO estão atribuídos a ele no sistema
    const codigosEsperados = new Set((itensDoColaborador || []).map((i) => i.codigo.toUpperCase()));
    const codigosDivergentes = codigosInformados.filter((c) => !codigosEsperados.has(c));
    if (codigosDivergentes.length > 0) {
      const { data: itensDivergentes } = await sb
        .from("itens")
        .select("id, codigo")
        .in("codigo", codigosDivergentes);
      for (const item of itensDivergentes || []) {
        linhas.push({
          ciclo_mes: cicloMes,
          item_id: item.id,
          colaborador_id: colaborador.id,
          status: "Divergente",
          observacoes: `Informado por ${colaborador.nome}, mas está registrado com outro responsável ou sem responsável no sistema.`,
          origem: "clickup",
          clickup_task_id: String(taskId),
          respondido_em: new Date().toISOString(),
        });
      }
    }

    if (linhas.length > 0) {
      await sb.from("conferencias").upsert(linhas, { onConflict: "ciclo_mes,item_id" });
    }

    return new Response(
      JSON.stringify({ ok: true, colaborador: colaborador.nome, registros: linhas.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(`Erro: ${err.message}`, { status: 500 });
  }
});
