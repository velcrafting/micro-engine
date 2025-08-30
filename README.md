# Micro Engine

One command creates a tiny Vite + Tailwind micro-site that deploys to GitHub Pages and plugs into your Next.js Labs hub.

## Requirements

- Node 18+
- npm
- Optional: `gh` CLI for fast repo creation

## Install

Put `create-micro.js` in your parent folder, then:

```bash
chmod +x create-micro.js

Run the script from the parent folder each time you want a new micro.
```
## Quick Start
```bash
# vanilla TypeScript micro
./create-micro.js --name my-micro
cd my-micro
npm run dev
```

Variants and flags

Base template:
	•	--template react uses React + TS
	•	default is vanilla TypeScript

Add-ons:
	•	--three adds Three.js and a rotating cube demo in #demo
	•	--d3 adds D3 and a small bar chart in #demo
	•	--charts adds Chart.js with a bar chart
	•	--pwa writes manifest.webmanifest and links it in index.html
	•	--no-plugins skips Tailwind plugins (typography, forms, aspect-ratio)

Metadata:
	•	--name, -n set project name
	•	--desc, -d set short description
	•	--template, -t set react or vanilla (default)

Examples:
```bash
# Vanilla TS + Tailwind
./create-micro.js --name poster

# React + Tailwind
./create-micro.js --name "qr-generator" --template react

# React + Three.js
./create-micro.js --name "3d-cube" --template react --three

# Vanilla + D3
./create-micro.js --name "viz-demo" --d3

# Vanilla + Chart.js + PWA manifest
./create-micro.js --name "charts-demo" --charts --pwa

# Minimal footprint, no Tailwind plugins
./create-micro.js --name "lean-toy" --no-plugins
```

What the generator creates
	•	Vite app with base: "./" so relative assets work under subpaths and proxies
	•	Tailwind + small design tokens and primitives
	•	Optional Tailwind plugins: typography, forms, aspect-ratio
	•	lab.json for dynamic discovery
	•	thumbnail.svg for cards and social previews
	•	GitHub Actions workflow for Pages
	•	Postbuild copies lab.json, thumbnail.svg and creates 404.html
	•	Strict TS, Prettier, EditorConfig
	•	Optional demo code for Three, D3, Chart.js
	•	Optional PWA manifest (no service worker by default)

Output tree (after build):
```bash
<slug>/
  .github/workflows/pages.yml
  src/ (style.css, main.ts or main.tsx)
  index.html
  lab.json
  thumbnail.svg
  vite.config.ts
  tailwind.config.cjs
  postcss.config.cjs
  tsconfig.json
  .prettierrc
  .editorconfig
  README.md
  LICENSE
  dist/  # created on build
```

Local scripts
```bash
npm run dev       # Vite dev server at http://localhost:5173
npm run build     # outputs to dist/
npm run preview   # serves dist on the same port
```

Deploy to GitHub Pages
	1.	Push to a new GitHub repo
 ```bash
git init && git add -A && git commit -m "init"
gh repo create velcrafting/<slug> --public --source=. --push
```

	2.	In GitHub: Settings → Pages → Source → GitHub Actions
The included workflow publishes dist/.

Live URL format:
```bash
https://<user>.github.io/<slug>/
```

Plug into Next.js Labs hub

Add a rewrite in your Next site from /labs/<slug> to the micro’s Pages base. Then your hub can fetch metadata from:
```bash
https://velcrafting.com/labs/<slug>/lab.json
```
Each micro ships with lab.json and a canonical link tag.

Conventions that matter
	•	Relative paths for assets and entry points
	•	404.html present for SPA safety
	•	No service worker by default
	•	Keep add-ons opt in to avoid bloat

Troubleshooting
	•	White screen on proxy path
Fix absolute paths. Use base: "./" and ./src/main.ts in index.html.
	•	Deep link 404 on GitHub Pages
Ensure dist/404.html exists. Postbuild makes it.
	•	CSP errors when proxied under Next
Allow required CDNs only for /labs/:slug* routes.
	•	GitHub Pages not publishing
Check Actions tab. Ensure Pages source is “GitHub Actions.”

Updating the engine

Edit create-micro.js and run it for the next micro. Existing projects are unaffected.

License

This engine is MIT. Each micro includes an MIT license by default.
