import palette from '../lib/palette.json'
import { contrast } from '../lib/contrast'
import { usePageMeta } from '../lib/use-page-meta'

const tokens = palette.tokens as { name: string; hex: string; role: string; decorative?: boolean }[]
const pairs = palette.pairs as { fg: string; bg: string; min: number; note: string }[]
const hexOf = (name: string) => tokens.find((token) => token.name === name)?.hex ?? '#000000'

/**
 * The colour page.
 *
 * Every number here is computed from the same palette.json the build gate
 * reads, so the page and the guard cannot disagree about a ratio. That is the
 * whole point of printing it: a palette is a measurement, not an opinion.
 */
export function Palette() {
  usePageMeta('Palette', 'Steelblue wall, gold grain, white smoke, one sharp hot pink — and the ratios that justify them.')

  return (
    <div className="page page--palette">
      <header className="doc__head">
        <p className="doc__kicker">palette</p>
        <h1 className="doc__title">Measured, not chosen.</h1>
        <p className="doc__lede">
          A muted steelblue wall with a gold grain over it, white smoke for ink, and one sharp
          hot pink that is reserved for the thing you should do next. The bright contrast is
          diffused by the grain and the smoke before any ink lands on it — the wall never has a
          hard edge to fight.
        </p>
      </header>

      <section className="palette__swatches" aria-label="Tokens">
        {tokens.map((token) => (
          <div className="swatch" key={token.name}>
            <span className="swatch__chip" style={{ background: token.hex }} aria-hidden="true" />
            <span className="swatch__name">{token.name}</span>
            <span className="swatch__hex">{token.hex}</span>
            <span className="swatch__role">{token.role}</span>
          </div>
        ))}
      </section>

      <h2>Declared pairs</h2>
      <p className="muted">
        Every ink the site paints is one of these, against a ground it is actually painted on.
        The floor is the minimum each pair promised; the ratio is what it measures today.
      </p>
      <div className="table-wrap">
        <table className="pairs">
          <caption className="visually-hidden">
            Declared colour pairs, their floors and their measured ratios
          </caption>
          <thead>
            <tr>
              <th scope="col">ink</th>
              <th scope="col">ground</th>
              <th scope="col">floor</th>
              <th scope="col">measured</th>
              <th scope="col">where</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair) => {
              const measured = contrast(hexOf(pair.fg), hexOf(pair.bg))
              const pass = measured >= pair.min
              return (
                <tr key={`${pair.fg}-${pair.bg}`} className={pass ? '' : 'is-fail'}>
                  <td>
                    <span
                      className="pairs__ink"
                      style={{ background: hexOf(pair.fg) }}
                      aria-hidden="true"
                    />
                    {pair.fg}
                  </td>
                  <td>
                    <span
                      className="pairs__ink"
                      style={{ background: hexOf(pair.bg) }}
                      aria-hidden="true"
                    />
                    {pair.bg}
                  </td>
                  <td>{pair.min.toFixed(1)}</td>
                  <td className="pairs__ratio">{measured.toFixed(2)}:1</td>
                  <td>{pair.note}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <h2>The texture</h2>
      <p className="muted">
        Two noise fields, both SVG turbulence generated in the stylesheet. The gold one carries
        a matrix that tints the grain to the token; the cold one sits on top at a fifth of the
        strength so the gold does not read as a flat wash. Neither is an image to download and
        neither is a decorative overlay on top of the text — both are under it.
      </p>
      <div className="texture">
        <div className="texture__sample" aria-hidden="true" />
        <p className="texture__note">
          If you can see the grain, it is too strong. It exists to break the wall's flat edge,
          not to be looked at.
        </p>
      </div>
    </div>
  )
}
