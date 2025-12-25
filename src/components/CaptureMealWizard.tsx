import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { buildHealthInsights } from '../nutrition/health'
import { fallbackRiskNutritionistNote } from '../nutrition/mealGuidance'
import { useApp } from '../state/AppContext'
import { useMealPhotoAnalysis } from '../state/MealPhotoAnalysisContext'
import { CaptureMealPicker } from './CaptureMealPicker'

function formatDatetimeLocalValue(date: Date) {
  const tzOffsetMs = date.getTimezoneOffset() * 60_000
  const local = new Date(date.getTime() - tzOffsetMs)
  return local.toISOString().slice(0, 16)
}

function mealLabelFromHour(hour: number) {
  if (hour >= 5 && hour < 11) return 'Breakfast'
  if (hour >= 11 && hour < 15) return 'Lunch'
  if (hour >= 15 && hour < 18) return 'Snack'
  if (hour >= 18 && hour < 23) return 'Dinner'
  return 'Meal'
}

export function CaptureMealWizard() {
  const navigate = useNavigate()
  const location = useLocation()

  const { addPhotoMeal, meals, currentProfile } = useApp()
  const { enqueueMealPhotoAnalysis, isMealQueued, isMealRunning, getMealError } = useMealPhotoAnalysis()

  const [eatenAt, setEatenAt] = useState(() => {
    const s = location.state as any
    return typeof s?.eatenAtLocal === 'string' ? s.eatenAtLocal : formatDatetimeLocalValue(new Date())
  })
  const [photoPreview, setPhotoPreview] = useState<string | null>(() => {
    const s = location.state as any
    return typeof s?.photoDataUrl === 'string' ? s.photoDataUrl : null
  })

  const [description, setDescription] = useState('')
  const [mealId, setMealId] = useState<string | null>(null)

  const [step, setStep] = useState<'pick' | 'describe' | 'analyzing' | 'review'>(() => (photoPreview ? 'describe' : 'pick'))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const s = location.state as any
    if (typeof s?.photoDataUrl === 'string') {
      setPhotoPreview(s.photoDataUrl)
      setStep('describe')
    }
    if (typeof s?.eatenAtLocal === 'string') setEatenAt(s.eatenAtLocal)
  }, [location.state])

  useEffect(() => {
    if (photoPreview && step === 'pick') setStep('describe')
    if (!photoPreview && step !== 'pick') {
      setStep('pick')
      setMealId(null)
    }
  }, [photoPreview, step])

  const meal = useMemo(() => (mealId ? meals.find((m) => m.id === mealId) ?? null : null), [mealId, meals])

  const mealLabel = useMemo(() => {
    const dt = new Date(eatenAt)
    if (!Number.isFinite(dt.getTime())) return 'Meal'
    return mealLabelFromHour(dt.getHours())
  }, [eatenAt])

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

  const warningInsights = useMemo(() => mealInsights.filter((i) => i.severity === 'warning'), [mealInsights])

  const note = useMemo(() => {
    const totals = meal?.totalMacros ?? null
    if (!totals) return ''
    return fallbackRiskNutritionistNote({
      ...totals,
      goal: currentProfile?.goal ?? undefined,
      conditions: currentProfile?.medical?.conditions ?? [],
      warnings: warningInsights.map((w) => w.text),
    })
  }, [meal?.totalMacros, currentProfile?.goal, currentProfile?.medical?.conditions, warningInsights])

  useEffect(() => {
    if (step !== 'analyzing') return
    if (!mealId) return

    if (getMealError(mealId)) {
      setStep('review')
      return
    }

    const m = meals.find((x) => x.id === mealId) ?? null
    if (m?.aiAnalysis || (m?.items?.length ?? 0) > 0) {
      setStep('review')
    }
  }, [step, mealId, meals, getMealError])

  async function beginAnalysis() {
    if (!photoPreview) return
    setBusy(true)
    setError(null)
    try {
      const iso = new Date(eatenAt).toISOString()

      const existing = mealId ? (meals.find((m) => m.id === mealId) ?? null) : null
      const created = existing ?? (await addPhotoMeal({ photoDataUrl: photoPreview, eatenAt: iso }))

      setMealId(created.id)
      enqueueMealPhotoAnalysis(created.id, { description })
      setStep('analyzing')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to analyze meal')
    } finally {
      setBusy(false)
    }
  }

  function onClose() {
    navigate('/')
  }

  function confirmAndSave() {
    navigate('/')
  }

  if (!photoPreview) {
    return (
      <CaptureMealPicker
        eatenAt={eatenAt}
        setEatenAt={setEatenAt}
        disabled={busy}
        onPhotoDataUrl={(dataUrl) => {
          setError(null)
          setPhotoPreview(dataUrl)
        }}
      />
    )
  }

  const mealError = mealId ? getMealError(mealId) : null

  return (
    <div className="relative">
      <div className="relative">
        <div className="relative h-[240px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 md:h-[320px]">
          <img src={photoPreview} alt="Meal photo preview" className="h-full w-full object-cover" />
          <button
            onClick={() => onClose()}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
            aria-label="Close"
            type="button"
          >
            <span className="text-lg leading-none">×</span>
          </button>
          <div className="absolute left-3 top-3 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">{mealLabel}</div>
        </div>

        <div className="-mt-6 rounded-t-3xl bg-white p-5 shadow-2xl">
          {step === 'describe' ? (
            <div className="space-y-4">
              <div>
                <div className="text-lg font-semibold">Describe this meal</div>
                <div className="mt-1 text-sm text-slate-600">Help the AI by adding details (e.g., "fried in oil", "double rice").</div>
              </div>

              <textarea
                className="min-h-[120px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Chicken adobo with garlic rice..."
              />

              <div className="grid gap-2">
                <label className="block text-sm">
                  <div className="font-medium">Eaten at</div>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={eatenAt}
                    onChange={(e) => setEatenAt(e.target.value)}
                    type="datetime-local"
                  />
                </label>

                {error ? (
                  <div className="text-sm text-red-600" role="alert" aria-live="assertive">
                    {error}
                  </div>
                ) : null}

                <button
                  className="mt-2 w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-4 text-sm font-semibold text-white transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
                  onClick={() => void beginAnalysis()}
                  disabled={busy}
                  type="button"
                >
                  Analyze Meal →
                </button>

                <button
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
                  onClick={() => navigate('/manual')}
                  type="button"
                >
                  Or use manual entry
                </button>
              </div>
            </div>
          ) : null}

          {step === 'analyzing' ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
              <div className="text-lg font-semibold">Analyzing your food…</div>
              <div className="text-sm text-slate-600">Identifying ingredients and calculating nutrition…</div>

              {mealId ? (
                <div className="mt-2 text-xs text-slate-500">
                  {isMealRunning(mealId) ? 'Running' : isMealQueued(mealId) ? 'Queued' : 'Starting'}
                </div>
              ) : null}

              {mealId && mealError ? (
                <div className="mt-3 w-full">
                  <div className="text-sm text-red-600" role="alert" aria-live="assertive">
                    {mealError}
                  </div>
                  <button
                    className="mt-3 w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-3 text-sm font-semibold text-white"
                    onClick={() => {
                      enqueueMealPhotoAnalysis(mealId, { description })
                      setStep('analyzing')
                    }}
                    type="button"
                  >
                    Try again
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 'review' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">Detected Items</div>
                <div className="text-sm font-semibold text-emerald-700">{meal?.totalMacros.calories ?? 0} kcal</div>
              </div>

              {mealInsights.length > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="text-sm font-semibold text-amber-900">Attention</div>
                  <div className="mt-2 space-y-1">
                    {mealInsights.slice(0, 2).map((i) => (
                      <div key={i.id} className="text-xs text-amber-900">
                        - {i.text}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                {(meal?.items ?? []).length === 0 ? (
                  <div className="px-4 py-4 text-sm text-slate-600">No detected items yet.</div>
                ) : (
                  <div>
                    {(meal?.items ?? []).map((it) => (
                      <div key={it.id} className="flex items-start justify-between gap-4 border-t border-slate-200 px-4 py-3 first:border-t-0">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900">{it.name}</div>
                          <div className="mt-0.5 text-xs text-slate-600">{it.quantityGrams ? `${Math.round(it.quantityGrams)}g` : '—'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-emerald-700">{it.macros.calories} kcal</div>
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            P {it.macros.protein_g}g · C {it.macros.carbs_g}g · F {it.macros.fat_g}g
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={warningInsights.length > 0 ? 'rounded-2xl bg-amber-50 px-4 py-3' : 'rounded-2xl bg-emerald-50 px-4 py-3'}>
                <div className={warningInsights.length > 0 ? 'text-sm font-semibold text-amber-900' : 'text-sm font-semibold text-emerald-900'}>
                  Nutritionist Note
                </div>
                <div className={warningInsights.length > 0 ? 'mt-2 text-xs text-amber-900/90' : 'mt-2 text-xs text-emerald-900/90'}>
                  "{note}"
                </div>
              </div>

              {mealId && mealError ? (
                <div className="text-sm text-red-600" role="alert" aria-live="assertive">
                  {mealError}
                </div>
              ) : null}

              <button
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-4 text-sm font-semibold text-white transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
                onClick={() => confirmAndSave()}
                disabled={!meal || (meal.items.length === 0 && !getMealError(meal.id))}
                type="button"
              >
                Confirm &amp; Save Meal
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
