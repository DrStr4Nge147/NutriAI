import { useEffect, useMemo, useState } from 'react'
import { useUiFeedback } from '../state/UiFeedbackContext'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isInstalled(): boolean {
  if (typeof window === 'undefined') return false

  const standaloneMatch = window.matchMedia?.('(display-mode: standalone)')?.matches
  if (standaloneMatch) return true

  const nav = navigator as unknown as { standalone?: boolean }
  if (nav.standalone) return true

  return false
}

function isIos(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua)
}

export function PwaInstallButton(props: { className?: string }) {
  const { toast } = useUiFeedback()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState<boolean>(() => isInstalled())

  const visible = useMemo(() => {
    if (installed) return false
    return true
  }, [installed])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const onAppInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    const mql = window.matchMedia?.('(display-mode: standalone)')
    const onDisplayModeChange = () => {
      if (isInstalled()) {
        setInstalled(true)
        setDeferredPrompt(null)
      }
    }

    if (mql?.addEventListener) mql.addEventListener('change', onDisplayModeChange)

    if (isInstalled()) {
      setInstalled(true)
      setDeferredPrompt(null)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
      if (mql?.removeEventListener) mql.removeEventListener('change', onDisplayModeChange)
    }
  }, [])

  async function onInstall() {
    const prompt = deferredPrompt
    if (!prompt) {
      if (isIos()) {
        toast({
          kind: 'info',
          message: 'To install on iPhone: tap Share, then “Add to Home Screen”.',
        })
        return
      }

      toast({
        kind: 'info',
        message: 'Install isn’t available yet. Try in a production (HTTPS) build with the service worker active.',
      })
      return
    }

    try {
      await prompt.prompt()
      const choice = await prompt.userChoice
      if (choice.outcome === 'accepted') {
        setInstalled(true)
        setDeferredPrompt(null)
      }
    } catch {
      return
    }
  }

  if (!visible) return null

  return (
    <div className={props.className ?? ''}>
      <button
        type="button"
        onClick={() => void onInstall()}
        className="w-full rounded-2xl bg-black px-4 py-3 text-left shadow-sm transition active:scale-[0.99]"
        aria-label="Install this app"
      >
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 3v10" strokeLinecap="round" />
              <path d="M8 9l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 17v3h16v-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>

          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight text-white">Install</div>
            <div className="mt-0.5 text-xs text-white/80">Add to your home screen for faster access</div>
          </div>

          <div className="ml-auto inline-flex shrink-0 items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
            Get
          </div>
        </div>
      </button>
    </div>
  )
}
