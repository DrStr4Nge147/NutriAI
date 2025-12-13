import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getAiSettings, setAiSettings } from '../ai/settings'
import { WeightTracker } from '../components/WeightTracker'
import { exportAllData, importAllData } from '../storage/exportImport'
import { clearAllData } from '../storage/db'
import { useApp } from '../state/AppContext'

export function SettingsRoute() {
  const { refresh, profiles, currentProfile, currentProfileId, selectProfile, saveProfile, deleteProfile } = useApp()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aiSettings, setAiSettingsState] = useState(() => getAiSettings())

  async function onExport() {
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      const payload = await exportAllData()
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ai-nutritionist-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMessage('Export downloaded')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  async function onImport(file: File | null) {
    setBusy(true)
    setMessage(null)
    setError(null)
    if (!file) {
      setBusy(false)
      return
    }

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      const result = await importAllData(parsed)
      await refresh()
      setMessage(`Imported ${result.profiles} profiles and ${result.meals} meals`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  async function onClear() {
    const ok = window.confirm('Clear all local data? This cannot be undone.')
    if (!ok) return

    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      await clearAllData()
      await refresh()
      setMessage('Local data cleared')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to clear data')
    } finally {
      setBusy(false)
    }
  }

  function saveAiSettings(next: typeof aiSettings) {
    setAiSettings(next)
    setAiSettingsState(next)
    setMessage('AI settings saved')
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="text-base font-semibold">Settings</div>
        <div className="mt-1 text-sm text-slate-600">Export/import your local data.</div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm space-y-3">
        <div className="text-sm font-medium">AI</div>

        <label className="block text-sm">
          <div className="font-medium">Provider</div>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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

        <div className="rounded-md border border-slate-200 p-3 space-y-3">
          <div className="text-sm font-medium">Gemini</div>
          <label className="block text-sm">
            <div className="font-medium">API key</div>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={aiSettings.gemini.model}
              onChange={(e) => setAiSettingsState({
                ...aiSettings,
                gemini: { ...aiSettings.gemini, model: e.target.value },
              })}
              disabled={busy}
            />
          </label>
        </div>

        <div className="rounded-md border border-slate-200 p-3 space-y-3">
          <div className="text-sm font-medium">Ollama</div>
          <label className="block text-sm">
            <div className="font-medium">Base URL</div>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => saveAiSettings(aiSettings)}
          disabled={busy}
          type="button"
        >
          Save AI settings
        </button>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm space-y-3">
        <div className="text-sm font-medium">Profiles</div>
        <div className="space-y-2">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
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
                    className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs"
                    onClick={() => void selectProfile(p.id)}
                    disabled={busy}
                    type="button"
                  >
                    Switch
                  </button>
                ) : null}
                <button
                  className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs text-red-700 disabled:opacity-50"
                  onClick={() => {
                    const ok = window.confirm(`Delete profile "${p.name}"? This deletes its meals.`)
                    if (!ok) return
                    void (async () => {
                      setBusy(true)
                      setMessage(null)
                      setError(null)
                      try {
                        await deleteProfile(p.id)
                        setMessage('Profile deleted')
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Failed to delete profile')
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
          className="inline-block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          Create new profile
        </Link>

        {currentProfile ? (
          <Link
            to="/profile"
            className="inline-block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            Edit current profile
          </Link>
        ) : null}

        {currentProfile ? <WeightTracker profile={currentProfile} onSaveProfile={saveProfile} /> : null}

        <hr className="my-2 border-slate-200" />

        <button
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
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
          className="w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-red-700 disabled:opacity-50"
          onClick={() => void onClear()}
          disabled={busy}
        >
          Clear local data
        </button>

        {message ? (
          <div className="text-sm text-green-700" role="status" aria-live="polite">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="text-sm text-red-600" role="alert" aria-live="assertive">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  )
}
