import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { dailyCalorieTarget } from '../nutrition/dailyNeeds'
import { sumMacroNutrients } from '../nutrition/macros'
import { useApp } from '../state/AppContext'

function dayKey(dt: Date) {
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function labelForMealHour(hour: number) {
  if (hour >= 5 && hour < 11) return 'Breakfast'
  if (hour >= 11 && hour < 15) return 'Lunch'
  if (hour >= 15 && hour < 18) return 'Snack'
  if (hour >= 18 && hour < 23) return 'Dinner'
  return 'Meal'
}

export function MealsRoute() {
  const { meals, currentProfile } = useApp()

  const sortedMeals = useMemo(() => {
    return meals
      .slice()
      .sort((a, b) => new Date(b.eatenAt).getTime() - new Date(a.eatenAt).getTime())
  }, [meals])

  const calorieTarget = useMemo(() => {
    if (!currentProfile) return null
    const result = dailyCalorieTarget({
      body: currentProfile.body,
      goal: currentProfile.goal,
      targetCaloriesKcal: currentProfile.targetCaloriesKcal,
    })
    return result?.target ?? null
  }, [currentProfile])

  const grouped = useMemo(() => {
    const buckets = new Map<string, { key: string; date: Date; meals: typeof sortedMeals }>()
    for (const m of sortedMeals) {
      const dt = new Date(m.eatenAt)
      const key = dayKey(dt)
      const existing = buckets.get(key)
      if (existing) existing.meals.push(m)
      else buckets.set(key, { key, date: dt, meals: [m] })
    }

    const today = new Date()
    const todayKey = dayKey(today)

    return Array.from(buckets.values())
      .map((b) => {
        const totals = sumMacroNutrients(b.meals.map((m) => m.totalMacros))
        const title = b.key === todayKey ? 'Today' : b.date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
        return { ...b, title, totals }
      })
      .sort((a, b) => (a.key < b.key ? 1 : -1))
  }, [sortedMeals])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-700" aria-hidden="true">
                <path
                  d="M7 4h10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7 8h10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7 12h7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7 16h10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5 4v16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19 4v16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="text-base font-semibold">Meal History</div>
            </div>
            <div className="mt-1 text-sm text-slate-600">All meals saved on this device.</div>
          </div>
          <div className="flex gap-2">
            <Link
              to="/manual"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              Manual Entry
            </Link>
          </div>
        </div>
      </div>

      {sortedMeals.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-sm text-slate-600">
          No meals yet.
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((day) => {
            const ratio = calorieTarget && calorieTarget > 0 ? Math.max(0, Math.min(1, day.totals.calories / calorieTarget)) : null
            return (
              <div key={day.key} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{day.title}</div>
                    <div className="text-xs text-slate-600">{day.meals.length} meal(s)</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-900">
                      {calorieTarget ? `${day.totals.calories} / ${calorieTarget} kcal` : `${day.totals.calories} kcal`}
                    </div>
                    <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500"
                        style={{ width: `${Math.round((ratio ?? 0) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200">
                  {day.meals.map((m) => {
                    const dt = new Date(m.eatenAt)
                    const label = labelForMealHour(dt.getHours())
                    const time = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    const description =
                      m.items.length > 0
                        ? m.items
                            .slice(0, 3)
                            .map((i) => i.name)
                            .filter(Boolean)
                            .join(', ')
                        : m.photoDataUrl
                          ? 'Photo meal'
                          : 'Meal'

                    return (
                      <Link
                        key={m.id}
                        to={`/meals/${m.id}`}
                        className="block px-4 py-3 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 overflow-hidden rounded-xl bg-slate-100">
                            {m.photoDataUrl ? <img src={m.photoDataUrl} alt="" className="h-full w-full object-cover" /> : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-slate-900">{label}</div>
                                <div className="mt-0.5 truncate text-xs text-slate-600">
                                  {description}
                                  {description ? ' · ' : ''}
                                  {time}
                                </div>
                              </div>
                              <div className="shrink-0 text-sm font-semibold text-emerald-700">{m.totalMacros.calories} kcal</div>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-1">
                              <div className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">P {m.totalMacros.protein_g}g</div>
                              <div className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">C {m.totalMacros.carbs_g}g</div>
                              <div className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">F {m.totalMacros.fat_g}g</div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
