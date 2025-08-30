#!/usr/bin/env node
/**
 * create-micro.js
 * Vite + Tailwind micro-site scaffolder with optional add-ons
 * and automatic git init + GitHub repo creation + first push.
 *
 * Examples:
 *   ./create-micro.js --name poster
 *   ./create-micro.js --name "3d-cube" --template react --three --push
 *   ./create-micro.js --name viz --d3 --owner velcrafting --private --push
 */

const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const os = require("os");

// ---------- helpers ----------
function run(cmd, opts = {}) {
  cp.execSync(cmd, { stdio: "inherit", ...opts });
}
function tryRun(cmd, opts = {}) {
  try { cp.execSync(cmd, { stdio: "pipe", ...opts }); return true; }
  catch { return false; }
}
function out(cmd, opts = {}) {
  return cp.execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], ...opts }).trim();
}
function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function argFlag(name) {
  return process.argv.includes(`--${name}`);
}
function argValue(name, fallback = "") {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith("--")) {
    return process.argv[idx + 1];
  }
  return fallback;
}
function nowISO() { return new Date().toISOString(); }
async function prompt(q) {
  return await new Promise(res => {
    process.stdout.write(q);
    process.stdin.setEncoding("utf8");
    process.stdin.once("data", d => res(d.toString().trim()));
  });
}

function resolveHome(p) {
  if (!p) return "";
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

// ---------- presets (mutate argv before parsing) ----------
(() => {
  const getArg = (name) => {
    const idx = process.argv.indexOf(`--${name}`);
    return idx >= 0 ? process.argv[idx + 1] : "";
  };
  const hasFlag = (name) => process.argv.includes(`--${name}`);
  const addFlag = (name) => { if (!hasFlag(name)) process.argv.push(`--${name}`); };
  const addKV = (name, value) => {
    const idx = process.argv.indexOf(`--${name}`);
    if (idx === -1) { process.argv.push(`--${name}`, value); }
  };
  const preset = getArg("preset") || getArg("p");
  if (!preset) return;
  switch ((preset || "").toLowerCase()) {
    case "react-tool":
      addKV("template", "react");
      break;
    case "react-three":
      addKV("template", "react");
      addFlag("three");
      break;
    case "vanilla-tool":
      addKV("template", "vanilla");
      break;
    default:
      // unknown preset: do nothing
      break;
  }
})();

// ---------- parse args ----------
const nameArg = argValue("name") || argValue("n");
const templateArg = argValue("template") || argValue("t") || "vanilla";
const descArg = argValue("desc") || argValue("d") || "";
const useReact = templateArg.toLowerCase().startsWith("react");
const template = useReact ? "react-ts" : "vanilla-ts";

const addThree = argFlag("three");
const addD3 = argFlag("d3");
const addCharts = argFlag("charts");
const addPWA = argFlag("pwa");
const noPlugins = argFlag("no-plugins");

const doPush = argFlag("push");
const ownerArg = argValue("owner");     // org or username
const isPrivate = argFlag("private");
const outDirArg = argValue("out-dir") || "micros";

// ---------- main ----------
(async () => {
  try {
    const name = nameArg || (await prompt("Project name: "));
    if (!name) throw new Error("Name is required");
    const slug = slugify(name);
    const desc = descArg || `Tiny demo ${slug}`;
    const nodeMajor = parseInt(process.versions.node.split(".")[0] || "0", 10);
    let installFailed = false;
    const displayTitle = (name || slug)
      .replace(/[\-_]+/g, " ")
      .trim()
      .replace(/\s+/g, " ")
      .split(" ")
      .map(w => (w ? w[0].toUpperCase() + w.slice(1) : ""))
      .join(" ");
    const baseDir = path.resolve(process.cwd(), outDirArg);
    fs.mkdirSync(baseDir, { recursive: true });
    const folder = path.join(baseDir, slug);
    const relFolder = path.relative(process.cwd(), folder) || ".";
    if (fs.existsSync(folder)) throw new Error(`Folder already exists: ${folder}`);
    fs.mkdirSync(folder, { recursive: true });

    // scaffold with Vite
    console.log(`\nScaffolding Vite in ${folder}`);
    // Run the Vite scaffolder inside the target folder to avoid path duplication
    run(`npm create vite@latest . -- --template ${template}`, { cwd: folder });

    console.log("\nInstalling deps");
    try {
      run(`npm i`, { cwd: folder });
      run(`npm i -D tailwindcss postcss autoprefixer @types/node`, { cwd: folder });
      if (!noPlugins) {
        run(`npm i -D @tailwindcss/typography @tailwindcss/forms @tailwindcss/aspect-ratio`, { cwd: folder });
      }
      if (addThree) run(`npm i three`, { cwd: folder });
      if (addD3) run(`npm i d3`, { cwd: folder });
      if (addCharts) run(`npm i chart.js`, { cwd: folder });
    } catch (e) {
      installFailed = true;
      console.log(`\nWarning: dependency install failed (${e.message}). Continuing to scaffold files.`);
    }

    // .gitignore early
    fs.writeFileSync(path.join(folder, ".gitignore"), `node_modules\ndist\n.DS_Store\n`);

    // postcss, tailwind
    fs.writeFileSync(path.join(folder, "postcss.config.cjs"), `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };`);
    fs.writeFileSync(path.join(folder, "tailwind.config.cjs"),
`/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html","./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: { bg: "rgb(10 10 11)", fg: "rgb(235 235 235)", muted: "rgb(160 160 160)" }
    },
  },
  plugins: [
    ${noPlugins ? "" : `require("@tailwindcss/typography"),`}
    ${noPlugins ? "" : `require("@tailwindcss/forms"),`}
    ${noPlugins ? "" : `require("@tailwindcss/aspect-ratio"),`}
  ].filter(Boolean),
};
`);

    // vite config
    fs.writeFileSync(path.join(folder, "vite.config.ts"),
`import { defineConfig } from "vite";
export default defineConfig({ base: "./", build: { outDir: "dist" } });
`);

    // base CSS
    const srcDir = path.join(folder, "src");
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, "style.css"),
`@tailwind base;
@tailwind components;
@tailwind utilities;

/* Tokens */
:root { --bg: rgb(10 10 11); --fg: rgb(235 235 235); --muted: rgb(160 160 160); color-scheme: dark; }
html, body { height: 100%; }
body { @apply bg-[color:var(--bg)] text-[color:var(--fg)] antialiased; }

/* Primitives */
.container { @apply max-w-3xl mx-auto p-6; }
.btn { @apply inline-flex items-center gap-2 px-3 py-2 rounded border border-white/20 hover:bg-white/10; }
.card { @apply rounded-lg border border-white/10 p-4 bg-white/5; }
.muted { color: var(--muted); }
`);

    // index.html head
    const indexHtml = path.join(folder, "index.html");
    let html = fs.readFileSync(indexHtml, "utf8");
    if (!html.includes('<meta name="viewport"')) {
      html = html.replace("<head>", `<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1">`);
    }
    html = html.replace("</head>", `  <meta name="description" content="${desc}">\n  <meta name="theme-color" content="#0a0a0b">\n  <link rel="canonical" href="https://velcrafting.com/labs/${slug}/">\n  <link rel="icon" href="./thumbnail.svg">\n  <link rel="stylesheet" href="./src/style.css">\n</head>`);
    if (!useReact && !html.includes('id="app"')) {
      html = html.replace("<body>", `<body>\n  <div id="app"></div>`);
    }
    if (!useReact && !html.includes('src/main.ts')) {
      html = html.replace("</body>", `  <script type="module" src="./src/main.ts"></script>\n</body>`);
    }
    fs.writeFileSync(indexHtml, html, "utf8");

    // entry
    if (useReact) {
      const mainTsx = path.join(srcDir, "main.tsx");
      let main = fs.readFileSync(mainTsx, "utf8");
      if (!main.includes(`./style.css`)) main = `import "./style.css";\n` + main;
      main = main.replace(/<React.StrictMode>[\s\S]*<\/React.StrictMode>/m,
`<React.StrictMode>
  <div className="container">
    <h1 className="text-3xl font-semibold">${name}</h1>
    <p className="mt-2 text-neutral-400">${desc}</p>
    <div id="demo" className="mt-4"></div>
    <button id="btn" className="btn mt-4">Ping</button>
    <pre id="out" className="mt-4 text-sm opacity-90"></pre>
  </div>
</React.StrictMode>`
      );
      fs.writeFileSync(mainTsx, main, "utf8");
    } else {
      fs.writeFileSync(path.join(srcDir, "main.ts"),
`import "./style.css";
const root = document.querySelector<HTMLDivElement>("#app")!;
root.innerHTML = \`
  <div class="container">
    <h1 class="text-3xl font-semibold">${name}</h1>
    <p class="mt-2 text-neutral-400">${desc}</p>
    <div id="demo" class="mt-4"></div>
    <button id="btn" class="btn mt-4">Ping</button>
    <pre id="out" class="mt-4 text-sm opacity-90"></pre>
  </div>
\`;
document.getElementById("btn")!.addEventListener("click", () => {
  const out = document.getElementById("out")!;
  out.textContent = "Time: " + new Date().toISOString();
});
`);
    }

    // optional demos
    if (addThree) {
      const demo = useReact
        ? `import * as THREE from "three";
const el = document.getElementById("demo")!;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 640/360, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(640, 360);
el.appendChild(renderer.domElement);
const mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshNormalMaterial());
scene.add(mesh);
camera.position.z = 3;
(function tick(){ mesh.rotation.y+=0.01; mesh.rotation.x+=0.008; renderer.render(scene,camera); requestAnimationFrame(tick); })();`
        : `import * as THREE from "three";
const el = document.getElementById("demo")!;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 640/360, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(640, 360);
el.appendChild(renderer.domElement);
const mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshNormalMaterial());
scene.add(mesh);
camera.position.z = 3;
(function tick(){ mesh.rotation.y+=0.01; mesh.rotation.x+=0.008; renderer.render(scene,camera); requestAnimationFrame(tick); })();`;
      const entry = useReact ? path.join(srcDir, "main.tsx") : path.join(srcDir, "main.ts");
      fs.appendFileSync(entry, `\n// three demo\n${demo}\n`);
    }
    if (addD3) {
      const entry = useReact ? path.join(srcDir, "main.tsx") : path.join(srcDir, "main.ts");
      fs.appendFileSync(entry,
`\n// d3 demo
import * as d3 from "d3";
const svg = d3.select("#demo").append("svg").attr("width", 640).attr("height", 240);
const data = [4, 8, 15, 16, 23, 42];
const x = d3.scaleBand().domain(data.map((_, i) => i)).range([24, 616]).padding(0.15);
const y = d3.scaleLinear().domain([0, d3.max(data) || 0]).nice().range([216, 16]);
svg.selectAll("rect").data(data).enter().append("rect")
  .attr("x", (_, i) => x(i))
  .attr("y", d => y(d))
  .attr("width", x.bandwidth())
  .attr("height", d => 216 - y(d))
  .attr("fill", "currentColor");
svg.append("g").attr("transform", "translate(0,216)").call(d3.axisBottom(x).tickFormat(() => ""));\n`);
    }
    if (addCharts) {
      const entry = useReact ? path.join(srcDir, "main.tsx") : path.join(srcDir, "main.ts");
      fs.appendFileSync(entry,
`\n// chart.js demo
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from "chart.js";
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);
const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 240;
document.getElementById("demo")!.appendChild(canvas);
new Chart(canvas.getContext("2d")!, {
  type: "bar",
  data: { labels: ["A","B","C","D"], datasets: [{ label: "Things", data: [3,7,4,6] }] },
  options: { responsive: false, plugins: { tooltip: { enabled: true } } }
});\n`);
    }

    // PWA manifest
    if (addPWA) {
      const manifest = {
        name, short_name: slug, description: desc,
        start_url: ".", display: "standalone",
        background_color: "#0a0a0b", theme_color: "#0a0a0b",
        icons: [{ src: "./thumbnail.svg", sizes: "512x512", type: "image/svg+xml" }]
      };
      fs.writeFileSync(path.join(folder, "manifest.webmanifest"), JSON.stringify(manifest, null, 2));
      let htmlPwa = fs.readFileSync(indexHtml, "utf8");
      if (!htmlPwa.includes("manifest.webmanifest")) {
        htmlPwa = htmlPwa.replace("</head>", `  <link rel="manifest" href="./manifest.webmanifest">\n</head>`);
      }
      fs.writeFileSync(indexHtml, htmlPwa, "utf8");
    }

    // derive owner for templating
    let ownerForTpl = ownerArg;
    try { if (!ownerForTpl && tryRun(`gh --version`)) ownerForTpl = out(`gh api user -q .login`); } catch {}
    ownerForTpl = ownerForTpl || "<owner>";
    const pagesBase = `https://${ownerForTpl}.github.io/${slug}`;
    const proxyBase = `https://velcrafting.com/labs/${slug}`;

    // --- update registries (local and optional external) ---
    const enginePath = resolveHome(argValue("engine-path"));
    const tagsArg = argValue("tags");
    const tagsArr = tagsArg ? tagsArg.split(",").map(s=>s.trim()).filter(Boolean) : [];

    const upsertRegistry = (dir, label = "registry") => {
      try {
        if (!dir || !fs.existsSync(dir)) {
          console.log(`Note: ${label} path does not exist: ${dir}. Skipping.`); return;
        }
        const regFile = path.join(dir, "registry.json");
        let reg = [];
        if (fs.existsSync(regFile)) {
          try { reg = JSON.parse(fs.readFileSync(regFile, "utf8")); }
          catch { console.log(`Warning: invalid JSON in ${regFile}. Recreating as empty list.`); reg = []; }
        }
        if (!Array.isArray(reg)) reg = [];
        const existingIdx = reg.findIndex(x => x.slug === slug);
        const entry = {
          slug,
          title: displayTitle,
          desc,
          owner: ownerForTpl,
          base: pagesBase,
          proxy: proxyBase,
          updated: new Date().toISOString(),
          tags: tagsArr.length ? tagsArr : (useReact ? ["react","tailwind"] : ["vanilla","tailwind"])
        };
        if (existingIdx >= 0) reg[existingIdx] = entry; else reg.push(entry);
        fs.writeFileSync(regFile, JSON.stringify(reg, null, 2));
        try {
          run(`git add registry.json`, { cwd: dir });
          run(`git commit -m "Add/update micro: ${slug}"`, { cwd: dir });
        } catch { /* non-fatal */ }
        console.log(`Updated ${label} at ${regFile}`);
      } catch (e) {
        console.log(`Failed to update ${label}: ${e.message}`);
      }
    };

    // always update local registry at repo root
    upsertRegistry(process.cwd(), "local registry");
    // optionally update external engine registry if provided and different
    if (enginePath && path.resolve(enginePath) !== path.resolve(process.cwd())) {
      upsertRegistry(enginePath, "engine registry");
    }

    // lab.json, thumb
    fs.writeFileSync(path.join(folder, "lab.json"), JSON.stringify({
      slug, title: name, summary: desc, version: "0.1.0",
      author: "Steven Pajewski", tags: [],
      thumbnail: "./thumbnail.svg", entry: "./index.html",
      repo: `https://github.com/${ownerForTpl}/${slug}`,
      updated: nowISO()
    }, null, 2));
    fs.writeFileSync(path.join(folder, "thumbnail.svg"),
`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="100%" height="100%" fill="#0a0a0b"/>
  <text x="50%" y="50%" fill="#e7e7e7" font-family="system-ui, Arial" font-size="54" text-anchor="middle" dominant-baseline="middle">${name}</text>
</svg>`);

    // Pages workflow
    const wfDir = path.join(folder, ".github", "workflows");
    fs.mkdirSync(wfDir, { recursive: true });
    fs.writeFileSync(path.join(wfDir, "pages.yml"),
`name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: "pages"
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: ./dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
`);

    // tsconfig, prettier, editorconfig
    const tsconfig = path.join(folder, "tsconfig.json");
    if (!fs.existsSync(tsconfig)) {
      fs.writeFileSync(tsconfig, JSON.stringify({
        compilerOptions: {
          target: "ES2020",
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          skipLibCheck: true,
          esModuleInterop: true,
          jsx: "react-jsx"
        },
        include: ["src"]
      }, null, 2));
    }
    fs.writeFileSync(path.join(folder, ".prettierrc"), JSON.stringify({ semi: true, singleQuote: false, printWidth: 100 }, null, 2));
    fs.writeFileSync(path.join(folder, ".editorconfig"),
`root = true
[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
`);

    // Tailored README.md
    fs.writeFileSync(path.join(folder, "README.md"),
`# ${name}

Tiny micro-site built with Vite + Tailwind.

- Live: ${pagesBase}/
- Proxy: ${proxyBase}/

## Scripts
- npm run dev
- npm run build
- npm run preview

## GitHub
gh repo create ${ownerForTpl}/${slug} --public --source=. --push

## Next.js rewrites (paste into your main site's next.config.ts)
{
  source: "/labs/${slug}",
  destination: "${pagesBase}/index.html"
},
{
  source: "/labs/${slug}/:path*",
  destination: "${pagesBase}/:path*"
}

## Labs registry row (add to config/labs.json in your main site)
{ "slug": "${slug}", "base": "${pagesBase}" }
`);

    // Tailored COMMANDS.md
    fs.writeFileSync(path.join(folder, "COMMANDS.md"),
`# Commands (${slug})

## Dev and build
npm run dev
npm run build
npm run preview

## Init and push
git init -b main
git add -A && git commit -m "init"
gh repo create ${ownerForTpl}/${slug} --public --source=. --push

## URLs
Pages: ${pagesBase}/
Proxy:  ${proxyBase}/

## Rewrites (Next.js)
- "/labs/${slug}" -> "${pagesBase}/index.html"
- "/labs/${slug}/:path*" -> "${pagesBase}/:path*"

## Health checks
curl -I ${pagesBase}/lab.json
curl -I ${proxyBase}/lab.json
`);

    // Tailored TEMPLATE_CHECKLIST.md
    fs.writeFileSync(path.join(folder, "TEMPLATE_CHECKLIST.md"),
`# Checklist — ${slug}

- [ ] vite.config.ts has base "./"
- [ ] dist/404.html exists
- [ ] dist/lab.json and dist/thumbnail.svg present
- [ ] Canonical link href="${proxyBase}/" present
- [ ] lab.json has "slug": "${slug}" and "repo": "https://github.com/${ownerForTpl}/${slug}"
- [ ] .github/workflows/pages.yml exists
- [ ] Live: ${pagesBase}/
- [ ] Proxy: ${proxyBase}/
- [ ] Rewrites added to main site
`);

    // LICENSE
    const year = new Date().getFullYear();
    fs.writeFileSync(path.join(folder, "LICENSE"),
`MIT License

Copyright (c) ${year} Steven Pajewski, Velcrafting

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files, to deal in the Software
without restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies of the
Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
`);

    // patch package.json
    const pkgPath = path.join(folder, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    pkg.scripts = pkg.scripts || {};
    if (pkg.scripts.dev && !pkg.scripts.dev.includes("--strictPort")) {
      pkg.scripts.dev = pkg.scripts.dev + " --strictPort --port 5173";
    }
    pkg.scripts.preview = "vite preview --strictPort --port 5173";
    pkg.scripts.postbuild = [
      "cp dist/index.html dist/404.html",
      "cp lab.json dist/lab.json",
      "cp thumbnail.svg dist/thumbnail.svg",
      addPWA ? "cp manifest.webmanifest dist/manifest.webmanifest" : ""
    ].filter(Boolean).join(" && ");
    pkg.keywords = Array.from(new Set([...(pkg.keywords || []), "micro", "labs", "vite", "tailwind"]));
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

    // git init and optional GitHub push
    console.log("\nInitializing git");
    run(`git init -b main`, { cwd: folder });
    run(`git add -A`, { cwd: folder });
    run(`git commit -m "init"`, { cwd: folder });

    if (doPush) {
      const hasGh = tryRun(`gh --version`);
      if (!hasGh) {
        console.log(`\nSkipping GitHub repo creation. Install GitHub CLI or run:
  gh repo create ${ownerArg ? ownerArg + "/" : ""}${slug} --public --source=${folder} --push`);
      } else {
        let owner = ownerArg;
        if (!owner) {
          try { owner = out(`gh api user -q .login`); } catch { owner = ""; }
        }
        const vis = isPrivate ? "--private" : "--public";
        console.log(`\nCreating GitHub repo ${owner ? owner + "/" : ""}${slug} ${isPrivate ? "(private)" : "(public)"}`);
        try {
          run(`gh repo create ${owner ? owner + "/" : ""}${slug} ${vis} --source=${folder} --push`, { cwd: folder });
        } catch {
          console.log(`Failed to create via gh. Manual steps:
  cd ${relFolder}
  gh repo create ${owner ? owner + "/" : ""}${slug} ${vis} --source=. --push
`);
        }
      }
    }

    console.log(`
✅ Created micro ${slug}

Next:
  cd ${relFolder}
  npm run dev
${doPush ? "" : `
Push to GitHub:
  gh repo create ${ownerArg ? ownerArg + "/" : ""}${slug} --public --source=. --push
  # In the repo Settings → Pages → Source = GitHub Actions
`}
`);
    if (installFailed || nodeMajor < 20) {
      console.log(`\nNote: Your Node.js version is ${process.versions.node}. Vite and modern tooling often require Node >= 20.\n- Recommend: install Node 20+ (e.g., via nvm: nvm install 20 && nvm use 20)\n- Then in ${relFolder}: npm ci (or npm i) to finish installing.`);
    }
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
})();
