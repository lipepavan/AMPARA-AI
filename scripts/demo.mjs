// Gera um HTML único de demonstração (dados fictícios, sem servidor): node scripts/demo.mjs [saida.html]
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(HERE, '..');
const out = process.argv[2] || path.join(root, 'dist-demo', 'ampara-demonstracao.html');
let h = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const hero = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(root, 'public/hero.jpg')).toString('base64');
const stub = fs.readFileSync(path.join(HERE, 'demo-stub.js'), 'utf8');
const ui = fs.readFileSync(path.join(HERE, 'demo-ui.html'), 'utf8');
const vars = { SUPABASE_URL: 'https://demo.supabase.co', SUPABASE_ANON_KEY: 'demo-chave-anon-ficticia-123456', PIX_KEY: '48900000000', PIX_NAME: 'DEMONSTRACAO', PIX_CITY: 'CRICIUMA', WHATSAPP: '5548900000000', FEE_RATE: '0.15', PAYMENT_LINK: '', CONTACT_EMAIL: '', FOOTER_CONTACT: '', SITE_URL: '' };
h = h.replace(/<link rel="canonical"[^>]*>\n?/, '').replace(/<meta property="og:(url|image)"[^>]*>\n?/g, '').replace(/<meta name="twitter:image"[^>]*>\n?/, '')
  .replace('content="index,follow"', 'content="noindex,nofollow"').replace(/<title>[^<]*<\/title>/, '<title>AMPARA AI — Demonstração</title>')
  .replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase[^>]*><\/script>/, '<script>' + stub + '</script>')
  .replace('<header>', '<div class="dm-tag">MODO DEMONSTRAÇÃO · dados fictícios · nada é enviado nem pago</div>\n<header>')
  .replace('</body>', ui + '\n</body>').replace('src="/hero.jpg"', 'src="' + hero + '"')
  .replace(/%%([A-Z_]+)%%/g, (m, k) => vars[k] ?? '');
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, h);
console.log('demo ok ->', out, (h.length / 1024).toFixed(0) + ' KB');
