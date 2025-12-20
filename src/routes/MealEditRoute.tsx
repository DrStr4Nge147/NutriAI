import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MealItemsEditor } from '../components/MealItemsEditor'
import { useApp } from '../state/AppContext'

export function MealEditRoute() {
  const { mealId } = useParams<{ mealId: string }>()
  const { meals, updateMeal } = useApp()

  const meal = useMemo(() => meals.find((m) => m.id === mealId) ?? null, [meals, mealId])

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
            <div className="text-base font-semibold">Edit items</div>
            <div className="mt-1 text-sm text-slate-600">Update food names, grams, and macros.</div>
          </div>
          <Link to={`/meals/${meal.id}`} className="text-sm text-slate-900 underline">
            Back
          </Link>
        </div>
      </div>

      <MealItemsEditor meal={meal} onSaveMeal={updateMeal} />
    </div>
  )
}
