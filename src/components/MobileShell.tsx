import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { t } from '../utils/i18n'
import { readFileAsDataUrl } from '../utils/files'
import { useMealPhotoAnalysis } from '../state/MealPhotoAnalysisContext'

function NavIcon(props: { name: 'home' | 'scan' | 'manual' | 'history' | 'settings'; active: boolean; tone?: 'inverse' }) {
  const stroke = props.tone === 'inverse' ? '#ffffff' : props.active ? '#047857' : '#64748b'
  const common = { stroke, strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  if (props.name === 'home') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path {...common} d="M4 11l8-7 8 7" />
        <path {...common} d="M6.5 10.5V20h11V10.5" />
      </svg>
    )
  }

  if (props.name === 'scan') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path {...common} d="M7 7h2l1-2h4l1 2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
        <path {...common} d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
      </svg>
    )
  }

  if (props.name === 'manual') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path {...common} d="M4 20h16" />
        <path {...common} d="M6 16l8.5-8.5a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8L11 19H6v-3z" />
      </svg>
    )
  }

  if (props.name === 'history') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path {...common} d="M7 4h10" />
        <path {...common} d="M7 8h10" />
        <path {...common} d="M7 12h7" />
        <path {...common} d="M7 16h10" />
        <path {...common} d="M5 4v16" />
        <path {...common} d="M19 4v16" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path {...common} d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
      <path
        {...common}
        d="M19.4 15a8.2 8.2 0 0 0 .1-6l-2 .7a6.2 6.2 0 0 1 0 4.6l2 .7z"
      />
      <path
        {...common}
        d="M4.6 9a8.2 8.2 0 0 0-.1 6l2-.7a6.2 6.2 0 0 1 0-4.6l-2-.7z"
      />
      <path
        {...common}
        d="M15 4.6a8.2 8.2 0 0 0-6 .1l.7 2a6.2 6.2 0 0 1 4.6 0l.7-2z"
      />
      <path
        {...common}
        d="M9 19.4a8.2 8.2 0 0 0 6-.1l-.7-2a6.2 6.2 0 0 1-4.6 0l-.7 2z"
      />
    </svg>
  )
}

export function MobileShell(props: { title: string; children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))
  const location = useLocation()
  const navigate = useNavigate()

  const { activeMealId, queuedMealIds } = useMealPhotoAnalysis()

  const scanInputRef = useRef<HTMLInputElement | null>(null)
  const scanGalleryInputRef = useRef<HTMLInputElement | null>(null)

  const [scanSourcePickerOpen, setScanSourcePickerOpen] = useState(false)

  const isAndroid = typeof navigator !== 'undefined' ? /Android/i.test(navigator.userAgent) : false

  function formatDatetimeLocalValue(date: Date) {
    const tzOffsetMs = date.getTimezoneOffset() * 60_000
    const local = new Date(date.getTime() - tzOffsetMs)
    return local.toISOString().slice(0, 16)
  }

  async function onPickScanPhoto(file: File | null) {
    if (!file) return
    try {
      const eatenAtLocal = formatDatetimeLocalValue(new Date())
      const photoDataUrl = await readFileAsDataUrl(file)
      navigate('/capture', { state: { eatenAtLocal, photoDataUrl } })
    } catch {
      navigate('/capture')
    }
  }

  function openScanPicker() {
    if (!location.pathname.startsWith('/capture')) {
      navigate('/capture')
    }

    if (isAndroid) {
      setScanSourcePickerOpen(true)
      return
    }

    const el = scanInputRef.current
    if (!el) return
    el.value = ''
    el.click()
  }

  function pickScanSource(source: 'camera' | 'gallery') {
    const el = source === 'camera' ? scanInputRef.current : scanGalleryInputRef.current
    setScanSourcePickerOpen(false)
    if (!el) {
      navigate('/capture')
      return
    }
    el.value = ''
    el.click()
  }

  const navItems: Array<{ to: string; label: string; icon: Parameters<typeof NavIcon>[0]['name']; match: (path: string) => boolean }> = [
    { to: '/', label: 'Dashboard', icon: 'home', match: (p) => p === '/' },
    { to: '/meals', label: 'Meal History', icon: 'history', match: (p) => p.startsWith('/meals') },
    { to: '/manual', label: 'Manual Entry', icon: 'manual', match: (p) => p.startsWith('/manual') },
    { to: '/settings', label: 'Settings', icon: 'settings', match: (p) => p.startsWith('/settings') || p.startsWith('/profile') },
  ]

  const bottomNavItems: Array<{ to: string; label: string; icon: Parameters<typeof NavIcon>[0]['name']; match: (path: string) => boolean }> = [
    navItems[0],
    navItems[1],
    { to: '/capture', label: 'Scan', icon: 'scan', match: (p) => p.startsWith('/capture') },
    navItems[2],
    navItems[3],
  ]

  const hideBottomNav = location.pathname.startsWith('/capture')

  function linkClass(active: boolean) {
    return active
      ? 'flex items-center gap-3 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-900'
      : 'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white/70 hover:text-slate-900'
  }

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
      <input
        ref={scanInputRef}
        className="sr-only"
        data-testid="scan-file-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => void onPickScanPhoto(e.target.files?.[0] ?? null)}
      />
      <input
        ref={scanGalleryInputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        onChange={(e) => void onPickScanPhoto(e.target.files?.[0] ?? null)}
      />
      <div className="mx-auto max-w-6xl px-4 py-4 md:px-6">
        <div className="md:grid md:grid-cols-[260px_1fr] md:gap-8">
          <aside className="hidden md:block">
            <div className="sticky top-4 flex min-h-[calc(100vh-2rem)] flex-col rounded-3xl bg-emerald-50/60 p-4">
              <Link to="/" className="flex items-center gap-3 px-2 py-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                    <path
                      d="M5 21c6-1 10-5 12-10 1.6-4-2-8-6-6C7 7 3 11 3 17c0 2 1 4 2 4z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8 16c3-2 5-4 8-8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="text-lg font-semibold tracking-tight">{props.title}</div>
              </Link>

              <nav className="mt-3 space-y-1" aria-label="Primary">
                {navItems.map((item) => {
                  const active = item.match(location.pathname)
                  return (
                    <Link key={item.to} to={item.to} className={linkClass(active)}>
                      <NavIcon name={item.icon} active={active} />
                      {item.label}
                    </Link>
                  )
                })}
              </nav>

              <div className="mt-auto pt-4">
                <button
                  onClick={() => openScanPicker()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:brightness-95"
                  type="button"
                >
                  <NavIcon name="scan" active={true} tone="inverse" />
                  Scan Meal
                </button>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            {!isOnline ? (
              <div
                className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                role="status"
                aria-live="polite"
              >
                {t('offline_banner')}
              </div>
            ) : null}

            {activeMealId || queuedMealIds.length > 0 ? (
              <button
                className="mb-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm shadow-sm hover:bg-slate-50"
                onClick={() => {
                  const target = activeMealId ?? queuedMealIds[0] ?? null
                  if (!target) return
                  navigate(`/meals/${target}`)
                }}
                type="button"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900">Analyzing in background</div>
                  <div className="truncate text-xs text-slate-600">
                    {activeMealId ? 'Running now' : 'Waiting to start'}
                    {queuedMealIds.length > 0 ? ` • ${queuedMealIds.length} queued` : ''}
                  </div>
                </div>
                <div className="shrink-0 rounded-xl bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700">View</div>
              </button>
            ) : null}

            <main className="pb-24 md:pb-0">
              <div className="mx-auto w-full max-w-4xl">{props.children}</div>
            </main>
          </div>
        </div>
      </div>

      {!hideBottomNav ? (
        <nav
          className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white md:hidden"
          aria-label="Bottom navigation"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="relative mx-auto max-w-md px-2 py-2">
            <div className="grid grid-cols-5 gap-1">
              {bottomNavItems.map((item) => {
                const active = item.match(location.pathname)

                if (item.to === '/capture') {
                  return (
                    <div key={item.to} className="relative">
                      <button
                        onClick={() => openScanPicker()}
                        className="absolute left-1/2 top-[-22px] flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 shadow-lg ring-8 ring-white"
                        aria-label={item.label}
                        type="button"
                      >
                        <NavIcon name={item.icon} active={true} tone="inverse" />
                      </button>
                      <div className="h-10" />
                    </div>
                  )
                }

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={
                      active
                        ? 'rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-2 py-2 text-center text-[11px] font-medium text-white'
                        : 'rounded-xl px-2 py-2 text-center text-[11px] text-slate-700 hover:bg-slate-100'
                    }
                  >
                    <div className="mx-auto flex w-full flex-col items-center gap-1">
                      <NavIcon name={item.icon} active={active} tone={active ? 'inverse' : undefined} />
                      <div className="leading-none">{item.label}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </nav>
      ) : null}

      {scanSourcePickerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            className="absolute inset-0 bg-black/40"
            onClick={() => setScanSourcePickerOpen(false)}
            type="button"
            aria-label="Close"
          />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white p-4 shadow-2xl">
            <div className="text-sm font-semibold text-slate-900">Scan</div>
            <div className="mt-1 text-xs text-slate-600">Choose camera or gallery.</div>
            <div className="mt-3 grid gap-2">
              <button
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 active:brightness-95"
                onClick={() => pickScanSource('camera')}
                type="button"
              >
                Camera
              </button>
              <button
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => pickScanSource('gallery')}
                type="button"
              >
                Gallery
              </button>
              <button
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => setScanSourcePickerOpen(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
