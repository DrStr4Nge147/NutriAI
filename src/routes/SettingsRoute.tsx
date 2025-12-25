import { useMemo, useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAiSettings, isHostedOnline, setAiSettings } from '../ai/settings'
import { getUiTheme, saveAndApplyUiTheme, type UiTheme } from '../ui/theme'
import {
  getReminderSettings,
  refreshReminderScheduler,
  requestNotificationPermission,
  setReminderSettings,
} from '../notifications/reminders'
import { exportAllData, importAllData } from '../storage/exportImport'
import { clearAllData } from '../storage/db'
import { GeminiTutorialModal } from '../components/GeminiTutorialModal'
import { useApp } from '../state/AppContext'
import { useUiFeedback } from '../state/UiFeedbackContext'
import { getAiChatBubbleEnabled, setAiChatBubbleEnabled } from '../ui/aiChatBubble'

export function SettingsRoute() {
  const navigate = useNavigate()
  const { refresh } = useApp()
  const { toast, confirm } = useUiFeedback()
  const [busy, setBusy] = useState(false)
  const [uiTheme, setUiThemeState] = useState<UiTheme>(() => getUiTheme())
  const [aiSettings, setAiSettingsState] = useState(() => getAiSettings())
  const [hostedOnline] = useState(() => isHostedOnline())
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    if (typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(max-width: 767px)').matches
  })
  const [geminiTutorialOpen, setGeminiTutorialOpen] = useState(false)
  const [reminders, setRemindersState] = useState(() => getReminderSettings())
  const [aiChatBubbleEnabled, setAiChatBubbleEnabledState] = useState(() => getAiChatBubbleEnabled())
  const savedAiSettingsRef = useRef(getAiSettings())
  const savedRemindersRef = useRef(getReminderSettings())
  const [unsavedModalOpen, setUnsavedModalOpen] = useState(false)
  const pendingNavigationRef = useRef<string | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof Notification === 'undefined') return 'unsupported'
    return Notification.permission
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(max-width: 767px)')
    const onChange = () => setIsMobile(mq.matches)
    onChange()

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    }

    mq.addListener(onChange)
    return () => mq.removeListener(onChange)
  }, [])

  useEffect(() => {
    if (!isMobile) return
    if (aiSettings.provider !== 'ollama') return
    const next = { ...aiSettings, provider: 'gemini' as const }
    setAiSettings(next)
    setAiSettingsState(next)
  }, [isMobile, aiSettings])

  useEffect(() => {
    if (!hostedOnline) return
    if (aiSettings.provider !== 'ollama') return
    const next = { ...aiSettings, provider: 'gemini' as const }
    setAiSettings(next)
    setAiSettingsState(next)
  }, [hostedOnline, aiSettings])

  const unsavedChanges = useMemo(() => {
    const changes: string[] = []
    const savedAi = savedAiSettingsRef.current
    const savedReminders = savedRemindersRef.current

    if (aiSettings.provider !== savedAi.provider) changes.push('AI provider')
    if (aiSettings.gemini.apiKey !== savedAi.gemini.apiKey) changes.push('Gemini API key')
    if (aiSettings.gemini.model !== savedAi.gemini.model) changes.push('Gemini model')
    if (aiSettings.gemini.consentToSendData !== savedAi.gemini.consentToSendData) changes.push('Gemini consent to send data')
    if (aiSettings.ollama.baseUrl !== savedAi.ollama.baseUrl) changes.push('Ollama base URL')
    if (aiSettings.ollama.model !== savedAi.ollama.model) changes.push('Ollama model')

    if (reminders.mealLog.enabled !== savedReminders.mealLog.enabled) changes.push('Meal logging reminder enabled')
    if (reminders.mealLog.time !== savedReminders.mealLog.time) changes.push('Meal logging reminder time')
    if (reminders.weighIn.enabled !== savedReminders.weighIn.enabled) changes.push('Weigh-in reminder enabled')
    if (reminders.weighIn.time !== savedReminders.weighIn.time) changes.push('Weigh-in reminder time')

    return changes
  }, [aiSettings, reminders])

  const hasUnsavedChanges = unsavedChanges.length > 0

  useEffect(() => {
    if (hasUnsavedChanges) return
    pendingNavigationRef.current = null
    setUnsavedModalOpen(false)
  }, [hasUnsavedChanges])

  useEffect(() => {
    if (!hasUnsavedChanges) return
    if (typeof document === 'undefined') return

    function onDocumentClick(e: MouseEvent) {
      if (!hasUnsavedChanges) return
      if (unsavedModalOpen) return
      if (e.defaultPrevented) return
      if (e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      const target = e.target as Element | null
      const a = target?.closest?.('a') as HTMLAnchorElement | null
      if (!a) return
      const href = a.getAttribute('href')
      if (!href) return
      if (a.target && a.target !== '_self') return
      if (href.startsWith('#')) return
      if (href.startsWith('mailto:') || href.startsWith('tel:')) return

      let url: URL
      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }

      if (url.origin !== window.location.origin) return

      const nextPath = `${url.pathname}${url.search}${url.hash}`
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
      if (nextPath === currentPath) return

      e.preventDefault()
      pendingNavigationRef.current = nextPath
      setUnsavedModalOpen(true)
    }

    document.addEventListener('click', onDocumentClick, true)
    return () => document.removeEventListener('click', onDocumentClick, true)
  }, [hasUnsavedChanges, unsavedModalOpen])

  useEffect(() => {
    if (!hasUnsavedChanges) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [hasUnsavedChanges])

  function proceedPendingNavigation() {
    const to = pendingNavigationRef.current
    pendingNavigationRef.current = null
    if (!to) return
    navigate(to)
  }

  async function onExport() {
    setBusy(true)
    try {
      const payload = await exportAllData()
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `himsogai-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast({ kind: 'success', message: 'Export downloaded' })
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Export failed' })
    } finally {
      setBusy(false)
    }
  }

  async function onImport(file: File | null) {
    setBusy(true)
    if (!file) {
      setBusy(false)
      return
    }

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      const result = await importAllData(parsed)
      await refresh()
      toast({ kind: 'success', message: `Imported ${result.profiles} profiles and ${result.meals} meals` })
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Import failed' })
    } finally {
      setBusy(false)
    }
  }

  async function onClear() {
    const ok = await confirm({
      title: 'Clear local data',
      message: 'Clear all local data? This cannot be undone.',
      confirmText: 'Clear',
      cancelText: 'Cancel',
      destructive: true,
    })
    if (!ok) return

    setBusy(true)
    try {
      await clearAllData()

      try {
        localStorage.removeItem('ai-nutritionist.currentProfileId')
        localStorage.removeItem('ai-nutritionist.aiSettings')
        localStorage.removeItem('ai-nutritionist.uiTheme')
        localStorage.removeItem('ai-nutritionist.reminders')
        localStorage.removeItem('ai-nutritionist.hideAiCloudDisclaimer')
        localStorage.removeItem('ai-nutritionist.geminiTutorialShown')
      } catch {
        // ignore
      }

      const nextTheme = getUiTheme()
      setUiThemeState(nextTheme)
      saveAndApplyUiTheme(nextTheme)

      const nextAiSettings = getAiSettings()
      setAiSettingsState(nextAiSettings)

      const nextReminders = getReminderSettings()
      setRemindersState(nextReminders)
      refreshReminderScheduler()

      await refresh()
      toast({ kind: 'success', message: 'Local data cleared' })
      navigate('/onboarding', { replace: true })
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to clear data' })
    } finally {
      setBusy(false)
    }
  }

  function persistAiSettings(next: typeof aiSettings, options?: { navigateHome?: boolean }) {
    setAiSettings(next)
    setAiSettingsState(next)
    savedAiSettingsRef.current = next
    toast({ kind: 'success', message: 'AI settings saved' })
    if (options?.navigateHome !== false) navigate('/')
  }

  async function onEnableNotifications() {
    const p = await requestNotificationPermission()
    if (p === 'unsupported') {
      setNotificationPermission('unsupported')
      toast({ kind: 'error', message: 'Notifications are not supported in this browser.' })
      return
    }
    setNotificationPermission(p)
    if (p !== 'granted') toast({ kind: 'error', message: 'Notifications permission not granted.' })
    else toast({ kind: 'success', message: 'Notifications enabled' })
  }

  function saveReminders(next: typeof reminders) {
    setReminderSettings(next)
    setRemindersState(next)
    savedRemindersRef.current = next
    refreshReminderScheduler()
    toast({ kind: 'success', message: 'Reminder settings saved' })
  }

  return (
    <div className="space-y-4">
      {unsavedModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="text-base font-semibold text-slate-900 dark:text-slate-100">Unsaved changes</div>
            <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
              You have unsaved changes in:
            </div>
            <div className="mt-2 space-y-1">
              {unsavedChanges.map((c) => (
                <div key={c} className="text-sm text-slate-700 dark:text-slate-200">- {c}</div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900"
                onClick={() => {
                  setUnsavedModalOpen(false)
                  pendingNavigationRef.current = null
                }}
                type="button"
              >
                Stay
              </button>
              <button
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900"
                onClick={() => {
                  setUnsavedModalOpen(false)
                  proceedPendingNavigation()
                }}
                type="button"
              >
                Leave without saving
              </button>
              <button
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                onClick={() => {
                  if (busy) return
                  if (unsavedChanges.length === 0) {
                    setUnsavedModalOpen(false)
                    proceedPendingNavigation()
                    return
                  }

                  const savedAi = savedAiSettingsRef.current
                  const savedReminders = savedRemindersRef.current
                  const aiDirty = JSON.stringify(aiSettings) !== JSON.stringify(savedAi)
                  const remindersDirty = JSON.stringify(reminders) !== JSON.stringify(savedReminders)

                  if (aiDirty) persistAiSettings(aiSettings, { navigateHome: false })
                  if (remindersDirty) saveReminders(reminders)

                  setUnsavedModalOpen(false)
                  proceedPendingNavigation()
                }}
                type="button"
              >
                Save and leave
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-base font-semibold text-slate-900 dark:text-slate-100">Settings</div>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Export/import your local data.</div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Appearance</div>

        <label className="block text-sm">
          <div className="font-medium text-slate-900 dark:text-slate-100">Color Theme</div>
          <select
            aria-label="Color Theme"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            value={uiTheme}
            onChange={(e) => {
              const next = e.target.value === 'dark' ? 'dark' : 'light'
              setUiThemeState(next)
              saveAndApplyUiTheme(next)
            }}
            disabled={busy}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">AI</div>

        <label className="flex items-center justify-between gap-3 text-sm text-slate-900 dark:text-slate-100">
          <div>
            <div className="font-medium">AI Chat bubble</div>
            <div className="text-xs text-slate-600 dark:text-slate-300">Show a draggable chat button on every page.</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="AI Chat bubble"
            aria-checked={aiChatBubbleEnabled}
            disabled={busy}
            onClick={() => {
              const next = !aiChatBubbleEnabled
              setAiChatBubbleEnabled(next)
              setAiChatBubbleEnabledState(next)
            }}
            className={
              aiChatBubbleEnabled
                ? 'relative inline-flex h-7 w-12 items-center rounded-full bg-emerald-600 transition disabled:opacity-50'
                : 'relative inline-flex h-7 w-12 items-center rounded-full bg-slate-300 transition disabled:opacity-50 dark:bg-slate-700'
            }
          >
            <span
              className={
                aiChatBubbleEnabled
                  ? 'inline-block h-5 w-5 translate-x-6 rounded-full bg-white shadow transition'
                  : 'inline-block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition'
              }
              aria-hidden="true"
            />
          </button>
        </label>

        <label className="block text-sm">
          <div className="font-medium text-slate-900 dark:text-slate-100">Provider</div>
          <select
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            value={isMobile || hostedOnline ? 'gemini' : aiSettings.provider}
            onChange={(e) => {
              if (isMobile || hostedOnline) {
                return
              }
              const provider = e.target.value === 'ollama' ? 'ollama' : 'gemini'
              setAiSettingsState({ ...aiSettings, provider })
            }}
            disabled={busy}
          >
            <option value="gemini">Gemini (online)</option>
            {isMobile ? (
              <option value="offline" disabled>Offline mode (coming soon)</option>
            ) : hostedOnline ? (
              <option value="ollama" disabled>Ollama (local) - disabled when hosted online</option>
            ) : (
              <option value="ollama">Ollama (local)</option>
            )}
          </select>
        </label>

        {aiSettings.provider === 'gemini' ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Gemini</div>
              <button
                className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                onClick={() => setGeminiTutorialOpen(true)}
                type="button"
              >
                How?
              </button>
            </div>
            <label className="block text-sm">
              <div className="font-medium text-slate-900 dark:text-slate-100">API key</div>
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={aiSettings.gemini.apiKey}
                onChange={(e) => setAiSettingsState({
                  ...aiSettings,
                  gemini: { ...aiSettings.gemini, apiKey: e.target.value },
                })}
                disabled={busy}
                type="password"
                autoComplete="off"
              />
            </label>
            <label className="block text-sm">
              <div className="font-medium text-slate-900 dark:text-slate-100">Model</div>
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={aiSettings.gemini.model}
                onChange={(e) => setAiSettingsState({
                  ...aiSettings,
                  gemini: { ...aiSettings.gemini, model: e.target.value },
                })}
                disabled={busy}
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-900 dark:text-slate-100">
              <input
                type="checkbox"
                checked={aiSettings.gemini.consentToSendData}
                onChange={(e) => setAiSettingsState({
                  ...aiSettings,
                  gemini: { ...aiSettings.gemini, consentToSendData: e.target.checked },
                })}
                disabled={busy}
              />
              Allow sending data to Gemini (online) for health chat and meal logging
            </label>
          </div>
        ) : null}

        {aiSettings.provider === 'ollama' && !isMobile && !hostedOnline ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Ollama</div>
            <label className="block text-sm">
              <div className="font-medium text-slate-900 dark:text-slate-100">Base URL</div>
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={aiSettings.ollama.baseUrl}
                onChange={(e) => setAiSettingsState({
                  ...aiSettings,
                  ollama: { ...aiSettings.ollama, baseUrl: e.target.value },
                })}
                disabled={busy}
              />
            </label>
            <label className="block text-sm">
              <div className="font-medium text-slate-900 dark:text-slate-100">Model</div>
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={aiSettings.ollama.model}
                onChange={(e) => setAiSettingsState({
                  ...aiSettings,
                  ollama: { ...aiSettings.ollama, model: e.target.value },
                })}
                disabled={busy}
              />
            </label>
          </div>
        ) : null}

        <button
          className="w-full rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
          onClick={() => persistAiSettings(aiSettings)}
          disabled={busy}
          type="button"
        >
          Save AI settings
        </button>
      </div>

      <GeminiTutorialModal open={geminiTutorialOpen} onClose={() => setGeminiTutorialOpen(false)} />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Reminders (optional)</div>
        <div className="text-xs text-slate-600 dark:text-slate-300">
          Reminders use the browser Notifications API and work best when the app is open or installed as a PWA.
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-300">
          Notifications: {notificationPermission === 'unsupported' ? 'unsupported' : notificationPermission}
        </div>

        <button
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          onClick={() => void onEnableNotifications()}
          disabled={busy || notificationPermission === 'granted'}
          type="button"
        >
          {notificationPermission === 'granted' ? 'Notifications enabled' : 'Enable notifications'}
        </button>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Meal logging</div>
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-900 dark:text-slate-100">
              <input
                type="checkbox"
                checked={reminders.mealLog.enabled}
                onChange={(e) => setRemindersState({
                  ...reminders,
                  mealLog: { ...reminders.mealLog, enabled: e.target.checked },
                })}
                disabled={busy}
              />
              Enable
            </label>
            <label className="text-sm">
              <span className="sr-only">Meal reminder time</span>
              <input
                type="time"
                className="rounded-xl border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={reminders.mealLog.time}
                onChange={(e) => setRemindersState({
                  ...reminders,
                  mealLog: { ...reminders.mealLog, time: e.target.value },
                })}
                disabled={busy}
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Weigh-in</div>
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-900 dark:text-slate-100">
              <input
                type="checkbox"
                checked={reminders.weighIn.enabled}
                onChange={(e) => setRemindersState({
                  ...reminders,
                  weighIn: { ...reminders.weighIn, enabled: e.target.checked },
                })}
                disabled={busy}
              />
              Enable
            </label>
            <label className="text-sm">
              <span className="sr-only">Weigh-in reminder time</span>
              <input
                type="time"
                className="rounded-xl border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={reminders.weighIn.time}
                onChange={(e) => setRemindersState({
                  ...reminders,
                  weighIn: { ...reminders.weighIn, time: e.target.value },
                })}
                disabled={busy}
              />
            </label>
          </div>
        </div>

        {notificationPermission !== 'granted' && (reminders.mealLog.enabled || reminders.weighIn.enabled) ? (
          <div className="text-sm text-amber-700 dark:text-amber-300">
            Enable notifications to receive reminders.
          </div>
        ) : null}

        <button
          className="w-full rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
          onClick={() => saveReminders(reminders)}
          disabled={busy}
          type="button"
        >
          Save reminders
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Data</div>

        <button
          className="w-full rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
          onClick={() => void onExport()}
          disabled={busy}
        >
          Export data
        </button>

        <label className="block text-sm">
          <div className="font-medium">Import data (JSON)</div>
          <input
            type="file"
            accept="application/json"
            disabled={busy}
            onChange={(e) => void onImport(e.target.files?.[0] ?? null)}
          />
        </label>

        <button
          className="w-full rounded-xl border border-red-300 bg-white px-3 py-2 text-sm text-red-700 disabled:opacity-50 dark:bg-slate-900"
          onClick={() => void onClear()}
          disabled={busy}
        >
          Clear local data
        </button>
      </div>
    </div>
  )
}
