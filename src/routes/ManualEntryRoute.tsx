import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MealItemsEditor } from '../components/MealItemsEditor'
import type { Meal } from '../models/types'
import { emptyMacros } from '../nutrition/macros'
import { useApp } from '../state/AppContext'
import { newId } from '../utils/id'

function formatDatetimeLocalValue(date: Date) {
  const tzOffsetMs = date.getTimezoneOffset() * 60_000
  const local = new Date(date.getTime() - tzOffsetMs)
  return local.toISOString().slice(0, 16)
}

export function ManualEntryRoute() {
  const navigate = useNavigate()
  const { currentProfileId, updateMeal } = useApp()

  const [meta] = useState(() => ({ id: newId(), createdAt: new Date().toISOString() }))
  const [eatenAtLocal, setEatenAtLocal] = useState(() => formatDatetimeLocalValue(new Date()))

  const eatenAtIso = useMemo(() => new Date(eatenAtLocal).toISOString(), [eatenAtLocal])

  const meal = useMemo<Meal>(
    () => ({
      id: meta.id,
      profileId: currentProfileId ?? '',
      createdAt: meta.createdAt,
      eatenAt: eatenAtIso,
      items: [],
      totalMacros: emptyMacros(),
    }),
    [meta.id, meta.createdAt, currentProfileId, eatenAtIso],
  )

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-700" aria-hidden="true">
            <path
              d="M4 20h16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M6 16l8.5-8.5a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8L11 19H6v-3z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-base font-semibold">Manual Entry</div>
        </div>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Add all foods for this meal, then save.</div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 dark:border-slate-800 dark:bg-slate-900">
        <label className="block text-sm">
          <div className="font-medium text-slate-900 dark:text-slate-100">Eaten at</div>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            value={eatenAtLocal}
            onChange={(e) => setEatenAtLocal(e.target.value)}
            type="datetime-local"
          />
        </label>
      </div>

      <MealItemsEditor
        meal={meal}
        onSaveMeal={async (next) => {
          if (!currentProfileId) throw new Error('No profile selected')
          await updateMeal({ ...next, profileId: currentProfileId, eatenAt: eatenAtIso })
          navigate(`/meals/${next.id}`)
        }}
        saveLabel="Save meal"
        successMessage="Meal saved"
        disableSaveWhenEmpty
      />
    </div>
  )
}
