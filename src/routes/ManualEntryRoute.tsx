import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { findFoods } from '../nutrition/localFoods'
import { useApp } from '../state/AppContext'
import { safeNumber } from '../utils/numbers'

export function ManualEntryRoute() {
  const navigate = useNavigate()
  const { addManualMeal } = useApp()

  const [name, setName] = useState('')
  const [grams, setGrams] = useState('150')
  const [eatenAt, setEatenAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const suggestions = useMemo(() => findFoods(name), [name])

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      const g = Math.max(1, safeNumber(grams, 0))
      const iso = new Date(eatenAt).toISOString()
      const meal = await addManualMeal({ name, grams: g, eatenAt: iso })
      navigate(`/meals/${meal.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save meal')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="text-base font-semibold">Manual meal entry</div>
        <div className="mt-1 text-sm text-slate-600">Type a food and grams. We’ll estimate macros.</div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm space-y-3">
        <label className="block text-sm">
          <div className="font-medium">Food</div>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., White rice"
          />
        </label>

        {suggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.id}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs"
                onClick={() => setName(s.name)}
                type="button"
              >
                {s.name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <div className="font-medium">Grams</div>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              inputMode="numeric"
            />
          </label>

          <label className="block text-sm">
            <div className="font-medium">Eaten at</div>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={eatenAt}
              onChange={(e) => setEatenAt(e.target.value)}
              type="datetime-local"
            />
          </label>
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <button
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => void submit()}
          disabled={submitting || !name.trim()}
          type="button"
        >
          Save meal
        </button>
      </div>
    </div>
  )
}
