const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 8080);
const STATIC_DIR = __dirname;
const API_URL = String(
  process.env.API_URL ||
  "https://mercadia-back-production.up.railway.app/api"
).replace(/\/$/, "");
const BACKEND_ORIGIN = API_URL.replace(/\/api$/, "");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function send(res, status, body, contentType){
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-cache"
  });
  res.end(body);
}

http.createServer((req, res) => {
  const requestUrl = new URL(req.url, "http://localhost");

  if(requestUrl.pathname === "/healthz"){
    return send(res, 200, JSON.stringify({ success: true }), "application/json");
  }

  if(requestUrl.pathname === "/config.js"){
    return send(
      res,
      200,
      `window.MERCADIA_CONFIG=${JSON.stringify({ API_URL, BACKEND_ORIGIN })};`,
      mimeTypes[".js"]
    );
  }

  const pathname = requestUrl.pathname === "/"
    ? "/login.html"
    : requestUrl.pathname;
  const relativePath = decodeURIComponent(pathname).replace(/^[/\\]+/, "");
  const filePath = path.resolve(STATIC_DIR, relativePath);
  const extension = path.extname(filePath).toLowerCase();

  if(
    !mimeTypes[extension] ||
    (filePath !== STATIC_DIR && !filePath.startsWith(STATIC_DIR + path.sep))
  ){
    return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
  }

  fs.stat(filePath, (error, stats) => {
    if(error || !stats.isFile()){
      return send(res, 404, "Not found", "text/plain; charset=utf-8");
    }

    res.writeHead(200, { "Content-Type": mimeTypes[extension] });
    fs.createReadStream(filePath).pipe(res);
  });
}).listen(PORT, "0.0.0.0", () => {
  console.log(`Mercadia admin escuchando en ${PORT}`);
});
