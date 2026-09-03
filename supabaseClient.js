// Preencha com os dados do SEU projeto Supabase (Project Settings > API).
// Essas duas chaves NÃO são secretas — foram feitas para rodar no navegador do jeito que
// este site funciona hoje (frontend estático). Quem protege os dados são as regras de RLS
// definidas em supabase/schema.sql, não o sigilo dessa chave.
const SUPABASE_URL = "https://cfksxzgzlczjotgfednk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_GlSoaSCSCfQQWgi60oM_aA_HW7n2-9q";

window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.SUPABASE_CONFIGURADO = SUPABASE_URL.indexOf("SEU-PROJETO") === -1 && SUPABASE_ANON_KEY.indexOf("SUA-CHAVE") === -1;
