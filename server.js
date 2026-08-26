import { createServer } from "http";
import { readFile, access } from "fs/promises";
import { join, extname, normalize } from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, "dist");
const port = process.env.PORT || 8080;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".txt": "text/plain",
  ".xml": "application/xml",
};

async function handler(req, res) {
  const url = req.url.split("?")[0];
  const safe = normalize(url).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(dist, safe);
  const ext = extname(filePath).toLowerCase();

  if (ext) {
    try {
      await access(filePath);
      const isAsset = url.startsWith("/assets/");
      res.writeHead(200, {
        "Content-Type": mime[ext] ?? "application/octet-stream",
        "Cache-Control": isAsset ? "public, max-age=31536000, immutable" : "no-cache",
      });
      res.end(await readFile(filePath));
      return;
    } catch {
      // fall through to SPA
    }
  }

  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-cache, no-store, must-revalidate",
  });
  res.end(await readFile(join(dist, "index.html")));
}

createServer(handler).listen(port, () => console.log(`Listening on port ${port}`));
