#!/usr/bin/env node
/**
 * The publish guard.
 *
 * A public site is a small, permanent promise. This file is the only thing
 * standing between a careless build and that promise, so every check below
 * names the failure it prevents and fails with a message a human can act on.
 *
 * le.ad inherits the guard's shape from le.gume and keeps only the rules that
 * are true here. Two are new, and they are the point of this seed:
 *
 *   - the manifest has to describe icons that were actually drawn at the size
 *     it claims, because a manifest that lies is worse than no manifest;
 *   - the isotope page has to print the id its feature file produces, because
 *     a protocol page that drifts from the specification is a rumour.
 *
 * Run after `vite build` (it is part of `npm run build`), or standalone with
 * `npm run guard` against an existing dist/.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { access, readFile, readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

const DIST = 'dist'
const failures = []
const notes = []

function fail(check, detail) {
  failures.push({ check, detail })
}

async function readText(path) {
  return readFile(path, 'utf8')
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

// --- 1. the output exists and is the shape Pages expects -------------------
let files
try {
  files = await walk(DIST)
} catch {
  console.error('guard: dist/ is missing — run `npm run build` first')
  process.exit(1)
}

const rel = files.map((file) => relative(DIST, file))
const required = [
  'index.html',
  '404.html',
  '.nojekyll',
  'favicon.svg',
  'robots.txt',
  'sitemap.xml',
  'llms.txt',
  'manifest.json',
  'sw.js',
  '.well-known/ai-catalog.json',
]
for (const file of required) {
  if (!rel.includes(file)) fail('required-file', `${file} is missing from dist/`)
}

const indexHtml = await readText(join(DIST, 'index.html')).catch(() => '')
const notFoundHtml = await readText(join(DIST, '404.html')).catch(() => '')

// Every shell boots the same application: a deep link must start the app, not
// serve a stale page.
const appScript = /<script[^>]+src="[^"]*assets\/index-[^"]+\.js"/.exec(indexHtml)?.[0]
if (!appScript) {
  fail('spa-fallback', 'dist/index.html does not load the application bundle')
} else if (notFoundHtml && !notFoundHtml.includes(appScript)) {
  fail('spa-fallback', 'dist/404.html does not load the application bundle')
}

// --- 2. the base path agrees with the deployed location -------------------
const pkg = JSON.parse(await readText('package.json'))
const expectedBase = pkg.homepage ? new URL(pkg.homepage).pathname : '/'
if (!indexHtml.includes(`${expectedBase}assets/`)) {
  fail(
    'base-path',
    `index.html does not load assets from ${expectedBase}assets/ — check vite.config.ts base ` +
      'against package.json homepage',
  )
}

const mount = expectedBase.replace(/\/$/, '')
const rootRefs = [...indexHtml.matchAll(/(?:src|href)="(\/[^"]*)"/g)].map((match) => match[1])
for (const ref of rootRefs) {
  if (ref !== mount && !ref.startsWith(expectedBase)) {
    fail('base-path', `index.html references ${ref}, which escapes the mount ${expectedBase}`)
  }
}

// --- 3. nothing shipped points back at source or at a map -----------------
for (const file of rel) {
  if (file.endsWith('.map')) fail('sourcemap', `${file} is a source map; set sourcemap: false`)
}
const scripts = files.filter((file) => file.endsWith('.js'))
const jsText = (await Promise.all(scripts.map((file) => readText(file)))).join('\n')

if (/\/src\/[A-Za-z0-9_-]+\.(?:tsx?|css)/.test(indexHtml) || /from\s*"\/src\//.test(jsText)) {
  fail('dev-paths', 'output refers to /src/ — a dev server URL leaked into the bundle')
}

// --- 4. placeholders in shipped markup ------------------------------------
const placeholder = /\b(?:TODO|FIXME|lorem ipsum)\b|example\.com/i
for (const [name, html] of [
  ['index.html', indexHtml],
  ['404.html', notFoundHtml],
]) {
  if (placeholder.test(html)) fail('placeholder', `${name} still contains a placeholder`)
}

// --- 5. nothing private or secret-looking anywhere ------------------------
const leakPatterns = [
  [/\/Users\/[A-Za-z0-9._-]+/, 'an absolute macOS home path'],
  [/\/home\/[A-Za-z0-9._-]+/, 'an absolute Linux home path'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'a private key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'an AWS access key id'],
  [/\bsk-(?:live|proj|ant)-[A-Za-z0-9_-]{16,}/, 'an API secret'],
  [/\b(?:password|passwd|secret|token)\s*[:=]\s*["'][^"']{8,}["']/i, 'a hardcoded credential'],
  [/127\.0\.0\.1:\d+/, 'a loopback URL'],
  [/localhost:\d+/, 'a localhost URL'],
]
for (const [pattern, what] of leakPatterns) {
  const hit = jsText.match(pattern) ?? indexHtml.match(pattern)
  if (hit) fail('leak', `output contains ${what}: ${hit[0].slice(0, 60)}`)
}

// --- 6. every real route has its own shell, and the content is in the bundle
const contentFiles = (await walk('src/content')).filter((file) => file.endsWith('.md'))
if (contentFiles.length === 0) fail('content', 'src/content/**/*.md matched nothing')

const sections = [...new Set(contentFiles.map((file) => relative('src/content', file).split('/')[0]))]

// Desk addresses are routes too. Read from the protocol module so a seventh
// desk cannot ship without its own 200.
const deskIds = [
  ...new Set(
    [...(await readText('src/lib/desk.ts')).matchAll(/'(ad-\d{2})'/g)].map((match) => match[1]),
  ),
]

const routes = [
  'design',
  'palette',
  ...deskIds.map((id) => `ad/${id}`),
  ...sections,
  ...contentFiles.map((file) => relative('src/content', file).replace(/\.md$/, '')),
]

for (const route of routes) {
  try {
    await access(join(DIST, route, 'index.html'))
  } catch (error) {
    if (!error || error.code !== 'ENOENT') throw error
    fail('route-shell', `dist/${route}/index.html is missing — Pages would answer 404 for /${route}`)
  }
}

for (const file of contentFiles) {
  const source = await readText(file)
  const title = /^title:\s*(.+)$/m.exec(source)?.[1]?.trim().replace(/^["']|["']$/g, '')
  if (!title) {
    fail('content', `${file} has no title: in frontmatter`)
    continue
  }
  if (!jsText.includes(title)) {
    fail('content', `${file} ("${title}") is not present in the built bundle`)
  }
  if (!/^description:\s*\S/m.test(source)) {
    fail('content', `${file} has no description: — a page without one has no unfurl and no summary`)
  }
}

// --- 7. internal links point at routes that exist -------------------------
const knownRoutes = new Set([
  '/',
  '/design',
  '/palette',
  ...sections.map((section) => `/${section}`),
  ...contentFiles.map((file) => `/${relative('src/content', file).replace(/\.md$/, '')}`),
])
const knownFiles = new Set(['/llms.txt', '/robots.txt', '/sitemap.xml', '/manifest.json', '/favicon.svg'])
for (const file of contentFiles) {
  const source = await readText(file)
  for (const match of source.matchAll(/\]\((\/[^)\s]*)\)/g)) {
    const target = match[1].replace(/#.*$/, '').replace(/\/$/, '') || '/'
    if (knownRoutes.has(target) || knownFiles.has(target)) continue
    fail('link', `${file} links to ${match[1]}, which is not a route on this site`)
  }
}

// --- 8. the machine entry lists every page -------------------------------
const llms = rel.includes('llms.txt') ? await readText(join(DIST, 'llms.txt')) : ''
if (!llms) {
  fail('llms', 'dist/llms.txt is empty or missing (see scripts/postbuild.mjs)')
} else {
  for (const file of contentFiles) {
    const route = relative('src/content', file).replace(/\.md$/, '')
    if (!llms.includes(`/${route}/)`)) fail('llms', `dist/llms.txt does not list /${route}`)
  }
  for (const anchor of ['## For agents', '## Invariants', '## Build and verify', '## The isotope']) {
    if (!llms.includes(anchor)) fail('llms', `dist/llms.txt is missing the "${anchor}" section`)
  }
}

// --- 9. installability, told the truth -----------------------------------
// A manifest is a claim a browser acts on. It names icons at particular sizes,
// so the sizes are read out of the PNG headers rather than from the filename:
// a 192x192 called icon-512.png installs nothing and looks fine in review.
const manifestSource = await readText(join(DIST, 'manifest.json')).catch(() => '')
if (!manifestSource) {
  fail('manifest', 'dist/manifest.json is missing')
} else {
  let manifest
  try {
    manifest = JSON.parse(manifestSource)
  } catch (error) {
    fail('manifest', `dist/manifest.json is not JSON: ${error.message}`)
  }
  if (manifest) {
    const needed = ['name', 'short_name', 'start_url', 'scope', 'display', 'background_color', 'theme_color', 'icons']
    for (const field of needed) {
      if (!manifest[field]) fail('manifest', `manifest.json has no ${field}`)
    }
    if (!['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].includes(manifest.display)) {
      fail('manifest', `manifest.json display is "${manifest.display}", which is not an installable mode`)
    }
    // A relative start_url is what makes one file correct on Pages and in dev.
    if (/^https?:/.test(manifest.start_url ?? '')) {
      fail('manifest', 'manifest.json start_url is absolute; use "./" so the mount is not baked in')
    }
    const sizes = new Set()
    for (const icon of manifest.icons ?? []) {
      const path = join(DIST, icon.src)
      let buffer
      try {
        buffer = readFileSync(path)
      } catch {
        fail('manifest', `manifest.json names ${icon.src}, which is not in dist/`)
        continue
      }
      if (buffer.subarray(1, 4).toString('ascii') !== 'PNG') {
        fail('manifest', `${icon.src} is not a PNG`)
        continue
      }
      const width = buffer.readUInt32BE(16)
      const height = buffer.readUInt32BE(20)
      const claimed = icon.sizes
      if (`${width}x${height}` !== claimed) {
        fail('manifest', `${icon.src} is ${width}x${height} but the manifest claims ${claimed}`)
      }
      sizes.add(claimed)
    }
    if (!sizes.has('192x192')) fail('manifest', 'manifest.json has no 192x192 icon')
    if (!sizes.has('512x512')) fail('manifest', 'manifest.json has no 512x512 icon')
    for (const shortcut of manifest.shortcuts ?? []) {
      if (!shortcut.url) fail('manifest', `shortcut "${shortcut.name}" has no url`)
    }

    // --- addresses -------------------------------------------------------
    // A protocol handler with no `%s` opens the same page for every desk, and
    // one whose fragment key the app does not parse is a handler that silently
    // does nothing. Both are invisible in a browser until someone tries it.
    const handlers = manifest.protocol_handlers ?? []
    if (!handlers.length) {
      fail('manifest', 'manifest.json declares no protocol_handlers — the installed app cannot be addressed')
    }
    for (const handler of handlers) {
      if (!/^web\+[a-z0-9]+$/.test(handler.protocol ?? '')) {
        fail('manifest', `protocol handler "${handler.protocol}" is not a web+ scheme`)
      }
      if (!String(handler.url ?? '').includes('%s')) {
        fail('manifest', `${handler.protocol} has no %s placeholder to receive the address`)
      }
      if (/^https?:/.test(String(handler.url ?? ''))) {
        fail('manifest', `${handler.protocol} url is absolute; it must stay same-origin`)
      }
      const fragment = String(handler.url ?? '').split('#')[1] ?? ''
      if (!fragment.startsWith('desk=')) {
        fail(
          'manifest',
          `${handler.protocol} opens "${handler.url}", which the app does not read as a desk address ` +
            '(src/lib/desks.ts parses #desk=)',
        )
      }
    }

    const mode = manifest.launch_handler?.client_mode
    if (!['auto', 'focus-existing', 'navigate-existing', 'navigate-new'].includes(mode)) {
      fail('manifest', `launch_handler.client_mode is "${mode}" — the app cannot say how an address is delivered`)
    }
    // `focus-existing` without a launchQueue consumer is a page that drops the
    // second address it is handed. The consumer lives in src/lib/pwa.ts.
    if (mode === 'focus-existing') {
      const pwa = await readText('src/lib/pwa.ts').catch(() => '')
      if (!/launchQueue/.test(pwa)) {
        fail('manifest', 'focus-existing is declared but src/lib/pwa.ts never reads launchQueue')
      }
      const home = await readText('src/pages/Home.tsx').catch(() => '')
      if (!/useLaunchQueue/.test(home)) {
        fail('manifest', 'focus-existing is declared but the row never consumes the launch queue')
      }
    }

    if (manifest.handle_links && !['auto', 'preferred', 'not-preferred'].includes(manifest.handle_links)) {
      fail('manifest', `handle_links is "${manifest.handle_links}", which is not a known value`)
    }
  }
}

// --- 10. the worker precaches what shipped -------------------------------
const sw = await readText(join(DIST, 'sw.js')).catch(() => '')
const bundle = rel.find((file) => /^assets\/index-.*\.js$/.test(file))
if (!sw) {
  fail('worker', 'dist/sw.js is missing — scripts/postbuild.mjs writes it')
} else {
  if (bundle && !sw.includes(bundle)) {
    fail('worker', `sw.js does not precache ${bundle} — the installed app would break offline`)
  }
  if (!sw.includes(`${expectedBase}index.html`)) {
    fail('worker', 'sw.js has no offline fallback for the app shell')
  }
  if (!/addEventListener\('fetch'/.test(sw)) {
    fail('worker', "sw.js has no fetch handler; browsers will not treat the site as installable")
  }
  if (!/addEventListener\('install'/.test(sw) || !/addEventListener\('activate'/.test(sw)) {
    fail('worker', 'sw.js is missing an install or activate handler')
  }
}

// --- 11. the isotope page and the feature file agree ---------------------
// The id is content-addressed by the canon. If the specification changes, the
// page has to change with it; this is the only check that makes the page's
// printed identity a fact rather than a copy-paste.
const isotopePage = await readText('src/content/isotope/hot-desk.md').catch(() => '')
const isotopeId = /^isotope\s+(\S+)$/m.exec(isotopePage)?.[1]
if (!isotopeId) {
  fail('isotope', 'src/content/isotope/hot-desk.md does not print an isotope id')
} else {
  try {
    const report = execFileSync('python3', ['scripts/validate-spec.py', 'features/hot-desk.feature'], {
      encoding: 'utf8',
    })
    const derived = /isotope\s+(\S+)/.exec(report)?.[1]
    if (!derived) {
      fail('isotope', 'the canon reported no isotope id for features/hot-desk.feature')
    } else if (derived !== isotopeId) {
      fail(
        'isotope',
        `the page prints ${isotopeId} but features/hot-desk.feature derives ${derived} — ` +
          'the protocol page has drifted from its specification',
      )
    } else {
      notes.push(`isotope ${derived.slice(0, 12)}…`)
    }
  } catch (error) {
    // Exit 2 is the validator saying the canon (brine.py) is not installed
    // here. That is a property of the machine, not of the page, so it is a
    // note: the check runs where the canon is, and the build says out loud
    // when it could not be run rather than passing quietly.
    if (error.status === 2) {
      notes.push('isotope id NOT re-derived here (the canon is not installed); run `npm run isotope`')
    } else {
      fail('isotope', `the canon could not read features/hot-desk.feature: ${error.message.slice(0, 120)}`)
    }
  }
}

// --- 12. size sanity ------------------------------------------------------
const total = (await Promise.all(files.map(async (file) => (await stat(file)).size))).reduce(
  (a, b) => a + b,
  0,
)
const budgetMb = 8
if (total > budgetMb * 1024 * 1024) {
  fail('size', `dist/ is ${(total / 1024 / 1024).toFixed(1)}MB, over the ${budgetMb}MB budget`)
}
notes.push(`${rel.length} files, ${(total / 1024).toFixed(0)}KB total`)

// --- report ---------------------------------------------------------------
if (failures.length) {
  console.error('guard: refused to publish\n')
  for (const { check, detail } of failures) console.error(`  [${check}] ${detail}`)
  console.error('\nNothing was published. Fix the checks above and rebuild.')
  process.exit(1)
}

console.log(`guard: clean — ${notes.join(', ')}`)
