-- AMPARA AI — aviso por e-mail a cada novo pedido de contratação
-- Supabase > SQL Editor > New snippet > cole tudo > Run. Pode rodar mais de uma vez.
--
-- ANTES: crie uma conta grátis em resend.com COM O E-MAIL QUE VAI RECEBER OS AVISOS e gere uma chave
-- (API Keys > Create API Key > "Sending access"). Sem domínio próprio, o Resend só entrega para o
-- e-mail da própria conta, o que serve para avisar você.
--
-- DEPOIS DE RODAR ESTE ARQUIVO, rode UMA vez estas 2 linhas, trocando os valores (não deixe a chave
-- salva no arquivo nem no git; apague o snippet no Supabase depois):
--   select vault.create_secret('re_COLE_A_CHAVE_AQUI', 'resend_api_key');
--   select vault.create_secret('seu-email@exemplo.com', 'aviso_email_destino');
-- Para trocar um valor depois: select vault.update_secret((select id from vault.secrets where name='resend_api_key'), 'nova_chave');

create extension if not exists pg_net with schema extensions;

create or replace function public.avisar_novo_pedido() returns trigger
language plpgsql security definer set search_path = '' as $$
declare k text; dest text; cuid text; reais text;
begin
  select decrypted_secret into k    from vault.decrypted_secrets where name = 'resend_api_key';
  select decrypted_secret into dest from vault.decrypted_secrets where name = 'aviso_email_destino';
  if k is null or dest is null then return new; end if;   -- ainda não configurado: não avisa, mas não atrapalha

  select nome into cuid from public.cuidadores where id = new.cuidador_id;
  reais := 'R$ ' || replace(to_char(new.taxa, 'FM999999990.00'), '.', ',');

  perform net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || k),
    body    := jsonb_build_object(
      'from',    'AMPARA AI <onboarding@resend.dev>',
      'to',      jsonb_build_array(dest),
      'subject', 'Novo pedido de cuidador: ' || coalesce(split_part(cuid, ' ', 1), ''),
      'text',    'Novo pedido na AMPARA AI' || E'\n\n'
                 || 'Pedido: ' || left(new.id::text, 8) || E'\n'
                 || 'Cuidador: ' || coalesce(cuid, '') || E'\n'
                 || 'Serviço: ' || new.tipo || ' (' || new.modalidade || ')' || E'\n'
                 || 'Data e hora: ' || to_char(new.data, 'DD/MM/YYYY') || ' ' || left(new.hora::text, 5) || E'\n'
                 || 'Taxa de intermediação: ' || reais || E'\n\n'
                 || 'Situação: aguardando o Pix. Detalhes e contato da família: Supabase > Table Editor > contratacoes.'
    ));
  return new;
exception when others then
  return new;   -- um problema no aviso nunca pode impedir a família de fazer o pedido
end $$;

revoke all on function public.avisar_novo_pedido() from public, anon, authenticated;

drop trigger if exists avisar_novo_pedido on public.contratacoes;
create trigger avisar_novo_pedido after insert on public.contratacoes
  for each row execute function public.avisar_novo_pedido();

-- Teste: depois de guardar a chave e o e-mail, rode  select public.testar_aviso_email();
create or replace function public.testar_aviso_email() returns bigint
language plpgsql security definer set search_path = '' as $$
declare k text; dest text;
begin
  select decrypted_secret into k    from vault.decrypted_secrets where name = 'resend_api_key';
  select decrypted_secret into dest from vault.decrypted_secrets where name = 'aviso_email_destino';
  if k is null or dest is null then raise exception 'Guarde antes a chave (resend_api_key) e o e-mail (aviso_email_destino) no vault.'; end if;
  return net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || k),
    body    := jsonb_build_object('from', 'AMPARA AI <onboarding@resend.dev>', 'to', jsonb_build_array(dest),
                                  'subject', 'Teste do aviso da AMPARA AI', 'text', 'Se você recebeu este e-mail, o aviso de novos pedidos está funcionando.'));
end $$;
revoke all on function public.testar_aviso_email() from public, anon, authenticated;

-- Para conferir se o envio deu certo (200 = enviado; 403 = e-mail diferente do da conta Resend; 401 = chave errada):
--   select created, status_code, left(content::text, 200) as resposta from net._http_response order by created desc limit 5;
