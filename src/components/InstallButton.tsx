import { useState } from 'react'
import { useInstall } from '../lib/pwa'

/**
 * The install door.
 *
 * Chrome and Edge offer a prompt; this button uses it. Everything else — which
 * is most browsers on the first visit — gets the truthful alternative: the
 * manifest is there, the browser's own menu has the install item, and the URL
 * below is what to drag to a home screen. Nothing pretends to install.
 */
export function InstallButton() {
  const { canPrompt, installed, install } = useInstall()
  const [note, setNote] = useState<string | null>(null)

  if (installed) {
    return (
      <span className="chip chip--done" title="Running as an installed window">
        ◆ installed
      </span>
    )
  }

  return (
    <div className="install">
      <button
        type="button"
        className="btn btn--quiet btn--compact"
        onClick={async () => {
          if (canPrompt) {
            const outcome = await install()
            if (outcome === 'dismissed') setNote('dismissed — the browser menu still has it')
            return
          }
          setNote('open your browser menu → install, or add this page to your home screen')
        }}
        aria-describedby={note ? 'install-note' : undefined}
      >
        install
      </button>
      {note ? (
        <p className="install__note" id="install-note" role="status">
          {note}
        </p>
      ) : null}
    </div>
  )
}
