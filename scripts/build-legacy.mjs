import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Build V1 unchanged. Namespace its assets so two framework runtimes never share chunks.
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
if (!existsSync("frontend/node_modules")) {
  const install = spawnSync(npm, ["ci"], {
    cwd: "frontend",
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (install.status) process.exit(install.status);
}
if (!process.env.CC_SKIP_LEGACY_BUILD) {
  const build = spawnSync(npm, ["run", "build"], {
    cwd: "frontend",
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (build.status) process.exit(build.status);
}
if (!existsSync("frontend/dist/client/index.html"))
  throw new Error("The preserved V1 build is missing");
mkdirSync("public/legacy", { recursive: true });
cpSync("frontend/dist/client", "public/legacy", { recursive: true });
cpSync("frontend/dist/client/_next", "public/legacy-assets/_next", { recursive: true });
const routes = [];
function rewrite(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) rewrite(file);
    else if (/\.(html|js|css|rsc|json)$/.test(entry.name)) {
      let content = readFileSync(file, "utf8").replaceAll(
        "/_next/static/",
        "/legacy-assets/_next/static/",
      );
      content = content.replaceAll("/command-center", "/command-center-v1");
      writeFileSync(file, content);
      if (file.endsWith(".html") && dir.replaceAll("\\", "/").startsWith("public/legacy")) {
        const route = file
          .replaceAll("\\", "/")
          .replace(/^public\/legacy/, "")
          .replace(/\.html$/, "");
        routes.push(route === "/index" ? "/" : route);
      }
    }
  }
}
rewrite("public/legacy");
rewrite("public/legacy-assets");
writeFileSync("public/legacy-routes.json", JSON.stringify(routes));
for (const name of [
  "favicon.svg",
  "jourvis-demo.json",
  "jourvis-social.png",
  "jourvis-social.svg",
]) {
  if (existsSync(`frontend/dist/client/${name}`))
    cpSync(`frontend/dist/client/${name}`, `public/${name}`);
}
cpSync("frontend/src/assets/businesses/restaurant/marinara-ristorante", "public/marinara", {
  recursive: true,
});
console.log(`Preserved ${routes.length} V1 pages; restaurant photographs prepared.`);
