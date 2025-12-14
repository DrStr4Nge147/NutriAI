import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getAiSettings, setAiSettings } from '../ai/settings'
import { WeightTracker } from '../components/WeightTracker'
import {
  getReminderSettings,
  refreshReminderScheduler,
  requestNotificationPermission,
  setReminderSettings,
} from '../notifications/reminders'
import { exportAllData, importAllData } from '../storage/exportImport'
import { clearAllData } from '../storage/db'
import { useApp } from '../state/AppContext'
import { useUiFeedback } from '../state/UiFeedbackContext'

export function SettingsRoute() {
  const { refresh, profiles, currentProfile, currentProfileId, selectProfile, saveProfile, deleteProfile } = useApp()
  const { toast, confirm } = useUiFeedback()
  const [busy, setBusy] = useState(false)
  const [aiSettings, setAiSettingsState] = useState(() => getAiSettings())
  const [reminders, setRemindersState] = useState(() => getReminderSettings())
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof Notification === 'undefined') return 'unsupported'
    return Notification.permission
  })

  async function onExport() {
    setBusy(true)
    try {
      const payload = await exportAllData()
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nutriai-export-${new Date().toISOString().slice(0, 10)}.json`
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
      await refresh()
      toast({ kind: 'success', message: 'Local data cleared' })
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
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-base font-semibold">Settings</div>
        <div className="mt-1 text-sm text-slate-600">Export/import your local data.</div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="text-sm font-medium">AI</div>

        <label className="block text-sm">
          <div className="font-medium">Provider</div>
          <select
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
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

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="text-sm font-medium">Gemini</div>
          <label className="block text-sm">
            <div className="font-medium">API key</div>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
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
            <div className="font-medium">Model</div>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={aiSettings.gemini.model}
              onChange={(e) => setAiSettingsState({
                ...aiSettings,
                gemini: { ...aiSettings.gemini, model: e.target.value },
              })}
              disabled={busy}
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
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

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="text-sm font-medium">Ollama</div>
          <label className="block text-sm">
            <div className="font-medium">Base URL</div>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={aiSettings.ollama.baseUrl}
              onChange={(e) => setAiSettingsState({
                ...aiSettings,
                ollama: { ...aiSettings.ollama, baseUrl: e.target.value },
              })}
              disabled={busy}
            />
          </label>
          <label className="block text-sm">
            <div className="font-medium">Model</div>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
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

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="text-sm font-medium">Reminders (optional)</div>
        <div className="text-xs text-slate-600">
          Reminders use the browser Notifications API and work best when the app is open or installed as a PWA.
        </div>

        <div className="text-xs text-slate-600">
          Notifications: {notificationPermission === 'unsupported' ? 'unsupported' : notificationPermission}
        </div>

        <button
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          onClick={() => void onEnableNotifications()}
          disabled={busy || notificationPermission === 'granted'}
          type="button"
        >
          {notificationPermission === 'granted' ? 'Notifications enabled' : 'Enable notifications'}
        </button>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="text-sm font-medium">Meal logging</div>
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
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
                className="rounded-xl border border-slate-300 bg-white px-2 py-1 text-sm"
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

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="text-sm font-medium">Weigh-in</div>
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
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
                className="rounded-xl border border-slate-300 bg-white px-2 py-1 text-sm"
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
          <div className="text-sm text-amber-700">
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

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="text-sm font-medium">Profiles</div>
        <div className="space-y-2">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
            >
              <div>
                <div className="text-sm font-medium">
                  {p.name}{' '}
                  {p.id === currentProfileId ? (
                    <span className="text-xs font-normal text-slate-600">(current)</span>
                  ) : null}
                </div>
                <div className="text-xs text-slate-600">
                  {p.body.heightCm}cm · {p.body.weightKg}kg · {p.body.age}y
                </div>
              </div>

              <div className="flex gap-2">
                {p.id !== currentProfileId ? (
                  <button
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1 text-xs hover:bg-slate-50"
                    onClick={() => void (async () => {
                      await selectProfile(p.id)
                      toast({ kind: 'success', message: `Switched to ${p.name}` })
                    })()}
                    disabled={busy}
                    type="button"
                  >
                    Switch
                  </button>
                ) : null}
                <button
                  className="rounded-xl border border-red-300 bg-white px-3 py-1 text-xs text-red-700 disabled:opacity-50"
                  onClick={() => {
                    void (async () => {
                      const ok = await confirm({
                        title: 'Delete profile',
                        message: `Delete profile "${p.name}"? This deletes its meals.`,
                        confirmText: 'Delete',
                        cancelText: 'Cancel',
                        destructive: true,
                      })
                      if (!ok) return

                      setBusy(true)
                      try {
                        await deleteProfile(p.id)
                        toast({ kind: 'success', message: 'Profile deleted' })
                      } catch (e) {
                        toast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to delete profile' })
                      } finally {
                        setBusy(false)
                      }
                    })()
                  }}
                  disabled={busy}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <Link
          to="/onboarding"
          className="inline-block rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
        >
          Create new profile
        </Link>

        {currentProfile ? (
          <Link
            to="/profile"
            className="inline-block rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            Edit current profile
          </Link>
        ) : null}

        {currentProfile ? <WeightTracker profile={currentProfile} onSaveProfile={saveProfile} /> : null}

        <hr className="my-2 border-slate-200" />

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
          className="w-full rounded-xl border border-red-300 bg-white px-3 py-2 text-sm text-red-700 disabled:opacity-50"
          onClick={() => void onClear()}
          disabled={busy}
        >
          Clear local data
        </button>
      </div>
    </div>
  )
}
