import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { analyzeMealPhoto } from '../ai/analyzePhoto'
import { useApp } from '../state/AppContext'

export function MealDetailRoute() {
  const navigate = useNavigate()
  const { mealId } = useParams<{ mealId: string }>()
  const { meals, removeMeal, updateMeal } = useApp()

  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const meal = useMemo(() => meals.find((m) => m.id === mealId) ?? null, [meals, mealId])

  async function onDelete() {
    if (!meal) return
    const ok = window.confirm('Delete this meal?')
    if (!ok) return
    await removeMeal(meal.id)
    navigate('/meals')
  }

  async function onAnalyze() {
    if (!meal?.photoDataUrl) return

    setAnalyzing(true)
    setAnalysisError(null)
    try {
      const result = await analyzeMealPhoto({ photoDataUrl: meal.photoDataUrl })
      await updateMeal({
        ...meal,
        items: result.items,
        totalMacros: result.totalMacros,
        aiAnalysis: result.ai,
      })
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : 'Failed to analyze photo')
    } finally {
      setAnalyzing(false)
    }
  }

  if (!meal) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-white p-4 shadow-sm text-sm text-slate-600">Meal not found.</div>
        <Link to="/meals" className="inline-block text-sm text-slate-900 underline">
          Back to meals
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="text-base font-semibold">Meal</div>
        <div className="mt-1 text-sm text-slate-600">{new Date(meal.eatenAt).toLocaleString()}</div>
      </div>

      {meal.photoDataUrl ? (
        <div className="space-y-3">
          <img src={meal.photoDataUrl} className="w-full rounded-lg border border-slate-200" />

          <div className="rounded-lg bg-white p-4 shadow-sm space-y-2">
            <div className="text-sm font-medium">Photo analysis</div>

            {meal.aiAnalysis ? (
              <div className="text-xs text-slate-600">
                Last analyzed: {new Date(meal.aiAnalysis.analyzedAt).toLocaleString()} ({meal.aiAnalysis.provider})
              </div>
            ) : (
              <div className="text-xs text-slate-600">Not analyzed yet.</div>
            )}

            {analysisError ? <div className="text-sm text-red-600">{analysisError}</div> : null}

            <button
              className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              onClick={() => void onAnalyze()}
              disabled={analyzing}
              type="button"
            >
              {analyzing ? 'Analyzing…' : 'Analyze photo'}
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="text-sm font-medium">Totals</div>
        <div className="mt-2 text-sm">
          <div>{meal.totalMacros.calories} kcal</div>
          <div>Protein: {meal.totalMacros.protein_g}g</div>
          <div>Carbs: {meal.totalMacros.carbs_g}g</div>
          <div>Fat: {meal.totalMacros.fat_g}g</div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="text-sm font-medium">Items</div>
        {meal.items.length === 0 ? (
          <div className="mt-2 text-sm text-slate-600">No items yet.</div>
        ) : (
          <div className="mt-2 space-y-2">
            {meal.items.map((i) => (
              <div key={i.id} className="rounded-md border border-slate-200 px-3 py-2">
                <div className="text-sm font-medium">{i.name}</div>
                <div className="text-xs text-slate-600">
                  {i.quantityGrams}g · {i.macros.calories} kcal
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        className="w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-red-700"
        onClick={() => void onDelete()}
      >
        Delete meal
      </button>
    </div>
  )
}
