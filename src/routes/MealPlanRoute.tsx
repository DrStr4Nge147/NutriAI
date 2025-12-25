import { useEffect, useMemo, useState } from 'react'
import { generateMealPlan, type GeneratedMealPlan } from '../ai/generateMealPlan'
import type { MealPlan, MealPlanMealType } from '../models/types'
import { useApp } from '../state/AppContext'
import { useMealPlanAnalysis } from '../state/MealPlanAnalysisContext'
import { useUiFeedback } from '../state/UiFeedbackContext'
import { deleteMealPlan, listMealPlansByProfile, putMeal, putMealPlan } from '../storage/db'
import { emptyMacros } from '../nutrition/macros'
import { newId } from '../utils/id'
import { formatDatetimeLocalValue, isHourWithinMealType, mealTypeFromHour, mealTypeLabel } from '../utils/mealType'

function mealTypeFromLocalTime(date: Date): MealPlanMealType {
  return mealTypeFromHour(date.getHours())
}

function isoWeekYearAndNumber(date: Date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return { year: tmp.getUTCFullYear(), week }
}

export function MealPlanRoute() {
  const { currentProfileId, currentProfile, refresh } = useApp()
  const { toast, confirm } = useUiFeedback()
  const { enqueueMealPlanAnalysis, isPlanQueued, isPlanRunning, getPlanError } = useMealPlanAnalysis()

  const now = new Date()
  const nowIsoWeek = isoWeekYearAndNumber(now)

  const [mealType, setMealType] = useState<MealPlanMealType>('lunch')
  const [userPickedMealType, setUserPickedMealType] = useState(false)
  const [approvedPlans, setApprovedPlans] = useState<MealPlan[]>([])
  const [mealIdByPlanId, setMealIdByPlanId] = useState<Record<string, string>>({})

  const [busy, setBusy] = useState(false)
  const [approveBusy, setApproveBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [generated, setGenerated] = useState<GeneratedMealPlan | null>(null)
  const [previewApproved, setPreviewApproved] = useState<MealPlan | null>(null)
  const [showAllApproved, setShowAllApproved] = useState(false)

  const [pendingApprove, setPendingApprove] = useState<null | { mealId: string; plan: MealPlan }>(null)
  const [pendingEatenAtLocal, setPendingEatenAtLocal] = useState<string>(() => formatDatetimeLocalValue(new Date()))

  const [approvedDateFilter, setApprovedDateFilter] = useState<'none' | 'week' | 'month'>('none')
  const [approvedYear, setApprovedYear] = useState<string>('all')
  const [approvedMonth, setApprovedMonth] = useState<number>(now.getMonth())
  const [approvedWeek, setApprovedWeek] = useState<number>(nowIsoWeek.week)

  useEffect(() => {
    if (userPickedMealType) return
    setMealType(mealTypeFromLocalTime(new Date()))
  }, [userPickedMealType])

  useEffect(() => {
    if (approvedDateFilter === 'none') return
    if (approvedYear !== 'all') return
    setApprovedYear(String(new Date().getFullYear()))
  }, [approvedDateFilter, approvedYear])

  const approvedForType = useMemo(() => {
    return approvedPlans.filter((p) => p.mealType === mealType)
  }, [approvedPlans, mealType])

  const approvedYearOptions = useMemo(() => {
    const thisYear = new Date().getFullYear()
    const years = new Set<number>()
    for (let y = thisYear; y >= thisYear - 5; y -= 1) years.add(y)
    for (const p of approvedForType) {
      const d = new Date(p.createdAt)
      if (!Number.isNaN(d.getTime())) years.add(d.getFullYear())
    }
    return Array.from(years).sort((a, b) => b - a)
  }, [approvedForType])

  const avoidTitles = useMemo(() => {
    return approvedForType
      .map((p) => p.title)
      .filter(Boolean)
      .slice(0, 25)
  }, [approvedForType])

  const filteredApprovedForType = useMemo(() => {
    let filtered = approvedForType
    const yearNum = approvedYear === 'all' ? null : Number.parseInt(approvedYear, 10)

    if (approvedDateFilter === 'none') {
      if (yearNum) {
        filtered = filtered.filter((p) => {
          const d = new Date(p.createdAt)
          return !Number.isNaN(d.getTime()) && d.getFullYear() === yearNum
        })
      }
    }

    if (approvedDateFilter === 'month') {
      const y = yearNum ?? new Date().getFullYear()
      filtered = filtered.filter((p) => {
        const d = new Date(p.createdAt)
        return !Number.isNaN(d.getTime()) && d.getFullYear() === y && d.getMonth() === approvedMonth
      })
    }

    if (approvedDateFilter === 'week') {
      const y = yearNum ?? new Date().getFullYear()
      filtered = filtered.filter((p) => {
        const d = new Date(p.createdAt)
        if (Number.isNaN(d.getTime())) return false
        const iso = isoWeekYearAndNumber(d)
        return iso.year === y && iso.week === approvedWeek
      })
    }

    return filtered
  }, [approvedForType, approvedDateFilter, approvedYear, approvedMonth, approvedWeek])

  const visibleApproved = useMemo(() => {
    if (showAllApproved) return filteredApprovedForType
    return filteredApprovedForType.slice(0, 5)
  }, [filteredApprovedForType, showAllApproved])

  function onViewApproved(plan: MealPlan) {
    setPreviewApproved(plan)
  }

  async function onDeleteApproved(plan: MealPlan) {
    if (!currentProfileId) return

    const ok = await confirm({
      title: 'Delete approved plan?',
      message: `This will remove "${plan.title}" from your approved plans.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      destructive: true,
    })
    if (!ok) return

    try {
      await deleteMealPlan(plan.id)
      setPreviewApproved((prev) => (prev?.id === plan.id ? null : prev))
      setApprovedPlans(await listMealPlansByProfile(currentProfileId))
      toast({ kind: 'success', message: 'Approved plan deleted' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete approved plan'
      toast({ kind: 'error', message: msg })
    }
  }

  useEffect(() => {
    if (!currentProfileId) {
      setApprovedPlans([])
      setPreviewApproved(null)
      return
    }

    let canceled = false
    ;(async () => {
      const plans = await listMealPlansByProfile(currentProfileId)
      if (canceled) return
      setApprovedPlans(plans)
    })().catch(() => {
      if (canceled) return
      setApprovedPlans([])
    })

    return () => {
      canceled = true
    }
  }, [currentProfileId])

  async function onGenerate() {
    if (!currentProfileId) {
      toast({ kind: 'error', message: 'No profile selected' })
      return
    }

    setBusy(true)
    setError(null)

    try {
      const result = await generateMealPlan({
        mealType,
        avoidTitles,
        profileContext: {
          age: currentProfile?.body.age,
          sex: currentProfile?.body.sex,
          heightCm: currentProfile?.body.heightCm,
          weightKg: currentProfile?.body.weightKg,
          activityLevel: currentProfile?.body.activityLevel,
          goal: currentProfile?.goal,
          targetCaloriesKcal: currentProfile?.targetCaloriesKcal ?? null,
        },
        medicalContext: {
          conditions: currentProfile?.medical.conditions ?? [],
          notes: currentProfile?.medical.notes ?? '',
          filesSummary: (currentProfile?.medical.filesSummary?.summary ?? '').slice(0, 800),
        },
      })
      setGenerated(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate meal plan')
    } finally {
      setBusy(false)
    }
  }

  async function onApprove() {
    if (!currentProfileId) {
      toast({ kind: 'error', message: 'No profile selected' })
      return
    }
    if (!generated) return

    setApproveBusy(true)
    setError(null)

    try {
      const plan: MealPlan = {
        id: newId(),
        profileId: currentProfileId,
        createdAt: new Date().toISOString(),
        mealType,
        title: generated.title,
        intro: generated.intro,
        ingredients: generated.ingredients,
        steps: generated.steps,
        ai: generated.ai,
      }

      await putMealPlan(plan)

      const now = new Date()
      const nowIso = now.toISOString()
      const mealId = newId()

      if (!isHourWithinMealType(plan.mealType, now.getHours())) {
        setPendingEatenAtLocal(formatDatetimeLocalValue(now))
        setPendingApprove({ mealId, plan })
        setApproveBusy(false)
        return
      }

      const meal = {
        id: mealId,
        profileId: currentProfileId,
        createdAt: nowIso,
        eatenAt: nowIso,
        mealType: plan.mealType,
        aiAnalysis: {
          provider: plan.ai?.provider ?? 'gemini',
          analyzedAt: plan.ai?.generatedAt ?? nowIso,
          rawText: JSON.stringify(
            {
              source: 'ai-meal-plan',
              mealType: plan.mealType,
              title: plan.title,
              intro: plan.intro,
              ingredients: plan.ingredients,
              steps: plan.steps,
            },
            null,
            2,
          ),
        },
        items: [
          {
            id: newId(),
            name: plan.title,
            quantityGrams: 0,
            macros: emptyMacros(),
          },
        ],
        totalMacros: emptyMacros(),
      }

      await putMeal(meal)
      await refresh()

      const analysisText =
        `Meal plan title: ${plan.title}\n` +
        `Intro: ${plan.intro}\n` +
        `Ingredients:\n- ${plan.ingredients.join('\n- ')}\n` +
        `Steps:\n- ${plan.steps.join('\n- ')}`

      setMealIdByPlanId((prev) => ({ ...prev, [plan.id]: mealId }))
      enqueueMealPlanAnalysis(plan.id, { mealId, text: analysisText })

      setApprovedPlans(await listMealPlansByProfile(currentProfileId))
      setGenerated(null)
      toast({ kind: 'success', message: 'Meal plan approved and saved' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to approve meal plan'
      toast({ kind: 'error', message: msg })
    } finally {
      setApproveBusy(false)
    }
  }

  async function confirmPendingApprove() {
    if (!currentProfileId) return
    if (!pendingApprove) return

    setApproveBusy(true)
    setError(null)

    try {
      const eatenAt = new Date(pendingEatenAtLocal).toISOString()
      const nowIso = new Date().toISOString()
      const { plan, mealId } = pendingApprove

      const meal = {
        id: mealId,
        profileId: currentProfileId,
        createdAt: nowIso,
        eatenAt,
        mealType: plan.mealType,
        aiAnalysis: {
          provider: plan.ai?.provider ?? 'gemini',
          analyzedAt: plan.ai?.generatedAt ?? nowIso,
          rawText: JSON.stringify(
            {
              source: 'ai-meal-plan',
              mealType: plan.mealType,
              title: plan.title,
              intro: plan.intro,
              ingredients: plan.ingredients,
              steps: plan.steps,
            },
            null,
            2,
          ),
        },
        items: [
          {
            id: newId(),
            name: plan.title,
            quantityGrams: 0,
            macros: emptyMacros(),
          },
        ],
        totalMacros: emptyMacros(),
      }

      await putMeal(meal)
      await refresh()

      const analysisText =
        `Meal plan title: ${plan.title}\n` +
        `Intro: ${plan.intro}\n` +
        `Ingredients:\n- ${plan.ingredients.join('\n- ')}\n` +
        `Steps:\n- ${plan.steps.join('\n- ')}`

      setMealIdByPlanId((prev) => ({ ...prev, [plan.id]: mealId }))
      enqueueMealPlanAnalysis(plan.id, { mealId, text: analysisText })

      setApprovedPlans(await listMealPlansByProfile(currentProfileId))
      setGenerated(null)
      toast({ kind: 'success', message: 'Meal plan approved and saved' })
      setPendingApprove(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to approve meal plan'
      toast({ kind: 'error', message: msg })
    } finally {
      setApproveBusy(false)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-700" aria-hidden="true">
              <path
                d="M4 8h16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 12h12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 16h8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="text-base font-semibold">AI Meal plan</div>
          </div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Generate a simple Filipino-style meal that’s easy to cook and easy to shop for.</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 dark:border-slate-800 dark:bg-slate-900">
          <label className="block text-sm">
            <div className="font-medium text-slate-900 dark:text-slate-100">Meal type</div>
            <select
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={mealType}
              onChange={(e) => {
                const next = (e.target.value === 'breakfast' || e.target.value === 'am_snack' || e.target.value === 'lunch' || e.target.value === 'pm_snack' || e.target.value === 'dinner')
                  ? (e.target.value as MealPlanMealType)
                  : 'lunch'
                setUserPickedMealType(true)
                setMealType(next)
                setGenerated(null)
                setError(null)
                setShowAllApproved(false)
                setPreviewApproved(null)
              }}
              disabled={busy || approveBusy}
            >
              <option value="breakfast">Breakfast</option>
              <option value="am_snack">AM snack</option>
              <option value="lunch">Lunch</option>
              <option value="pm_snack">PM snack</option>
              <option value="dinner">Dinner</option>
            </select>
          </label>

          {!generated ? (
            <button
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
              onClick={() => void onGenerate()}
              disabled={busy || approveBusy}
              type="button"
            >
              <span className="inline-flex items-center justify-center gap-2">
                {busy ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" aria-hidden="true">
                    <path
                      d="M12 2a10 10 0 1 0 10 10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : null}
                <span>{busy ? 'Generating…' : 'Generate a Meal Plan'}</span>
              </span>
            </button>
          ) : null}

          {avoidTitles.length > 0 ? (
            <div className="text-xs text-slate-600 dark:text-slate-300">Avoiding repeats from your last {avoidTitles.length} approved {mealTypeLabel(mealType).toLowerCase()} plan(s).</div>
          ) : null}

          {error ? <div className="text-sm text-red-700">{error}</div> : null}
        </div>

        {generated ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <div className="text-lg font-semibold">{generated.title}</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{generated.intro}</div>
            </div>

            <div>
              <div className="text-sm font-medium">Ingredients</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1 dark:text-slate-200">
                {generated.ingredients.map((x, idx) => (
                  <li key={`${idx}-${x}`}>{x}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-sm font-medium">How to cook</div>
              <ol className="mt-2 list-decimal pl-5 text-sm text-slate-700 space-y-1 dark:text-slate-200">
                {generated.steps.map((x, idx) => (
                  <li key={`${idx}-${x}`}>{x}</li>
                ))}
              </ol>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                onClick={() => void onGenerate()}
                disabled={busy || approveBusy}
                type="button"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {busy ? (
                    <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" aria-hidden="true">
                      <path
                        d="M12 2a10 10 0 1 0 10 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : null}
                  <span>{busy ? 'Regenerating…' : 'Regenerate'}</span>
                </span>
              </button>
              <button
                className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                onClick={() => void onApprove()}
                disabled={busy || approveBusy}
                type="button"
              >
                {approveBusy ? 'Approving…' : 'Approve & save'}
              </button>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm font-medium">Approved {mealTypeLabel(mealType)} plans</div>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Used to reduce repetition when you generate again.</div>

          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <label className="block text-xs">
              <div className="font-medium text-slate-700 dark:text-slate-200">Filter</div>
              <select
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                value={approvedDateFilter}
                onChange={(e) => {
                  const v = e.target.value === 'week' || e.target.value === 'month' ? e.target.value : 'none'
                  setApprovedDateFilter(v)
                  setShowAllApproved(false)
                  if (v !== 'none' && approvedYear === 'all') setApprovedYear(String(new Date().getFullYear()))
                }}
                disabled={busy || approveBusy}
              >
                <option value="none">No filter</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </label>

            <label className="block text-xs">
              <div className="font-medium text-slate-700 dark:text-slate-200">Year</div>
              <select
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                value={approvedYear}
                onChange={(e) => {
                  const v = e.target.value
                  setApprovedYear(v)
                  setShowAllApproved(false)
                }}
                disabled={busy || approveBusy}
              >
                {approvedDateFilter === 'none' ? <option value="all">All</option> : null}
                {approvedYearOptions.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </label>

            {approvedDateFilter === 'month' ? (
              <label className="block text-xs">
                <div className="font-medium text-slate-700 dark:text-slate-200">Month</div>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  value={String(approvedMonth)}
                  onChange={(e) => {
                    const v = Number.parseInt(e.target.value, 10)
                    setApprovedMonth(Number.isFinite(v) ? v : now.getMonth())
                    setShowAllApproved(false)
                  }}
                  disabled={busy || approveBusy}
                >
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const label = new Date(2000, idx, 1).toLocaleString(undefined, { month: 'short' })
                    return (
                      <option key={idx} value={String(idx)}>
                        {label}
                      </option>
                    )
                  })}
                </select>
              </label>
            ) : null}

            {approvedDateFilter === 'week' ? (
              <label className="block text-xs">
                <div className="font-medium text-slate-700 dark:text-slate-200">Week</div>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  value={String(approvedWeek)}
                  onChange={(e) => {
                    const v = Number.parseInt(e.target.value, 10)
                    setApprovedWeek(Number.isFinite(v) ? v : nowIsoWeek.week)
                    setShowAllApproved(false)
                  }}
                  disabled={busy || approveBusy}
                >
                  {Array.from({ length: 53 }).map((_, idx) => (
                    <option key={idx + 1} value={String(idx + 1)}>
                      {idx + 1}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          {approvedForType.length === 0 ? (
            <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">No approved plans yet.</div>
          ) : filteredApprovedForType.length === 0 ? (
            <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">No approved plans match this filter.</div>
          ) : (
            <div className="mt-3 space-y-2">
              {visibleApproved.map((p) => {
                const linkedMealId = mealIdByPlanId[p.id]
                const analyzing = isPlanRunning(p.id) || isPlanQueued(p.id)
                const err = getPlanError(p.id)
                return (
                <div key={p.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{p.title}</div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{new Date(p.createdAt).toLocaleString()}</div>
                      {analyzing ? (
                        <div className="mt-2">
                          <div className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 animate-spin" aria-hidden="true">
                              <path d="M12 2a10 10 0 1 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                            </svg>
                            <span>Analyzing nutrition…</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" />
                          </div>
                        </div>
                      ) : err ? (
                        <div className="mt-1 text-xs text-red-700">Analysis failed: {err}</div>
                      ) : linkedMealId ? (
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Nutrition saved to Meal History</div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        onClick={() => onViewApproved(p)}
                        disabled={busy || approveBusy}
                        type="button"
                      >
                        View
                      </button>
                      <button
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-red-900/30"
                        onClick={() => void onDeleteApproved(p)}
                        disabled={busy || approveBusy}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                )
              })}

              {filteredApprovedForType.length > 5 ? (
                <button
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                  onClick={() => setShowAllApproved((x) => !x)}
                  disabled={busy || approveBusy}
                  type="button"
                >
                  {showAllApproved ? 'Show less' : `Show all (${filteredApprovedForType.length})`}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {pendingApprove ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="text-base font-semibold text-slate-900 dark:text-slate-100">Confirm meal time</div>
            <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
              You selected <span className="font-semibold">{mealTypeLabel(pendingApprove.plan.mealType)}</span>, but the current time is unusual for that meal.
              Please confirm when you ate it.
            </div>

            <label className="mt-4 block text-sm">
              <div className="font-medium text-slate-900 dark:text-slate-100">Eaten at</div>
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                value={pendingEatenAtLocal}
                onChange={(e) => setPendingEatenAtLocal(e.target.value)}
                type="datetime-local"
              />
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900"
                onClick={() => setPendingApprove(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                onClick={() => void confirmPendingApprove()}
                disabled={approveBusy}
                type="button"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
