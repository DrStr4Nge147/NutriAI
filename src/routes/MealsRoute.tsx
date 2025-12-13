import { Link } from 'react-router-dom'
import { useApp } from '../state/AppContext'

export function MealsRoute() {
  const { meals } = useApp()

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="text-base font-semibold">Meal history</div>
        <div className="mt-1 text-sm text-slate-600">All meals saved on this device.</div>
      </div>

      {meals.length === 0 ? (
        <div className="rounded-lg bg-white p-4 shadow-sm text-sm text-slate-600">No meals yet.</div>
      ) : (
        <div className="space-y-2">
          {meals.map((m) => (
            <Link
              key={m.id}
              to={`/meals/${m.id}`}
              className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="text-sm font-medium">{new Date(m.eatenAt).toLocaleString()}</div>
              <div className="mt-1 text-xs text-slate-600">
                {m.totalMacros.calories} kcal · P {m.totalMacros.protein_g}g · C {m.totalMacros.carbs_g}g · F{' '}
                {m.totalMacros.fat_g}g
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
