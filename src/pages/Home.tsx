import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DeskCard } from '../components/DeskCard'
import { ClaimStrip } from '../components/ClaimStrip'
import { RecordPanel } from '../components/RecordPanel'
import { DESK_IDS, LEASE_MS, REFUSAL, type Claim, type DeskId, verdict } from '../lib/desk'
import { deskFromUrl, handoffLink, readAddress, readHandoff, useDeskRow } from '../lib/desks'
import { useLaunchQueue } from '../lib/pwa'
import { usePageMeta } from '../lib/use-page-meta'
import { Rule, Text } from '../ui/parts'

function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

const ADDRESSED = (id: string) => `${id} is addressed to you — name a seed to adopt it.`

/**
 * The row.
 *
 * `address` is the desk this visit is *for*, resolved by the route `/ad/:id`.
 * It is passed in rather than read from the machine so the prerendered shell
 * already says it: a URL addressed to a desk is answered in the initial HTML,
 * not after hydration.
 */
export function Home({ address }: { address?: string }) {
  // The hook appends " · le.ad"; the prerendered shell writes the same string.
  // Passing the suffix here would print it twice.
  usePageMeta(
    address ?? 'le.ad',
    address
      ? `${address} is an address for a desk on le.ad. Name a seed to adopt it.`
      : undefined,
  )
  const row = useDeskRow()
  const navigate = useNavigate()
  const held = row.desks.filter((desk) => desk.holder).length
  const addressed = address && DESK_IDS.includes(address as DeskId) ? (address as DeskId) : null
  const [copied, setCopied] = useState<DeskId | null>(null)
  const [arrival, setArrival] = useState<string | null>(() =>
    addressed ? ADDRESSED(addressed) : null,
  )
  const [keepAlive, setKeepAlive] = useState(false)
  const [target, setTarget] = useState<DeskId | ''>(() => addressed ?? '')

  // An occupied desk is never the target, and a freed desk becomes available
  // without a reload. The strip is the only place a claim is made, so the
  // default has to be the first desk that could actually accept one.
  const free = row.desks.filter((desk) => !desk.holder).map((desk) => desk.id)
  const aimed = target && free.includes(target) ? target : (free[0] ?? '')
  const addressedDesk = addressed ? row.desks.find((desk) => desk.id === addressed) : undefined

  const latest = useRef(row)
  latest.current = row

  /**
   * Adopt an address.
   *
   * Adopting is not claiming: the desk is aimed and the seed field is focused,
   * and the claim is still the strip's to make. That is the whole difference
   * between a link that says *which desk* and a link that says *which claim*.
   */
  const adopt = useCallback((id: DeskId) => {
    setTarget(id)
    setArrival(ADDRESSED(id))
    document.getElementById('claim-seed')?.focus({ preventScroll: true })
  }, [])

  // --- the handoff ---------------------------------------------------------
  // A claim link carries the claim in the fragment, so opening it is enough:
  // the desk is claimed here, and the fragment is removed so a reload does not
  // claim it twice. A fragment that names a desk and no claim is an address,
  // and it is adopted instead.
  //
  // This listens for `hashchange` as well as mount. Pasting a second link into
  // a tab that is already open is a same-document navigation — no remount, no
  // effect — and that is exactly how a handoff is normally received.
  const applyHandoff = useCallback(() => {
    const hash = window.location.hash
    const handoff = readHandoff(hash)
    if (!handoff) {
      const addressedByHash = readAddress(hash)
      if (addressedByHash) {
        adopt(addressedByHash)
        window.history.replaceState(null, '', window.location.pathname)
      }
      return
    }
    const check = verdict(handoff.claim, Date.now())
    if (!check.ok) {
      setArrival(`refused — ${REFUSAL[check.reason]}`)
      window.history.replaceState(null, '', window.location.pathname)
      return
    }
    const outcome = latest.current.claim(handoff.desk, handoff.claim)
    if (outcome.ok) {
      setArrival(
        `${handoff.desk} is held by ${handoff.claim.seed} until ${new Date(
          Date.now() + LEASE_MS,
        ).toLocaleTimeString()}.`,
      )
    } else if (outcome.reason === 'held' && outcome.desk.holder?.seed === handoff.claim.seed) {
      setArrival(`${handoff.desk} is already yours. The lease is running.`)
    } else {
      setArrival(`refused — ${REFUSAL[outcome.reason]}`)
    }
    window.history.replaceState(null, '', window.location.pathname)
  }, [adopt])

  useEffect(() => {
    applyHandoff()
    window.addEventListener('hashchange', applyHandoff)
    return () => window.removeEventListener('hashchange', applyHandoff)
  }, [applyHandoff])

  // --- the launch queue ----------------------------------------------------
  // An installed app that asked for `focus-existing` gets its URL here, not in
  // `location`. The route change is what makes the rest of the page agree: the
  // address prop, the title, the aimed desk and the prerendered copy all follow
  // from one navigation.
  const onLaunch = useCallback(
    (url: URL) => {
      const id = deskFromUrl(url)
      if (!id) return
      navigate(`/ad/${id}`, { replace: true })
      adopt(id)
    },
    [adopt, navigate],
  )
  useLaunchQueue(onLaunch)

  useEffect(() => {
    if (addressed) setTarget(addressed)
  }, [addressed])

  // --- keep-alive ----------------------------------------------------------
  // A real seed heartbeats every thirty seconds. The switch is the same call
  // the seed would make, so leaving it on demonstrates the lease rather than
  // describing it.
  useEffect(() => {
    if (!keepAlive) return
    const tick = () => {
      for (const [id, seed] of Object.entries(latest.current.mine)) {
        if (seed) latest.current.heartbeat(id as DeskId, seed)
      }
    }
    const interval = window.setInterval(tick, 15_000)
    return () => window.clearInterval(interval)
  }, [keepAlive])

  const copy = useCallback(
    async (id: DeskId) => {
      const desk = row.desks.find((entry) => entry.id === id)
      if (!desk?.holder) return
      const link = handoffLink(id, desk.holder)
      try {
        await navigator.clipboard.writeText(link)
        setCopied(id)
        window.setTimeout(() => setCopied(null), 2400)
      } catch {
        window.prompt('Copy the claim link', link)
      }
    },
    [row.desks],
  )

  return (
    <div className="page page--home">
      <section className="plate">
        <p className="plate__eyebrow">
          <span className="dot dot--live" aria-hidden="true" /> six desks · {held} held · lease{' '}
          {clock(LEASE_MS)}
        </p>
        <h1 className="plate__title">
          {addressed ? (
            <>
              This is {addressed}.
              <br />
              <span className="plate__accent">
                {addressedDesk?.holder
                  ? `Held by ${addressedDesk.holder.seed} — take another.`
                  : 'Adopt it, or take another.'}
              </span>
            </>
          ) : (
            <>
              An empty desk,
              <br />
              <span className="plate__accent">and one claim at a time.</span>
            </>
          )}
        </h1>
        <p className="plate__lede">
          {addressed
            ? `This URL names a desk, not a claim. The strip below is aimed at ${addressed}; name a seed and the desk is adopted for one lease. Any desk can be addressed the same way — /ad/${addressed}/ is a real page, and web+desk:${addressed} is the same address for the installed app.`
            : 'le.ad holds no content. It is a connection point: a seed arrives, takes a desk, leaves a link, and leaves. When the lease runs out the desk is empty again — not stale, not haunted by a seed that stopped calling.'}
        </p>
        <p className="plate__meta">
          <a href={`${import.meta.env.BASE_URL}manifest.json`}>installable</a> ·{' '}
          <a href={`${import.meta.env.BASE_URL}llms.txt`}>llms.txt</a> ·{' '}
          <a href="#claim-heading">claim below</a>
        </p>
      </section>

      {arrival ? (
        <p className="arrival" role="status">
          <span className="arrival__key">{addressed && arrival === ADDRESSED(addressed) ? 'address' : 'handoff'}</span>{' '}
          {arrival}{' '}
          <button type="button" className="arrival__dismiss" onClick={() => setArrival(null)}>
            dismiss
          </button>
        </p>
      ) : null}

      <ClaimStrip
        desks={row.desks}
        target={aimed}
        onTarget={setTarget}
        onClaim={(id, claim: Claim) => {
          const outcome = row.claim(id, claim)
          if (outcome.ok) setArrival(`${id} is held by ${claim.seed}.`)
          return outcome
        }}
      />

      <section className="canvas" aria-labelledby="canvas-heading">
        <div className="canvas__head">
          <h2 className="canvas__title" id="canvas-heading">
            the row
          </h2>
          <Text tone="muted" size="small" as="p">
            Six desks, one lamp each. A lit lamp is a live lease; a dark one is free to take.
          </Text>
        </div>
        <div className="canvas__grid">
          {row.desks.map((desk) => (
            <DeskCard
              key={desk.id}
              desk={desk}
              now={row.now}
              mine={row.mine[desk.id]}
              onRelease={(id) => {
                const seed = row.mine[id]
                if (seed) row.release(id, seed)
              }}
              onHeartbeat={(id) => {
                const seed = row.mine[id]
                if (seed) row.heartbeat(id, seed)
              }}
              onCopy={copy}
              copied={copied === desk.id}
              onPick={(id) => {
                setTarget(id)
                document.getElementById('claim-heading')?.scrollIntoView({ block: 'center' })
                document.getElementById('claim-seed')?.focus({ preventScroll: true })
              }}
            />
          ))}
        </div>
      </section>

      <Rule />

      <section className="keepalive" aria-labelledby="keepalive-heading">
        <div>
          <h2 className="keepalive__title" id="keepalive-heading">
            keep the desk
          </h2>
          <Text tone="muted" size="small" as="p">
            A lease is ninety seconds. A heartbeat renews it; silence returns the desk to the
            row. The switch sends the same heartbeat a seed would, every fifteen seconds, for
            the desks this browser holds.
          </Text>
        </div>
        <label className="keepalive__control">
          <input
            type="checkbox"
            checked={keepAlive}
            onChange={(event) => setKeepAlive(event.target.checked)}
          />
          <span>heartbeat while this tab is open</span>
        </label>
      </section>

      <RecordPanel desks={row.desks} />

      <section className="reset">
        <Text tone="muted" size="small" as="p">
          The row is stored in this browser only. Nothing about a claim is sent to a server —
          which is also why a claim link is the way to hand a desk to a seed.
        </Text>
        <button
          type="button"
          className="linkish"
          onClick={() => {
            row.reset()
            setArrival(null)
          }}
        >
          clear this browser&rsquo;s row
        </button>
      </section>
    </div>
  )
}
