'use strict';
/**
 * Мини-сервер для сайтов «статика + функции в api/», которые раньше работали на Vercel
 * (atlantia-olympiads-kz, fibonacci-olympiads-kz). Без зависимостей, только Node.js 18+.
 *
 *  - раздаёт файлы из ROOT (по умолчанию /app), закрывая служебные (api, test, docs, scripts, package.json,
 *    vercel.json, *.csv, *.md, dotfiles кроме .well-known и всё, что перечислено в .vercelignore);
 *  - /api/<имя> запускает api/<имя>.js как функцию Vercel (req.body, req.query, res.status().json());
 *  - повторяет из vercel.json: cleanUrls, headers (с регулярными source) и redirects с условием по host;
 *  - /__health — для проверки контейнера.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(process.env.ROOT || '/app');
const PORT = Number(process.env.PORT) || 3000;
const MAX_BODY = 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.pdf': 'application/pdf', '.webmanifest': 'application/manifest+json', '.map': 'application/json',
};

/* ── vercel.json ─────────────────────────────────────────────────────────── */
function loadConfig(root) {
  let v = {};
  try { v = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')); } catch { /* нет файла — значения по умолчанию */ }
  const re = (s) => { try { return new RegExp('^' + s + '$'); } catch { return null; } };
  return {
    cleanUrls: v.cleanUrls !== false,
    headers: (v.headers || []).map(h => ({ re: re(h.source), headers: h.headers || [] })).filter(h => h.re),
    redirects: (v.redirects || []).map(r => ({
      re: re(r.source), has: r.has || [], destination: r.destination, status: r.permanent ? 308 : (r.statusCode || 307),
    })).filter(r => r.re),
  };
}

/* ── что нельзя отдавать как файл ────────────────────────────────────────── */
const ALWAYS_DENY = new Set(['api', 'test', 'tests', 'docs', 'scripts', 'node_modules', '.git', '.azhost', '.claude',
  'package.json', 'package-lock.json', 'vercel.json', '.vercelignore', '.gitignore', 'dockerfile', 'docker.env',
  'compose.yaml', 'readme.md', 'unslop.md', 'claude.md', 'agents.md']);
const DENY_EXT = new Set(['.md', '.csv', '.docx', '.doc', '.env', '.yaml', '.yml', '.log', '.sh', '.map']);

function isDenied(rel) {
  const parts = rel.split('/').filter(Boolean);
  if (!parts.length) return false;
  if (parts.some(p => p.startsWith('.') && p !== '.well-known')) return true;
  if (ALWAYS_DENY.has(parts[0].toLowerCase())) return true;
  if (parts.length === 1 && DENY_EXT.has(path.extname(parts[0]).toLowerCase()) && !parts[0].toLowerCase().endsWith('.xml')) return true;
  if (parts.length > 1 && DENY_EXT.has(path.extname(parts[parts.length - 1]).toLowerCase()) && ['.env', '.sh', '.log'].includes(path.extname(parts[parts.length - 1]).toLowerCase())) return true;
  return false;
}

/* ── req/res в стиле Vercel ──────────────────────────────────────────────── */
function wrapRes(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return res;
  };
  res.send = (body) => {
    if (body !== null && typeof body === 'object' && !Buffer.isBuffer(body)) return res.json(body);
    res.end(body);
    return res;
  };
  res.redirect = (code, url) => {
    if (typeof code === 'string') { url = code; code = 307; }
    res.statusCode = code; res.setHeader('Location', url); res.end();
    return res;
  };
  return res;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('too large'), { code: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseBody(req, raw) {
  const type = String(req.headers['content-type'] || '').toLowerCase();
  if (!raw) return undefined;
  if (type.startsWith('application/json')) { try { return JSON.parse(raw); } catch { return raw; } }
  if (type.startsWith('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(raw));
  return raw;
}

/* ── сервер ──────────────────────────────────────────────────────────────── */
function createServer(root = ROOT) {
  const cfg = loadConfig(root);
  const fnCache = new Map();

  const applyHeaders = (res, pathname) => {
    for (const h of cfg.headers) {
      if (h.re.test(pathname)) for (const { key, value } of h.headers) res.setHeader(key, value);
    }
  };
  const hostOf = (req) => String(req.headers.host || '').split(':')[0].toLowerCase();

  function redirectFor(req, pathname, search) {
    const host = hostOf(req);
    for (const r of cfg.redirects) {
      const m = r.re.exec(pathname);
      if (!m) continue;
      const ok = r.has.every(c => c.type !== 'host' || new RegExp('^' + c.value + '$', 'i').test(host));
      if (!ok) continue;
      const dest = r.destination.replace(/\$(\d+)/g, (_, i) => m[Number(i)] || '').replace(/:(\w+)/g, (s, n) => (m.groups && m.groups[n]) || s);
      return { status: r.status, location: dest + (dest.includes('?') ? '' : search) };
    }
    return null;
  }

  function resolveFile(pathname) {
    let rel;
    try { rel = decodeURIComponent(pathname); } catch { return null; }
    if (rel.includes('\0')) return null;
    rel = path.posix.normalize(rel);
    if (!rel.startsWith('/')) return null;
    if (isDenied(rel)) return null;
    const abs = path.join(root, rel);
    if (abs !== root && !abs.startsWith(root + path.sep)) return null;
    const candidates = rel === '/' ? ['index.html'] : [abs.slice(root.length + 1), abs.slice(root.length + 1) + '.html', path.join(abs.slice(root.length + 1), 'index.html')];
    for (const c of candidates) {
      const f = path.join(root, c);
      try { if (fs.statSync(f).isFile()) return { file: f, rel: '/' + c.split(path.sep).join('/') }; } catch { /* дальше */ }
    }
    return null;
  }

  function loadFn(name) {
    if (!/^[A-Za-z0-9-]+$/.test(name)) return null;
    const f = path.join(root, 'api', name + '.js');
    if (!fs.existsSync(f)) return null;
    if (!fnCache.has(f)) { const m = require(f); fnCache.set(f, m.default || m); }
    return fnCache.get(f);
  }

  return http.createServer(async (rawReq, rawRes) => {
    const req = rawReq; const res = wrapRes(rawRes);
    try {
      const url = new URL(req.url, 'http://x');
      let pathname = url.pathname;

      if (pathname === '/__health') return res.status(200).json({ ok: true });

      const redir = redirectFor(req, pathname, url.search);
      if (redir) { res.statusCode = redir.status; res.setHeader('Location', redir.location); return res.end(); }

      applyHeaders(res, pathname);

      // функции: /api/<имя>
      const fm = /^\/api\/([^/]+)\/?$/.exec(pathname);
      if (fm) {
        const fn = fm[1].startsWith('_') ? null : loadFn(fm[1]);
        if (!fn) return res.status(404).json({ ok: false, error: 'not_found' });
        req.query = Object.fromEntries(url.searchParams);
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
          try { req.body = parseBody(req, await readBody(req)); } catch (e) { return res.status(e.code === 413 ? 413 : 400).json({ ok: false, error: 'bad_request' }); }
        }
        return await fn(req, res);
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); return res.status(405).end(); }

      // cleanUrls: /oferta.html → /oferta
      if (cfg.cleanUrls && /\.html$/.test(pathname) && pathname !== '/index.html' && resolveFile(pathname)) {
        res.statusCode = 308; res.setHeader('Location', pathname.replace(/\.html$/, '') + url.search); return res.end();
      }
      if (pathname === '/index.html') { res.statusCode = 308; res.setHeader('Location', '/' + url.search); return res.end(); }
      if (pathname.length > 1 && pathname.endsWith('/')) { res.statusCode = 308; res.setHeader('Location', pathname.replace(/\/+$/, '') + url.search); return res.end(); }

      const hit = resolveFile(pathname);
      if (!hit) {
        const nf = path.join(root, '404.html');
        res.statusCode = 404;
        if (fs.existsSync(nf)) { res.setHeader('Content-Type', MIME['.html']); return res.end(fs.readFileSync(nf)); }
        res.setHeader('Content-Type', MIME['.txt']);
        return res.end('Not found');
      }
      const st = fs.statSync(hit.file);
      res.setHeader('Content-Type', MIME[path.extname(hit.file).toLowerCase()] || 'application/octet-stream');
      res.setHeader('Content-Length', st.size);
      res.setHeader('Last-Modified', st.mtime.toUTCString());
      if (!res.getHeader('Cache-Control')) res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(hit.file).on('error', () => res.destroy()).pipe(res);
    } catch (e) {
      console.error(JSON.stringify({ level: 'error', msg: 'server error', reason: String(e && e.message || e).slice(0, 200) }));
      if (!res.headersSent) res.status(500).json({ ok: false, error: 'internal' }); else res.destroy();
    }
  });
}

module.exports = { createServer, isDenied, loadConfig };

if (require.main === module) {
  createServer().listen(PORT, '0.0.0.0', () => console.log(`static-fn: ${ROOT} on :${PORT}`));
}
