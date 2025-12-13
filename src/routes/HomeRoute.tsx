import { Link } from 'react-router-dom'
import { useApp } from '../state/AppContext'

export function HomeRoute() {
  const { currentProfile, meals } = useApp()

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="text-base font-semibold">Hi{currentProfile ? `, ${currentProfile.name}` : ''}</div>
        <div className="mt-1 text-sm text-slate-600">Log a meal and review your recent history.</div>
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
