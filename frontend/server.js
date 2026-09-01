const http = require("http");
const fs = require("fs");
const net = require("net");
const path = require("path");
const zlib = require("zlib");

const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3010);
const backendHost = process.env.CLASSIC_API_HOST || "127.0.0.1";
const backendPort = Number(process.env.CLASSIC_API_PORT || 4010);
const root = path.join(__dirname, "build");

const types = {
  ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8", ".map": "application/json; charset=utf-8",
};
const compressible = new Set([".html", ".js", ".css", ".json", ".svg", ".txt", ".map"]);
const gzipCache = new Map();

function isBackendPath(url = "") {
  // /webhook/ : chemin enregistré tel quel dans le dashboard SharePay
  // (Applications → Webhooks), sans préfixe /api — §wallet/webhook.ts.
  return url.startsWith("/api/") || url.startsWith("/ws/") || url.startsWith("/webhook/") || url.startsWith("/ops-classic-3010-b92f2835255d");
}

function proxyHttp(req, res) {
  const upstream = http.request({
    hostname: backendHost, port: backendPort, method: req.method, path: req.url,
    headers: { ...req.headers, host: `${backendHost}:${backendPort}` },
  }, (upstreamRes) => {
    res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
    upstreamRes.pipe(res);
  });
  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ message: "Service Classic temporairement indisponible" }));
  });
  req.pipe(upstream);
}

function sendFile(req, res, filePath, stat) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(500); res.end("Internal server error"); return; }
    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      "Content-Type": types[ext] || "application/octet-stream",
      "Cache-Control": filePath.includes(`${path.sep}static${path.sep}`) ? "public, max-age=31536000, immutable" : "no-cache",
      Vary: "Accept-Encoding",
    };
    if (compressible.has(ext) && /\bgzip\b/i.test(req.headers["accept-encoding"] || "") && data.length > 1024) {
      const cached = gzipCache.get(filePath);
      const body = cached?.mtimeMs === stat.mtimeMs ? cached.body : zlib.gzipSync(data, { level: 6 });
      gzipCache.set(filePath, { body, mtimeMs: stat.mtimeMs });
      res.writeHead(200, { ...headers, "Content-Encoding": "gzip", "Content-Length": body.length });
      res.end(body);
      return;
    }
    res.writeHead(200, { ...headers, "Content-Length": data.length });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (isBackendPath(req.url)) { proxyHttp(req, res); return; }
  // Ne jamais laisser un chemin de backoffice inconnu tomber sur la SPA :
  // cela ferait croire que le dashboard de l'autre édition existe ici.
  if ((req.url || "").startsWith("/ops-")) { res.writeHead(404); res.end("Not found"); return; }
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = path.join(root, safePath);
  if (!filePath.startsWith(root)) { res.writeHead(403); res.end("Forbidden"); return; }
  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) filePath = path.join(filePath, "index.html");
    fs.stat(filePath, (fileErr, fileStat) => {
      if (!fileErr && fileStat.isFile()) sendFile(req, res, filePath, fileStat);
      else {
        const indexPath = path.join(root, "index.html");
        fs.stat(indexPath, (indexError, indexStat) => {
          if (indexError) { res.writeHead(404); res.end("Not found"); }
          else sendFile(req, res, indexPath, indexStat);
        });
      }
    });
  });
});

server.on("upgrade", (req, socket, head) => {
  if (!isBackendPath(req.url)) { socket.destroy(); return; }
  const upstream = net.connect(backendPort, backendHost, () => {
    upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`);
    for (const [name, value] of Object.entries(req.headers)) {
      if (value !== undefined) upstream.write(`${name}: ${Array.isArray(value) ? value.join(", ") : value}\r\n`);
    }
    upstream.write("\r\n");
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

server.listen(port, host, () => console.log(`QuizArena Classic listening on http://${host}:${port}`));
