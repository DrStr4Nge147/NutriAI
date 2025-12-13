import { useEffect, useState, type ReactNode } from 'react'
import { t } from '../utils/i18n'

export function MobileShell(props: { title: string; children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))

  useEffect(() => {
    if (typeof window === 'undefined') return

    function onOnline() {
      setIsOnline(true)
    }

    function onOffline() {
      setIsOnline(false)
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-md px-4 py-4">
        {!isOnline ? (
          <div
            className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            role="status"
            aria-live="polite"
          >
            {t('offline_banner')}
          </div>
        ) : null}
        <header className="mb-4">
          <h1 className="text-lg font-semibold">{props.title}</h1>
        </header>
        <main>{props.children}</main>
      </div>
    </div>
  )
}
