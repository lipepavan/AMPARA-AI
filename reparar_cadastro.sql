-- AMPARA AI — reparo do cadastro de cuidadores (pode rodar mais de uma vez, não apaga dados)
-- Supabase > SQL Editor > New query > cole tudo > Run

-- 1) status e regra de cadastro com acesso imediato
alter table cuidadores drop constraint if exists cuidadores_status_check;
alter table cuidadores add constraint cuidadores_status_check check (status in ('ativo','pendente','verificado','reprovado'));
alter table cuidadores alter column status set default 'ativo';
update cuidadores set status='ativo' where status='pendente';

alter table cuidadores enable row level security;
alter table cuidadores_contato enable row level security;

drop policy if exists "ver verificados" on cuidadores;
drop policy if exists "ver ativos" on cuidadores;
drop policy if exists "cadastro livre" on cuidadores;
create policy "ver ativos" on cuidadores for select using (status in ('ativo','verificado'));
create policy "cadastro livre" on cuidadores for insert to anon, authenticated with check (status='ativo');

-- 2) contato do cuidador: qualquer um envia, ninguém lê pelo site
drop policy if exists "enviar contato" on cuidadores_contato;
create policy "enviar contato" on cuidadores_contato for insert to anon, authenticated with check (true);

-- 3) documentos: bucket privado + permissão de envio
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('docs','docs',false,5242880,array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "enviar documentos" on storage.objects;
create policy "enviar documentos" on storage.objects for insert to anon, authenticated with check (bucket_id='docs');
