import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const port = Number(process.env.PORT) || 4173;
// Local only by default. Set HOST=0.0.0.0 to make the server reachable from other machines.
const host = process.env.HOST || '127.0.0.1';
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
    return;
  }

  // Work on the raw request target: new URL() would silently resolve "/%2e%2e/" and hide the traversal attempt.
  const rawPath = request.url.split(/[?#]/)[0];
  let pathname;
  try {
    pathname = decodeURIComponent(rawPath);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }
  if (!pathname.startsWith('/') || pathname.includes('\0') || pathname.includes('\\') || pathname.includes(':')) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  const segments = pathname.split('/').filter(Boolean);
  if (segments.includes('..')) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  if (segments.some((segment) => segment.startsWith('.'))) {
    response.writeHead(404).end('Not found');
    return;
  }

  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filename = resolve(root, `.${requestedPath}`);
  if (filename !== root && !filename.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const body = await readFile(filename);
    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(filename).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    const missing = error.code === 'ENOENT' || error.code === 'EISDIR' || error.code === 'ENOTDIR';
    response.writeHead(missing ? 404 : 500).end(missing ? 'Not found' : 'Server error');
  }
});

server.listen(port, host, () => {
  console.log(`SupeRR Selector dashboard: http://${host}:${port}`);
  if (host === '0.0.0.0' || host === '::') console.log('HOST is set to all interfaces: other machines on the network can open this server.');
});