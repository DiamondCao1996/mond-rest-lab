import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.dirname(fileURLToPath(import.meta.url));
const allowed = new Set(['index.html','app.js','core.js','styles.css','favicon.svg','experiment.html','experiment.js','experiment-core.js','experiment.css']);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml' };
http.createServer(async (req,res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  const name = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!allowed.has(name)) { res.writeHead(404); res.end('Not found'); return; }
  try { const data = await readFile(path.join(root,name)); res.writeHead(200, {'Content-Type':types[path.extname(name)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(data); }
  catch { res.writeHead(500); res.end('Unable to read page'); }
}).listen(4173,'127.0.0.1',() => console.log('MOND Rest Lab: http://127.0.0.1:4173'));
