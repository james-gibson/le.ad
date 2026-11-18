/**
 * The seed's card: what it says about itself.
 *
 * A pitch site should not write copy about someone else's seed — it should
 * quote the seed. `self-card.json` is the single source, this module gives it a
 * type, and `scripts/seed-card.mjs` renders it to `/seed.json` at build time so
 * the published card cannot drift from the site.
 *
 * `pitches` is keyed by voice: the same seed says a different true thing to a
 * reader than to a packager. A voice with no line is a voice this seed is not
 * pitching to.
 */
import card from './self-card.json'

export type SeedCard = {
  version: number
  id: string
  name: string
  preferred: string
  verb: string
  kind: 'seed' | 'site' | 'lab' | 'project' | 'isotope'
  live: string
  repo: string
  rung: number
  description: string
  pitches: Record<string, string>
  voices: string[]
  goals: string[]
  ships: string[]
  builtFrom: string[]
}

export const SELF_CARD = card as SeedCard
