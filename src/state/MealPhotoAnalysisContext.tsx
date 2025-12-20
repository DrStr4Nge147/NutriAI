import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { analyzeMealPhoto } from '../ai/analyzePhoto'
import { emptyMacros } from '../nutrition/macros'
import { getMeal } from '../storage/db'
import { useUiFeedback } from './UiFeedbackContext'
import { useApp } from './AppContext'

type MealPhotoAnalysisValue = {
  activeMealId: string | null
  queuedMealIds: string[]
  enqueueMealPhotoAnalysis: (mealId: string, options?: { description?: string }) => void
  isMealQueued: (mealId: string) => boolean
  isMealRunning: (mealId: string) => boolean
  getMealError: (mealId: string) => string | null
}

const MealPhotoAnalysisContext = createContext<MealPhotoAnalysisValue | null>(null)

export function MealPhotoAnalysisProvider(props: { children: ReactNode }) {
  const { meals, updateMeal } = useApp()
  const { toast } = useUiFeedback()

  const [activeMealId, setActiveMealId] = useState<string | null>(null)
  const [queuedMealIds, setQueuedMealIds] = useState<string[]>([])
  const [errorsByMealId, setErrorsByMealId] = useState<Record<string, string | null>>({})
  const [descriptionsByMealId, setDescriptionsByMealId] = useState<Record<string, string | undefined>>({})

  const mealsRef = useRef(meals)
  useEffect(() => {
    mealsRef.current = meals
  }, [meals])

  const descriptionsRef = useRef(descriptionsByMealId)
  useEffect(() => {
    descriptionsRef.current = descriptionsByMealId
  }, [descriptionsByMealId])

  const inFlightRef = useRef<string | null>(null)

  const isMealQueued = useCallback((mealId: string) => queuedMealIds.includes(mealId), [queuedMealIds])
  const isMealRunning = useCallback((mealId: string) => activeMealId === mealId, [activeMealId])

  const getMealError = useCallback((mealId: string) => errorsByMealId[mealId] ?? null, [errorsByMealId])

  const enqueueMealPhotoAnalysis = useCallback(
    (mealId: string, options?: { description?: string }) => {
      if (inFlightRef.current === mealId || queuedMealIds.includes(mealId)) {
        toast({ kind: 'info', message: 'Meal photo analysis is already in progress.' })
        return
      }

      setErrorsByMealId((prev) => ({ ...prev, [mealId]: null }))

      const description = options?.description?.trim()
      if (description) {
        setDescriptionsByMealId((prev) => ({ ...prev, [mealId]: description }))
      }

      setQueuedMealIds((prev) => {
        if (prev.includes(mealId)) return prev
        return [...prev, mealId]
      })

      if (inFlightRef.current) {
        toast({ kind: 'info', message: 'Analysis is running in the background. Added to queue.' })
      } else {
        toast({ kind: 'info', message: 'Analyzing meal photo in the background…' })
      }
    },
    [queuedMealIds, toast],
  )

  const runJob = useCallback(
    async (mealId: string) => {
      try {
        const inMemory = mealsRef.current.find((m) => m.id === mealId) ?? null
        const meal = inMemory ?? (await getMeal(mealId)) ?? null
        if (!meal) throw new Error('Meal not found')
        if (!meal.photoDataUrl) throw new Error('Meal photo not found')

        const description = descriptionsRef.current[mealId]

        const result = await analyzeMealPhoto({ photoDataUrl: meal.photoDataUrl, description })

        const latest = mealsRef.current.find((m) => m.id === mealId) ?? meal

        await updateMeal({
          ...latest,
          items: result.items,
          totalMacros: result.totalMacros ?? emptyMacros(),
          aiAnalysis: result.ai,
        })

        toast({ kind: 'success', message: 'Meal photo analysis complete.' })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to analyze photo'
        setErrorsByMealId((prev) => ({ ...prev, [mealId]: msg }))
        toast({ kind: 'error', message: msg })
      } finally {
        setDescriptionsByMealId((prev) => {
          if (!prev[mealId]) return prev
          const next = { ...prev }
          delete next[mealId]
          return next
        })
        inFlightRef.current = null
        setActiveMealId(null)
      }
    },
    [toast, updateMeal],
  )

  useEffect(() => {
    if (inFlightRef.current) return
    if (queuedMealIds.length === 0) return

    const nextId = queuedMealIds[0]
    inFlightRef.current = nextId
    setActiveMealId(nextId)
    setQueuedMealIds((prev) => prev.filter((id) => id !== nextId))

    void runJob(nextId)
  }, [queuedMealIds, runJob, activeMealId])

  const value = useMemo<MealPhotoAnalysisValue>(
    () => ({
      activeMealId,
      queuedMealIds,
      enqueueMealPhotoAnalysis,
      isMealQueued,
      isMealRunning,
      getMealError,
    }),
    [activeMealId, queuedMealIds, enqueueMealPhotoAnalysis, isMealQueued, isMealRunning, getMealError],
  )

  return <MealPhotoAnalysisContext.Provider value={value}>{props.children}</MealPhotoAnalysisContext.Provider>
}

export function useMealPhotoAnalysis() {
  const ctx = useContext(MealPhotoAnalysisContext)
  if (!ctx) throw new Error('MealPhotoAnalysisProvider missing')
  return ctx
}
