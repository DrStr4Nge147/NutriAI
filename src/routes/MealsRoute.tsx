import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state/AppContext'

export function MealsRoute() {
  const { meals } = useApp()

  const sortedMeals = useMemo(() => {
    return meals
      .slice()
      .sort((a, b) => new Date(b.eatenAt).getTime() - new Date(a.eatenAt).getTime())
  }, [meals])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold">History</div>
            <div className="mt-1 text-sm text-slate-600">All meals saved on this device.</div>
          </div>
          <div className="flex gap-2">
            <Link
              to="/capture"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 active:brightness-95"
            >
              Scan
            </Link>
            <Link
              to="/manual"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              Manual
            </Link>
          </div>
        </div>
      </div>

      {sortedMeals.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-sm text-slate-600">
          No meals yet.
        </div>
      ) : (
        <div className="space-y-2">
          {sortedMeals.map((m) => {
            const dt = new Date(m.eatenAt)
            const when = dt.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            return (
              <Link
                key={m.id}
                to={`/meals/${m.id}`}
                className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-xl bg-slate-100">
                    {m.photoDataUrl ? <img src={m.photoDataUrl} alt="" className="h-full w-full object-cover" /> : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">{when}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <div className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">{m.totalMacros.calories} kcal</div>
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
    </div>
  )
}
