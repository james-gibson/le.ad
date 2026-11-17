# le.ad

**An empty hot desk.** Six desks, one claim at a time, a lease that runs out. A
[le.gume](https://github.com/james-gibson/le.gume) seed that holds no content of its own: it is a
connection point for active seeds, and the first home of the desk-claim isotope.

**Live:** https://james-gibson.github.io/le.ad/

## What this is

Most sites accumulate. This one is valuable because it is empty. A seed that wants somewhere to
be arrives, claims a desk, and leaves a link behind — the link carries the claim, so the next
machine to open it is already at the desk. When the lease runs out the desk is empty again, not
stale.

- **A protocol, not a page.** `src/lib/desk.ts` is a pure state machine; `features/hot-desk.feature`
  is its specification; `scripts/desk-check.ts` runs the implementation against the same
  fourteen scenarios. The page renders the machine; it does not decide anything the machine
  would not.
- **Installable.** A generated `manifest.json` with 192, 512 and maskable icons drawn by
  `scripts/icons.mjs`, and a service worker written by `scripts/postbuild.mjs` from the hashed
  assets it just built, so the installed desk opens offline.
- **Parts, not a framework.** The UI takes [tuiparts.sh](https://tuiparts.sh) at its word —
  behaviour in typed components, presentation in a token file you own. No CSS framework, no
  theme runtime. See `/docs/ui`.
- **A measured palette.** Muted steelblue wall, gold grain, white smoke, one sharp hot pink.
  `src/lib/palette.json` declares every pair and the gate reads it; `/palette` prints the same
  numbers from the same file.
- **A guard, not a checklist.** `scripts/verify-publish.mjs` fails the build on a manifest that
  names an icon it did not draw, a worker that does not precache the shipped bundle, a page whose
  isotope id drifted from its feature file, or a link to a route that does not exist.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | types, icons, manifest, tokens, Vite, prerender, shells, `sw.js`, contrast, a11y, overflow, the protocol check and the guard |
| `npm run smoke` | renders every route to a string; fails on a render error |
| `npm run check:desk` | runs the desk protocol against the fourteen isotope scenarios |
| `npm run isotope` | re-derives the isotope id from `features/hot-desk.feature` with the real canon |
| `npm run preview` | serve the production build locally |

Node 22+. Nothing else is required, and there is no service to start.

## Layout

```text
src/lib/desk.ts                  the protocol: claim, heartbeat, release, sweep, record
src/lib/desks.ts                 persistence, the clock, the handoff link
src/ui/theme.ts                  the tuiparts token contract, two registered themes
src/ui/parts.tsx                 Box, Row, Stack, Text, Panel, Badge, Dot
src/ui/controls.tsx              Button, Field, Input, Select, Switch, Tabs
src/pages/Home.tsx               the row, the claim strip, the record
src/pages/Design.tsx             the live catalogue (every part the site ships)
src/pages/Palette.tsx            the measured palette
src/content/<section>/<slug>.md  pages; the file path is the URL
features/hot-desk.feature        the isotope, fourteen scenarios
scripts/desk-check.ts            the protocol executed against those scenarios
scripts/icons.mjs                PNG icons drawn from code, no design export
scripts/manifest.mjs             manifest.json, generated from the drawn icons
scripts/postbuild.mjs            route shells, sitemap, llms.txt, sw.js
scripts/verify-publish.mjs       the publish guard
```

## The isotope

le.ad introduces one thing and proposes it upstream: a **lease on a connection point**.

```text
isotope    6fBcXp8gZNhhBwwbQMP0t9F5MuxpzGWMX_l2k5TJd24
signature  33778bc4c5bdda4e…  (hmac-sha256, key seed-42)
canon      72 tokens, 14 parts
```

The rule the lattice did not have: a desk that is *held* needs a clock, and silence has to
return it. Rung 0 may connect and may not hold; a distance past the rung ceiling is refused as
drift; a lease runs for ninety seconds and a heartbeat renews it. The proposal is filed as
[isotope#46](https://github.com/james-gibson/isotope/issues/46): upstream the feature as
`isotope/features/hot-desk.feature`, with the constant beside the rung ceilings in `trust.go`.
Until that lands, nothing else should depend on the shape of a claim.

## Deploy

Push to `main`. The workflow runs `npm ci && npm run build`, uploads `dist/`, and publishes with
`actions/deploy-pages`. The base path lives in two places that must agree — `vite.config.ts`
(`base`) and `package.json` (`homepage`) — and the guard checks that they do.

## License

AGPL-3.0-only.
