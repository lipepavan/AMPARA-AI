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
- **Cuidador indisponível:** coluna `cuidadores.disponivel` (padrão true). Com `false` o site mostra a tag e o aviso "Indisponível no momento", troca o botão por um desativado, e o banco recusa nova contratação (policy `criar contratacao`). O dono troca no Table Editor. `migrations_indisponivel.sql` aplica isso (idempotente); sem a coluna o site continua funcionando, todos aparecem como disponíveis.
- **Agenda do cuidador (decidido pelo dono em 24/11/2026):** quando o dono marca um pedido como `confirmada`, o cuidador fica ocupado só naquele dia e horário (início = data+hora; duração = qtd horas, ou 8/12/24 h na diária). O site mostra "Agenda deste cuidador" na tela de contratar e barra horário conflitante; o banco também (policy `criar contratacao` + funções `cuidador_ocupado`/`agenda_cuidador`). A família só cria pedido com `pago=false` e `confirmada=false`. Trigger impede o dono de confirmar dois pedidos sobrepostos. `migrations_agenda.sql` (idempotente) aplica isso.
- **Aviso de novo pedido por e-mail:** `aviso_email.sql` cria um trigger em `contratacoes` que manda e-mail ao dono via Resend (pg_net). Chave e e-mail ficam no Vault do Supabase (`resend_api_key`, `aviso_email_destino`), nunca no código. Falha no aviso nunca bloqueia o pedido. Contato da família não vai no e-mail.
- Pix: chave tipo telefone do dono, gerada em BRCode estático (já implementado em `index.html`, funções `brcode`/`pixm`).

## Stack e estrutura
- Site estático em um arquivo: `index.html` (HTML/CSS/JS puro, rotas por hash `#inicio #buscar #cuidador #contrat/<id> #minhas #termos #privacidade`). Sem framework, sem dependências npm.
- Bibliotecas por CDN (versões fixas): `@supabase/supabase-js@2.45.4`, `qrcode-generator@1.4.4`. Se o CDN falhar, o site abre sem banco (funções desativadas).
- Backend: Supabase (Auth por link mágico, Postgres com RLS, Storage privado `docs`). `schema.sql` cria tudo.
- `scripts/build.mjs` injeta as variáveis no `index.html` (placeholders `%%NOME%%`) e gera `dist/`. **Nunca edite valores direto no index.html.**
- Hospedagem: Vercel (`vercel.json`: build, `dist`, cabeçalhos de segurança e CSP). `public/` = og.png, robots.txt, sitemap.xml.

## Login
- **E-mail + senha, acesso imediato** (decisão do dono, 22/11/2026): `signUp`/`signInWithPassword` no modal `ask()`. Sem link de confirmação: exige **Confirm email = OFF** no Supabase (Authentication > Sign In / Providers > Email).
- "Esqueci minha senha": `resetPasswordForEmail` com `redirectTo=/auth/callback?next=senha`. `public/auth/callback.html` troca o `?code=` (PKCE) por sessão e vai para `/#senha`, onde o usuário define a nova senha. `next` só aceita rotas internas conhecidas.
- **E-mail de recuperação de senha:** quem envia é o Supabase. O serviço padrão dele só entrega para e-mails da equipe do projeto e limita a 2 e-mails por hora (não serve para produção). Para clientes reais, configurar **SMTP próprio** em Supabase > Authentication > Emails > SMTP Settings (com SMTP próprio o limite inicial é 30/h e pode ser aumentado em Rate Limits). O site mostra a causa do erro e espera 1 min entre pedidos.
- Precisa de `https://<site>/auth/callback` em Supabase > Authentication > Redirect URLs, e do domínio de produção estável (não URL de deploy) em Site URL.
- Vercel: **Deployment Protection / Vercel Authentication desligada** para o site público, senão visitantes caem no login da Vercel.

## Visual
- Paleta azul (combina com `public/hero.jpg`, a foto do topo da home, e `public/og.jpg` para compartilhamento). Variáveis CSS em `:root` (claro/escuro). Botões grandes (`.btn`, altura mínima 52px); `.btn.alt` = contorno.
- Home: hero em `#heroslot` (fora do `<main>`). ≥1200px a caixa de busca fica sobre a imagem (proporção 16:9, sem cortar a faixa inferior); abaixo disso a imagem fica em cima e o cartão embaixo.

## Formulários
- Valores em R$ usam máscara (`moeda`/`val`: digita-se só números, aparece `R$ 1.234,56`). Percentual da taxa não aparece na tela (só em Termos); o valor da taxa em R$ aparece antes do Pix.
- Cadastro do cuidador em etapas (perfil, contato, documentos) com retomada e mensagem de erro com a etapa e o motivo. `reparar_cadastro.sql` reaplica as regras do banco (idempotente).

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
