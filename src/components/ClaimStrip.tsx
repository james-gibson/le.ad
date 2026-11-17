import { useMemo, useState, type FormEvent } from 'react'
import {
  DESK_IDS,
  MIN_RUNG,
  REFUSAL,
  RUNGS,
  SURFACES,
  type Desk,
  type DeskId,
  type Outcome,
  type Rung,
  type Surface,
} from '../lib/desk'
import { Button, Field, Input, Select } from '../ui/controls'
import { Row, Stack, Text } from '../ui/parts'

/**
 * The claim strip.
 *
 * A claim is four declared facts and a clock: which seed, from which surface,
 * at which rung, at what 42i distance. The strip does not invent any of them —
 * it offers the lattice's own numbers and refuses with the protocol's reason.
 */
export function ClaimStrip({
  desks,
  target,
  onTarget,
  onClaim,
}: {
  desks: Desk[]
  /** the desk the strip will claim; owned by the page so a desk card can aim it */
  target: DeskId | ''
  onTarget: (id: DeskId | '') => void
  onClaim: (id: DeskId, claim: { seed: string; surface: Surface; rung: Rung; distance: number; at: number }) => Outcome
}) {
  const free = useMemo(() => desks.filter((desk) => !desk.holder).map((desk) => desk.id), [desks])
  const [seed, setSeed] = useState('')
  const [surface, setSurface] = useState<Surface>('desk')
  const [rung, setRung] = useState<Rung>(2)
  const [distance, setDistance] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const ceiling = RUNGS[rung].max

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setDone(null)
    if (!target) {
      setError('every desk is held. Wait for a lease to run out.')
      return
    }
    const outcome = onClaim(target, {
      seed: seed.trim().toLowerCase(),
      surface,
      rung,
      distance,
      at: Date.now(),
    })
    if (outcome.ok) {
      setError(null)
      setDone(`${target} is held by ${seed.trim().toLowerCase()}. The lease runs for 1:30.`)
      setSeed('')
    } else {
      setError(REFUSAL[outcome.reason])
    }
  }

  return (
    <form className="strip" onSubmit={submit} aria-labelledby="claim-heading">
      <div className="strip__lead">
        <h2 className="strip__title" id="claim-heading">
          claim a desk
        </h2>
        <Text tone="muted" size="small" as="p">
          {free.length
            ? `${free.length} of ${DESK_IDS.length} desks are empty. A desk is one body at a time.`
            : `All ${DESK_IDS.length} desks are held. A lease runs out in ninety seconds of silence.`}
        </Text>
      </div>

      <Row className="strip__fields" gap={2} wrap>
        <Field label="seed" htmlFor="claim-seed" hint="lowercase slug, 2–32">
          <Input
            id="claim-seed"
            name="seed"
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
            placeholder="synapse"
            autoComplete="off"
            spellCheck={false}
            required
            pattern="[a-z0-9][a-z0-9-]{1,31}"
          />
        </Field>

        <Field label="desk" htmlFor="claim-desk">
          <Select
            id="claim-desk"
            name="desk"
            value={target}
            onChange={(event) => onTarget(event.target.value as DeskId)}
            disabled={!free.length}
          >
            {free.length ? (
              free.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))
            ) : (
              <option value="">none free</option>
            )}
          </Select>
        </Field>

        <Field label="surface" htmlFor="claim-surface">
          <Select
            id="claim-surface"
            name="surface"
            value={surface}
            onChange={(event) => setSurface(event.target.value as Surface)}
          >
            {SURFACES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="rung" htmlFor="claim-rung" hint={`ceiling ${ceiling}`}>
          <Select
            id="claim-rung"
            name="rung"
            value={rung}
            onChange={(event) => {
              const next = Number(event.target.value) as Rung
              setRung(next)
              setDistance((current) => Math.min(current, RUNGS[next].max))
            }}
          >
            {RUNGS.filter((entry) => entry.rung >= MIN_RUNG).map((entry) => (
              <option key={entry.rung} value={entry.rung}>
                {entry.rung} · {entry.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="42i distance" htmlFor="claim-distance" hint={`0–${ceiling}`}>
          <Input
            id="claim-distance"
            name="distance"
            type="number"
            min={0}
            max={ceiling}
            value={distance}
            onChange={(event) => setDistance(Number(event.target.value))}
          />
        </Field>

        <div className="strip__submit">
          <Button type="submit" variant="primary" disabled={!free.length}>
            take the desk
          </Button>
        </div>
      </Row>

      {/* The address of the aimed desk, shown in all three forms it can be
          spoken in. This is the exposure: an address is a link, a fragment and
          a scheme, and all three adopt the same desk. */}
      {target ? (
        <p className="address">
          <span className="address__label">address</span>
          <a className="address__link" href={`${import.meta.env.BASE_URL}ad/${target}/`}>
            /ad/{target}/
          </a>
          <span className="address__sep" aria-hidden="true">
            ·
          </span>
          <code className="address__code">#{'desk=' + target}</code>
          <span className="address__sep" aria-hidden="true">
            ·
          </span>
          <code className="address__code">web+desk:{target}</code>
        </p>
      ) : null}

      <Stack gap={1} className="strip__note" aria-live="polite">
        {error ? (
          <Text tone="accent" size="small" as="p" className="strip__error">
            refused: {error}
          </Text>
        ) : done ? (
          <Text tone="muted" size="small" as="p">
            {done}
          </Text>
        ) : (
          <Text tone="muted" size="small" as="p">
            The claim is kept in this browser and in the link you copy, never sent anywhere.
          </Text>
        )}
      </Stack>
    </form>
  )
}
