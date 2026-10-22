// Liefert den Ausgaben-Ordner nur lokal aus (127.0.0.1). Nach außen geht er über Tailscale Serve:
//   node src/serve.mjs <ausgaben-ordner> [port]     und einmalig:  tailscale serve --bg <port>
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, resolve, extname, sep } from 'node:path';

const WURZEL = resolve(process.argv[2] || 'dist');
const PORT = Number(process.argv[3] || process.env.PORT || 8043);
const TYP = {
  '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.css': 'text/css; charset=utf-8', '.ttf': 'font/ttf', '.woff2': 'font/woff2',
};

createServer((req, res) => {
  let pfad;
  try { pfad = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
  let datei = resolve(join(WURZEL, pfad));
  if (datei !== WURZEL && !datei.startsWith(WURZEL + sep)) { res.writeHead(403).end(); return; }   // nichts außerhalb des Ordners
  try { if (statSync(datei).isDirectory()) datei = join(datei, 'index.html'); statSync(datei); }
  catch { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Nicht gefunden'); return; }
  const ext = extname(datei).toLowerCase();
  const frisch = ['.html', '.json', '.js', '.webmanifest'].includes(ext);   // Ausgaben immer neu prüfen
  res.writeHead(200, { 'content-type': TYP[ext] || 'application/octet-stream', 'cache-control': frisch ? 'no-cache' : 'public, max-age=86400' });
  createReadStream(datei).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`Wochenblatt: http://127.0.0.1:${PORT}/  ←  ${WURZEL}`));
