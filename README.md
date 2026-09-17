# nikext.dev — personal site

Personal site of Nikola Todorovski. Next.js (static export) + three.js, deployed on Cloudflare Pages.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static site in ./out
```

## Where things live

| What | Where |
| --- | --- |
| Copy, links, languages, certs | `src/data/profile.ts` |
| Roles / experience | `src/data/roles.ts` |
| Stack chips | `src/data/stack.ts` |
| Hero graph nodes | `src/data/nodes.ts` |
| Hero scene (three.js, GPU particles, bloom) | `src/components/Scene.tsx` + `src/components/scene/shaders.ts` |
| Colours, type, spacing tokens | `src/app/globals.css` (`--accent` drives every orange) |
| Sections | `src/components/*` |

## Portrait

Drop a photo at `public/portrait.jpg` (4:5 works best). Until it exists the About section shows a hatched placeholder.

## Deploy to Cloudflare

The site is a static export, so it deploys as an assets-only Worker: `wrangler.jsonc` points Wrangler at `./out` and there is no server code. Without that file Wrangler's auto-config would route the build through OpenNext, which fails on a static export.

Workers Builds settings for the connected GitHub repo:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Node version | `22` (read from `.node-version`) |

The `name` in `wrangler.jsonc` must match the Worker's name in the dashboard. Every push to `main` deploys; other branches get preview URLs.

Cloudflare Pages works too: preset "Next.js (Static HTML Export)", build command `npm run build`, output directory `out`.
