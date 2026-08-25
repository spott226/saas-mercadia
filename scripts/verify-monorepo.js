const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");

const requiredFiles = [
  "apps/admin/package.json",
  "apps/admin/server.js",
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

if(errors.length){
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Monorepo Mercadia verificado correctamente.");
