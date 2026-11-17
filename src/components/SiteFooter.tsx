import { Link } from 'react-router-dom'
import { SITE } from '../lib/site'

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer__row">
        <p className="footer__line">
          <span className="footer__key">le.ad</span> — an empty hot desk. Six desks, one claim
          each, a ninety-second lease.
        </p>
        <p className="footer__line footer__line--dim">
          A <a href="https://github.com/james-gibson/le.gume">le.gume</a> seed. AGPL-3.0-only.
        </p>
      </div>
      <div className="footer__row">
        <nav aria-label="Elsewhere" className="footer__links">
          <a href={SITE.repo}>source</a>
          <Link to="/isotope/hot-desk">the isotope</Link>
          <Link to="/design">design</Link>
          <Link to="/palette">palette</Link>
          <a href={`${import.meta.env.BASE_URL}llms.txt`}>llms.txt</a>
          <a href={`${import.meta.env.BASE_URL}manifest.json`}>manifest.json</a>
        </nav>
        <p className="footer__line footer__line--dim">{SITE.handoff}</p>
      </div>
    </footer>
  )
}
