# Agent hints

## This repository

`le.ad` is a public, installable "hot desk": a le.gume seed whose content is a protocol rather
than a library of pages. Six desks, one claim at a time, a ninety-second lease.

Live: https://james-gibson.github.io/le.ad/ · Repo: `james-gibson/le.ad`

## The one invariant that matters

`src/lib/desk.ts` is the protocol and it is pure. Every decision is a function of
`(desk, claim, now)`. Do not move a rule into a component, a hook or a page — a desk that
decides differently depending on where it is read is not a desk.

Three things have to agree, always:

| artefact | what it says |
| --- | --- |
| `features/hot-desk.feature` | the behaviour, as the canon reads it |
| `scripts/desk-check.ts` | the behaviour, executed |
| `src/content/isotope/hot-desk.md` | the isotope id the canon derives |

Change one, change all three, then run `npm run check:desk` and `npm run isotope`. The publish
guard refuses a build where the page prints an id the feature file does not derive.

## Commands

```bash
npm run dev        # vite
npm run build      # the gate: types, icons, manifest, tokens, vite, prerender, guard
npm run smoke      # render every route (and the 404) to a string
npm run check:desk # the protocol against the fourteen scenarios
npm run isotope    # re-derive the isotope id with the real canon
```

`npm run build` is the gate. The guard fails on placeholders, leaked paths or credentials, a
base path that disagrees with `package.json.homepage`, a route without its shell, a manifest that
names an icon it did not draw, a worker that does not precache the shipped bundle, an isotope id
that drifted, or content that never reached the bundle. Do not weaken a check to make a build
pass; fix the output.

## Content

- One page = one file: `src/content/<section>/<slug>.md`, frontmatter `title` + `description`
  (plus optional `order`, `updated`, `tags`). The nav, section indexes, sitemap and `llms.txt`
  are derived from the file tree; there is no nav array.
- Do not open the body with `# Title`. The title is the frontmatter title, and the content model
  strips a repeated leading heading so a page cannot ship two `<h1>` elements.
- Markdown only. A live widget is a route under `src/pages/`, like `/design`.
- Router links are basename-relative; raw `href` strings use `import.meta.env.BASE_URL`.

## Design

- Tokens are `src/lib/palette.json` (measured) and `src/ui/theme.css` (painted).
  `scripts/tokens.mjs` refuses a build where they disagree. A new colour is a new token, a
  declared pair and a CSS custom property, in that order.
- The sharp pink `#FF2E88` is a **fill**, never small text: it is 2.65:1 on the wall. The pink
  that carries meaning as ink is `#FF94C1`. `night` is the text that sits on the fill.
- Parts live in `src/ui/parts.tsx` and `src/ui/controls.tsx`; `/design` renders every one of
  them with the props the site actually uses. Keep it in step.
- tuiparts is a terminal library and cannot be a dependency of a browser build. The split and
  the token names are what le.ad borrows; do not add `@tuiparts/*` to `package.json`.

## Upstream

le.ad introduces the desk-claim isotope and proposes it to
[`isotope`](https://github.com/james-gibson/isotope). The proposal is the feature file plus the
ninety-second constant. If upstream adopts it, this repository keeps the page and drops the
duplicate: the source of truth for the protocol moves to `isotope/trust.go`.
