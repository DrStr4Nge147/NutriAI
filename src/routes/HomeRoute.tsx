import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { estimateTdee } from '../nutrition/dailyNeeds'
import { sumMacroNutrients } from '../nutrition/macros'
import { useApp } from '../state/AppContext'

export function HomeRoute() {
  const { currentProfile, meals } = useApp()

  const todaySummary = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    const todayMeals = meals.filter((m) => {
      const d = new Date(m.eatenAt)
      return d >= start && d < end
    })

    const missingNutritionCount = todayMeals.filter((m) => m.totalMacros.calories === 0 && m.items.length === 0).length

    return {
      totals: sumMacroNutrients(todayMeals.map((m) => m.totalMacros)),
      count: todayMeals.length,
      missingNutritionCount,
    }
  }, [meals])

  const dailyNeeds = useMemo(() => {
    if (!currentProfile) return null
    return estimateTdee(currentProfile.body)
  }, [currentProfile])

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="text-base font-semibold">Hi{currentProfile ? `, ${currentProfile.name}` : ''}</div>
        <div className="mt-1 text-sm text-slate-600">Log a meal and review your recent history.</div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm space-y-2">
        <div className="text-sm font-medium">Today</div>

        {dailyNeeds ? (
          <div className="text-xs text-slate-600">
            Daily target: {dailyNeeds.tdee} kcal (BMR {dailyNeeds.bmr} · activity x{dailyNeeds.multiplier})
          </div>
        ) : (
          <div className="text-xs text-slate-600">Add your body details to estimate daily needs.</div>
        )}

        <div className="text-sm">
          <div>
            {todaySummary.totals.calories} kcal eaten{todaySummary.count > 0 ? ` · ${todaySummary.count} meal(s)` : ''}
          </div>
          <div className="text-xs text-slate-600">
            P {todaySummary.totals.protein_g}g · C {todaySummary.totals.carbs_g}g · F {todaySummary.totals.fat_g}g
          </div>
        </div>

        {todaySummary.count === 0 ? <div className="text-sm text-slate-600">No meals logged today.</div> : null}

        {todaySummary.missingNutritionCount > 0 ? (
          <div className="text-sm text-amber-700">
            {todaySummary.missingNutritionCount} meal(s) don’t have nutrition totals yet.
          </div>
        ) : null}

        {dailyNeeds ? (
          <div
            className={
              todaySummary.totals.calories > dailyNeeds.tdee ? 'text-sm text-red-700' : 'text-sm text-green-700'
            }
          >
            {todaySummary.totals.calories > dailyNeeds.tdee
              ? `Over by ${todaySummary.totals.calories - dailyNeeds.tdee} kcal`
              : `Remaining ${dailyNeeds.tdee - todaySummary.totals.calories} kcal`}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/capture"
          className="rounded-md bg-slate-900 px-3 py-3 text-center text-sm font-medium text-white"
        >
          Take/Upload
        </Link>
        <Link
          to="/manual"
          className="rounded-md border border-slate-300 bg-white px-3 py-3 text-center text-sm font-medium"
        >
          Manual entry
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/meals"
          className="rounded-md border border-slate-300 bg-white px-3 py-3 text-center text-sm font-medium"
        >
          Meal history
        </Link>
        <Link
          to="/settings"
          className="rounded-md border border-slate-300 bg-white px-3 py-3 text-center text-sm font-medium"
        >
          Settings
        </Link>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="text-sm font-medium">Recent meals</div>
        {meals.length === 0 ? (
          <div className="mt-2 text-sm text-slate-600">No meals yet.</div>
        ) : (
          <div className="mt-2 space-y-2">
            {meals.slice(0, 5).map((m) => (
              <Link
                key={m.id}
                to={`/meals/${m.id}`}
                className="block rounded-md border border-slate-200 bg-white px-3 py-2"
              >
                <div className="text-sm font-medium">{new Date(m.eatenAt).toLocaleString()}</div>
                <div className="text-xs text-slate-600">
                  {m.totalMacros.calories} kcal · P {m.totalMacros.protein_g}g · C {m.totalMacros.carbs_g}g · F{' '}
                  {m.totalMacros.fat_g}g
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
