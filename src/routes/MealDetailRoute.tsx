import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { buildHealthInsights } from '../nutrition/health'
import { useApp } from '../state/AppContext'
import { useUiFeedback } from '../state/UiFeedbackContext'
import { useMealPhotoAnalysis } from '../state/MealPhotoAnalysisContext'

function mealLabelFromHour(hour: number) {
  if (hour >= 5 && hour < 10) return 'Breakfast'
  if (hour >= 10 && hour < 12) return 'AM snack'
  if (hour >= 12 && hour < 15) return 'Lunch'
  if (hour >= 15 && hour < 18) return 'PM snack'
  if (hour >= 18 && hour < 23) return 'Dinner'
  return 'Meal'
}

function nutritionistNote(input: { calories: number; protein_g: number; carbs_g: number; fat_g: number }): string {
  const kcal = input.calories
  if (!Number.isFinite(kcal) || kcal <= 0) return 'Log a meal to see a nutrition note.'

  const pKcal = Math.max(0, input.protein_g) * 4
  const cKcal = Math.max(0, input.carbs_g) * 4
  const fKcal = Math.max(0, input.fat_g) * 9
  const total = pKcal + cKcal + fKcal

  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0)
  const p = pct(pKcal)
  const c = pct(cKcal)
  const f = pct(fKcal)

  if (kcal >= 900) return `This meal is energy-dense (~${kcal} kcal). Consider balancing with lighter meals later and adding vegetables/fiber for fullness.`
  if (kcal >= 600) return `This is a substantial meal (~${kcal} kcal). Aim for balance: protein, fiber-rich carbs, and some healthy fats.`
  return `Macro split is roughly P ${p}% / C ${c}% / F ${f}%. If you’re still hungry later, add fiber (fruit/veg) and water.`
}

function MacroDonut(props: { proteinG: number; carbsG: number; fatG: number }) {
  const pKcal = Math.max(0, props.proteinG) * 4
  const cKcal = Math.max(0, props.carbsG) * 4
  const fKcal = Math.max(0, props.fatG) * 9
  const total = pKcal + cKcal + fKcal

  const radius = 24
  const cx = 28
  const cy = 28
  const circ = 2 * Math.PI * radius

  const seg = (kcal: number) => {
    if (total <= 0) return 0
    return (kcal / total) * circ
  }

  const pSeg = seg(pKcal)
  const cSeg = seg(cKcal)
  const fSeg = seg(fKcal)
  const strokeW = 7

  return (
    <svg viewBox="0 0 56 56" className="h-14 w-14 text-slate-200 dark:text-slate-700">
      <circle cx={cx} cy={cy} r={radius} stroke="currentColor" strokeWidth={strokeW} fill="none" />

      {total > 0 ? (
        <>
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke="#10b981"
            strokeWidth={strokeW}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${pSeg} ${Math.max(0, circ - pSeg)}`}
            strokeDashoffset={0}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke="#f59e0b"
            strokeWidth={strokeW}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${cSeg} ${Math.max(0, circ - cSeg)}`}
            strokeDashoffset={-pSeg}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke="#ef4444"
            strokeWidth={strokeW}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${fSeg} ${Math.max(0, circ - fSeg)}`}
            strokeDashoffset={-(pSeg + cSeg)}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </>
      ) : null}
    </svg>
  )
}

function TrashIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className ?? 'h-5 w-5'} aria-hidden="true">
      <path d="M4 7h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7 7l1 14h8l1-14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 11v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function MealDetailRoute() {
  const navigate = useNavigate()
  const { mealId } = useParams<{ mealId: string }>()
  const { meals, removeMeal, currentProfile } = useApp()
  const { toast, confirm } = useUiFeedback()

  const { enqueueMealPhotoAnalysis, isMealRunning, isMealQueued, getMealError } = useMealPhotoAnalysis()

  const meal = useMemo(() => meals.find((m) => m.id === mealId) ?? null, [meals, mealId])

  const mealInsights = useMemo(() => {
    if (!meal || !currentProfile) return []
    return buildHealthInsights({
      scope: 'meal',
      body: currentProfile.body,
      medical: currentProfile.medical,
      totals: meal.totalMacros,
      targetKcal: null,
      items: meal.items.map((i) => ({ name: i.name })),
    })
  }, [meal, currentProfile])

  const mealLabel = useMemo(() => {
    if (!meal) return 'Meal'
    const dt = new Date(meal.eatenAt)
    if (!Number.isFinite(dt.getTime())) return 'Meal'
    return mealLabelFromHour(dt.getHours())
  }, [meal])

  const mealTitle = useMemo(() => {
    if (!meal) return ''
    const first = meal.items?.[0]?.name?.trim() ?? ''
    if (first) {
      const extra = Math.max(0, (meal.items?.length ?? 0) - 1)
      return extra > 0 ? `${first} +${extra} more` : first
    }
    if (meal.photoDataUrl) return 'Photo meal'
    return 'Meal'
  }, [meal])

  const note = useMemo(() => {
    if (!meal) return ''
    return nutritionistNote(meal.totalMacros)
  }, [meal])

  async function onDelete() {
    if (!meal) return
    const ok = await confirm({
      title: 'Delete meal',
      message: 'Delete this meal?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      destructive: true,
    })
    if (!ok) return
    try {
      await removeMeal(meal.id)
      toast({ kind: 'success', message: 'Meal deleted' })
      navigate('/meals')
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to delete meal' })
    }
  }

  async function onAnalyze() {
    if (!meal?.photoDataUrl) return

    try {
      enqueueMealPhotoAnalysis(meal.id)
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to start analysis' })
    }
  }

  if (!meal) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Meal not found.</div>
        <Link to="/meals" className="inline-block text-sm text-slate-900 underline dark:text-slate-100">
          Back to meals
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {meal.photoDataUrl ? (
        <div className="relative h-[240px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 md:h-[320px] dark:border-slate-800 dark:bg-slate-900">
          <img src={meal.photoDataUrl} alt="Meal photo" className="h-full w-full object-cover" />
          <Link
            to="/meals"
            className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
            aria-label="Back"
          >
            <span className="text-lg leading-none">←</span>
          </Link>
          <button
            onClick={() => void onDelete()}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
            aria-label="Delete meal"
            type="button"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
          <div className="absolute left-3 top-14 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">{mealLabel}</div>
          <div className="absolute bottom-3 left-3 right-3">
            <div className="text-3xl font-bold text-white">
              {meal.totalMacros.calories} <span className="text-base font-medium">kcal</span>
            </div>
            <div className="mt-1 text-base font-semibold text-white">{mealTitle}</div>
            <div className="mt-1 text-sm text-white/90">{new Date(meal.eatenAt).toLocaleString()}</div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{mealLabel}</div>
              <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{mealTitle}</div>
              <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {meal.totalMacros.calories} <span className="text-base font-medium text-slate-700 dark:text-slate-200">kcal</span>
              </div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{new Date(meal.eatenAt).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void onDelete()}
                className="inline-flex items-center justify-center rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:bg-slate-950"
                aria-label="Delete meal"
                type="button"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
              <Link to="/meals" className="text-sm text-slate-900 underline dark:text-slate-100" aria-label="Back">
                Back
              </Link>
            </div>
          </div>
        </div>
      )}

      {mealInsights.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-900/50 dark:bg-amber-900/20">
          <div className="text-sm font-semibold text-amber-900 dark:text-amber-100">Analysis Warning</div>
          <div className="mt-2 space-y-1">
            {mealInsights.map((i) => (
              <div key={i.id} className="text-sm text-amber-900 dark:text-amber-100">
                - {i.text}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <MacroDonut
              proteinG={Math.round(meal.totalMacros.protein_g)}
              carbsG={Math.round(meal.totalMacros.carbs_g)}
              fatG={Math.round(meal.totalMacros.fat_g)}
            />
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  Protein
                </div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">{Math.round(meal.totalMacros.protein_g)}g</div>
              </div>
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                  Carbs
                </div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">{Math.round(meal.totalMacros.carbs_g)}g</div>
              </div>
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                  Fat
                </div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">{Math.round(meal.totalMacros.fat_g)}g</div>
              </div>
            </div>
          </div>

          {meal.photoDataUrl ? (
            <button
              className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
              onClick={() => void onAnalyze()}
              disabled={isMealRunning(meal.id) || isMealQueued(meal.id)}
              type="button"
            >
              {isMealRunning(meal.id) || isMealQueued(meal.id) ? 'Analyzing…' : 'Re-analyze'}
            </button>
          ) : null}
        </div>

        {meal.photoDataUrl && getMealError(meal.id) ? (
          <div className="mt-3 text-sm text-red-600" role="alert" aria-live="assertive">
            {getMealError(meal.id)}
          </div>
        ) : null}

        {meal.photoDataUrl && (isMealRunning(meal.id) || isMealQueued(meal.id)) ? (
          <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">Analyzing in background…</div>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Items consumed</div>
          <Link to={`/meals/${meal.id}/edit`} className="text-sm font-semibold text-emerald-700 underline">
            Edit
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {meal.items.length === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">No items yet.</div>
          ) : (
            <div>
              {meal.items.map((it) => (
                <div key={it.id} className="flex items-start justify-between gap-4 border-t border-slate-200 px-4 py-3 first:border-t-0 dark:border-slate-800">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{it.name}</div>
                    <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                      {it.quantityGrams ? `${Math.round(it.quantityGrams)}g` : '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-emerald-700">{it.macros.calories} kcal</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-emerald-50 p-5 dark:bg-emerald-900/20">
        <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Nutritionist Note</div>
        <div className="mt-2 text-sm text-emerald-900/90 dark:text-emerald-100/90">"{note}"</div>
      </div>
    </div>
  )
}
