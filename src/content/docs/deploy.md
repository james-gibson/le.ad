---
title: Build and deploy
description: One command, one guard, and the checks that refuse to publish a lie.
order: 3
updated: 2026-11-16
tags: build, deploy
---

# Build and deploy

```sh
git clone https://github.com/james-gibson/le.ad
cd le.ad
npm ci
npm run dev        # vite
npm run build      # the gate
npm run smoke      # render every route on the server
```

Node 22 or newer. Nothing else is required, and there is no service to start.

## What the build runs, in order

| step | what it refuses |
| --- | --- |
| `tsc --noEmit` | a type that does not exist |
| `vite build` | a module graph that does not resolve |
| `scripts/icons.mjs` | an icon that disagrees with the manifest |
| `scripts/manifest.mjs` | a manifest that is not valid JSON, or names an icon it did not draw |
| `scripts/prerender.tsx` | a route that throws while rendering |
| `scripts/postbuild.mjs` | a route without its own shell |
| `scripts/tokens.mjs` | a CSS token that disagrees with `palette.json` |
| `scripts/contrast.mjs` | an ink below its floor, or at an alpha nobody measured |
| `scripts/a11y.mjs` | a heading jump, an unlabelled control, a missing `lang` |
| `scripts/overflow.mjs` | text that leaves its box at a fixed width |
| `scripts/verify-publish.mjs` | the failure classes below |

## The guard

`scripts/verify-publish.mjs` is the gate. It fails on:

- a placeholder (`TODO`, `lorem ipsum`, `example.com`) in a shipped shell;
- a base path that disagrees with `package.json.homepage`;
- a source map, or a `/src/` reference that survived into the output;
- an absolute home path, a loopback URL, or a credential-shaped string;
- a content page without its own `dist/<section>/<slug>/index.html`;
- a page whose title never reached the bundle;
- an internal link to a route that does not exist;
- a `manifest.json` missing a field installability needs, or naming an icon that is not there;
- a `sw.js` that does not precache the bundle it shipped with;
- a missing `404.html`, `.nojekyll`, `robots.txt`, `sitemap.xml` or `llms.txt`;
- an `llms.txt` that does not list a page, a section, and the build commands;
- an isotope page whose feature file does not produce the id the page prints;
- a `dist/` over the size budget.

Each check names the failure it prevents, so a red build is a sentence rather than a stack.

## Pages

Push to `main`. The workflow runs `npm ci && npm run build`, uploads `dist/`, and publishes with
`actions/deploy-pages`. The base path lives in two places that must agree — `vite.config.ts`
(`base`) and `package.json` (`homepage`) — and the guard checks that they do.

A project site is served from `/le.ad/`, so:

- router links are basename-relative (`<Link to="/design">`);
- raw `href` strings use `import.meta.env.BASE_URL`;
- markdown links are written root-absolute and prefixed at render time;
- the manifest's `start_url` and `scope` are relative, so the same file works in dev.

## Adding a page

Create `src/content/<section>/<slug>.md` with frontmatter, then build. The nav, the section
index, the sitemap, `llms.txt`, the 404 shell and the route shell are all derived from the file
tree — there is no nav array to edit and no list to forget.
