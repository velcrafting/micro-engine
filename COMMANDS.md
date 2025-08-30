# Commands Cheatsheet

## Create a new micro
# vanilla TypeScript
./create-micro.js --name poster

# React
./create-micro.js --name "qr-generator" --template react

# With add ons
./create-micro.js --name "3d-cube" --template react --three
./create-micro.js --name "viz-demo" --d3
./create-micro.js --name "charts-demo" --charts
./create-micro.js --name "pwa-toy" --pwa

# Lean output without Tailwind plugins
./create-micro.js --name "lean-toy" --no-plugins

## Auto git init and push to GitHub
# uses gh CLI. set owner or it auto detects
./create-micro.js --name poster --push --owner velcrafting
./create-micro.js --name secret-lab --private --push --owner velcrafting

## Local dev and build
npm run dev
npm run build
npm run preview

## Git basics per micro
git init -b main
git add -A && git commit -m "init"
gh repo create <owner>/<slug> --public --source=. --push

## Vercel proxy on main site
# Next.js rewrites example
// next.config.ts
async function rewrites() {
  return [
    { source: "/labs/poster", destination: "https://<user>.github.io/poster/index.html" },
    { source: "/labs/poster/:path*", destination: "https://<user>.github.io/poster/:path*" }
  ];
}
export default { rewrites };

## Registry example for your hub
# config/labs.json in your Next repo
[
  { "slug": "poster", "base": "https://<user>.github.io/poster" },
  { "slug": "qr-generator", "base": "https://<user>.github.io/qr-generator" }
]

## Common fixes
# deep link 404 on GitHub Pages
# ensure 404.html exists after build
cat dist/index.html > dist/404.html

# assets not loading under /labs/<slug>
# fix absolute paths. use Vite base "./"
# and script hrefs like ./src/main.ts not /src/main.ts

# CSP blocks CDN
# add domains to CSP in your Next site only for /labs/:slug*