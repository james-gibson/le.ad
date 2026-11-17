#!/usr/bin/env node
/**
 * The icons, drawn rather than exported.
 *
 * A seed that ships a 400KB PNG from a design tool has a file nobody can
 * regenerate and nobody can review. The mark here is six rectangles and a
 * circle: a desk with a lamp on it, in the site's own two colours. Everything
 * is computed from the size asked for, so the 192 and the 512 are the same
 * drawing and not two exports that might disagree.
 *
 *   node scripts/icons.mjs
 *
 * Writes public/icons/icon-192.png, icon-512.png, maskable-512.png and
 * apple-touch-icon.png. No dependencies: the PNG encoder below is 60 lines of
 * chunk assembly over zlib, which is in the standard library.
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const WALL = [0x2e, 0x4a, 0x5f]
const DESK = [0xc9, 0xa4, 0x5c]
const SMOKE = [0xed, 0xf2, 0xf4]
const PINK = [0xff, 0x2e, 0x88]

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([length, body, crc])
}

function png(width, height, pixels) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // colour type: RGBA
  header[10] = 0
  header[11] = 0
  header[12] = 0

  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0 // filter: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function canvas(size, colour) {
  const pixels = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i += 1) {
    pixels[i * 4] = colour[0]
    pixels[i * 4 + 1] = colour[1]
    pixels[i * 4 + 2] = colour[2]
    pixels[i * 4 + 3] = 255
  }
  return pixels
}

function put(pixels, size, x, y, colour, alpha = 1) {
  if (x < 0 || y < 0 || x >= size || y >= size) return
  const at = (y * size + x) * 4
  for (let c = 0; c < 3; c += 1) {
    pixels[at + c] = Math.round(pixels[at + c] * (1 - alpha) + colour[c] * alpha)
  }
  pixels[at + 3] = 255
}

function rect(pixels, size, x, y, w, h, colour, alpha = 1) {
  for (let dy = 0; dy < h; dy += 1) {
    for (let dx = 0; dx < w; dx += 1) put(pixels, size, x + dx, y + dy, colour, alpha)
  }
}

/** A filled circle with one pixel of feathering, so the lamp is not a square. */
function circle(pixels, size, cx, cy, r, colour, alpha = 1) {
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y += 1) {
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x += 1) {
      const distance = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
      if (distance <= r - 1) put(pixels, size, x, y, colour, alpha)
      else if (distance <= r) put(pixels, size, x, y, colour, alpha * 0.55)
    }
  }
}

/**
 * The mark: a desk seen from the front. One horizontal is the desk, two shorts
 * are its legs, and the lamp is the only thing that is pink — the same rule the
 * page follows, where the accent marks the live state and nothing else.
 */
function mark(size, { inset = 0.16, background = WALL } = {}) {
  const pixels = canvas(size, background)
  const s = size
  const unit = Math.round(s * (1 - inset * 2))
  const left = Math.round(s * inset)
  const thickness = Math.max(2, Math.round(s * 0.035))

  // desk top
  const deskY = Math.round(s * 0.62)
  rect(pixels, s, left, deskY, unit, thickness, DESK)
  // legs
  const legTop = deskY + thickness
  const legHeight = Math.round(unit * 0.2)
  const legWidth = Math.max(2, Math.round(s * 0.028))
  rect(pixels, s, left + Math.round(unit * 0.06), legTop, legWidth, legHeight, SMOKE, 0.55)
  rect(
    pixels,
    s,
    left + unit - legWidth - Math.round(unit * 0.06),
    legTop,
    legWidth,
    legHeight,
    SMOKE,
    0.55,
  )
  // lamp stem and shade
  const stemX = Math.round(s * 0.5)
  rect(pixels, s, stemX, Math.round(s * 0.34), legWidth, deskY - Math.round(s * 0.34), SMOKE, 0.4)
  circle(pixels, s, stemX + legWidth / 2, Math.round(s * 0.3), s * 0.075, PINK)
  return png(s, s, pixels)
}

mkdirSync('public/icons', { recursive: true })

const files = [
  ['public/icons/icon-192.png', mark(192)],
  ['public/icons/icon-512.png', mark(512)],
  // Maskable: the glyph pulls in to the safe circle so a launcher can crop it
  // to a squircle, a circle or a rounded square without cutting the desk.
  ['public/icons/maskable-512.png', mark(512, { inset: 0.24 })],
  ['public/icons/apple-touch-icon.png', mark(180)],
]

for (const [path, buffer] of files) {
  writeFileSync(path, buffer)
  console.log(`icons: ${path} — ${(buffer.length / 1024).toFixed(1)}KB`)
}

// One more thing worth generating rather than hand-writing: the SVG the tab
// uses, so the tab and the launcher agree about the mark.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="le.ad">
  <rect width="64" height="64" fill="#2E4A5F"/>
  <rect x="10" y="40" width="44" height="2.4" fill="#C9A45C"/>
  <rect x="13" y="42.4" width="2" height="6" fill="#EDF2F4" opacity=".55"/>
  <rect x="49" y="42.4" width="2" height="6" fill="#EDF2F4" opacity=".55"/>
  <rect x="31" y="22" width="2" height="18" fill="#EDF2F4" opacity=".4"/>
  <circle cx="32" cy="19" r="4.6" fill="#FF2E88"/>
</svg>
`
writeFileSync(join('public', 'favicon.svg'), svg)
console.log('icons: public/favicon.svg')
