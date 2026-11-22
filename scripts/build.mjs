// Gera dist/ a partir de index.html + public/, injetando as variáveis de ambiente (.env ou ambiente da Vercel).
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const env = { ...readDotEnv(path.join(root, '.env')), ...process.env };
const prod = env.VERCEL_ENV === 'production' || env.STRICT === '1';

function readDotEnv(f) {
  if (!fs.existsSync(f)) return {};
  const o = {};
  for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return o;
}
const get = (k, d = '') => (env[k] ?? d).toString().trim();
const v = {
  SUPABASE_URL: get('SUPABASE_URL').replace(/\/+$/, ''),
  SUPABASE_ANON_KEY: get('SUPABASE_ANON_KEY'),
  PIX_KEY: get('PIX_KEY').replace(/\D/g, ''),
  PIX_NAME: get('PIX_NAME', 'AMPARA AI'),
  PIX_CITY: get('PIX_CITY', 'CRICIUMA'),
  WHATSAPP: get('WHATSAPP').replace(/\D/g, ''),
  SITE_URL: get('SITE_URL', env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + env.VERCEL_PROJECT_PRODUCTION_URL : '').replace(/\/+$/, ''),
  FEE_RATE: get('FEE_RATE', '0.15'),
  PAYMENT_LINK: get('PAYMENT_LINK'),
  CONTACT_EMAIL: get('CONTACT_EMAIL'),
};

const errs = [];
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(v.SUPABASE_URL)) errs.push('SUPABASE_URL (ex.: https://abc.supabase.co)');
if (v.SUPABASE_ANON_KEY.length < 20) errs.push('SUPABASE_ANON_KEY');
if (/service_role/i.test(JSON.stringify(decodeJwt(v.SUPABASE_ANON_KEY)))) {
  console.error('ERRO: SUPABASE_ANON_KEY é uma chave service_role. Use a chave anon/public.'); process.exit(1);
}
if (!/^\d{10,11}$/.test(v.PIX_KEY)) errs.push('PIX_KEY (celular com DDD, 10-11 dígitos)');
if (!/^55\d{10,11}$/.test(v.WHATSAPP)) errs.push('WHATSAPP (55 + DDD + número)');
if (!/^https:\/\/[^/]+$/.test(v.SITE_URL)) errs.push('SITE_URL (ex.: https://seusite.com.br)');
if (!(Number(v.FEE_RATE) > 0 && Number(v.FEE_RATE) < 1)) errs.push('FEE_RATE (0 a 1)');
if (v.PAYMENT_LINK && !/^https?:\/\//.test(v.PAYMENT_LINK)) errs.push('PAYMENT_LINK (precisa começar com https://)');

if (errs.length) {
  const msg = 'Variáveis ausentes/inválidas:\n - ' + errs.join('\n - ');
  if (prod) { console.error('ERRO (produção): ' + msg); process.exit(1); }
  console.warn('AVISO: ' + msg + '\n(o site sai com essas partes desativadas; em produção o build falha)');
}
function decodeJwt(t) { try { return JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()); } catch { return {}; } }

const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const js = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/</g, '\\x3c');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const contact = [v.CONTACT_EMAIL && ` · <a href="mailto:${attr(v.CONTACT_EMAIL)}">${attr(v.CONTACT_EMAIL)}</a>`, /^55\d{10,11}$/.test(v.WHATSAPP) && ` · <a href="https://wa.me/${v.WHATSAPP}" rel="noopener">WhatsApp</a>`].filter(Boolean).join('');
const map = {
  SITE_URL: attr(v.SITE_URL), FOOTER_CONTACT: contact,
  SUPABASE_URL: js(v.SUPABASE_URL), SUPABASE_ANON_KEY: js(v.SUPABASE_ANON_KEY), PIX_KEY: js(v.PIX_KEY),
  PIX_NAME: js(v.PIX_NAME), PIX_CITY: js(v.PIX_CITY), WHATSAPP: js(v.WHATSAPP),
  FEE_RATE: js(v.FEE_RATE), PAYMENT_LINK: js(v.PAYMENT_LINK), CONTACT_EMAIL: js(v.CONTACT_EMAIL),
};
html = html.replace(/%%([A-Z_]+)%%/g, (m, k) => { if (!(k in map)) throw new Error('placeholder desconhecido ' + m); return map[k]; });
if (!v.SITE_URL) html = html.replace(/<link rel="canonical"[^>]*>\n?/, '').replace(/<meta property="og:(url|image)"[^>]*>\n?/g, '').replace(/<meta name="twitter:image"[^>]*>\n?/, '');

const out = path.join(root, 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
fs.writeFileSync(path.join(out, 'index.html'), html);
const pub = path.join(root, 'public');
if (fs.existsSync(pub)) for (const f of fs.readdirSync(pub)) {
  let c = fs.readFileSync(path.join(pub, f));
  if (/\.(txt|xml)$/.test(f)) c = Buffer.from(c.toString().replace(/%%SITE_URL%%/g, v.SITE_URL || 'https://example.invalid'));
  fs.writeFileSync(path.join(out, f), c);
}
console.log(`build ok -> dist/ (${(html.length / 1024).toFixed(1)} KB)${errs.length ? ' [com avisos]' : ''}`);
