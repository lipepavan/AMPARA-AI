-- AMPARA AI — aviso de cuidador indisponível (pode rodar mais de uma vez, não apaga dados)
-- Supabase > SQL Editor > New snippet > cole tudo > Run
--
-- Para marcar um cuidador como indisponível:  Table Editor > cuidadores > coluna "disponivel" = false
-- Para voltar a aceitar contratações:         "disponivel" = true

alter table public.cuidadores add column if not exists disponivel boolean not null default true;

-- O banco também barra a contratação de quem está indisponível (não só o site)
drop policy if exists "criar contratacao" on public.contratacoes;
create policy "criar contratacao" on public.contratacoes for insert
  with check (
    user_id = auth.uid() and pago = false
    and exists (select 1 from public.cuidadores c where c.id = contratacoes.cuidador_id and c.disponivel)
  );
