import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Layout } from './components/Layout'
import { SECTIONS, getPage, type SectionId } from './lib/content'
import { DESK_IDS, type DeskId } from './lib/desk'
import { Design } from './pages/Design'
import { DocPage } from './pages/DocPage'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import { Palette } from './pages/Palette'
import { SectionIndex } from './pages/SectionIndex'

function isSection(value: string | undefined): value is SectionId {
  return !!value && SECTIONS.some((s) => s.id === value)
}

function SectionRoute() {
  const { section } = useParams()
  if (!isSection(section)) return <NotFound />
  return <SectionIndex section={section} />
}

function PageRoute() {
  const { section, slug } = useParams()
  const page = isSection(section) && slug ? getPage(section, slug) : undefined
  if (!page) return <NotFound />
  return <DocPage page={page} />
}

/**
 * A desk, addressed.
 *
 * `/ad/ad-03` is the page form of a desk address: a real 200 on Pages, a real
 * `<title>`, and the same parse as `web+desk:ad-03` and `#desk=ad-03`. It ranks
 * above the content route, so a desk id can never be mistaken for a page slug.
 */
function DeskAddressRoute() {
  const { id } = useParams()
  if (!id || !DESK_IDS.includes(id as DeskId)) return <NotFound />
  return <Home address={id} />
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="design" element={<Design />} />
        <Route path="palette" element={<Palette />} />
        <Route path="ad/:id" element={<DeskAddressRoute />} />
        <Route path="desk/index" element={<Navigate to="/desk" replace />} />
        <Route path=":section" element={<SectionRoute />} />
        <Route path=":section/:slug" element={<PageRoute />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
