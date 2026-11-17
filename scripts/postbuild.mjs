#!/usr/bin/env node
/**
 * Post-build steps that GitHub Pages needs and Vite does not know about.
 *
 * 1. dist/404.html — a copy of the shell. Pages serves it for any unknown path,
 *    the SPA boots, React Router renders the 404 route.
 * 2. dist/<section>/<slug>/index.html — one shell per real route. Pages serves
 *    these with a 200 instead of falling through to 404.html, so a deep link is
 *    a found page rather than a missing one that happens to render.
 * 3. dist/.nojekyll — stops Pages from running Jekyll over the output.
 * 4. dist/robots.txt, sitemap.xml, .well-known/ai-catalog.json — the find half
 *    of agent readiness: one rule for all agents, a list of what is published.
 * 5. dist/llms.txt — the machine entry, generated from the content tree.
 * 6. dist/sw.js — the service worker, with a precache list naming the hashed
 *    assets that were just built. A worker cannot be hand-written here: its
 *    cache names have to match the bundle or the first deploy breaks offline.
 */
import { execFileSync } from 'node:child_process'
import { writeFile, mkdir, readdir, readFile, access, rm } from 'node:fs/promises'
import { join, relative } from 'node:path'

const SITE = 'https://james-gibson.github.io/le.ad'
const BASE = '/le.ad/'
const built = new Date().toISOString().slice(0, 10)
const commit = (() => {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return built
  }
})()
const DIST = 'dist'
const CONTENT = 'src/content'
const index = join(DIST, 'index.html')

try {
  await access(index)
} catch {
  console.error('postbuild: dist/index.html is missing — run vite build first')
  process.exit(1)
}

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else out.push(full)
  }
  return out
}

// Routes are the content tree plus the two static ones. Keeping this derived
// means a new page gets its own 200 without editing this file.
const sectionDirs = (await readdir(CONTENT, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

const routes = [
  'design',
  'palette',
  ...sectionDirs,
  ...(await walk(CONTENT))
    .filter((f) => f.endsWith('.md'))
    .map((f) => relative(CONTENT, f).replace(/\.md$/, '')),
]

// --- prerendered shells ---------------------------------------------------
const template = await readFile(index, 'utf8')
const PRERENDER = join(DIST, '.prerender')
const markup = new Map()
try {
  for (const file of await readdir(PRERENDER)) {
    markup.set(file.replace(/\.html$/, ''), await readFile(join(PRERENDER, file), 'utf8'))
  }
} catch {
  console.warn('postbuild: no prerendered markup — shells will be empty')
}

const shellFor = (key) => {
  const content = markup.get(key)
  return content ? template.replace('<div id="root"></div>', `<div id="root">${content}</div>`) : template
}

// The build knows each page's title; the prerendered shell must say it. An
// effect that sets document.title runs after paint, so without this every page
// ships the same <title> — a WCAG 2.4.2 failure and a bad unfurl.
const pageTitles = new Map()
const pageMeta = new Map()
for (const file of await walk(CONTENT)) {
  if (!file.endsWith('.md')) continue
  const source = await readFile(file, 'utf8')
  const route = relative(CONTENT, file).replace(/\.md$/, '')
  const title = /^title:\s*(.+)$/m.exec(source)?.[1]?.trim().replace(/^["']|["']$/g, '')
  const description = /^description:\s*(.+)$/m.exec(source)?.[1]?.trim().replace(/^["']|["']$/g, '')
  if (title) pageTitles.set(route, title)
  if (description) pageMeta.set(route, description)
}

const SECTION_LABELS = { desk: 'Desk', isotope: 'Isotope', docs: 'Docs' }

const titleFor = (route) => {
  if (!route) return null
  if (pageTitles.has(route)) return `${pageTitles.get(route)} · le.ad`
  if (route === 'design') return 'Design · le.ad'
  if (route === 'palette') return 'Palette · le.ad'
  if (route === '404') return 'Not found · le.ad'
  const section = route.split('/')[0]
  if (!route.includes('/') && section) {
    return `${SECTION_LABELS[section] ?? section} · le.ad`
  }
  return null
}

const withTitle = (html, route) => {
  const title = titleFor(route)
  if (!title) return html
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
}

for (const route of routes) {
  const dir = join(DIST, route)
  await mkdir(dir, { recursive: true })
  await writeFile(
    join(dir, 'index.html'),
    withTitle(shellFor(route.replace(/\//g, '__')), route),
    'utf8',
  )
}

await writeFile(join(DIST, 'index.html'), shellFor('home'), 'utf8')
await writeFile(join(DIST, '404.html'), withTitle(shellFor('404'), '404'), 'utf8')
await writeFile(join(DIST, '.nojekyll'), '')

// --- sitemap, crawl policy, catalog ---------------------------------------
const sitemapUrls = ['', ...routes.map((route) => `${route}/`)]
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapUrls.map((route) => `  <url><loc>${route ? `${SITE}/${route}/` : `${SITE}/`}</loc></url>`),
  '</urlset>',
  '',
].join('\n')
await writeFile(join(DIST, 'sitemap.xml'), sitemap, 'utf8')

await writeFile(
  join(DIST, 'robots.txt'),
  ['User-agent: *', 'Allow: /', '', `Sitemap: ${SITE}/sitemap.xml`, ''].join('\n'),
  'utf8',
)

const catalog = {
  name: 'le.ad',
  url: `${SITE}/`,
  description:
    'An empty hot desk: a connection point for active le.gume seeds, and the first home of the desk-claim isotope.',
  entries: [
    { type: 'text/plain', url: `${SITE}/llms.txt`, name: 'llms.txt' },
    { type: 'application/xml', url: `${SITE}/sitemap.xml`, name: 'sitemap.xml' },
    { type: 'application/manifest+json', url: `${SITE}/manifest.json`, name: 'manifest.json' },
    { type: 'text/html', url: `${SITE}/`, name: 'the row' },
    { type: 'text/html', url: `${SITE}/isotope/hot-desk/`, name: 'the isotope' },
    { type: 'text/html', url: `${SITE}/desk/claiming/`, name: 'how to claim' },
  ],
}
await mkdir(join(DIST, '.well-known'), { recursive: true })
await writeFile(
  join(DIST, '.well-known', 'ai-catalog.json'),
  `${JSON.stringify(catalog, null, 2)}\n`,
  'utf8',
)

// --- llms.txt -------------------------------------------------------------
const pages = []
for (const [route, title] of pageTitles) {
  const [section] = route.split('/')
  const order = Number(
    /^order:\s*(\d+)/m.exec(await readFile(join(CONTENT, `${route}.md`), 'utf8'))?.[1] ?? 999,
  )
  pages.push({ route, section, title, description: pageMeta.get(route) ?? '', order })
}
pages.sort(
  (a, b) =>
    (Object.keys(SECTION_LABELS).indexOf(a.section) - Object.keys(SECTION_LABELS).indexOf(b.section)) ||
    a.order - b.order,
)

const lines = [
  '# le.ad',
  '',
  '> An empty hot desk. Six desks, one claim each, a ninety-second lease, and a link',
  '> that carries the claim. A connection point for active seeds — not a content site.',
  '',
  `Live: ${SITE}/`,
  'Repo: https://github.com/james-gibson/le.ad',
  'Stack: React 19, Vite, hand-written CSS tokens, no CSS framework, no runtime services.',
  'Source of truth: src/content/<section>/<slug>.md for pages; src/lib/desk.ts for the protocol.',
  '',
  '## Build and verify',
  '',
  '    npm ci',
  '    npm run build    # tsc, vite, icons, manifest, prerender, shells, sw.js, guard',
  '    npm run smoke    # renders every route server-side; fails if one throws',
  '    npm run isotope  # re-derives the isotope id from features/hot-desk.feature',
  '',
  'The guard refuses placeholders, local paths, credentials, a base path that disagrees',
  'with package.json homepage, a route without its shell, a manifest naming a missing',
  'icon, a service worker that does not precache the shipped bundle, a page that never',
  'reached the bundle, and an isotope page whose id does not match its feature file.',
  '',
  '## Invariants',
  '',
  '- Navigation, section indexes, the sitemap and this file are derived from the content tree.',
  '- The desk is a pure state machine in src/lib/desk.ts. The page renders it; it does not',
  '  decide anything the machine would not.',
  '- A desk holds one seed at a time, for a lease of ninety seconds, renewed by a heartbeat.',
  '- An expired lease is swept on read. There is no cleanup task and no stale holder.',
  '- The row lives in localStorage and in the claim link. No claim is sent to a server.',
  '- /design is the live catalogue of the parts; /palette prints the measured ratios.',
  '- This file is generated at build time; editing it in dist/ changes nothing.',
  '',
]

for (const section of Object.keys(SECTION_LABELS)) {
  const list = pages.filter((page) => page.section === section)
  if (!list.length) continue
  lines.push(`## ${SECTION_LABELS[section]}`, '')
  for (const page of list) {
    lines.push(`- [${page.title}](${SITE}/${page.route}/): ${page.description}`)
  }
  lines.push('')
}

lines.push(
  '## The isotope',
  '',
  'le.ad introduces the desk-claim isotope and proposes it upstream. The feature file is',
  'features/hot-desk.feature; the page /isotope/hot-desk prints the id the canon derives.',
  'A claim is seed, surface, rung, 42i distance and an issue time. Rung 0 may connect but',
  'may not hold. A distance past the rung ceiling is refused as drift. Silence is not a state.',
  '',
  '## For agents',
  '',
  `- The protocol, in one page: ${SITE}/isotope/hot-desk/`,
  `- How to claim: ${SITE}/desk/claiming/`,
  `- What a hot desk is: ${SITE}/desk/what-a-desk-is/`,
  `- The parts, live: ${SITE}/design/`,
  '',
)

await writeFile(join(DIST, 'llms.txt'), lines.join('\n'), 'utf8')

await rm(PRERENDER, { recursive: true, force: true })

// --- the service worker ---------------------------------------------------
// Built from the output, not written by hand: the precache list has to name the
// hashed assets Vite just emitted, and a worker that guesses them is a worker
// that 404s on the first deploy.
const assets = (await walk(join(DIST, 'assets'))).map((file) => `${BASE}${relative(DIST, file)}`)
const shell = [
  BASE,
  `${BASE}manifest.json`,
  `${BASE}favicon.svg`,
  `${BASE}icons/icon-192.png`,
  `${BASE}icons/icon-512.png`,
  `${BASE}icons/maskable-512.png`,
  `${BASE}llms.txt`,
]

const sw = `/*
 * le.ad service worker — generated by scripts/postbuild.mjs
 *
 * Do not edit dist/sw.js: the next build overwrites it, and the precache list
 * has to match the hashed assets that build emitted.
 *
 *   version ${commit}
 */
const VERSION = '${commit}'
const CACHE = 'le.ad-' + VERSION
const SHELL = ${JSON.stringify([...shell, ...assets], null, 2)}
const OFFLINE = ${JSON.stringify(`${BASE}index.html`)}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // A navigation is a promise that the site is still there. Answer from the
  // network when it is, and from the cached shell when it is not — a deep link
  // still boots the app offline, it just boots it from cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match(OFFLINE))),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})
`
await writeFile(join(DIST, 'sw.js'), sw, 'utf8')

console.log(
  `postbuild: ${routes.length} shells, 404.html, sitemap.xml, robots.txt, ai-catalog.json, ` +
    `llms.txt (${pages.length} pages), sw.js (${shell.length + assets.length} precached, ${commit})`,
)
