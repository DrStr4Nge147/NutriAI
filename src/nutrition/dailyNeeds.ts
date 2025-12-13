import type { ActivityLevel, BodyMetrics, Sex } from '../models/types'

export function activityMultiplier(level: ActivityLevel): number {
  switch (level) {
    case 'sedentary':
      return 1.2
    case 'light':
      return 1.375
    case 'moderate':
      return 1.55
    case 'active':
      return 1.725
    case 'very_active':
      return 1.9
  }
}

function sexConstant(sex: Sex): number {
  switch (sex) {
    case 'male':
      return 5
    case 'female':
      return -161
    case 'other':
    case 'prefer_not_say':
      return -78
  }
}

export function estimateBmr(body: BodyMetrics): number | null {
  const { weightKg, heightCm, age, sex } = body
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null
  if (!Number.isFinite(heightCm) || heightCm <= 0) return null
  if (!Number.isFinite(age) || age <= 0) return null

  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexConstant(sex)
  return Math.round(bmr)
}

export function estimateTdee(body: BodyMetrics): { bmr: number; tdee: number; multiplier: number } | null {
  const bmr = estimateBmr(body)
  if (bmr == null) return null
  const multiplier = activityMultiplier(body.activityLevel)
  return { bmr, multiplier, tdee: Math.round(bmr * multiplier) }
}
