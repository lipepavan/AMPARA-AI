# AMPARA AI — contexto do projeto (leia antes de qualquer tarefa)

Site brasileiro (pt-BR) de **intermediação entre famílias e cuidadores** de idosos/adultos. Não é app de agência e não emprega ninguém.

## Regras de negócio (já decididas pelo dono — não mude sem perguntar)
- O **cuidador se cadastra de graça**, sem taxa e sem comissão. Ele informa os próprios valores (por hora, diária 8h/12h/24h).
- A **família paga só a intermediação: 15% do valor negociado** com o cuidador (configurável em `CFG.rate`), via **Pix**, antes da intermediação.
- O **serviço é pago direto ao cuidador, depois de realizado.** A plataforma nunca recebe nem repassa esse valor.
- Após o Pix confirmado, a AMPARA AI faz a intermediação **em até 2 horas**: o dono chama o cuidador, e quando ele aceita marca `confirmada`.
- **O contato (telefone/e-mail/endereço) do cuidador NUNCA aparece no site.** Toda comunicação passa pela AMPARA AI.
- Cadastro do cuidador: dados pessoais, especialidades (enfermeiro(a), técnico em enfermagem, cuidador com curso, cuidador com experiência, acompanhante hospitalar, cuidados paliativos), COREN (se enfermeiro/técnico), endereço completo, **RG e comprovante de endereço obrigatórios; certidão de antecedentes OPCIONAL** (validade de 30 dias).
- **Acesso imediato (decidido pelo dono em 22/11/2026):** cuidador aparece na busca assim que se cadastra (`status='ativo'`). `verificado` é só um selo opcional que o dono concede após conferir documentos; `reprovado` esconde o perfil. Nunca exibir o selo "Verificado" para perfil `ativo`. **Não criar perfis de demonstração** no site real.
- Pix: chave tipo telefone do dono, gerada em BRCode estático (já implementado em `index.html`, funções `brcode`/`pixm`).

## Stack e estrutura
- Site estático em um arquivo: `index.html` (HTML/CSS/JS puro, rotas por hash `#inicio #buscar #cuidador #contrat/<id> #minhas #termos #privacidade`). Sem framework, sem dependências npm.
- Bibliotecas por CDN (versões fixas): `@supabase/supabase-js@2.45.4`, `qrcode-generator@1.4.4`. Se o CDN falhar, o site abre sem banco (funções desativadas).
- Backend: Supabase (Auth por link mágico, Postgres com RLS, Storage privado `docs`). `schema.sql` cria tudo.
- `scripts/build.mjs` injeta as variáveis no `index.html` (placeholders `%%NOME%%`) e gera `dist/`. **Nunca edite valores direto no index.html.**
- Hospedagem: Vercel (`vercel.json`: build, `dist`, cabeçalhos de segurança e CSP). `public/` = og.png, robots.txt, sitemap.xml.

## Login (callback)
- Login por link mágico com **PKCE**. O e-mail aponta para `/auth/callback?next=<rota>` (`public/auth/callback.html`), que troca o `?code=` por sessão (`exchangeCodeForSession`) e redireciona para `/#<rota>`. `next` só aceita rotas internas conhecidas (sem open redirect). Erro/link expirado mostra mensagem e link de volta.
- Precisa de `https://<site>/auth/callback` em Supabase > Authentication > Redirect URLs. O link deve ser aberto no mesmo navegador que o pediu (verificador PKCE fica no localStorage).

## Variáveis de ambiente (veja `.env.example`)
Obrigatórias: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PIX_KEY`, `WHATSAPP`, `SITE_URL`. Com padrão: `PIX_NAME`, `PIX_CITY`, `FEE_RATE`=0.15. Opcionais: `PAYMENT_LINK`, `CONTACT_EMAIL`. Build de produção (`VERCEL_ENV=production` ou `STRICT=1`) falha se faltar alguma obrigatória.

## Comandos
- `npm run lint` — ESLint no JS inline + rotas, handlers, placeholders e SEO
- `npm run build` — gera `dist/`
- `npm run preview` — serve `dist/` em http://localhost:4173
- `npm run check` — lint + build · `npm run deploy` — `vercel --prod`
- Banco: rodar `schema.sql` no SQL Editor do Supabase.

## Estado atual
- Auditado e testado ponta a ponta (Playwright, mobile 360px e desktop) com Supabase **simulado**; `schema.sql` validado em Postgres local. **Falta testar contra o Supabase real** com chaves reais.
- Operação manual: dono aprova cuidador (`status`), confere Pix e marca `pago`, chama o cuidador e marca `confirmada` (ver LEIA-ME.md).
- Termos/Privacidade são texto-base: precisam de revisão jurídica.

## Segurança (obrigatório)
- Chave `anon` pode ficar no front. **Chave `service_role` e segredos de pagamento NUNCA no front nem no git**: só em variáveis de ambiente / Edge Functions.
- Toda tabela com RLS ligado; revisar políticas a cada mudança. Documentos só por URL assinada, só para admin.
- LGPD: coletar o mínimo, consentimento no cadastro (já existe), publicar Termos e Privacidade.
- Escapar todo texto de usuário ao renderizar (função `esc`).

## Como trabalhar
- Português do Brasil em toda interface e mensagens. Mobile primeiro. Claro e escuro.
- Antes de dizer que algo funciona, **rode e teste** (Playwright) o fluxo ponta a ponta.
- Mudanças pequenas e commits claros. Pergunte antes de mudar regra de negócio.
