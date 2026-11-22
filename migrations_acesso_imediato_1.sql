-- AMPARA AI — migração: acesso imediato (sem aprovação manual)
-- Rode UMA vez no Supabase: SQL Editor > New query > Run. Seguro para banco que já tem dados.

alter table cuidadores drop constraint if exists cuidadores_status_check;
alter table cuidadores add constraint cuidadores_status_check check (status in ('ativo','pendente','verificado','reprovado'));
alter table cuidadores alter column status set default 'ativo';

-- libera quem já estava aguardando aprovação
update cuidadores set status='ativo' where status='pendente';

drop policy if exists "ver verificados" on cuidadores;
drop policy if exists "ver ativos" on cuidadores;
drop policy if exists "cadastro livre" on cuidadores;
create policy "ver ativos" on cuidadores for select using (status in ('ativo','verificado'));
create policy "cadastro livre" on cuidadores for insert with check (status='ativo');
