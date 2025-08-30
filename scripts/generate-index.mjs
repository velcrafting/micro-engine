import fs from "node:fs";
import path from "node:path";

const regPath = path.join(process.cwd(), "registry.json");
const items = JSON.parse(fs.readFileSync(regPath, "utf8"));

const rows = items
  .sort((a,b) => new Date(b.updated) - new Date(a.updated))
  .map(x => `
  <a class="card" href="${x.proxy || x.base}">
    <div class="title">${x.title || x.slug}</div>
    <div class="desc">${x.desc || ""}</div>
    <div class="meta">
      <span>${x.slug}</span>
      ${x.tags?.length ? `<span>${x.tags.join(" · ")}</span>` : ""}
      <span>${new Date(x.updated).toLocaleDateString()}</span>
    </div>
  </a>`).join("\n");

const html = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Labs Index</title>
<meta name="description" content="Auto-generated index of micro-sites.">
<style>
:root{color-scheme:dark}
body{margin:0;font-family:ui-sans-serif,system-ui,Arial;background:#0b0b0b;color:#e7e7e7}
main{max-width:1100px;margin:40px auto;padding:0 16px}
h1{font-weight:600;font-size:28px;margin:0 0 16px}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
.card{display:block;padding:14px;border:1px solid #222;border-radius:12px;background:#111;text-decoration:none;color:inherit}
.card:hover{background:#171717;border-color:#2a2a2a}
.title{font-weight:600;margin-bottom:6px}
.desc{opacity:.8;font-size:14px;margin-bottom:8px;min-height:38px}
.meta{opacity:.6;font-size:12px;display:flex;gap:10px;flex-wrap:wrap}
header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
header .meta{opacity:.7}
</style>
<main>
  <header>
    <h1>Labs</h1>
    <div class="meta">${items.length} projects</div>
  </header>
  <div class="grid">
    ${rows}
  </div>
</main>`;
fs.writeFileSync(path.join(process.cwd(), "index.html"), html);
console.log(`Wrote index.html with ${items.length} projects`);