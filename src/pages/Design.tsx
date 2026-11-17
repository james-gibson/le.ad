import { useState } from 'react'
import { DeskCard } from '../components/DeskCard'
import { LEASE_MS, RUNGS, type Desk } from '../lib/desk'
import { usePageMeta } from '../lib/use-page-meta'
import { Badge, Dot, Panel, Row, Rule, Stack, Text } from '../ui/parts'
import { Button, Field, Input, Select, Switch, TabPanel, Tabs } from '../ui/controls'
import { theme, WALL } from '../ui/theme'

const demoHeld: Desk = {
  id: 'ad-02',
  claims: 3,
  holder: { seed: 'synapse', surface: 'desk', rung: 4, distance: 118, at: 0 },
  expires: LEASE_MS,
}

const demoEmpty: Desk = { id: 'ad-05', claims: 0, holder: null, expires: null }

const CONTRACT: [string, string][] = [
  ['colors.background', WALL.ink],
  ['colors.surface', WALL.panel],
  ['colors.foreground', WALL.smoke],
  ['colors.mutedForeground', WALL.smokeDim],
  ['colors.border', WALL.line],
  ['colors.focus', WALL.pinkInk],
  ['colors.primary', WALL.pink],
  ['colors.primaryForeground', WALL.night],
  ['colors.destructive', WALL.pinkDeep],
  ['colors.success', WALL.goldSoft],
  ['glyphs.check / radio', '✓ ●'],
  ['glyphs.thumb / track', '▮ ╌'],
  ['borders.style', theme.get().borders.style],
  ['density.paddingX', `${theme.get().density.paddingX}ch`],
]

/**
 * The live catalogue.
 *
 * Every control here is the one the site ships, with the props the site
 * actually uses — a design page that renders a component nobody renders is a
 * screenshot with extra steps.
 */
export function Design() {
  usePageMeta('Design', 'The parts le.ad ships, live: buttons, fields, badges, a switch, a tab list, and the desk in both states.')
  const [on, setOn] = useState(true)
  const [tab, setTab] = useState<'parts' | 'tokens'>('parts')
  const [text, setText] = useState('synapse')
  const [rung, setRung] = useState(2)
  const [busy, setBusy] = useState(false)

  return (
    <div className="page page--design">
      <header className="doc__head">
        <p className="doc__kicker">design</p>
        <h1 className="doc__title">The parts, live.</h1>
        <p className="doc__lede">
          Behaviour in typed components, presentation in tokens you can edit — the same split
          tuiparts.sh makes for a terminal, applied to a desk in a browser. A recipe that is not
          on this page is not on the site.
        </p>
      </header>

      <Tabs
        label="Design sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'parts', label: 'parts' },
          { id: 'tokens', label: 'tokens' },
        ]}
      />

      {tab === 'parts' ? (
        <TabPanel id="design-parts" label="parts">
          <h2>Button</h2>
          <p className="muted">
            Three variants, two sizes. `primary` is the one action on a screen: the accent fill
            with ink-dark text, measured at the ratio printed on the palette page.
          </p>
          <Row gap={2} wrap className="design__row">
            <Button variant="primary">take the desk</Button>
            <Button>copy link</Button>
            <Button variant="ghost">dismiss</Button>
            <Button size="compact">keep</Button>
            <Button variant="primary" disabled>
              full
            </Button>
            <Button variant="primary" aria-busy={busy} onClick={() => setBusy(!busy)}>
              {busy ? 'working…' : 'idle'}
            </Button>
          </Row>

          <h2>Badge and dot</h2>
          <p className="muted">
            Presentation only: a status label composed from text and a mark, with no state and
            nothing to press. The dot is the same contract as the lamp on a desk.
          </p>
          <Row gap={3} wrap className="design__row">
            <Badge label="empty" intent="muted" />
            <Badge label="held" intent="accent" />
            <Badge label="installable" />
            <span className="design__dot">
              <Dot intent="live" /> lamp lit
            </span>
            <span className="design__dot">
              <Dot intent="muted" /> lamp dark
            </span>
          </Row>

          <h2>Field</h2>
          <p className="muted">
            A label, the control, and one line of hint or one line of error — never both. The
            hint says what the value may be; the error repeats the protocol's own refusal.
          </p>
          <Row gap={3} wrap className="design__row">
            <Field label="seed" htmlFor="design-seed" hint="lowercase slug, 2–32">
              <Input
                id="design-seed"
                value={text}
                onChange={(event) => setText(event.target.value)}
                spellCheck={false}
              />
            </Field>
            <Field label="rung" htmlFor="design-rung" hint={`ceiling ${RUNGS[rung].max}`}>
              <Select
                id="design-rung"
                value={rung}
                onChange={(event) => setRung(Number(event.target.value))}
              >
                {RUNGS.filter((entry) => entry.rung > 0).map((entry) => (
                  <option key={entry.rung} value={entry.rung}>
                    {entry.rung} · {entry.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="seed" htmlFor="design-error" error="a seed name is a lowercase slug">
              <Input id="design-error" defaultValue="Synapse!" aria-invalid="true" />
            </Field>
          </Row>

          <h2>Switch</h2>
          <p className="muted">
            A button with `role="switch"`. The pressed state is `aria-checked`; the thumb is only
            its visible half, so the two cannot drift.
          </p>
          <div className="design__row">
            <Switch
              checked={on}
              onChange={setOn}
              label="heartbeat while this tab is open"
              hint="renews every fifteen seconds"
            />
          </div>

          <h2>Set in use: a desk</h2>
          <p className="muted">
            The whole vocabulary on one component: a Badge, a plan drawn in one-pixel lines, a
            definition list, a lease bar, and the two actions that belong to a holder.
          </p>
          <div className="canvas__grid design__desks">
            <DeskCard
              desk={demoHeld}
              now={0}
              mine="synapse"
              onRelease={() => {}}
              onHeartbeat={() => {}}
              onCopy={() => {}}
              copied={false}
            />
            <DeskCard
              desk={demoEmpty}
              now={0}
              mine={undefined}
              onRelease={() => {}}
              onHeartbeat={() => {}}
              onCopy={() => {}}
              copied={false}
            />
          </div>
        </TabPanel>
      ) : (
        <TabPanel id="design-tokens" label="tokens">
          <h2>The tuiparts contract</h2>
          <p className="muted">
            The names in this table are copied from
            <a href="https://tuiparts.sh/docs/theming"> tuiparts&rsquo; token contract</a>, field
            for field: intent colours are background and foreground pairs, so a Recipe never
            infers text contrast; glyphs are characters; density is horizontal padding in
            character cells. le.ad&rsquo;s own wall is a second, smaller object — the parts can be
            replaced without repainting the room.
          </p>
          <Panel className="design__tokens">
            <table>
              <caption className="visually-hidden">Token contract values</caption>
              <thead>
                <tr>
                  <th scope="col">token</th>
                  <th scope="col">value</th>
                </tr>
              </thead>
              <tbody>
                {CONTRACT.map(([key, value]) => (
                  <tr key={key}>
                    <td>
                      <code>{key}</code>
                    </td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <h2>What is not carried over</h2>
          <p className="muted">
            tuiparts renders into a terminal through OpenTUI. There is no OpenTUI renderer for a
            browser, so `@tuiparts/react` cannot be a dependency of a GitHub Pages site — the
            primitives would have nothing to attach to. What is carried over is the division and
            the vocabulary: Roots with real platform behaviour, Parts that read them, and
            presentation as source. Ticket it the way the lab does:{' '}
            <a href="https://github.com/tuiparts/tuiparts">tuiparts</a> is the upstream, and if a
            web renderer ships, the parts in <code>src/ui/</code> are the ones that get deleted.
          </p>
          <Rule />
          <Stack gap={2}>
            <Text tone="muted" size="small" as="p">
              The full palette, with measured ratios, is on the palette page.
            </Text>
            <Row gap={2}>
              <Button variant="ghost" onClick={() => setTab('parts')}>
                back to the parts
              </Button>
            </Row>
          </Stack>
        </TabPanel>
      )}
    </div>
  )
}
