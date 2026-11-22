// Servidor estático simples para pré-visualizar dist/ (porta 4173 ou PORT).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const dir = path.resolve(import.meta.dirname, '..', 'dist');
const port = Number(process.env.PORT) || 4173;
const types = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.txt': 'text/plain', '.xml': 'application/xml', '.svg': 'image/svg+xml' };
http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(dir, path.normalize(p));
  if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('404'); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(port, () => console.log(`preview em http://localhost:${port}`));
