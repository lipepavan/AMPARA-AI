-- AMPARA AI — rode este arquivo inteiro no Supabase (SQL Editor > New query > Run)
-- Se você rodou a versão anterior e NÃO tem dados reais nela, rode antes esta linha:
-- drop table if exists desbloqueios, contratacoes, cuidadores_contato, cuidadores cascade;

create table cuidadores(
  id uuid primary key,
  nome text not null, cidade text not null, esp text[] not null,
  exp int not null default 0, bio text, coren text,
  p_hora numeric, p_8 numeric, p_12 numeric, p_24 numeric,
  disponivel boolean not null default true,
  status text not null default 'ativo' check (status in ('ativo','pendente','verificado','reprovado')),
  certidao_em date default current_date,
  created_at timestamptz default now());
create table cuidadores_contato(
  cuidador_id uuid primary key references cuidadores(id) on delete cascade,
  tel text not null, email text not null,
  rua text, numero text, tipo_res text, apto text, bloco text, comprovante_tipo text);
-- Se já rodou a versão anterior COM dados reais, rode só estas 3 linhas e ignore o resto:
-- alter table contratacoes add column if not exists tel_familia text, add column if not exists confirmada boolean not null default false;
-- drop policy if exists "ver contato pago" on cuidadores_contato;

create table contratacoes(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cuidador_id uuid not null references cuidadores(id) on delete cascade,
  tipo text not null, assistido text not null, parentesco text,
  data date not null, hora time not null,
  modalidade text not null, qtd int not null default 1,
  valor numeric not null check (valor > 0),
  taxa numeric not null check (taxa >= 0),
  cidade text, endereco text, obs text, tel_familia text,
  pago boolean not null default false,
  confirmada boolean not null default false,
  created_at timestamptz default now());

alter table cuidadores enable row level security;
alter table cuidadores_contato enable row level security;
alter table contratacoes enable row level security;

-- Público vê cuidadores ativos/verificados, sem contato, endereço ou documentos
-- Cadastro com acesso imediato: perfil 'ativo' já aparece na busca. 'verificado' = selo opcional dado por você; 'reprovado' esconde o perfil.
create policy "ver ativos" on cuidadores for select using (status in ('ativo','verificado'));
create policy "cadastro livre" on cuidadores for insert with check (status='ativo');
create policy "enviar contato" on cuidadores_contato for insert with check (true);
-- Contato, endereço e documentos do cuidador: ninguém lê pelo site, só você, no painel
-- Cada família vê e cria só as suas contratações; "pago" e "confirmada" só são alterados por você, no painel
create policy "minhas contratacoes" on contratacoes for select using (user_id=auth.uid());
-- "disponivel"=false: o site mostra o aviso e o banco recusa novas contratações desse cuidador
create policy "criar contratacao" on contratacoes for insert with check (user_id=auth.uid() and pago=false and exists (select 1 from cuidadores c where c.id=contratacoes.cuidador_id and c.disponivel));

-- Documentos dos cuidadores: qualquer um envia, ninguém lê pelo site (só você, no painel)
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('docs','docs',false,5242880,array['image/jpeg','image/png','image/webp','image/heic','application/pdf']) on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
create policy "enviar documentos" on storage.objects for insert to anon, authenticated with check (bucket_id='docs');

-- Permissões das tabelas para o site (sem isso o Supabase responde "permission denied for table")
grant usage on schema public to anon, authenticated;
grant select, insert on public.cuidadores to anon, authenticated;
grant insert on public.cuidadores_contato to anon, authenticated;
grant select, insert on public.contratacoes to authenticated;
