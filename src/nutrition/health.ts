import type { BodyMetrics, MacroNutrients, MedicalInfo } from '../models/types'

export type HealthInsight = {
  id: string
  severity: 'info' | 'warning'
  text: string
}

function bmiFromBody(body: BodyMetrics): number | null {
  if (!Number.isFinite(body.heightCm) || body.heightCm <= 0) return null
  if (!Number.isFinite(body.weightKg) || body.weightKg <= 0) return null
  const m = body.heightCm / 100
  const bmi = body.weightKg / (m * m)
  return Number.isFinite(bmi) ? bmi : null
}

function normalizeCondition(value: string) {
  return value.trim().toLowerCase()
}

function hasAnyCondition(medical: MedicalInfo, needles: string[]): boolean {
  const set = new Set((medical.conditions ?? []).map(normalizeCondition))
  return needles.some((n) => set.has(normalizeCondition(n)))
}

function round1(value: number) {
  return Math.round(value * 10) / 10
}

function recommendedProteinG(body: BodyMetrics): number | null {
  if (!Number.isFinite(body.weightKg) || body.weightKg <= 0) return null
  const perKg = body.activityLevel === 'active' || body.activityLevel === 'very_active' ? 1.2 : 0.8
  return Math.round(body.weightKg * perKg)
}

export function buildHealthInsights(input: {
  body: BodyMetrics
  medical: MedicalInfo
  totals: MacroNutrients
  tdeeKcal: number | null
}): HealthInsight[] {
  const insights: HealthInsight[] = []

  const bmi = bmiFromBody(input.body)
  if (bmi != null) {
    if (bmi < 18.5) {
      insights.push({
        id: 'bmi-underweight',
        severity: 'warning',
        text: `BMI suggests underweight (${round1(bmi)}). Consider discussing nutrition goals with a clinician if this is unexpected.`,
      })
    } else if (bmi >= 30) {
      insights.push({
        id: 'bmi-obesity',
        severity: 'warning',
        text: `BMI suggests obesity (${round1(bmi)}). Small, sustainable changes can help; consider clinician guidance if needed.`,
      })
    } else if (bmi >= 25) {
      insights.push({
        id: 'bmi-overweight',
        severity: 'info',
        text: `BMI suggests overweight (${round1(bmi)}). If weight change is a goal, focus on consistent habits over time.`,
      })
    }
  }

  if (input.tdeeKcal != null && Number.isFinite(input.tdeeKcal) && input.tdeeKcal > 0) {
    const calories = input.totals.calories
    if (calories > input.tdeeKcal * 1.25) {
      insights.push({
        id: 'calories-high',
        severity: 'warning',
        text: `Today’s intake is far above your estimated target (+${Math.round(calories - input.tdeeKcal)} kcal).`,
      })
    } else if (calories > 0 && calories < input.tdeeKcal * 0.5) {
      insights.push({
        id: 'calories-low',
        severity: 'info',
        text: `Today’s intake is quite low vs your estimated target (-${Math.round(input.tdeeKcal - calories)} kcal).`,
      })
    }
  }

  const proteinTarget = recommendedProteinG(input.body)
  if (proteinTarget != null) {
    if (input.totals.protein_g > 0 && input.totals.protein_g < proteinTarget * 0.5) {
      insights.push({
        id: 'protein-low',
        severity: 'warning',
        text: `Protein looks low today (${Math.round(input.totals.protein_g)}g vs ~${proteinTarget}g suggested).`,
      })
    }
  }

  const hasDiabetes = hasAnyCondition(input.medical, ['diabetes', 'prediabetes', 'insulin resistance', 'insulin_resistance'])
  if (hasDiabetes) {
    const carbs = input.totals.carbs_g
    const calories = input.totals.calories
    const carbRatio = calories > 0 ? (carbs * 4) / calories : null

    if (carbs >= 200 || (carbRatio != null && carbRatio >= 0.6)) {
      insights.push({
        id: 'diabetes-high-carbs',
        severity: 'warning',
        text: `With diabetes/prediabetes listed, today’s carbs look high (${Math.round(carbs)}g). Consider spreading carbs across meals and prioritizing fiber/protein.`,
      })
    }
  }

  return insights
}
