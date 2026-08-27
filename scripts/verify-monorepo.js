const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");

const requiredFiles = [
  "Dockerfile",
  "railway.toml",
  "apps/admin/package.json",
  "apps/admin/server.js",
  "apps/admin/css/commerce-os.css",
  "apps/admin/js/ui.js",
  "apps/admin/railway.toml",
  "apps/backend/package.json",
  "apps/backend/src/server.js",
  "apps/backend/railway.toml",
  "apps/storefront/package.json",
  "apps/storefront/server.js",
  "apps/storefront/railway.toml",
  "apps/storefront/public/manifest.webmanifest",
  "apps/storefront/public/service-worker.js"
];

const forbiddenNames = new Set([
  ".env",
  ".git",
  "node_modules"
]);

const errors = [];

for(const relativePath of requiredFiles){
  if(!fs.existsSync(path.join(root, relativePath))){
    errors.push(`Falta ${relativePath}`);
  }
}

function scan(directory){
  for(const entry of fs.readdirSync(directory, { withFileTypes: true })){
    const fullPath = path.join(directory, entry.name);
    const relativePath = path.relative(root, fullPath).replaceAll("\\", "/");

    if(relativePath === ".git") continue;

    if(forbiddenNames.has(entry.name)){
      continue;
    }

    if(entry.isDirectory()){
      scan(fullPath);
    }
  }
}

scan(path.join(root, "apps"));

try{
  const trackedFiles = execFileSync(
    "git",
    ["ls-files", "-z"],
    {
      cwd: root,
      encoding: "utf8"
    }
  ).split("\0").filter(Boolean);

  for(const file of trackedFiles){
    const segments = file.split("/");
    const name = segments.at(-1);

    if(
      segments.includes("node_modules") ||
      name === ".env" ||
      segments.includes(".git")
    ){
      errors.push(`Archivo prohibido rastreado por Git: ${file}`);
    }
  }
}catch(error){
  errors.push("No se pudo verificar el indice de Git");
}

for(const relativePath of [
  "package.json",
  "apps/admin/package.json",
  "apps/backend/package.json",
  "apps/storefront/package.json",
  "apps/storefront/public/manifest.webmanifest"
]){
  try{
    JSON.parse(
      fs.readFileSync(
        path.join(root, relativePath),
        "utf8"
      )
    );
  }catch(error){
    errors.push(`${relativePath} no contiene JSON valido`);
  }
}

const adminPages = [
  "dashboard.html","products.html","orders.html","inventory.html",
  "customers.html","store.html","login.html"
];

for(const page of adminPages){
  const contents = fs.readFileSync(path.join(root,"apps/admin",page),"utf8");
  if(!contents.includes("user-scalable=no")){
    errors.push(`Falta viewport de aplicación en apps/admin/${page}`);
  }
  if(!contents.includes("commerce-os.css")){
    errors.push(`Falta diseño Commerce OS en apps/admin/${page}`);
  }
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(root,"apps/storefront/public/manifest.webmanifest"),"utf8")
);
if(manifest.display !== "standalone" || manifest.scope !== "/"){
  errors.push("El manifest no está configurado como aplicación standalone");
}

const adminAuth = fs.readFileSync(path.join(root,"apps/admin/js/auth.js"),"utf8");
if(!adminAuth.includes("mercadia_admin_token")){
  errors.push("La sesión persistente del panel no está configurada");
}

const pwaSource = fs.readFileSync(path.join(root,"apps/storefront/public/js/pwa.js"),"utf8");
if(!pwaSource.includes("/admin/push/subscribe")){
  errors.push("Falta la suscripción de alertas para propietarios");
}

if(errors.length){
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Monorepo Mercadia verificado correctamente.");
