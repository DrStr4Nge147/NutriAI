import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { readFileAsDataUrl } from '../utils/files'
import { buildHealthInsights } from '../nutrition/health'
import { fallbackRiskNutritionistNote } from '../nutrition/mealGuidance'
import { useApp } from '../state/AppContext'
import { useMealPhotoAnalysis } from '../state/MealPhotoAnalysisContext'

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

export function CaptureMealRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const { addPhotoMeal, meals, currentProfile } = useApp()

  const { enqueueMealPhotoAnalysis, isMealQueued, isMealRunning, getMealError } = useMealPhotoAnalysis()

  const scanFileInputRef = useRef<HTMLInputElement | null>(null)
  const uploadFileInputRef = useRef<HTMLInputElement | null>(null)

  const isCoarsePointer =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)').matches
      : false

  const [eatenAt, setEatenAt] = useState(() => {
    const s = location.state as any
    return typeof s?.eatenAtLocal === 'string' ? s.eatenAtLocal : formatDatetimeLocalValue(new Date())
  })
  const [photoPreview, setPhotoPreview] = useState<string | null>(() => {
    const s = location.state as any
    return typeof s?.photoDataUrl === 'string' ? s.photoDataUrl : null
  })
  const [cameraActive, setCameraActive] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [description, setDescription] = useState('')
  const [mealId, setMealId] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const [step, setStep] = useState<'pick' | 'describe' | 'analyzing' | 'review'>(() => (photoPreview ? 'describe' : 'pick'))

  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (!videoRef.current) return
    if (!stream) {
      ;(videoRef.current as HTMLVideoElement & { srcObject?: MediaStream | null }).srcObject = null
      return
    }

    ;(videoRef.current as HTMLVideoElement & { srcObject?: MediaStream | null }).srcObject = stream
    void videoRef.current.play().catch(() => {})
  }, [stream])

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [stream])

  useEffect(() => {
    const s = location.state as any
    if (typeof s?.photoDataUrl === 'string') setPhotoPreview(s.photoDataUrl)
    if (typeof s?.eatenAtLocal === 'string') setEatenAt(s.eatenAtLocal)
  }, [location.state])

  useEffect(() => {
    if (photoPreview && step === 'pick') setStep('describe')
    if (!photoPreview && step !== 'pick') {
      setStep('pick')
      setMealId(null)
      setConfirmed(false)
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

  async function onPickFile(file: File | null) {
    setError(null)
    if (!file) return
    setEatenAt(formatDatetimeLocalValue(new Date()))
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setPhotoPreview(dataUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read image')
    }
  }

  async function startCamera() {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not available in this browser.')
      return
    }

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      setStream(nextStream)
      setCameraActive(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to access camera'
      setError(msg)
      setCameraActive(false)
      setStream(null)
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)
    setCameraActive(false)
  }

  function captureFromCamera() {
    setError(null)
    const video = videoRef.current
    if (!video) return

    setEatenAt(formatDatetimeLocalValue(new Date()))

    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) {
      setError('Camera not ready yet. Please wait a moment and try again.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setError('Unable to capture image.')
      return
    }

    ctx.drawImage(video, 0, 0, w, h)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setPhotoPreview(dataUrl)
    stopCamera()
  }

  function openFilePicker() {
    setError(null)
    const el = scanFileInputRef.current
    if (!el) return
    el.value = ''
    el.click()
  }

  async function beginAnalysis() {
    if (!photoPreview) return
    setSubmitting(true)
    setError(null)
    try {
      const iso = new Date(eatenAt).toISOString()

      const created = mealId
        ? (meals.find((m) => m.id === mealId) ?? null)
        : await addPhotoMeal({ photoDataUrl: photoPreview, eatenAt: iso })

      if (!created) throw new Error('Failed to create meal')
      setMealId(created.id)

      enqueueMealPhotoAnalysis(created.id, { description })
      setStep('analyzing')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to analyze meal')
    } finally {
      setSubmitting(false)
    }
  }

  async function onClose() {
    navigate('/')
  }

  function confirmAndSave() {
    setConfirmed(true)
    navigate('/')
  }

  return (
    <div className="relative">
      {photoPreview ? (
        <div className="relative">
          <div className="relative h-[240px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 md:h-[320px] dark:border-slate-800 dark:bg-slate-900">
            <img src={photoPreview} alt="Meal photo preview" className="h-full w-full object-cover" />
            <button
              onClick={() => void onClose()}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
              aria-label="Close"
              type="button"
            >
              <span className="text-lg leading-none">×</span>
            </button>
            <div className="absolute left-3 top-3 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              {mealLabel}
            </div>
          </div>

          <div className="-mt-6 rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            {step === 'describe' ? (
              <div className="space-y-4">
                <div>
                  <div className="text-lg font-semibold">Describe this meal</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Help the AI by adding details (e.g., "fried in oil", "double rice").</div>
                </div>

                <textarea
                  className="min-h-[120px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Chicken adobo with garlic rice..."
                />

                <div className="grid gap-2">
                  <label className="block text-sm">
                    <div className="font-medium text-slate-900 dark:text-slate-100">Eaten at</div>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
                    disabled={submitting}
                    type="button"
                  >
                    Analyze Meal →
                  </button>

                  <button
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
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
                <div className="text-sm text-slate-600 dark:text-slate-300">Identifying ingredients and calculating nutrition…</div>

                {mealId ? (
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {isMealRunning(mealId) || isMealQueued(mealId) ? 'Running' : 'Starting'}
                  </div>
                ) : null}

                {mealId && getMealError(mealId) ? (
                  <div className="mt-3 w-full">
                    <div className="text-sm text-red-600" role="alert" aria-live="assertive">
                      {getMealError(mealId)}
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
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Detected Items</div>
                  <div className="text-sm font-semibold text-emerald-700">{meal?.totalMacros.calories ?? 0} kcal</div>
                </div>

                {mealInsights.length > 0 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-900/20">
                    <div className="text-sm font-semibold text-amber-900 dark:text-amber-100">Attention</div>
                    <div className="mt-2 space-y-1">
                      {mealInsights.slice(0, 2).map((i) => (
                        <div key={i.id} className="text-xs text-amber-900 dark:text-amber-100">
                          - {i.text}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                  {(meal?.items ?? []).length === 0 ? (
                    <div className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">No detected items yet.</div>
                  ) : (
                    <div>
                      {(meal?.items ?? []).map((it) => (
                        <div key={it.id} className="flex items-start justify-between gap-4 border-t border-slate-200 px-4 py-3 first:border-t-0 dark:border-slate-800">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{it.name}</div>
                            <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                              {it.quantityGrams ? `${Math.round(it.quantityGrams)}g` : '—'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-emerald-700">{it.macros.calories} kcal</div>
                            <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                              P {it.macros.protein_g}g · C {it.macros.carbs_g}g · F {it.macros.fat_g}g
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className={
                    warningInsights.length > 0
                      ? 'rounded-2xl bg-amber-50 px-4 py-3 dark:bg-amber-900/20'
                      : 'rounded-2xl bg-emerald-50 px-4 py-3 dark:bg-emerald-900/20'
                  }
                >
                  <div
                    className={
                      warningInsights.length > 0
                        ? 'text-sm font-semibold text-amber-900 dark:text-amber-100'
                        : 'text-sm font-semibold text-emerald-900 dark:text-emerald-100'
                    }
                  >
                    Nutritionist Note
                  </div>

                  {warningInsights.length > 0 ? (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-900/20">
                      <div className="text-sm font-semibold text-amber-900 dark:text-amber-100">Warnings</div>
                      <div className="mt-2 space-y-1">
                        {warningInsights.map((i) => (
                          <div key={i.id} className="text-xs text-amber-900 dark:text-amber-100">
                            - {i.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div
                    className={
                      warningInsights.length > 0
                        ? 'mt-2 text-xs text-amber-900/90 dark:text-amber-100/90'
                        : 'mt-2 text-xs text-emerald-900/90 dark:text-emerald-100/90'
                    }
                  >
                    "{note}"
                  </div>
                </div>

                {mealId && getMealError(mealId) ? (
                  <div className="text-sm text-red-600" role="alert" aria-live="assertive">
                    {getMealError(mealId)}
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
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">Scan meal</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Take a photo or upload an image to estimate nutrition.</div>
            </div>

            <input
              ref={scanFileInputRef}
              className="sr-only"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
            />

            <label className="block text-sm">
              <div className="font-medium text-slate-900 dark:text-slate-100">Eaten at</div>
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                value={eatenAt}
                onChange={(e) => setEatenAt(e.target.value)}
                type="datetime-local"
              />
            </label>

            {isCoarsePointer ? (
              <button
                className="w-full rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
                onClick={() => openFilePicker()}
                disabled={submitting}
                type="button"
              >
                Scan
              </button>
            ) : (
              <>
                <div className="flex gap-2">
                  {!cameraActive ? (
                    <button
                      className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
                      onClick={() => void startCamera()}
                      disabled={submitting}
                      type="button"
                    >
                      Open camera
                    </button>
                  ) : (
                    <>
                      <button
                        className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 active:brightness-95"
                        onClick={() => captureFromCamera()}
                        type="button"
                      >
                        Capture
                      </button>
                      <button
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                        onClick={() => stopCamera()}
                        type="button"
                      >
                        Close
                      </button>
                    </>
                  )}
                </div>

                {cameraActive ? (
                  <video
                    ref={videoRef}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800"
                    autoPlay
                    playsInline
                    muted
                  />
                ) : null}
              </>
            )}

            <label className="block text-sm">
              <div className="font-medium text-slate-900 dark:text-slate-100">Upload photo</div>
              <input
                className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-900 hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-100 dark:hover:file:bg-slate-700"
                ref={uploadFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
              />
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                If camera doesn’t open, your browser may not support it here. Try HTTPS or use Upload.
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
