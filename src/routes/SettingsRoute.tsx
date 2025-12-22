import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAiSettings, setAiSettings } from '../ai/settings'
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

export function SettingsRoute() {
  const navigate = useNavigate()
  const { refresh } = useApp()
  const { toast, confirm } = useUiFeedback()
  const [busy, setBusy] = useState(false)
  const [uiTheme, setUiThemeState] = useState<UiTheme>(() => getUiTheme())
  const [aiSettings, setAiSettingsState] = useState(() => getAiSettings())
  const [geminiTutorialOpen, setGeminiTutorialOpen] = useState(false)
  const [reminders, setRemindersState] = useState(() => getReminderSettings())
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof Notification === 'undefined') return 'unsupported'
    return Notification.permission
  })

  useEffect(() => {
    if (aiSettings.provider !== 'gemini') return
    if (aiSettings.gemini.apiKey) return

    try {
      const k = 'ai-nutritionist.geminiTutorialShown'
      if (localStorage.getItem(k)) return
      setGeminiTutorialOpen(true)
      localStorage.setItem(k, '1')
    } catch {
    }
  }, [aiSettings.provider, aiSettings.gemini.apiKey])

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

  function saveAiSettings(next: typeof aiSettings) {
    setAiSettings(next)
    setAiSettingsState(next)
    toast({ kind: 'success', message: 'AI settings saved' })
    navigate('/')
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
    refreshReminderScheduler()
    toast({ kind: 'success', message: 'Reminder settings saved' })
  }

  return (
    <div className="space-y-4">
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

        <label className="block text-sm">
          <div className="font-medium text-slate-900 dark:text-slate-100">Provider</div>
          <select
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            value={aiSettings.provider}
            onChange={(e) => {
              const provider = e.target.value === 'ollama' ? 'ollama' : 'gemini'
              saveAiSettings({ ...aiSettings, provider })
            }}
            disabled={busy}
          >
            <option value="gemini">Gemini (online)</option>
            <option value="ollama">Ollama (local)</option>
          </select>
        </label>

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
            Allow sending meal photos to Gemini (online)
          </label>
        </div>

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

        <button
          className="w-full rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
          onClick={() => saveAiSettings(aiSettings)}
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
