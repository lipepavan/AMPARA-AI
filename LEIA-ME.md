# AMPARA AI — site de intermediação (pronto para hospedar)

Arquivos: `index.html` (o site), `schema.sql` (banco), `scripts/` (build, lint, preview), `public/` (og.png, robots, sitemap).

**Como funciona:** o cuidador se cadastra de graça. A família escolhe um cuidador verificado, informa o serviço, o valor negociado e o seu WhatsApp, e paga **15% desse valor** à AMPARA AI via Pix. Em até 2 horas após o pagamento, a AMPARA AI faz a intermediação com o cuidador. O contato do cuidador **nunca** aparece no site. O serviço é pago direto ao cuidador, depois de realizado.

## 1. Banco de dados (grátis) — 10 min
1. Crie conta em supabase.com e um projeto novo.
2. SQL Editor > New query > cole o `schema.sql` > Run.
3. Settings > API: copie **Project URL** e a chave **anon public**.
4. Authentication > URL Configuration: em *Site URL* coloque o endereço final do site e, em *Redirect URLs*, adicione `https://SEU-SITE/auth/callback` (sem isso o link do e-mail não volta para o site).
5. Authentication > SMTP: configure um e-mail próprio (Resend, Brevo...). O envio padrão do Supabase tem limite baixo.

## 2. Configurar o site (variáveis de ambiente — não edite o index.html)
Copie `.env.example` para `.env` (local) ou cadastre as mesmas variáveis na Vercel (Settings > Environment Variables): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PIX_KEY` (celular com DDD, só números), `PIX_NAME`, `PIX_CITY`, `WHATSAPP` (55+DDD+número), `SITE_URL`, e opcionais `FEE_RATE` (0.15), `PAYMENT_LINK`, `CONTACT_EMAIL`. Em produção o build **falha** se algo obrigatório faltar.

## 3. Hospedar
`npm run build` gera a pasta `dist/` (é a que vai ao ar). Na Vercel o `vercel.json` já define build e cabeçalhos de segurança: `npm run deploy` (ou ligue o repositório no GitHub). Netlify/Cloudflare Pages: comando `npm run build`, pasta `dist`.

## 4. Operação (Supabase > Table Editor)
- **Novo cuidador:** tabela `cuidadores` (status `pendente`). Dados de contato em `cuidadores_contato`; documentos em Storage > `docs` > pasta com o id do cuidador (RG, comprovante e, se enviada, a certidão, que é opcional). Se estiver tudo certo, troque o status para `verificado`. Só então ele aparece no site.
- **Nova contratação:** tabela `contratacoes`. Ela traz o serviço, a data, o local, o valor negociado, a taxa e o WhatsApp da família (`tel_familia`).
- **Pix:** a família paga a taxa e envia o comprovante. Confira o recebimento e marque `pago = true`. A tela dela passa a mostrar "Em intermediação".
- **Intermediação (em até 2 horas):** chame o cuidador pelo WhatsApp dele com os dados do serviço. Quando ele aceitar, avise a família e marque `confirmada = true`. Os dois se falam sempre por você; nenhum contato é divulgado.
- **Pagamento do serviço:** a família paga o cuidador direto, depois de realizado. A AMPARA AI não recebe esse valor.
- O valor negociado é informado pela família (já vem preenchido com a tabela do cuidador). Confira com o cuidador quando achar necessário.

## 5. Antes de divulgar
- As páginas `#termos` e `#privacidade` já existem, mas são texto-base: peça revisão a um advogado (LGPD).
- Regularização fiscal da atividade (MEI/CNPJ e nota fiscal) com o seu contador.
- Ainda não existem pelo site: avaliação por estrelas, renovação de certidão pelo cuidador e pagamento automático.
