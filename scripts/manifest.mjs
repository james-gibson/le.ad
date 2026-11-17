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

writeFileSync('public/manifest.json', `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`manifest: public/manifest.json — ${icons.length} icons, ${manifest.shortcuts.length} shortcuts, start_url ${manifest.start_url}`)

// A small guard against the one mistake that is invisible until install fails:
// an absolute URL where a relative one belongs.
for (const icon of manifest.icons) {
  if (/^https?:/.test(icon.src)) {
    console.error(`manifest: ${icon.src} is absolute; use a path relative to the manifest`)
    process.exit(1)
  }
}
void SITE
