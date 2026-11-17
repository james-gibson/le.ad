/**
 * The isotope, executed.
 *
 * `features/hot-desk.feature` states fourteen behaviours; `src/lib/desk.ts` is
 * the reference implementation; the page renders it. This file closes the last
 * gap: it runs the implementation against the same fourteen statements, so a
 * claim about conformance is a command and not a reading.
 *
 *   npm run check:desk      (vite build --ssr, then node)
 *
 * The scenarios are numbered to match the feature file, in its order. If a
 * scenario is added upstream, it is added here before the page may claim it.
 */
import {
  LEASE_MS,
  MIN_RUNG,
  RUNGS,
  claim,
  claimLive,
  decodeClaim,
  emptyDesk,
  encodeClaim,
  heartbeat,
  occupant,
  record,
  release,
  verdict,
  type Claim,
  type Desk,
} from '../src/lib/desk'

const T0 = 1_700_000_000_000
const SEED = 'synapse'
const OTHER = 'railhead'

let failures = 0
const results: string[] = []

function check(scenario: number, name: string, condition: boolean, detail = '') {
  if (condition) {
    results.push(`  ok  ${String(scenario).padStart(2, '0')}  ${name}`)
  } else {
    failures += 1
    results.push(`FAIL  ${String(scenario).padStart(2, '0')}  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const claimOf = (overrides: Partial<Claim> = {}): Claim => ({
  seed: SEED,
  surface: 'desk',
  rung: 2,
  distance: 31,
  at: T0,
  ...overrides,
})

const held: Desk = claim(emptyDesk('ad-01'), claimOf(), T0).desk

// 1. an unclaimed desk has no holder
check(1, 'unclaimed desk has no holder', occupant(emptyDesk('ad-01'), T0) === null)

// 2. absolute zero may not hold a desk
{
  const outcome = claim(emptyDesk('ad-01'), claimOf({ rung: 0, distance: 0 }), T0)
  check(
    2,
    'absolute zero is refused as rung-zero',
    !outcome.ok && outcome.reason === 'rung-zero' && outcome.desk.holder === null,
    outcome.ok ? 'accepted' : outcome.reason,
  )
  check(2, 'MIN_RUNG is 1', MIN_RUNG === 1)
}

// 3. a claim past the ceiling of its rung is refused
{
  const ceiling = RUNGS[2].max
  const outcome = claim(emptyDesk('ad-01'), claimOf({ rung: 2, distance: ceiling + 14 }), T0)
  check(
    3,
    'a claim past the ceiling is refused as drift',
    !outcome.ok && outcome.reason === 'drift' && outcome.desk.holder === null,
  )
}

// 4. a claim that fits takes the desk
{
  const outcome = claim(emptyDesk('ad-01'), claimOf(), T0)
  check(4, 'a claim that fits takes the desk', outcome.ok && outcome.desk.holder?.seed === SEED)
  check(4, 'the lease ends 90 seconds after the claim', outcome.desk.expires === T0 + LEASE_MS)
}

// 5. a second claim inside the lease is refused
{
  const outcome = claim(held, claimOf({ seed: OTHER }), T0 + 1000)
  check(
    5,
    'a second claim inside the lease is refused as held',
    !outcome.ok && outcome.reason === 'held' && outcome.desk.holder?.seed === SEED,
  )
}

// 6. a heartbeat from the holder extends the lease
{
  const outcome = heartbeat(held, SEED, T0 + 30_000)
  check(6, 'the holder may heartbeat', outcome.ok)
  check(6, 'the lease ends 90 seconds after the heartbeat', outcome.desk.expires === T0 + 30_000 + LEASE_MS)
}

// 7. a heartbeat from another seed is refused
{
  const outcome = heartbeat(held, OTHER, T0 + 30_000)
  check(
    7,
    'another seed may not heartbeat',
    !outcome.ok && outcome.reason === 'not-holder' && outcome.desk.expires === held.expires,
  )
}

// 8. an expired lease returns the desk to the row
{
  check(8, 'the desk is empty at the end of the lease', occupant(held, T0 + LEASE_MS) === null)
  check(8, 'the desk still holds one millisecond before', occupant(held, T0 + LEASE_MS - 1) !== null)
}

// 9. the holder may release the desk
{
  const outcome = release(held, SEED, T0 + 5000)
  check(9, 'the holder may release', outcome.ok && outcome.desk.holder === null)
}

// 10. a release by another seed is refused
{
  const outcome = release(held, OTHER, T0 + 5000)
  check(10, 'another seed may not release', !outcome.ok && outcome.desk.holder?.seed === SEED)
}

// 11. the record is the same for the same claim
{
  const a = claim(emptyDesk('ad-01'), claimOf(), T0).desk
  const b = claim(emptyDesk('ad-01'), claimOf(), T0).desk
  check(11, 'two identical claims publish an identical record', record(a) === record(b))
  check(11, 'the record does not carry the lease deadline', !record(a).includes('expires'))
}

// 12. a claim link decodes to the claim it encoded
{
  const original = claimOf({ rung: 3, distance: 96 })
  const round = decodeClaim(encodeClaim(original))
  check(
    12,
    'the link round-trips',
    !!round &&
      round.seed === original.seed &&
      round.rung === original.rung &&
      round.distance === original.distance &&
      round.at === original.at,
  )
  check(12, 'a malformed link decodes to nothing', decodeClaim('not-a-claim') === null)
}

// 13. an expired claim link is refused on arrival
{
  const stale = claimOf({ at: T0 })
  const now = T0 + LEASE_MS + 1
  const checkResult = verdict(stale, now)
  check(13, 'an expired link is refused as stale', !checkResult.ok && checkResult.reason === 'stale')
  check(13, 'a live link is accepted', verdict(stale, T0 + 1).ok && claimLive(stale, T0 + 1))
}

// 14. claiming one desk leaves the rest of the row untouched
{
  const row = ['ad-01', 'ad-02', 'ad-03', 'ad-04', 'ad-05', 'ad-06'].map((id) =>
    emptyDesk(id as Desk['id']),
  )
  const after = row.map((desk) => (desk.id === 'ad-01' ? claim(desk, claimOf(), T0).desk : desk))
  check(
    14,
    'one claim leaves five desks empty',
    after[0].holder !== null && after.slice(1).every((desk) => desk.holder === null),
  )
}

console.log(results.join('\n'))
console.log(
  failures
    ? `\ndesk: ${failures} of ${results.length} assertions failed — the page may not claim the isotope`
    : `\ndesk: ${results.length} assertions pass against features/hot-desk.feature (14 scenarios)`,
)
process.exit(failures ? 1 : 0)
