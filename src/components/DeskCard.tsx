import { LEASE_MS, remaining as remainingOf, RUNGS, type Desk, type DeskId } from '../lib/desk'
import { Badge, Row } from '../ui/parts'
import { Button } from '../ui/controls'

function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * One desk on the canvas.
 *
 * The lamp is the state: dark while the desk is empty, lit while it is held.
 * Everything else — the id, the plan, the facts — is furniture and stays put,
 * so a reader finds their own desk in the same place every time.
 */
export function DeskCard({
  desk,
  now,
  mine,
  onRelease,
  onHeartbeat,
  onCopy,
  copied,
  onPick,
}: {
  desk: Desk
  now: number
  mine: string | undefined
  onRelease: (id: DeskId) => void
  onHeartbeat: (id: DeskId) => void
  onCopy: (id: DeskId) => void
  copied: boolean
  /** aim the claim strip at this desk; the strip is the only place a claim is made */
  onPick?: (id: DeskId) => void
}) {
  const held = desk.holder !== null
  const left = remainingOf(desk, now)
  const pct = held ? Math.max(0, Math.min(100, (left / LEASE_MS) * 100)) : 0
  const id = `desk-${desk.id}`

  return (
    <article className={`desk ${held ? 'desk--held' : 'desk--empty'}`} aria-labelledby={id}>
      <header className="desk__head">
        <h3 className="desk__id" id={id}>
          {desk.id}
        </h3>
        <Badge label={held ? 'held' : 'empty'} intent={held ? 'accent' : 'muted'} />
      </header>

      <svg className="plan" viewBox="0 0 120 64" role="presentation" focusable="false">
        <path className="plan__desk" d="M12 26h96" />
        <path className="plan__leg" d="M20 26v18M100 26v18" />
        <path className="plan__chair" d="M46 44h28v12H46z" />
        <path className="plan__stem" d="M60 26V14" />
        <circle className="plan__lamp" cx="60" cy="10" r="4" />
      </svg>

      {held && desk.holder ? (
        <>
          <p className="desk__seed">{desk.holder.seed}</p>
          <dl className="facts">
            <div className="facts__pair">
              <dt>surface</dt>
              <dd>{desk.holder.surface}</dd>
            </div>
            <div className="facts__pair">
              <dt>rung</dt>
              <dd>
                {desk.holder.rung} · {RUNGS[desk.holder.rung].name}
              </dd>
            </div>
            <div className="facts__pair">
              <dt>42i</dt>
              <dd>{desk.holder.distance}</dd>
            </div>
            <div className="facts__pair">
              <dt>lease</dt>
              <dd className="facts__lease">{clock(left)}</dd>
            </div>
          </dl>
          <div
            className="lease"
            role="progressbar"
            aria-label={`lease on ${desk.id}`}
            aria-valuemin={0}
            aria-valuemax={LEASE_MS / 1000}
            aria-valuenow={Math.ceil(left / 1000)}
          >
            <span className="lease__fill" style={{ width: `${pct}%` }} />
          </div>
          <Row className="desk__actions" gap={1} wrap>
            {mine ? (
              <>
                <Button size="compact" onClick={() => onHeartbeat(desk.id)}>
                  keep
                </Button>
                <Button size="compact" onClick={() => onRelease(desk.id)}>
                  release
                </Button>
              </>
            ) : null}
            <Button size="compact" variant={mine ? 'ghost' : 'quiet'} onClick={() => onCopy(desk.id)}>
              {copied ? 'copied ✓' : 'copy link'}
            </Button>
          </Row>
        </>
      ) : (
        <>
          <p className="desk__empty">
            no holder.
            <span className="desk__empty-sub">The desk is furniture until a seed claims it.</span>
          </p>
          {onPick ? (
            <Row className="desk__actions" gap={1}>
              <Button size="compact" onClick={() => onPick(desk.id)}>
                take {desk.id}
              </Button>
            </Row>
          ) : null}
        </>
      )}
    </article>
  )
}
