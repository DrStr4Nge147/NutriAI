import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext'

export function MealDetailRoute() {
  const navigate = useNavigate()
  const { mealId } = useParams<{ mealId: string }>()
  const { meals, removeMeal } = useApp()

  const meal = useMemo(() => meals.find((m) => m.id === mealId) ?? null, [meals, mealId])

  async function onDelete() {
    if (!meal) return
    const ok = window.confirm('Delete this meal?')
    if (!ok) return
    await removeMeal(meal.id)
    navigate('/meals')
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
        <img src={meal.photoDataUrl} className="w-full rounded-lg border border-slate-200" />
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
