import { useEffect, useMemo, useState } from 'react'
import type { UserProfile, WeightEntry } from '../models/types'
import { useUiFeedback } from '../state/UiFeedbackContext'
import { safeNumber } from '../utils/numbers'

function sortDesc(entries: WeightEntry[]) {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date))
}

function isoDay(value: string) {
  return value.slice(0, 10)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function linePath(points: { x: number; y: number }[]) {
  if (points.length === 0) return ''
  return points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

export function WeightTracker(props: {
  profile: UserProfile
  onSaveProfile: (profile: UserProfile) => Promise<void>
}) {
  const { toast, confirm } = useUiFeedback()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [weightKg, setWeightKg] = useState('')

  useEffect(() => {
    setError(null)
    setWeightKg(String(props.profile.body.weightKg))
  }, [props.profile.id])

  const entries = useMemo(() => {
    const raw = props.profile.weightHistory ?? []
    return sortDesc(raw)
  }, [props.profile.weightHistory])

  const latest = entries[0] ?? null

  const graph = useMemo(() => {
    const history = [...(props.profile.weightHistory ?? [])]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)

    if (history.length < 2) return null

    const values = history.map((e) => e.weightKg).filter((w) => Number.isFinite(w) && w > 0)
    if (values.length < 2) return null

    const minW = Math.min(...values)
    const maxW = Math.max(...values)
    const span = Math.max(0.1, maxW - minW)

    const width = 320
    const height = 96
    const padX = 8
    const padY = 10

    const points = history.map((e, idx) => {
      const x = padX + (idx / (history.length - 1)) * (width - padX * 2)
      const yNorm = (e.weightKg - minW) / span
      const y = padY + (1 - clamp(yNorm, 0, 1)) * (height - padY * 2)
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }
    })

    return {
      width,
      height,
      minW,
      maxW,
      points,
      path: linePath(points),
      startLabel: isoDay(history[0].date),
      endLabel: isoDay(history[history.length - 1].date),
    }
  }, [props.profile.weightHistory])

  async function save(nextEntries: WeightEntry[], nextBodyWeightKg: number) {
    setBusy(true)
    setError(null)
    try {
      await props.onSaveProfile({
        ...props.profile,
        body: { ...props.profile.body, weightKg: nextBodyWeightKg },
        weightHistory: sortDesc(nextEntries),
      })
      toast({ kind: 'success', message: 'Saved' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save'
      setError(msg)
      toast({ kind: 'error', message: msg })
    } finally {
      setBusy(false)
    }
  }

  async function addEntry() {
    const w = safeNumber(weightKg, 0)
    if (!Number.isFinite(w) || w <= 0) {
      setError('Enter a valid weight')
      toast({ kind: 'error', message: 'Enter a valid weight' })
      return
    }

    const iso = new Date(date).toISOString()
    const nextEntries = [...(props.profile.weightHistory ?? []), { date: iso, weightKg: w }]
    await save(nextEntries, w)
  }

  async function removeEntry(entry: WeightEntry) {
    const ok = await confirm({
      title: 'Delete weight entry',
      message: `Delete weight entry for ${isoDay(entry.date)}?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      destructive: true,
    })
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
          {graph ? (
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <div>
                  {graph.minW.toFixed(1)}–{graph.maxW.toFixed(1)} kg
                </div>
                <div>
                  {graph.startLabel} → {graph.endLabel}
                </div>
              </div>
              <svg
                viewBox={`0 0 ${graph.width} ${graph.height}`}
                className="mt-2 h-24 w-full"
                role="img"
                aria-label="Weight trend"
              >
                <path d={graph.path} fill="none" stroke="#059669" strokeWidth="2" />
                {graph.points.map((p, idx) => (
                  <circle key={idx} cx={p.x} cy={p.y} r={2.5} fill="#059669" />
                ))}
              </svg>
            </div>
          ) : null}

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

      {error ? (
        <div className="text-sm text-red-600" role="alert" aria-live="assertive">
          {error}
        </div>
      ) : null}
    </div>
  )
}
