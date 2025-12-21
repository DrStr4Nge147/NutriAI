import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { dailyCalorieTarget } from '../nutrition/dailyNeeds'
import { buildHealthInsights, buildLifestyleInsights } from '../nutrition/health'
import { sumMacroNutrients } from '../nutrition/macros'
import { useApp } from '../state/AppContext'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function mealLabelFromHour(hour: number) {
  if (hour >= 5 && hour < 11) return 'Breakfast'
  if (hour >= 11 && hour < 15) return 'Lunch'
  if (hour >= 15 && hour < 18) return 'Snack'
  if (hour >= 18 && hour < 23) return 'Dinner'
  return 'Meal'
}

export function HomeRoute() {
  const { currentProfile, meals } = useApp()

  const [healthExpanded, setHealthExpanded] = useState(false)
  const [lifestyleExpanded, setLifestyleExpanded] = useState(false)

  const todayMeals = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    return meals
      .filter((m) => {
        const d = new Date(m.eatenAt)
        return d >= start && d < end
      })
      .slice()
      .sort((a, b) => new Date(b.eatenAt).getTime() - new Date(a.eatenAt).getTime())
  }, [meals])

  const todaySummary = useMemo(() => {
    const missingNutritionCount = todayMeals.filter((m) => m.totalMacros.calories === 0 && m.items.length === 0).length

    return {
      totals: sumMacroNutrients(todayMeals.map((m) => m.totalMacros)),
      count: todayMeals.length,
      missingNutritionCount,
    }
  }, [todayMeals])

  const dailyNeeds = useMemo(() => {
    if (!currentProfile) return null
    return dailyCalorieTarget({
      body: currentProfile.body,
      goal: currentProfile.goal,
      targetCaloriesKcal: currentProfile.targetCaloriesKcal,
    })
  }, [currentProfile])

  const healthInsights = useMemo(() => {
    if (!currentProfile) return []
    return buildHealthInsights({
      body: currentProfile.body,
      medical: currentProfile.medical,
      totals: todaySummary.totals,
      targetKcal: dailyNeeds?.target ?? null,
    })
  }, [currentProfile, todaySummary.totals, dailyNeeds?.target])

  const lifestyleInsights = useMemo(() => {
    if (!currentProfile) return []
    return buildLifestyleInsights({
      body: currentProfile.body,
      medical: currentProfile.medical,
      meals,
      targetKcal: dailyNeeds?.target ?? null,
      days: 7,
    }).filter((i) => i.id !== 'medical-files-on-record')
  }, [currentProfile, meals, dailyNeeds?.target])

  const lifestylePreview = lifestyleInsights.slice(0, 3)
  const lifestyleHasWarning = lifestylePreview.some((i) => i.severity === 'warning')
  const lifestyleParagraph = lifestylePreview.map((i) => i.text).join(' ')

  const lifestyleHasWarningAll = lifestyleInsights.some((i) => i.severity === 'warning')
  const lifestyleParagraphAll = lifestyleInsights.map((i) => i.text).join(' ')

  const calorieProgress = useMemo(() => {
    const target = dailyNeeds?.target ?? null
    if (!target || !Number.isFinite(target) || target <= 0) return null
    const eaten = todaySummary.totals.calories
    const ratio = target > 0 ? eaten / target : 0
    const pct = Math.max(0, Math.min(1.25, ratio))
    return {
      target,
      eaten,
      pct,
      pctLabel: Math.round(Math.max(0, Math.min(1, ratio)) * 100),
      remaining: target - eaten,
      over: eaten - target,
    }
  }, [dailyNeeds?.target, todaySummary.totals.calories])

  const donut = useMemo(() => {
    if (!calorieProgress) return null
    const pct = clamp(calorieProgress.eaten / calorieProgress.target, 0, 1)

    const radius = 34
    const cx = 42
    const cy = 42
    const circ = 2 * Math.PI * radius
    const dash = circ * pct
    const gap = circ - dash
    return { radius, cx, cy, circ, dash, gap, pctLabel: Math.round(pct * 100) }
  }, [calorieProgress])

  const macroTargets = useMemo(() => {
    if (!currentProfile || !dailyNeeds?.target) return null

    const targetKcal = dailyNeeds.target
    const weightKg = currentProfile.body.weightKg

    const proteinG = Math.round(Math.max(90, 1.6 * weightKg))
    const proteinKcal = proteinG * 4

    const fatKcal = targetKcal * 0.25
    const fatG = Math.round(fatKcal / 9)

    const remainingKcal = Math.max(0, targetKcal - proteinKcal - fatKcal)
    const carbsG = Math.round(remainingKcal / 4)

    return { proteinG, carbsG, fatG }
  }, [currentProfile, dailyNeeds?.target])

  function MacroBar(props: { label: string; valueG: number; targetG: number | null }) {
    const pct = props.targetG ? clamp(props.valueG / props.targetG, 0, 1) : 0
    return (
      <div>
        <div className="flex items-center justify-between text-xs">
          <div className="font-medium text-slate-700">{props.label}</div>
          <div className="text-slate-600">
            {Math.round(props.valueG)}g{props.targetG ? ` / ${Math.round(props.targetG)}g` : ''}
          </div>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500"
            style={{ width: `${Math.round(pct * 100)}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-slate-600">{greetingForHour(new Date().getHours())}</div>
          <div className="text-xl font-semibold">{currentProfile?.name ?? 'NutriAI'}</div>
        </div>

        <Link
          to="/profile"
          aria-label="Profile"
          className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path
              d="M20 21a8 8 0 0 0-16 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-[1fr_96px] items-center gap-4">
          <div>
            <div className="text-sm font-medium text-slate-700">Calories left</div>
            <div className="mt-1 text-4xl font-semibold tracking-tight">
              {calorieProgress ? Math.max(0, Math.round(calorieProgress.remaining)) : '--'}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {calorieProgress ? `Goal: ${calorieProgress.target} kcal` : 'Add body details to estimate a daily goal.'}
            </div>
          </div>

          <div className="flex items-center justify-center">
            {donut ? (
              <svg viewBox="0 0 84 84" className="h-24 w-24" role="img" aria-label="Calories progress">
                <circle cx={donut.cx} cy={donut.cy} r={donut.radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle
                  cx={donut.cx}
                  cy={donut.cy}
                  r={donut.radius}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${donut.dash} ${donut.gap}`}
                  transform={`rotate(-90 ${donut.cx} ${donut.cy})`}
                />
                <text x="42" y="46" textAnchor="middle" fontSize="14" fill="#64748b" fontWeight="600">
                  {donut.pctLabel}%
                </text>
              </svg>
            ) : (
              <div className="h-24 w-24 rounded-full bg-slate-100" />
            )}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <MacroBar label="Protein" valueG={todaySummary.totals.protein_g} targetG={macroTargets?.proteinG ?? null} />
          <MacroBar label="Carbs" valueG={todaySummary.totals.carbs_g} targetG={macroTargets?.carbsG ?? null} />
          <MacroBar label="Fat" valueG={todaySummary.totals.fat_g} targetG={macroTargets?.fatG ?? null} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">Today&apos;s meals</div>
          <Link to="/meals" className="text-sm text-slate-900 underline">
            View all
          </Link>
        </div>

        {todayMeals.length === 0 ? (
          <div className="mt-3 text-sm text-slate-600">No meals logged today.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {todayMeals.slice(0, 6).map((m) => {
              const dt = new Date(m.eatenAt)
              const label = mealLabelFromHour(dt.getHours())
              const time = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              return (
                <Link
                  key={m.id}
                  to={`/meals/${m.id}`}
                  className="block rounded-xl border border-slate-200 bg-white px-3 py-3 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-lg bg-slate-100">
                      {m.photoDataUrl ? (
                        <img src={m.photoDataUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900">{label}</div>
                          <div className="mt-1 text-xs text-slate-600">{time}</div>
                        </div>
                        <div className="shrink-0 text-sm font-semibold text-slate-900">{m.totalMacros.calories} kcal</div>
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
        )}

        {todaySummary.missingNutritionCount > 0 ? (
          <div className="mt-3 text-sm text-amber-700">
            {todaySummary.missingNutritionCount} meal(s) don’t have nutrition totals yet.
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-sm font-medium">Health Insights</div>
          <div className="text-xs text-slate-500">Today</div>
        </div>

        {healthInsights.length > 0 ? (
          <div className="mt-3 space-y-2">
            {healthInsights.slice(0, healthExpanded ? healthInsights.length : 3).map((i) => (
              <div
                key={i.id}
                className={
                  i.severity === 'warning'
                    ? 'rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900'
                    : 'rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900'
                }
              >
                {i.text}
              </div>
            ))}
            {healthInsights.length > 3 ? (
              <button
                type="button"
                className="text-left text-xs text-slate-900 underline"
                aria-expanded={healthExpanded}
                onClick={() => setHealthExpanded((v) => !v)}
              >
                {healthExpanded ? 'Show less' : `Show ${healthInsights.length - 3} more`}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-600">No insights yet for today. Log meals to see guidance.</div>
        )}

        {lifestyleInsights.length > 0 ? (
          <div className="mt-4 space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Lifestyle</div>
              <div className="text-xs text-slate-500">Last 7 days</div>
            </div>
            <div
              className={
                (lifestyleExpanded ? lifestyleHasWarningAll : lifestyleHasWarning)
                  ? 'rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900'
                  : 'rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900'
              }
            >
              {lifestyleExpanded ? lifestyleParagraphAll : lifestyleParagraph}
            </div>
            {lifestyleInsights.length > 3 ? (
              <button
                type="button"
                className="text-left text-xs text-slate-900 underline"
                aria-expanded={lifestyleExpanded}
                onClick={() => setLifestyleExpanded((v) => !v)}
              >
                {lifestyleExpanded ? 'Show less' : `Show ${lifestyleInsights.length - 3} more`}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
