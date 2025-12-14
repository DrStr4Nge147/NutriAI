import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MealItemsEditor } from '../components/MealItemsEditor'
import { buildHealthInsights } from '../nutrition/health'
import { useApp } from '../state/AppContext'
import { useUiFeedback } from '../state/UiFeedbackContext'
import { useMealPhotoAnalysis } from '../state/MealPhotoAnalysisContext'

export function MealDetailRoute() {
  const navigate = useNavigate()
  const { mealId } = useParams<{ mealId: string }>()
  const { meals, removeMeal, updateMeal, currentProfile } = useApp()
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-sm text-slate-600">Meal not found.</div>
        <Link to="/meals" className="inline-block text-sm text-slate-900 underline">
          Back to meals
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold">Meal</div>
            <div className="mt-1 text-sm text-slate-600">{new Date(meal.eatenAt).toLocaleString()}</div>
          </div>
          <Link to="/meals" className="text-sm text-slate-900 underline">
            Back
          </Link>
        </div>
      </div>

      {meal.photoDataUrl ? (
        <div className="space-y-3">
          <img src={meal.photoDataUrl} alt="Meal photo" className="w-full rounded-2xl border border-slate-200" />

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
            <div className="text-sm font-medium">Photo analysis</div>

            {meal.aiAnalysis ? (
              <div className="text-xs text-slate-600">
                Last analyzed: {new Date(meal.aiAnalysis.analyzedAt).toLocaleString()} ({meal.aiAnalysis.provider})
              </div>
            ) : (
              <div className="text-xs text-slate-600">Not analyzed yet.</div>
            )}

            {getMealError(meal.id) ? (
              <div className="text-sm text-red-600" role="alert" aria-live="assertive">
                {getMealError(meal.id)}
              </div>
            ) : null}

            {isMealRunning(meal.id) || isMealQueued(meal.id) ? (
              <div className="text-xs text-slate-600">Analyzing in background…</div>
            ) : null}

            <button
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
              onClick={() => void onAnalyze()}
              disabled={isMealRunning(meal.id) || isMealQueued(meal.id)}
              type="button"
            >
              {isMealRunning(meal.id) || isMealQueued(meal.id) ? 'Analyzing…' : 'Analyze photo'}
            </button>
          </div>
        </div>
      ) : null}

      {mealInsights.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <div className="text-sm font-medium">Warnings</div>
          <div className="space-y-2">
            {mealInsights.map((i) => (
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
          </div>
        </div>
      ) : null}

      <MealItemsEditor meal={meal} onSaveMeal={updateMeal} />

      <button
        className="w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-red-700"
        onClick={() => void onDelete()}
        type="button"
      >
        Delete meal
      </button>
    </div>
  )
}
