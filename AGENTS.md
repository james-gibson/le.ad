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

## Addresses

A desk has three addresses and they all mean the same thing — this desk, not this claim:

```text
/ad/ad-03/        #desk=ad-03        web+desk:ad-03
```

- `/ad/:id` is a real route with its own prerendered shell. It ranks above `:section/:slug`, so a
  desk id can never be read as a page slug. `scripts/postbuild.mjs` and
  `scripts/verify-publish.mjs` read the ids out of `src/lib/desk.ts`; a seventh desk without its
  shell fails the build.
- `protocol_handlers` maps `web+desk:<id>` to `./#desk=%s`. The guard checks the `%s` and checks
  that the fragment starts with `desk=`, because a handler the app cannot parse is a handler that
  silently does nothing.
- `launch_handler: focus-existing` is only honest if `src/lib/pwa.ts` consumes `launchQueue`.
  The guard checks that too: with a reused window the address never reaches `location`.
- `url_handlers` is obsolete (superseded by link capturing and `scope_extensions`). Do not add it.

Adopting is not claiming: an address aims the strip and focuses the seed field, and the claim is
still the strip's to make. Keep that boundary.

## The agent door is the seed's, not the starter's

le.gume's rule is one door for an agent, and the door is `llms.txt`. Copying the starter's
sentence through that door is the mistake: `le.gume` asks an agent to clone it, `le.railhead` asks
it to read a record, and this desk asks it to **take a desk**. Same door, different verb.

- `SITE.action` is this seed's verb and its address (`take a desk`, `ad-01`).
- `SITE.handoff` is the door itself, unchanged in shape so an agent that knows the family can find
  it. It is printed once, and the guard counts that it stays one.
- The door says how to *publish*, not how to build: push to main and the workflow runs `npm ci &&
  npm run build`. A local build is optional, and for a desk it is usually unnecessary — there is
  nothing to compile to take one.
- The footer puts the verb above the description and the door below it. A visitor gets a desk; an
  agent gets a path.

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
