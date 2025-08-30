# Template Checklist

This is the preflight before you push a new micro. Keep it boring and consistent.

## Build and structure
- Vite config has `base: "./"` and `build.outDir = "dist"`.
- `index.html` references `./src/main.ts` or `./src/main.tsx`.
- `dist/404.html` exists. Postbuild copies index to 404.
- `lab.json` and `thumbnail.svg` are copied into `dist`.

## Styling and UX
- Tailwind present. Base tokens set: bg, fg, muted.
- Primitives available: `.container`, `.btn`, `.card`, `.muted`.
- No reliance on global CSS from your main site.

## Routing and paths
- All asset URLs are relative. No leading slash.
- If SPA with client routing and not using hash router then 404.html fallback is in place.

## Discovery and SEO
- `lab.json` fields filled: slug, title, summary, entry, repo, updated.
- `<link rel="canonical" href="https://velcrafting.com/labs/<slug>/">` present.
- `meta name="description"` set.
- Favicon present. `thumbnail.svg` exists for cards.

## Security and performance
- No service worker by default.
- Only required CDN domains used. Prepare to whitelist via CSP on `/labs/:slug*` if needed.
- No mixed content. All external resources are https.

## GitHub Pages
- `.github/workflows/pages.yml` exists and uploads `dist`.
- Repo default branch is `main`.
- GitHub Pages set to GitHub Actions in Settings after first push.

## Local quality
- `npm run dev` works at http://localhost:5173 with strictPort.
- `npm run build` produces a working `dist` that runs under a subpath.
- `npm run preview` serves the build without console errors.

## Optional add ons
- Three.js demo renders a cube in `#demo` if `--three` used.
- D3 demo renders a simple bar chart in `#demo` if `--d3` used.
- Chart.js demo renders a bar chart if `--charts` used.
- PWA manifest exists and is linked if `--pwa` used. No service worker unless you add it intentionally.

## Hand off to the hub
- Add entry to your Next repo `config/labs.json` with the Pages base.
- Confirm rewrites route `/labs/<slug>` to that base.
- Visit `https://velcrafting.com/labs/<slug>/lab.json` and `index.html` via the proxy to verify.

## Sanity traps
- If assets 404 under the proxy then you used absolute paths. Fix them and rebuild.
- If the page renders blank only on Pages then check for modulepreload warnings. Vite base set to `./` avoids this.
- If analytics double count then remove any second tracker in the micro. Prefer host level analytics.