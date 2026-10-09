import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

const directory = resolve(process.argv[2] || 'site');
const port = Number(process.env.PORT || 4322);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    if (path === '/amy-studio') { response.writeHead(302, { Location: '/amy-studio/' }); response.end(); return; }
    if (path.startsWith('/amy-studio/')) path = path.slice('/amy-studio'.length);
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(directory, '.' + path);
    if (!file.startsWith(directory + sep)) { response.writeHead(403); response.end(); return; }
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': `${types[extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' });
    response.end(content);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Amy Studio preview: http://127.0.0.1:${port}/amy-studio/`));
