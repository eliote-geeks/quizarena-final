const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3011);
const root = path.join(__dirname, "build");

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg"
};

// Types worth compressing
const COMPRESSIBLE = new Set([".html", ".js", ".css", ".json", ".svg", ".txt", ".map"]);

// In-memory gzip cache keyed by absolute file path — invalidated when mtime changes
const gzipCache = new Map();
function getGzipped(filePath, buffer, mtimeMs) {
  const cached = gzipCache.get(filePath);
  if (cached && cached.mtimeMs === mtimeMs) return cached.buffer;
  const compressed = zlib.gzipSync(buffer, { level: 6 });
  gzipCache.set(filePath, { buffer: compressed, mtimeMs });
  return compressed;
}

function acceptsGzip(req) {
  const enc = req.headers["accept-encoding"] || "";
  return /\bgzip\b/i.test(enc);
}

function sendFile(req, res, filePath, stat) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Internal server error");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = types[ext] || "application/octet-stream";
    const isStatic =
      filePath.includes(`${path.sep}assets${path.sep}`) ||
      filePath.includes(`${path.sep}fonts${path.sep}`) ||
      filePath.includes(`${path.sep}audio${path.sep}`);
    const headers = {
      "Content-Type": type,
      "Cache-Control": isStatic
        ? "public, max-age=31536000, immutable"
        : "no-cache",
      "Vary": "Accept-Encoding",
    };

    if (COMPRESSIBLE.has(ext) && acceptsGzip(req) && data.length > 1024) {
      const gz = getGzipped(filePath, data, stat.mtimeMs);
      headers["Content-Encoding"] = "gzip";
      headers["Content-Length"] = gz.length;
      res.writeHead(200, headers);
      res.end(gz);
    } else {
      headers["Content-Length"] = data.length;
      res.writeHead(200, headers);
      res.end(data);
    }
  });
}

http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);

  // Les avatars sont générés par l'API Fastify. Le bundle les appelle avec
  // un chemin relatif : sans ce relais, le serveur SPA sert index.html à la
  // place de l'image et l'avatar apparaît cassé.
  if (urlPath.startsWith("/api/avatar/")) {
    const upstream = http.get(
      { host: "127.0.0.1", port: 4000, path: urlPath, headers: { Accept: req.headers.accept || "image/svg+xml" } },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode || 502, {
          "Content-Type": upstreamRes.headers["content-type"] || "image/svg+xml",
          "Cache-Control": "public, max-age=86400",
        });
        upstreamRes.pipe(res);
      },
    );
    upstream.on("error", () => {
      res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Avatar service unavailable");
    });
    return;
  }

  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = path.join(root, safePath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) filePath = path.join(filePath, "index.html");
    fs.stat(filePath, (fileErr, fileStat) => {
      if (!fileErr && fileStat.isFile()) {
        sendFile(req, res, filePath, fileStat);
      } else {
        const idx = path.join(root, "index.html");
        fs.stat(idx, (idxErr, idxStat) => {
          if (idxErr) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Not found");
          } else {
            sendFile(req, res, idx, idxStat);
          }
        });
      }
    });
  });
}).listen(port, host, () => {
  console.log(`QuizArena v2 listening on http://${host}:${port} (gzip enabled)`);
});
