import type { BodyMetrics, MacroNutrients, Meal, MedicalInfo } from '../models/types'

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

function extractAllergyTerms(conditions: string[]): string[] {
  const stop = new Set(['allergy', 'allergies', 'to', 'food', 'foods', 'severe', 'mild', 'and', 'or'])
  const terms: string[] = []
  for (const raw of conditions) {
    const c = normalizeCondition(raw)
    if (!c.includes('allerg')) continue

    const cleaned = c.replace(/[^a-z0-9\s,]/g, ' ')
    for (const token of cleaned.split(/[\s,]+/)) {
      const t = token.trim()
      if (!t || stop.has(t)) continue
      if (t.length < 3) continue
      terms.push(t)
    }
  }
  return Array.from(new Set(terms))
}

export function buildHealthInsights(input: {
  scope?: 'day' | 'meal'
  body: BodyMetrics
  medical: MedicalInfo
  totals: MacroNutrients
  targetKcal: number | null
  items?: { name: string }[]
}): HealthInsight[] {
  const insights: HealthInsight[] = []

  const scope = input.scope ?? 'day'

  if (scope === 'day') {
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

    if (input.targetKcal != null && Number.isFinite(input.targetKcal) && input.targetKcal > 0) {
      const calories = input.totals.calories
      if (calories > input.targetKcal * 1.25) {
        insights.push({
          id: 'calories-high',
          severity: 'warning',
          text: `Today’s intake is far above your target (+${Math.round(calories - input.targetKcal)} kcal).`,
        })
      } else if (calories > 0 && calories < input.targetKcal * 0.5) {
        insights.push({
          id: 'calories-low',
          severity: 'info',
          text: `Today’s intake is quite low vs your target (-${Math.round(input.targetKcal - calories)} kcal).`,
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
  }

  const sodiumMg = input.totals.sodium_mg ?? 0
  const sugarG = input.totals.sugar_g ?? 0

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

    if (sugarG >= 50) {
      insights.push({
        id: 'diabetes-high-sugar',
        severity: 'warning',
        text: `With diabetes/prediabetes listed, sugar looks high (${Math.round(sugarG)}g). Consider reducing sweetened drinks/snacks and pairing carbs with protein/fiber.`,
      })
    }
  }

  const hasHypertension = hasAnyCondition(input.medical, ['hypertension', 'high blood pressure', 'high_bp', 'hbp'])
  if (hasHypertension && sodiumMg >= 2300) {
    insights.push({
      id: 'hypertension-high-sodium',
      severity: 'warning',
      text: `With hypertension listed, sodium looks high (${Math.round(sodiumMg)} mg). Consider choosing lower-sodium options and limiting sauces/processed foods.`,
    })
  }

  const hasKidneyDisease = hasAnyCondition(input.medical, ['kidney disease', 'ckd', 'chronic kidney disease', 'renal disease'])
  if (hasKidneyDisease) {
    if (sodiumMg >= 2000) {
      insights.push({
        id: 'kidney-high-sodium',
        severity: 'warning',
        text: `With kidney disease listed, sodium looks high (${Math.round(sodiumMg)} mg). Consider lowering salt and discussing targets with your clinician/dietitian.`,
      })
    }

    const proteinTarget = recommendedProteinG(input.body)
    if (proteinTarget != null && input.totals.protein_g >= proteinTarget * 1.5) {
      insights.push({
        id: 'kidney-high-protein',
        severity: 'warning',
        text: `With kidney disease listed, protein may be high (${Math.round(input.totals.protein_g)}g). Your clinician may recommend a personalized target.`,
      })
    }
  }

  const allergyTerms = extractAllergyTerms(input.medical.conditions ?? [])
  if (allergyTerms.length > 0) {
    const itemNames = (input.items ?? []).map((i) => i.name.toLowerCase())
    const matches = allergyTerms.filter((t) => itemNames.some((n) => n.includes(t)))

    if (matches.length > 0) {
      insights.push({
        id: 'allergy-match',
        severity: 'warning',
        text: `Possible allergen match (${matches.join(', ')}). Double-check ingredients and cross-contamination risk.`,
      })
    } else {
      insights.push({
        id: 'allergy-reminder',
        severity: 'info',
        text: `Allergies listed (${allergyTerms.join(', ')}). Double-check meal ingredients and labels.`,
      })
    }
  }

  return insights
}

function withinLastDays(iso: string, days: number): boolean {
  const d = new Date(iso)
  const t = d.getTime()
  if (!Number.isFinite(t)) return false
  const now = Date.now()
  return t >= now - days * 24 * 60 * 60 * 1000
}

function hourFromIso(iso: string): number | null {
  const d = new Date(iso)
  const t = d.getTime()
  if (!Number.isFinite(t)) return null
  return d.getHours()
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

export function buildLifestyleInsights(input: {
  body: BodyMetrics
  medical: MedicalInfo
  meals: Meal[]
  targetKcal: number | null
  days?: number
}): HealthInsight[] {
  const insights: HealthInsight[] = []

  const days = input.days ?? 7
  const recentMeals = input.meals.filter((m) => withinLastDays(m.eatenAt, days))

  const daysWithMeals = new Set(
    recentMeals
      .map((m) => {
        const d = new Date(m.eatenAt)
        const t = d.getTime()
        if (!Number.isFinite(t)) return null
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      })
      .filter(Boolean) as string[],
  )

  const dayCount = daysWithMeals.size
  if (dayCount <= 2) {
    insights.push({
      id: 'meal-logging-low',
      severity: 'info',
      text: `You’ve logged meals on ${dayCount} day(s) in the last ${days} days. More consistent logging helps generate better insights.`,
    })
  } else if (dayCount >= Math.max(4, Math.floor(days * 0.7))) {
    insights.push({
      id: 'meal-logging-consistent',
      severity: 'info',
      text: `Nice consistency: meals logged on ${dayCount} day(s) in the last ${days} days.`,
    })
  }

  const lateMeals = recentMeals.filter((m) => {
    const h = hourFromIso(m.eatenAt)
    return h != null && (h >= 22 || h <= 4)
  })
  const lateRatio = recentMeals.length > 0 ? lateMeals.length / recentMeals.length : 0
  if (recentMeals.length >= 4 && lateRatio >= 0.35) {
    insights.push({
      id: 'late-night-meals',
      severity: 'info',
      text: `Many meals were logged late at night (~${Math.round(clamp01(lateRatio) * 100)}%). If sleep or energy is an issue, consider earlier last-meal timing.`,
    })
  }

  const totals = recentMeals.reduce(
    (acc, m) => {
      acc.calories += m.totalMacros.calories
      acc.sodium_mg += m.totalMacros.sodium_mg ?? 0
      acc.sugar_g += m.totalMacros.sugar_g ?? 0
      return acc
    },
    { calories: 0, sodium_mg: 0, sugar_g: 0 },
  )

  const avgPerDay = {
    calories: days > 0 ? totals.calories / days : 0,
    sodium_mg: days > 0 ? totals.sodium_mg / days : 0,
    sugar_g: days > 0 ? totals.sugar_g / days : 0,
  }

  if (input.targetKcal != null && Number.isFinite(input.targetKcal) && input.targetKcal > 0) {
    const ratio = avgPerDay.calories / input.targetKcal
    if (ratio >= 1.25) {
      insights.push({
        id: 'avg-calories-high',
        severity: 'info',
        text: `Your average logged intake is above your target (~${Math.round(avgPerDay.calories)} kcal/day vs ${Math.round(input.targetKcal)}).`,
      })
    } else if (avgPerDay.calories > 0 && ratio <= 0.6) {
      insights.push({
        id: 'avg-calories-low',
        severity: 'info',
        text: `Your average logged intake is well below your target (~${Math.round(avgPerDay.calories)} kcal/day vs ${Math.round(input.targetKcal)}).`,
      })
    }
  }

  const hasHypertension = hasAnyCondition(input.medical, ['hypertension', 'high blood pressure', 'high_bp', 'hbp'])
  if (hasHypertension && avgPerDay.sodium_mg >= 2300) {
    insights.push({
      id: 'avg-sodium-high-hypertension',
      severity: 'warning',
      text: `With hypertension listed, average sodium looks high (~${Math.round(avgPerDay.sodium_mg)} mg/day across last ${days} days).`,
    })
  }

  const hasDiabetes = hasAnyCondition(input.medical, ['diabetes', 'prediabetes', 'insulin resistance', 'insulin_resistance'])
  const sugarThreshold = hasDiabetes ? 35 : 50
  if (avgPerDay.sugar_g >= sugarThreshold) {
    insights.push({
      id: 'avg-sugar-high',
      severity: hasDiabetes ? 'warning' : 'info',
      text: `Average sugar looks high (~${Math.round(avgPerDay.sugar_g)} g/day across last ${days} days).`,
    })
  }

  if (input.body.activityLevel === 'sedentary') {
    insights.push({
      id: 'activity-sedentary',
      severity: 'info',
      text: `Activity level is set to sedentary. Even short walks or light resistance training can improve energy and glucose control.`,
    })
  }

  const medicalFilled =
    (input.medical.conditions?.length ?? 0) > 0 ||
    (input.medical.labs?.length ?? 0) > 0 ||
    Boolean(input.medical.notes?.trim())

  if (!medicalFilled) {
    insights.push({
      id: 'medical-history-missing',
      severity: 'info',
      text: 'Medical history is empty. Adding conditions, notes, or lab files can improve personalization.',
    })
  } else {
    const labsCount = input.medical.labs?.length ?? 0
    if (labsCount > 0) {
      insights.push({
        id: 'medical-files-on-record',
        severity: 'info',
        text: `Medical files on record: ${labsCount}. These can help personalize guidance.`,
      })
    }
  }

  return insights
}
