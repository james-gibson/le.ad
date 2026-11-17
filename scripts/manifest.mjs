#!/usr/bin/env node
/**
 * The manifest, generated so it cannot describe icons that do not exist.
 *
 * Installability is a small, specific claim: an `id`, a `start_url` inside a
 * `scope`, a `display` mode, and 192px and 512px icons. A manifest that names
 * a missing file is worse than no manifest, because the browser reports
 * "installable" in a document and then silently refuses — so the file is
 * written from the same list scripts/icons.mjs draws.
 *
 * Relative `start_url` and `scope` are deliberate: the same manifest is correct
 * at /le.ad/ on Pages and at / in a dev server.
 */
import { existsSync, writeFileSync } from 'node:fs'

const SITE = 'https://james-gibson.github.io/le.ad/'

const icons = [
  {
    src: 'icons/icon-192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: 'icons/icon-512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: 'icons/maskable-512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable',
  },
]

for (const icon of icons) {
  const path = `public/${icon.src}`
  if (!existsSync(path)) {
    console.error(`manifest: ${path} is named in the manifest but was never drawn`)
    process.exit(1)
  }
}

const manifest = {
  id: '/le.ad/',
  name: 'le.ad — an empty hot desk',
  short_name: 'le.ad',
  description:
    'An empty hot desk: six desks, one claim at a time, a lease that runs out. A connection point for active seeds.',
  lang: 'en',
  dir: 'ltr',
  start_url: './',
  scope: './',
  display: 'standalone',
  display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
  orientation: 'any',
  background_color: '#2E4A5F',
  theme_color: '#2E4A5F',
  categories: ['productivity', 'utilities', 'developer'],
  icons,
  /**
   * Addresses, in the three forms a browser can hand to an app.
   *
   * `protocol_handlers` is the one that ships broadly (Chrome/Edge 96+): the
   * installed desk registers for `web+desk:` and opens
   * `web+desk:ad-03` at `./#desk=ad-03`. `%s` is replaced with everything
   * after the scheme, so the app receives the desk id and nothing else.
   *
   * `launch_handler` decides what happens when the desk is already open. A
   * desk holds one body at a time, so the answer is `focus-existing`: reuse
   * the window instead of spawning a second row. The address then arrives
   * through `launchQueue`, which src/lib/pwa.ts reads.
   *
   * `handle_links` is Chromium's same-origin link-capturing prototype. Manifests
   * ignore members they do not know, so declaring it is a hint, not a promise.
   */
  protocol_handlers: [{ protocol: 'web+desk', url: './#desk=%s' }],
  launch_handler: { client_mode: 'focus-existing' },
  handle_links: 'preferred',
  shortcuts: [
    {
      name: 'Claim a desk',
      short_name: 'Claim',
      description: 'Take an empty desk for one lease.',
      url: './#claim-heading',
    },
    {
      name: 'The isotope',
      short_name: 'Isotope',
      description: 'The desk-claim isotope, its rules and its id.',
      url: './isotope/hot-desk',
    },
    {
      name: 'Design',
      short_name: 'Design',
      description: 'The parts this desk ships, live.',
      url: './design',
    },
  ],
  // The desk is a dark room with one lamp. Saying so here stops the browser
  // from painting a white window frame around it before the first paint.
  prefer_related_applications: false,
  screenshots: [],
  serviceworker: { src: 'sw.js', scope: './' },
}

// The address members are checked here, before they reach a browser: a handler
// with no `%s` opens the same page for every desk, and a handler on another
// origin is refused at parse time with no error a user can see.
for (const handler of manifest.protocol_handlers ?? []) {
  if (!/^web\+[a-z0-9]+$/.test(handler.protocol)) {
    console.error(`manifest: protocol "${handler.protocol}" must be a web+ scheme`)
    process.exit(1)
  }
  if (!handler.url.includes('%s')) {
    console.error(`manifest: ${handler.protocol} url has no %s placeholder`)
    process.exit(1)
  }
  if (/^https?:/.test(handler.url)) {
    console.error(`manifest: ${handler.protocol} url must be same-origin, not absolute`)
    process.exit(1)
  }
}
if (!['auto', 'focus-existing', 'navigate-existing', 'navigate-new'].includes(manifest.launch_handler.client_mode)) {
  console.error(`manifest: unknown launch_handler client_mode "${manifest.launch_handler.client_mode}"`)
  process.exit(1)
}

writeFileSync('public/manifest.json', `${JSON.stringify(manifest, null, 2)}\n`)
console.log(
  `manifest: public/manifest.json — ${icons.length} icons, ${manifest.shortcuts.length} shortcuts, ` +
    `start_url ${manifest.start_url}, ${manifest.protocol_handlers.length} protocol handler(s) (${manifest.protocol_handlers
      .map((handler) => handler.protocol)
      .join(', ')})`,
)

// A small guard against the one mistake that is invisible until install fails:
// an absolute URL where a relative one belongs.
for (const icon of manifest.icons) {
  if (/^https?:/.test(icon.src)) {
    console.error(`manifest: ${icon.src} is absolute; use a path relative to the manifest`)
    process.exit(1)
  }
}
void SITE
