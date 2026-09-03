-- =====================================================================
-- GCERT · Controle de Inventário — schema do banco (Supabase / Postgres)
-- Rode este arquivo inteiro em: Supabase > seu projeto > SQL Editor > New query > Run
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Categorias (seções do estoque: Computador, Mouse, Fone, Celular...)
-- ---------------------------------------------------------------------
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ordem int not null default 0
);

insert into categorias (nome, ordem) values
  ('Computador', 1),
  ('Notebook', 2),
  ('Monitor', 3),
  ('Teclado', 4),
  ('Mouse', 5),
  ('Fone / Headset', 6),
  ('Celular', 7),
  ('Carregador', 8),
  ('Tablet', 9),
  ('Impressora', 10),
  ('Outro', 99)
on conflict (nome) do nothing;

-- ---------------------------------------------------------------------
-- Colaboradores
-- ---------------------------------------------------------------------
create table if not exists colaboradores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text,
  setor text,
  status text not null default 'Ativo' check (status in ('Ativo','Inativo')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Itens (patrimônio)
-- ---------------------------------------------------------------------
create sequence if not exists itens_codigo_seq;

create table if not exists itens (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('GCERT-' || lpad(nextval('itens_codigo_seq')::text, 4, '0')),
  nome text not null,
  categoria_id uuid references categorias(id),
  marca_modelo text,
  numero_serie text,
  status text not null default 'Em estoque' check (status in ('Em estoque','Em uso','Manutenção','Baixado')),
  colaborador_id uuid references colaboradores(id) on delete set null,
  data_aquisicao date,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists itens_categoria_idx on itens(categoria_id);
create index if not exists itens_colaborador_idx on itens(colaborador_id);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists itens_set_updated_at on itens;
create trigger itens_set_updated_at before update on itens
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Conferências (ciclo mensal de auditoria do patrimônio)
-- origem = 'manual' (preenchido aqui no sistema) ou 'clickup' (fase 2: sincronizado do formulário do ClickUp)
-- ---------------------------------------------------------------------
create table if not exists conferencias (
  id uuid primary key default gen_random_uuid(),
  ciclo_mes date not null,
  item_id uuid not null references itens(id) on delete cascade,
  colaborador_id uuid references colaboradores(id) on delete set null,
  status text not null default 'Pendente' check (status in ('Pendente','Confirmado','Não localizado','Divergente')),
  condicao text,
  observacoes text,
  origem text not null default 'manual' check (origem in ('manual','clickup')),
  clickup_task_id text,
  respondido_em timestamptz,
  created_at timestamptz not null default now(),
  unique (ciclo_mes, item_id)
);

create index if not exists conferencias_ciclo_idx on conferencias(ciclo_mes);

-- ---------------------------------------------------------------------
-- Solicitações de cadastro (formulário público, sem login)
-- Qualquer pessoa com o link pode enviar; só a equipe autenticada consegue
-- LER e aprovar. Aprovar cria o colaborador de verdade e atribui os itens
-- (isso é feito pelo app, não aqui no banco) — essa tabela é só a "caixa de entrada".
-- ---------------------------------------------------------------------
create table if not exists solicitacoes_cadastro (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  setor text,
  dispositivos jsonb not null default '[]'::jsonb,
  status text not null default 'Pendente' check (status in ('Pendente','Aprovado','Rejeitado')),
  created_at timestamptz not null default now(),
  processado_em timestamptz
);

alter table solicitacoes_cadastro enable row level security;

drop policy if exists "solicitacoes: envio publico" on solicitacoes_cadastro;
create policy "solicitacoes: envio publico" on solicitacoes_cadastro
  for insert with check (true);
drop policy if exists "solicitacoes: gestao autenticada" on solicitacoes_cadastro;
create policy "solicitacoes: gestao autenticada" on solicitacoes_cadastro
  for select using (auth.role() = 'authenticated');
drop policy if exists "solicitacoes: atualizar autenticado" on solicitacoes_cadastro;
create policy "solicitacoes: atualizar autenticado" on solicitacoes_cadastro
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
-- View pública — é isso que a página do QR Code (item.html) lê, sem login.
-- Só expõe o essencial; nunca e-mail, valor de aquisição ou observações internas.
-- ---------------------------------------------------------------------
create or replace view itens_publicos as
select
  i.codigo,
  i.nome,
  c.nome as categoria,
  i.status,
  col.nome as colaborador_nome
from itens i
left join categorias c on c.id = i.categoria_id
left join colaboradores col on col.id = i.colaborador_id;

-- a view roda com o privilégio de quem a criou, não de quem consulta —
-- assim ela pode ler as tabelas protegidas por RLS e devolver só as colunas acima.
alter view itens_publicos set (security_invoker = off);

-- ---------------------------------------------------------------------
-- RLS — equipe autenticada (Supabase Auth) tem acesso total;
-- visitante anônimo só lê categorias e a view pública de itens.
-- ---------------------------------------------------------------------
alter table categorias enable row level security;
alter table colaboradores enable row level security;
alter table itens enable row level security;
alter table conferencias enable row level security;

drop policy if exists "categorias: leitura publica" on categorias;
create policy "categorias: leitura publica" on categorias
  for select using (true);
drop policy if exists "categorias: escrita autenticada" on categorias;
create policy "categorias: escrita autenticada" on categorias
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "colaboradores: acesso autenticado" on colaboradores;
create policy "colaboradores: acesso autenticado" on colaboradores
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "itens: acesso autenticado" on itens;
create policy "itens: acesso autenticado" on itens
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "conferencias: acesso autenticado" on conferencias;
create policy "conferencias: acesso autenticado" on conferencias
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select on itens_publicos to anon, authenticated;
grant select on categorias to anon, authenticated;
