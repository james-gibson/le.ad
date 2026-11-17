/**
 * The desk, as a state machine.
 *
 * A hot desk is a connection point with no content of its own. It is useful
 * exactly because it is empty: a seed that wants to be reachable claims the
 * desk, publishes the claim link, and holds it for a lease. When the lease
 * runs out the desk is empty again — never "stale", never held by a seed that
 * stopped calling.
 *
 * Everything in this file is a pure function of (desk, claim, now). That is
 * deliberate: the desk is the reference implementation of the hot-desk
 * isotope, and `features/hot-desk.feature` specifies it step for step. If the
 * protocol and the page ever disagree, this file is wrong, not the feature.
 *
 * The rungs and their distance ceilings are not invented here. They are the
 * 42i capability lattice the lab already uses (isotope/trust.go): rung 0 is
 * absolute zero, rung 6 is certification. A desk is a *readable* surface, so
 * it does not admit absolute zero, and it does not admit a claim whose 42i
 * distance has run past the ceiling of the rung it declares.
 */

/** How long a claim holds a desk without a heartbeat. */
export const LEASE_MS = 90_000

/** How often a holder should call `heartbeat` to keep the desk. */
export const HEARTBEAT_MS = 30_000

/** The desks on the canvas. Ids are stable; a desk is furniture, not content. */
export const DESK_IDS = ['ad-01', 'ad-02', 'ad-03', 'ad-04', 'ad-05', 'ad-06'] as const

export type DeskId = (typeof DESK_IDS)[number]

/** The surface a seed is claiming from. Carried in the record, not interpreted. */
export const SURFACES = ['base', 'desk', 'relay'] as const

export type Surface = (typeof SURFACES)[number]

/**
 * The 42i lattice, as ceilings. `max` is the largest distance that still sits
 * on the rung; a claim past it is a claim the rung does not cover.
 */
export const RUNGS = [
  { rung: 0, name: 'absolute zero', max: 0 },
  { rung: 1, name: 'read-only', max: 20 },
  { rung: 2, name: 'harness tools', max: 60 },
  { rung: 3, name: 'mock secrets', max: 100 },
  { rung: 4, name: 'higher authority', max: 140 },
  { rung: 5, name: 'delegation', max: 180 },
  { rung: 6, name: 'certification', max: 220 },
] as const

export type Rung = (typeof RUNGS)[number]['rung']

/** The lowest rung a desk admits. Absolute zero may connect; it may not hold. */
export const MIN_RUNG: Rung = 1

export type Claim = {
  /** lowercase slug: the seed that is asking for the desk */
  seed: string
  surface: Surface
  rung: Rung
  /** the 42i distance the seed declares for itself, 0–220 */
  distance: number
  /** when the claim was issued, epoch milliseconds */
  at: number
}

export type Desk = {
  id: DeskId
  holder: Claim | null
  /** epoch ms at which the holder's lease ends; null when the desk is empty */
  expires: number | null
  /** claims accepted on this desk, for the record. Never decremented. */
  claims: number
}

export type Refusal = 'bad-seed' | 'rung-zero' | 'no-such-rung' | 'drift' | 'held' | 'not-holder'

export type Outcome =
  | { ok: true; desk: Desk }
  | { ok: false; reason: Refusal; desk: Desk }

export function emptyDesk(id: DeskId): Desk {
  return { id, holder: null, expires: null, claims: 0 }
}

export function emptyDesks(): Desk[] {
  return DESK_IDS.map(emptyDesk)
}

/** A seed name is a slug, 2–32 characters. Anything else is not a seed. */
export function seedProblem(seed: string): boolean {
  return !/^[a-z0-9][a-z0-9-]{1,31}$/.test(seed)
}

/**
 * Expiry, applied on read.
 *
 * This is the rule that makes a hot desk different from a booking: silence is
 * not a state. Once `now` is at or past `expires` the desk is empty, and a
 * reader can never observe a holder whose lease has run out.
 */
export function sweep(desk: Desk, now: number): Desk {
  if (desk.holder && desk.expires !== null && now >= desk.expires) {
    return { ...desk, holder: null, expires: null }
  }
  return desk
}

export function claim(desk: Desk, next: Claim, now: number): Outcome {
  const current = sweep(desk, now)

  if (seedProblem(next.seed)) return { ok: false, reason: 'bad-seed', desk: current }
  if (!RUNGS.some((entry) => entry.rung === next.rung)) {
    return { ok: false, reason: 'no-such-rung', desk: current }
  }
  if (next.rung < MIN_RUNG) return { ok: false, reason: 'rung-zero', desk: current }

  const ceiling = RUNGS[next.rung].max
  if (next.distance > ceiling || next.distance < 0) {
    return { ok: false, reason: 'drift', desk: current }
  }
  if (current.holder) return { ok: false, reason: 'held', desk: current }

  return {
    ok: true,
    desk: {
      ...current,
      holder: { ...next },
      expires: next.at + LEASE_MS,
      claims: current.claims + 1,
    },
  }
}

/**
 * A heartbeat is a claim with no new information: the same seed, the same
 * declared distance, a fresh clock. Only the holder may send one, and only a
 * live claim can be extended — a heartbeat after expiry is a new claim.
 */
export function heartbeat(desk: Desk, seed: string, now: number): Outcome {
  const current = sweep(desk, now)
  if (!current.holder) return { ok: false, reason: 'not-holder', desk: current }
  if (current.holder.seed !== seed) return { ok: false, reason: 'not-holder', desk: current }
  return {
    ok: true,
    desk: { ...current, expires: now + LEASE_MS },
  }
}

/** Only the holder may release. The desk is empty the instant they do. */
export function release(desk: Desk, seed: string, now: number): Outcome {
  const current = sweep(desk, now)
  if (!current.holder) return { ok: false, reason: 'not-holder', desk: current }
  if (current.holder.seed !== seed) return { ok: false, reason: 'not-holder', desk: current }
  return { ok: true, desk: { ...current, holder: null, expires: null } }
}

export function occupant(desk: Desk, now: number): Desk['holder'] {
  return sweep(desk, now).holder
}

/** Milliseconds left on the lease, floored at zero. */
export function remaining(desk: Desk, now: number): number {
  const current = sweep(desk, now)
  return current.expires === null ? 0 : Math.max(0, current.expires - now)
}

/**
 * The record is the desk's public face and it must be stable: two desks that
 * received the same claims in the same order publish the same record, and the
 * clock is not part of it. That is what lets a claim link be a citation.
 */
export function record(desk: Desk): string {
  return JSON.stringify({
    id: desk.id,
    claims: desk.claims,
    holder: desk.holder
      ? {
          seed: desk.holder.seed,
          surface: desk.holder.surface,
          rung: desk.holder.rung,
          distance: desk.holder.distance,
          at: desk.holder.at,
        }
      : null,
  })
}

// --- the claim link --------------------------------------------------------
// base64url over a compact field string. Hand-rolled so the encoder has no
// platform branch: the browser, the prerenderer and a test all produce the
// same bytes for the same claim.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]
    const b = bytes[i + 1] ?? 0
    const c = bytes[i + 2] ?? 0
    out += ALPHABET[a >> 2]
    out += ALPHABET[((a & 3) << 4) | (b >> 4)]
    if (i + 1 < bytes.length) out += ALPHABET[((b & 15) << 2) | (c >> 6)]
    if (i + 2 < bytes.length) out += ALPHABET[c & 63]
  }
  return out
}

function fromBase64Url(input: string): string {
  const source = input.replace(/=+$/, '')
  const bytes: number[] = []
  for (let i = 0; i < source.length; i += 4) {
    const chunk = [0, 1, 2, 3].map((offset) => {
      const index = ALPHABET.indexOf(source[i + offset] ?? '')
      return index === -1 ? 0 : index
    })
    bytes.push((chunk[0] << 2) | (chunk[1] >> 4))
    if (i + 2 < source.length) bytes.push(((chunk[1] & 15) << 4) | (chunk[2] >> 2))
    if (i + 3 < source.length) bytes.push(((chunk[2] & 3) << 6) | chunk[3])
  }
  return new TextDecoder().decode(new Uint8Array(bytes))
}

/** `seed|surface|rung|distance|at`, base64url. Short enough to paste. */
export function encodeClaim(claim: Claim): string {
  return toBase64Url(
    [claim.seed, claim.surface, claim.rung, claim.distance, claim.at].join('|'),
  )
}

export function decodeClaim(token: string): Claim | null {
  let text: string
  try {
    text = fromBase64Url(token)
  } catch {
    return null
  }
  const parts = text.split('|')
  if (parts.length !== 5) return null
  const [seed, surface, rung, distance, at] = parts
  const rungValue = Number(rung)
  const distanceValue = Number(distance)
  const atValue = Number(at)
  if (!SURFACES.includes(surface as Surface)) return null
  if (!Number.isInteger(rungValue) || !RUNGS.some((entry) => entry.rung === rungValue)) return null
  if (!Number.isFinite(distanceValue) || distanceValue < 0 || distanceValue > 220) return null
  if (!Number.isFinite(atValue) || atValue <= 0) return null
  if (seedProblem(seed)) return null
  return {
    seed,
    surface: surface as Surface,
    rung: rungValue as Rung,
    distance: distanceValue,
    at: atValue,
  }
}

/** A claim is live while its lease has not run out. */
export function claimLive(claim: Claim, now: number): boolean {
  return now < claim.at + LEASE_MS
}

export function verdict(claim: Claim, now: number): { ok: true } | { ok: false; reason: Refusal | 'stale' } {
  if (seedProblem(claim.seed)) return { ok: false, reason: 'bad-seed' }
  if (claim.rung < MIN_RUNG) return { ok: false, reason: 'rung-zero' }
  if (claim.distance > RUNGS[claim.rung].max) return { ok: false, reason: 'drift' }
  if (!claimLive(claim, now)) return { ok: false, reason: 'stale' }
  return { ok: true }
}

/** Human copy for a refusal. The desk says why, in the desk's own voice. */
export const REFUSAL: Record<Refusal | 'stale', string> = {
  'bad-seed': 'a seed name is a lowercase slug, 2 to 32 characters',
  'rung-zero': 'absolute zero may connect; it may not hold a desk',
  'no-such-rung': 'that rung is not on the lattice',
  drift: 'the distance has run past the ceiling of the rung you declared',
  held: 'the desk is held. One body at a time.',
  'not-holder': 'only the holder can do that',
  stale: 'that claim link has expired',
}
