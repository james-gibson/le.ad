/**
 * The desk row: persistence, the clock, and the handoff link.
 *
 * The protocol in desk.ts is pure. This file is the part that touches the
 * browser, and it keeps the same rule: nothing here changes a desk without
 * going through desk.ts first. Storage is a cache of decisions, never a
 * second opinion about them.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DESK_IDS,
  claim as claimDesk,
  decodeClaim,
  encodeClaim,
  emptyDesks,
  heartbeat as heartbeatDesk,
  release as releaseDesk,
  sweep,
  type Claim,
  type Desk,
  type DeskId,
  type Outcome,
} from './desk'

const KEY = 'le.ad.desks.v1'
const MINE = 'le.ad.mine.v1'

function isDesk(value: unknown): value is Desk {
  if (!value || typeof value !== 'object') return false
  const desk = value as Desk
  if (!DESK_IDS.includes(desk.id)) return false
  if (typeof desk.claims !== 'number') return false
  if (desk.expires !== null && typeof desk.expires !== 'number') return false
  if (desk.holder === null) return true
  const holder = desk.holder
  return (
    typeof holder.seed === 'string' &&
    typeof holder.surface === 'string' &&
    typeof holder.rung === 'number' &&
    typeof holder.distance === 'number' &&
    typeof holder.at === 'number'
  )
}

/** The desks this browser has claimed, and the seed name it claimed them with. */
export type Mine = Partial<Record<DeskId, string>>

export function readMine(): Mine {
  if (typeof localStorage === 'undefined') return {}
  try {
    const parsed = JSON.parse(localStorage.getItem(MINE) ?? '{}') as Record<string, unknown>
    const out: Mine = {}
    for (const id of DESK_IDS) {
      const seed = parsed[id]
      if (typeof seed === 'string') out[id] = seed
    }
    return out
  } catch {
    return {}
  }
}

function writeMine(mine: Mine): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(MINE, JSON.stringify(mine))
  } catch {
    // See writeDesks.
  }
}

/** Never trust the store: a bad or partial value is a fresh row, not a crash. */
export function readDesks(): Desk[] {
  if (typeof localStorage === 'undefined') return emptyDesks()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyDesks()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return emptyDesks()
    const known = new Map(parsed.filter(isDesk).map((desk) => [desk.id, desk]))
    return DESK_IDS.map((id) => known.get(id) ?? { id, holder: null, expires: null, claims: 0 })
  } catch {
    return emptyDesks()
  }
}

function writeDesks(desks: Desk[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(desks))
  } catch {
    // Storage can be full or blocked. The desk keeps working for this tab.
  }
}

/** A clock a component can render. One interval, shared by nothing else. */
export function useNow(interval = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), interval)
    return () => window.clearInterval(id)
  }, [interval])
  return now
}

export type DeskRow = {
  desks: Desk[]
  now: number
  /** desk id -> the seed name this browser claimed it with */
  mine: Mine
  /** claim, heartbeat, release — each returns the outcome the protocol gave */
  claim: (id: DeskId, claim: Claim) => Outcome
  heartbeat: (id: DeskId, seed: string) => Outcome
  release: (id: DeskId, seed: string) => Outcome
  reset: () => void
}

export function useDeskRow(): DeskRow {
  const [desks, setDesks] = useState<Desk[]>(readDesks)
  const [mine, setMine] = useState<Mine>(readMine)
  const now = useNow(1000)

  // Another tab claiming a desk is not a conflict to resolve, it is the same
  // row. Adopt its value; the protocol already decided.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY) setDesks(readDesks())
      if (event.key === MINE) setMine(readMine())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const commit = useCallback((next: Desk[]) => {
    setDesks(next)
    writeDesks(next)
  }, [])

  const remember = useCallback((next: Mine) => {
    setMine(next)
    writeMine(next)
  }, [])

  const claim = useCallback(
    (id: DeskId, next: Claim) => {
      const current = readDesks()
      const desk = current.find((entry) => entry.id === id) ?? { id, holder: null, expires: null, claims: 0 }
      const outcome = claimDesk(desk, next, Date.now())
      commit(current.map((entry) => (entry.id === id ? outcome.desk : entry)))
      if (outcome.ok) remember({ ...readMine(), [id]: next.seed })
      return outcome
    },
    [commit, remember],
  )

  const heartbeat = useCallback(
    (id: DeskId, seed: string) => {
      const current = readDesks()
      const desk = current.find((entry) => entry.id === id)
      if (!desk) return { ok: false, reason: 'not-holder', desk: { id, holder: null, expires: null, claims: 0 } } as Outcome
      const outcome = heartbeatDesk(desk, seed, Date.now())
      commit(current.map((entry) => (entry.id === id ? outcome.desk : entry)))
      return outcome
    },
    [commit],
  )

  const release = useCallback(
    (id: DeskId, seed: string) => {
      const current = readDesks()
      const desk = current.find((entry) => entry.id === id)
      if (!desk) return { ok: false, reason: 'not-holder', desk: { id, holder: null, expires: null, claims: 0 } } as Outcome
      const outcome = releaseDesk(desk, seed, Date.now())
      commit(current.map((entry) => (entry.id === id ? outcome.desk : entry)))
      if (outcome.ok) {
        const next = { ...readMine() }
        delete next[id]
        remember(next)
      }
      return outcome
    },
    [commit, remember],
  )

  const reset = useCallback(() => {
    commit(emptyDesks())
    remember({})
  }, [commit, remember])

  // Expiry is applied on read everywhere, so a stale lease never survives a
  // render even if no write ever happens.
  const live = useMemo(() => desks.map((desk) => sweep(desk, now)), [desks, now])

  return { desks: live, now, mine, claim, heartbeat, release, reset }
}

// --- the handoff link ------------------------------------------------------
// The claim is carried in the fragment, not the query:
//   #desk=ad-03&claim=<token>
// Pages never sees it, so a desk that holds no content also sends no content
// to a server on the way in. It is short enough to paste into a channel.

export type Handoff = { desk: DeskId; token: string; claim: Claim }

export function readHandoff(hash: string): Handoff | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return null
  const params = new URLSearchParams(raw)
  const desk = params.get('desk')
  const token = params.get('claim')
  if (!desk || !token) return null
  if (!DESK_IDS.includes(desk as DeskId)) return null
  const claim = decodeClaim(token)
  if (!claim) return null
  return { desk: desk as DeskId, token, claim }
}

export function handoffLink(desk: DeskId, claim: Claim): string {
  const token = encodeClaim(claim)
  const base = typeof window === 'undefined' ? 'https://james-gibson.github.io/le.ad/' : `${window.location.origin}${import.meta.env.BASE_URL}`
  return `${base}#desk=${desk}&claim=${token}`
}
