import type { Meal, UserProfile } from '../models/types'
import { buildHealthInsights, type HealthInsight } from './health'

export function buildMealWarnings(input: { meal: Meal; profile: UserProfile }): HealthInsight[] {
  return buildHealthInsights({
    scope: 'meal',
    body: input.profile.body,
    medical: input.profile.medical,
    totals: input.meal.totalMacros,
    targetKcal: null,
    items: input.meal.items.map((i) => ({ name: i.name })),
  }).filter((i) => i.severity === 'warning')
}

export function hasMealWarnings(input: { meal: Meal; profile: UserProfile }): boolean {
  return buildMealWarnings(input).length > 0
}

export function fallbackNutritionistNote(input: { calories: number; protein_g: number; carbs_g: number; fat_g: number }): string {
  const kcal = input.calories
  if (!Number.isFinite(kcal) || kcal <= 0) return 'Log a meal to see a nutrition note.'

  const pKcal = Math.max(0, input.protein_g) * 4
  const cKcal = Math.max(0, input.carbs_g) * 4
  const fKcal = Math.max(0, input.fat_g) * 9
  const total = pKcal + cKcal + fKcal

  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0)
  const p = pct(pKcal)
  const c = pct(cKcal)
  const f = pct(fKcal)

  if (kcal >= 900) return `High-calorie meal (~${kcal} kcal). Balance with a lighter meal later and add vegetables/fiber.`
  if (kcal >= 600) return `Solid meal (~${kcal} kcal). Prioritize protein + fiber-rich carbs and keep fats moderate.`
  return `Light meal (~${kcal} kcal). Add vegetables/fiber and include protein to stay full.`
}

export function fallbackRiskNutritionistNote(input: {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  goal?: string
  conditions?: string[]
  warnings?: string[]
}): string {
  const warnings = (input.warnings ?? []).map((x) => x.trim()).filter(Boolean)
  if (warnings.length === 0) return fallbackNutritionistNote(input)

  const conditions = (input.conditions ?? []).map((x) => x.trim()).filter(Boolean)
  const head = conditions.length ? `This meal may be risky for ${conditions.join(', ')}.` : 'This meal may carry some risks for your health.'
  const first = warnings[0]
  const action = 'Consider a smaller portion, choosing a lower-sodium/low-sugar option, and adding vegetables/fiber.'
  return `${head} ${first} ${action}`
}
