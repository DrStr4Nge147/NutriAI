import { useEffect, useMemo, useState } from 'react'
import type { UserProfile, WeightEntry } from '../models/types'
import { safeNumber } from '../utils/numbers'

function sortDesc(entries: WeightEntry[]) {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date))
}

function isoDay(value: string) {
  return value.slice(0, 10)
}

export function WeightTracker(props: {
  profile: UserProfile
  onSaveProfile: (profile: UserProfile) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [weightKg, setWeightKg] = useState('')

  useEffect(() => {
    setMessage(null)
    setError(null)
    setWeightKg(String(props.profile.body.weightKg))
  }, [props.profile.id])

  const entries = useMemo(() => {
    const raw = props.profile.weightHistory ?? []
    return sortDesc(raw)
  }, [props.profile.weightHistory])

  const latest = entries[0] ?? null

  async function save(nextEntries: WeightEntry[], nextBodyWeightKg: number) {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await props.onSaveProfile({
        ...props.profile,
        body: { ...props.profile.body, weightKg: nextBodyWeightKg },
        weightHistory: sortDesc(nextEntries),
      })
      setMessage('Saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setBusy(false)
    }
  }

  async function addEntry() {
    const w = safeNumber(weightKg, 0)
    if (!Number.isFinite(w) || w <= 0) {
      setError('Enter a valid weight')
      return
    }

    const iso = new Date(date).toISOString()
    const nextEntries = [...(props.profile.weightHistory ?? []), { date: iso, weightKg: w }]
    await save(nextEntries, w)
  }

  async function removeEntry(entry: WeightEntry) {
    const ok = window.confirm(`Delete weight entry for ${isoDay(entry.date)}?`)
    if (!ok) return

    const remaining = (props.profile.weightHistory ?? []).filter((e) => !(e.date === entry.date && e.weightKg === entry.weightKg))
    const nextLatest = sortDesc(remaining)[0]
    const nextBodyWeightKg = nextLatest ? nextLatest.weightKg : props.profile.body.weightKg
    await save(remaining, nextBodyWeightKg)
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm space-y-3">
      <div className="text-sm font-medium">Weight tracking</div>

      <div className="text-xs text-slate-600">
        Latest: {latest ? `${isoDay(latest.date)} · ${latest.weightKg} kg` : 'No entries yet'}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <div className="font-medium">Date</div>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            type="date"
            disabled={busy}
          />
        </label>

        <label className="block text-sm">
          <div className="font-medium">Weight (kg)</div>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            inputMode="decimal"
            disabled={busy}
          />
        </label>
      </div>

      <button
        className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        onClick={() => void addEntry()}
        disabled={busy}
        type="button"
      >
        Log weight
      </button>

      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries.slice(0, 10).map((e, idx) => (
            <div
              key={`${e.date}-${e.weightKg}-${idx}`}
              className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
            >
              <div>
                <div className="text-sm font-medium">{isoDay(e.date)}</div>
                <div className="text-xs text-slate-600">{e.weightKg} kg</div>
              </div>

              <button
                className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs text-red-700 disabled:opacity-50"
                onClick={() => void removeEntry(e)}
                disabled={busy}
                type="button"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {message ? <div className="text-sm text-green-700">{message}</div> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
    </div>
  )
}
