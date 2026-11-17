import { Link } from 'react-router-dom'
import { SECTIONS } from '../lib/content'
import { usePageMeta } from '../lib/use-page-meta'

export function NotFound() {
  usePageMeta('Not found', 'That desk is not on this floor.')

  return (
    <div className="page page--404">
      <p className="doc__kicker">404</p>
      <h1 className="doc__title">
        No desk here.
      </h1>
      <p className="doc__lede">
        The path is the URL, and this path is not one of them. The row is on the home page; the
        sections are below it.
      </p>
      <ul className="notfound__list">
        <li>
          <Link to="/">the row</Link>
        </li>
        {SECTIONS.map((section) => (
          <li key={section.id}>
            <Link to={`/${section.id}`}>{section.label.toLowerCase()}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
