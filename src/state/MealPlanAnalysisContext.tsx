import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { analyzeMealText } from '../ai/analyzeMealText'
import { emptyMacros } from '../nutrition/macros'
import { getMeal } from '../storage/db'
import { useApp } from './AppContext'
import { useUiFeedback } from './UiFeedbackContext'

type MealPlanAnalysisValue = {
  activePlanId: string | null
  queuedPlanIds: string[]
  enqueueMealPlanAnalysis: (planId: string, input: { mealId: string; text: string }) => void
  isPlanQueued: (planId: string) => boolean
  isPlanRunning: (planId: string) => boolean
  getPlanError: (planId: string) => string | null
}

const MealPlanAnalysisContext = createContext<MealPlanAnalysisValue | null>(null)

export function MealPlanAnalysisProvider(props: { children: ReactNode }) {
  const { meals, updateMeal } = useApp()
  const { toast } = useUiFeedback()

  const [activePlanId, setActivePlanId] = useState<string | null>(null)
  const [queuedPlanIds, setQueuedPlanIds] = useState<string[]>([])
  const [errorsByPlanId, setErrorsByPlanId] = useState<Record<string, string | null>>({})

  const jobsByPlanIdRef = useRef<Record<string, { mealId: string; text: string }>>({})

  const mealsRef = useRef(meals)
  useEffect(() => {
    mealsRef.current = meals
  }, [meals])

  const inFlightRef = useRef<string | null>(null)

  const isPlanQueued = useCallback((planId: string) => queuedPlanIds.includes(planId), [queuedPlanIds])
  const isPlanRunning = useCallback((planId: string) => activePlanId === planId, [activePlanId])
  const getPlanError = useCallback((planId: string) => errorsByPlanId[planId] ?? null, [errorsByPlanId])

  const enqueueMealPlanAnalysis = useCallback(
    (planId: string, input: { mealId: string; text: string }) => {
      if (inFlightRef.current === planId || queuedPlanIds.includes(planId)) {
        toast({ kind: 'info', message: 'Meal plan analysis is already in progress.' })
        return
      }

      jobsByPlanIdRef.current[planId] = input
      setErrorsByPlanId((prev) => ({ ...prev, [planId]: null }))

      setQueuedPlanIds((prev) => {
        if (prev.includes(planId)) return prev
        return [...prev, planId]
      })

      if (inFlightRef.current) {
        toast({ kind: 'info', message: 'Analysis is running in the background. Added to queue.' })
      } else {
        toast({ kind: 'info', message: 'Analyzing meal plan in the background…' })
      }
    },
    [queuedPlanIds, toast],
  )

  const runJob = useCallback(
    async (planId: string) => {
      try {
        const job = jobsByPlanIdRef.current[planId]
        if (!job) throw new Error('Meal plan analysis job missing')

        const result = await analyzeMealText({ text: job.text })

        const inMemory = mealsRef.current.find((m) => m.id === job.mealId) ?? null
        const meal = inMemory ?? (await getMeal(job.mealId)) ?? null
        if (!meal) throw new Error('Meal not found')

        await updateMeal({
          ...meal,
          items: result.items,
          totalMacros: result.totalMacros ?? emptyMacros(),
          aiAnalysis: result.ai,
        })

        toast({ kind: 'success', message: 'Meal plan analysis complete.' })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to analyze meal plan'
        setErrorsByPlanId((prev) => ({ ...prev, [planId]: msg }))
        toast({ kind: 'error', message: msg })
      } finally {
        delete jobsByPlanIdRef.current[planId]
        inFlightRef.current = null
        setActivePlanId(null)
      }
    },
    [toast, updateMeal],
  )

  useEffect(() => {
    if (inFlightRef.current) return
    if (queuedPlanIds.length === 0) return

    const nextId = queuedPlanIds[0]
    inFlightRef.current = nextId
    setActivePlanId(nextId)
    setQueuedPlanIds((prev) => prev.filter((id) => id !== nextId))

    void runJob(nextId)
  }, [queuedPlanIds, runJob, activePlanId])

  const value = useMemo<MealPlanAnalysisValue>(
    () => ({
      activePlanId,
      queuedPlanIds,
      enqueueMealPlanAnalysis,
      isPlanQueued,
      isPlanRunning,
      getPlanError,
    }),
    [activePlanId, queuedPlanIds, enqueueMealPlanAnalysis, isPlanQueued, isPlanRunning, getPlanError],
  )

  return <MealPlanAnalysisContext.Provider value={value}>{props.children}</MealPlanAnalysisContext.Provider>
}

export function useMealPlanAnalysis() {
  const ctx = useContext(MealPlanAnalysisContext)
  if (!ctx) throw new Error('MealPlanAnalysisProvider missing')
  return ctx
}
