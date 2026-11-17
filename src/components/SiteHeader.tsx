import { NavLink } from 'react-router-dom'
import { SECTIONS } from '../lib/content'
import { InstallButton } from './InstallButton'

export function SiteHeader() {
  return (
    <header className="masthead">
      <a className="skip" href="#main">
        skip to the desk
      </a>
      <NavLink to="/" className="brand" aria-label="le.ad — the desk">
        <span className="brand__mark" aria-hidden="true">
          <span className="brand__desk" />
          <span className="brand__lamp" />
        </span>
        <span className="brand__name">
          le<span className="brand__dot">.</span>ad
        </span>
        <span className="brand__sub">active desk</span>
      </NavLink>

      <nav aria-label="Sections" className="nav">
        {SECTIONS.map((section) => (
          <NavLink
            key={section.id}
            to={`/${section.id}`}
            className={({ isActive }) => `nav__link ${isActive ? 'is-active' : ''}`}
          >
            {section.label}
          </NavLink>
        ))}
        <NavLink
          to="/design"
          className={({ isActive }) => `nav__link ${isActive ? 'is-active' : ''}`}
        >
          Design
        </NavLink>
        <NavLink
          to="/palette"
          className={({ isActive }) => `nav__link ${isActive ? 'is-active' : ''}`}
        >
          Palette
        </NavLink>
      </nav>

      <div className="masthead__end">
        <InstallButton />
      </div>
    </header>
  )
}
