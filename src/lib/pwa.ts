/**
 * Installability, honestly.
 *
 * A desk you have to find in a tab is a worse desk. `manifest.json` makes the
 * page installable as its own window, and this module is the only client-side
 * part: register the service worker the build generates, and expose the
 * browser's install prompt when it is offered.
 *
 * Nothing here fakes the prompt. If the browser has not offered one — Firefox
 * on desktop, or any browser before the second visit — the install button
 * copies the URL instead of pretending to install something.
 */
import { useEffect, useState } from 'react'

type PromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallState = {
  /** true when the browser has offered its own install prompt */
  canPrompt: boolean
  /** true when the page is already running as an installed window */
  installed: boolean
  install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
}

export function useInstall(): InstallState {
  const [prompt, setPrompt] = useState<PromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    setInstalled(standalone)

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPrompt(event as PromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  return {
    canPrompt: prompt !== null,
    installed,
    install: async () => {
      if (!prompt) return 'unavailable'
      await prompt.prompt()
      const choice = await prompt.userChoice
      if (choice.outcome === 'accepted') setPrompt(null)
      return choice.outcome
    },
  }
}

/**
 * Register the worker, but only in a built site. A dev server would cache the
 * modules being edited, which is the one thing a hot desk must not do.
 */
export function registerWorker(): void {
  if (!import.meta.env.PROD) return
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    }).catch(() => {
      // An unregistered worker is not an error the reader can act on.
    })
  })
}
