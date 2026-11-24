-- AMPARA AI — cuidador indisponível automaticamente no horário em que já tem serviço confirmado
-- Supabase > SQL Editor > New snippet > cole tudo > Run. Pode rodar mais de uma vez, não apaga dados.
--
-- Regra: quando você marca um pedido como "confirmada", aquele cuidador fica ocupado só naquele dia e horário
-- (início + duração: por hora = quantidade de horas; diária = 8, 12 ou 24 horas). Em outros horários continua livre.

alter table public.cuidadores add column if not exists disponivel boolean not null default true;

-- fim do serviço (início = data + hora)
create or replace function public.contrat_fim(d date, h time, m text, q int) returns timestamp
language sql immutable set search_path = '' as $$
  select (d + h) + make_interval(hours => case m when '8' then 8 when '12' then 12 when '24' then 24 else greatest(coalesce(q, 1), 1) end)
$$;

-- o cuidador já tem serviço confirmado que se sobrepõe a este horário? (enxerga pedidos de todas as famílias, por isso security definer)
create or replace function public.cuidador_ocupado(cid uuid, d date, h time, m text, q int) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.contratacoes k
    where k.cuidador_id = cid and k.confirmada
      and (d + h) < public.contrat_fim(k.data, k.hora, k.modalidade, k.qtd)
      and (k.data + k.hora) < public.contrat_fim(d, h, m, q))
$$;

-- agenda que o site mostra: só início e fim dos serviços confirmados que ainda não terminaram. Nenhum dado de família.
create or replace function public.agenda_cuidador(cid uuid) returns table(inicio timestamp, fim timestamp)
language sql stable security definer set search_path = '' as $$
  select k.data + k.hora, public.contrat_fim(k.data, k.hora, k.modalidade, k.qtd)
  from public.contratacoes k
  where k.cuidador_id = cid and k.confirmada
    and public.contrat_fim(k.data, k.hora, k.modalidade, k.qtd) > (now() at time zone 'America/Sao_Paulo')
  order by 1 limit 20
$$;

revoke all on function public.contrat_fim(date, time, text, int) from public, anon, authenticated;
revoke all on function public.cuidador_ocupado(uuid, date, time, text, int) from public, anon, authenticated;
revoke all on function public.agenda_cuidador(uuid) from public, anon, authenticated;
grant execute on function public.cuidador_ocupado(uuid, date, time, text, int) to authenticated;
grant execute on function public.agenda_cuidador(uuid) to authenticated;

-- Família só cria pedido novo (nunca já pago nem já confirmado), de cuidador disponível e livre naquele horário
drop policy if exists "criar contratacao" on public.contratacoes;
create policy "criar contratacao" on public.contratacoes for insert
  with check (
    user_id = auth.uid() and pago = false and confirmada = false
    and exists (select 1 from public.cuidadores c where c.id = contratacoes.cuidador_id and c.disponivel)
    and not public.cuidador_ocupado(cuidador_id, data, hora, modalidade, qtd)
  );

-- Você também não consegue confirmar dois pedidos que se sobrepõem para o mesmo cuidador
create or replace function public.barrar_conflito_confirmada() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.confirmada and exists (
    select 1 from public.contratacoes k
    where k.cuidador_id = new.cuidador_id and k.confirmada and k.id <> new.id
      and (new.data + new.hora) < public.contrat_fim(k.data, k.hora, k.modalidade, k.qtd)
      and (k.data + k.hora) < public.contrat_fim(new.data, new.hora, new.modalidade, new.qtd))
  then
    raise exception 'Este cuidador já tem outro serviço confirmado nesse horário.';
  end if;
  return new;
end $$;
revoke all on function public.barrar_conflito_confirmada() from public, anon, authenticated;
drop trigger if exists barrar_conflito_confirmada on public.contratacoes;
create trigger barrar_conflito_confirmada before insert or update of confirmada, data, hora, modalidade, qtd
  on public.contratacoes for each row execute function public.barrar_conflito_confirmada();
