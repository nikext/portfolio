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

## Deploy to Cloudflare Pages

Connect the GitHub repo in the Cloudflare dashboard with:

| Setting | Value |
| --- | --- |
| Framework preset | Next.js (Static HTML Export) |
| Build command | `npm run build` |
| Build output directory | `out` |
| Node version | `22` (read from `.node-version`) |

Every push to `main` deploys; other branches get preview URLs.
