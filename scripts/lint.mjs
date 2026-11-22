// Lint: extrai o JS inline do index.html, roda ESLint (regras de erro) e confere links/ids/placeholders.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import os from 'node:os';
const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let bad = 0; const fail = (m) => { console.error('✗ ' + m); bad++; };
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (!scripts.length) fail('nenhum <script> inline');
let code = scripts.join('\n').replace(/rate:Number\('%%FEE_RATE%%'\)/, "rate:Number('0.15')");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
fs.writeFileSync(path.join(tmp, 'app.js'), code);
fs.writeFileSync(path.join(tmp, 'eslint.config.mjs'), `export default [{files:['**/*.js'],languageOptions:{ecmaVersion:2022,sourceType:'script',globals:{document:'readonly',window:'readonly',location:'readonly',addEventListener:'readonly',navigator:'readonly',crypto:'readonly',supabase:'readonly',qrcode:'readonly',encodeURIComponent:'readonly',decodeURIComponent:'readonly',setTimeout:'readonly',console:'readonly'}},rules:{'no-undef':'error','no-unused-vars':['error',{args:'none',varsIgnorePattern:'^(hbusca|list|busca|ctrView|upd|calc|ctr|minhas|cuid|sp|ap|cad|ask|login|signup|forgot|senha|nsenha|acct|pixm|legal|mk|esc|home|render)$'}],'no-dupe-keys':'error','no-unreachable':'error','no-redeclare':'error','no-const-assign':'error','no-func-assign':'error','no-self-assign':'error','eqeqeq':['off']}}];`);
try { execFileSync('eslint', ['-c', path.join(tmp, 'eslint.config.mjs'), path.join(tmp, 'app.js')], { stdio: 'pipe', cwd: tmp }); console.log('✓ eslint (JS inline) sem erros'); }
catch (e) { fail('eslint:\n' + (e.stdout || e.stderr || e.message)); }
// ids duplicados dentro de um mesmo template/tela são verificados em runtime (e2e); aqui: handlers inline apontam para funções existentes
const fns = new Set([...code.matchAll(/(?:function\s+|const\s+)([A-Za-z0-9_$]+)/g)].map((m) => m[1]));
for (const m of html.matchAll(/\bon(?:click|submit|change|input)="(?:const b=this;)?\s*([A-Za-z0-9_$]+)\(/g)) if (!fns.has(m[1]) && !['$'].includes(m[1])) fail('handler inline sem função: ' + m[1]);
for (const m of code.matchAll(/\bon(?:click|submit|change|input)="\s*([A-Za-z0-9_$]+)\(/g)) if (!fns.has(m[1]) && m[1] !== '$') fail('handler (template) sem função: ' + m[1]);
// rotas: todo href="#x" precisa existir no render()
const routes = new Set(['inicio', 'buscar', 'cuidador', 'contrat', 'minhas', 'senha', 'termos', 'privacidade', '']);
for (const m of (html + code).matchAll(/href="#([a-z]*)/g)) if (!routes.has(m[1])) fail('rota desconhecida #' + m[1]);
// placeholders que não podem existir
for (const bad_ of [/COLE_AQUI/, /48999999999/, /5548999999999/, /lorem ipsum/i, /service_role/i]) if (bad_.test(html)) fail('placeholder/segredo no código: ' + bad_);
// todos os %%X%% são conhecidos pelo build
const known = fs.readFileSync(path.join(root, 'scripts/build.mjs'), 'utf8');
for (const m of new Set([...html.matchAll(/%%([A-Z_]+)%%/g)].map((x) => x[1]))) if (!known.includes(m)) fail('build não trata %%' + m + '%%');
// SEO mínimo
for (const [n, r] of [['title', /<title>[^<]{10,}/], ['meta description', /name="description" content="[^"]{50,}/], ['og:title', /property="og:title"/], ['og:description', /property="og:description"/], ['og:image', /property="og:image"/], ['canonical', /rel="canonical"/], ['lang pt-BR', /<html lang="pt-BR"/], ['viewport', /name="viewport"/]]) if (!r.test(html)) fail('SEO: falta ' + n);
const cbp = path.join(root, 'public/auth/callback.html');
if (!fs.existsSync(cbp)) fail('falta public/auth/callback.html');
else {
  const cb = fs.readFileSync(cbp, 'utf8');
  fs.writeFileSync(path.join(tmp, 'cb.js'), [...cb.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n'));
  try { execFileSync(process.execPath, ['--check', path.join(tmp, 'cb.js')], { stdio: 'pipe' }); console.log('✓ callback.html: sintaxe ok'); } catch (e) { fail('callback.html: erro de sintaxe\n' + e.stderr); }
  if (!/exchangeCodeForSession/.test(cb)) fail('callback.html não troca o code por sessão');
  if (!/auth\/callback/.test(html)) fail('index.html não aponta redirectTo para /auth/callback');
}
fs.rmSync(tmp, { recursive: true, force: true });
if (bad) { console.error(`\n${bad} problema(s)`); process.exit(1); }
console.log('✓ rotas, handlers, placeholders e SEO ok');
