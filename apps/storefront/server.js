const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 8080);
const PUBLIC_DIR = path.join(__dirname, "public");
const API_URL = String(
  process.env.API_URL ||
  "https://mercadia-back-production.up.railway.app/api"
).replace(/\/$/, "");
const BACKEND_ORIGIN = API_URL.replace(/\/api$/, "");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp"
};

function send(res, status, body, contentType){
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-cache"
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, "http://localhost");

  if(requestUrl.pathname === "/healthz"){
    return send(
      res,
      200,
      JSON.stringify({ success: true }),
      mimeTypes[".json"]
    );
  }

  if(requestUrl.pathname === "/config.js"){
    return send(
      res,
      200,
      `window.MERCADIA_CONFIG=${JSON.stringify({
        API_URL,
        BACKEND_ORIGIN
      })};`,
      mimeTypes[".js"]
    );
  }

  const pathname = requestUrl.pathname === "/"
    ? "/index.html"
    : requestUrl.pathname;
  const relativePath = decodeURIComponent(pathname).replace(/^[/\\]+/, "");
  const filePath = path.resolve(PUBLIC_DIR, relativePath);

  if(
    filePath !== PUBLIC_DIR &&
    !filePath.startsWith(PUBLIC_DIR + path.sep)
  ){
    return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
  }

  fs.stat(filePath, (statError, stats) => {
    if(statError || !stats.isFile()){
      return send(res, 404, "Not found", "text/plain; charset=utf-8");
    }

    res.writeHead(200, {
      "Content-Type":
        mimeTypes[path.extname(filePath).toLowerCase()] ||
        "application/octet-stream"
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Mercadia storefront escuchando en ${PORT}`);
});
