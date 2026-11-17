import { record, type Desk } from '../lib/desk'
import { Text } from '../ui/parts'

/**
 * The record.
 *
 * One line of JSON per desk, and the only place on the site that shows the
 * protocol rather than describing it. It is the same string
 * `features/hot-desk.feature` asserts is stable: two rows that received the
 * same claims publish the same record, whatever the clock says.
 */
export function RecordPanel({ desks }: { desks: Desk[] }) {
  const lines = desks.map((desk) => record(desk))

  return (
    <section className="record" aria-labelledby="record-heading">
      <div className="record__head">
        <h2 className="record__title" id="record-heading">
          the record
        </h2>
        <Text tone="muted" size="small" as="p">
          Public face of the row. No timestamps: a record is a citation, not a log.
        </Text>
      </div>
      <pre className="record__json" aria-live="polite">
        {lines.join('\n')}
      </pre>
    </section>
  )
}
