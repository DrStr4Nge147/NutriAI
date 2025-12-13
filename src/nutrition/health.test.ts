import { describe, expect, it } from 'vitest'
import { buildHealthInsights } from './health'

describe('health', () => {
  it('warns on underweight BMI', () => {
    const insights = buildHealthInsights({
      body: { heightCm: 180, weightKg: 50, age: 30, sex: 'male', activityLevel: 'moderate' },
      medical: { conditions: [] },
      totals: { calories: 0, carbs_g: 0, protein_g: 0, fat_g: 0 },
      targetKcal: null,
    })

    expect(insights.some((i) => i.id === 'bmi-underweight' && i.severity === 'warning')).toBe(true)
  })

  it('warns on very high calories vs target', () => {
    const insights = buildHealthInsights({
      body: { heightCm: 170, weightKg: 70, age: 30, sex: 'male', activityLevel: 'moderate' },
      medical: { conditions: [] },
      totals: { calories: 2600, carbs_g: 0, protein_g: 0, fat_g: 0 },
      targetKcal: 2000,
    })

    expect(insights.some((i) => i.id === 'calories-high' && i.severity === 'warning')).toBe(true)
  })

  it('warns on low protein vs suggested', () => {
    const insights = buildHealthInsights({
      body: { heightCm: 170, weightKg: 80, age: 30, sex: 'male', activityLevel: 'moderate' },
      medical: { conditions: [] },
      totals: { calories: 1200, carbs_g: 100, protein_g: 10, fat_g: 20 },
      targetKcal: 2200,
    })

    expect(insights.some((i) => i.id === 'protein-low' && i.severity === 'warning')).toBe(true)
  })

  it('warns on high carbs when diabetes is listed', () => {
    const insights = buildHealthInsights({
      body: { heightCm: 170, weightKg: 70, age: 30, sex: 'male', activityLevel: 'moderate' },
      medical: { conditions: ['Diabetes'] },
      totals: { calories: 1600, carbs_g: 260, protein_g: 30, fat_g: 10, sugar_g: 0, sodium_mg: 0 },
      targetKcal: 2000,
    })

    expect(insights.some((i) => i.id === 'diabetes-high-carbs' && i.severity === 'warning')).toBe(true)
  })

  it('warns on high sodium when hypertension is listed', () => {
    const insights = buildHealthInsights({
      body: { heightCm: 170, weightKg: 70, age: 30, sex: 'male', activityLevel: 'moderate' },
      medical: { conditions: ['Hypertension'] },
      totals: { calories: 1000, carbs_g: 0, protein_g: 20, fat_g: 10, sodium_mg: 3000, sugar_g: 0 },
      targetKcal: 2000,
    })

    expect(insights.some((i) => i.id === 'hypertension-high-sodium' && i.severity === 'warning')).toBe(true)
  })

  it('warns on high sugar when diabetes is listed', () => {
    const insights = buildHealthInsights({
      body: { heightCm: 170, weightKg: 70, age: 30, sex: 'male', activityLevel: 'moderate' },
      medical: { conditions: ['Diabetes'] },
      totals: { calories: 1500, carbs_g: 150, protein_g: 30, fat_g: 30, sugar_g: 80, sodium_mg: 0 },
      targetKcal: 2000,
    })

    expect(insights.some((i) => i.id === 'diabetes-high-sugar' && i.severity === 'warning')).toBe(true)
  })

  it('matches allergy terms against meal items when provided', () => {
    const insights = buildHealthInsights({
      scope: 'meal',
      body: { heightCm: 170, weightKg: 70, age: 30, sex: 'male', activityLevel: 'moderate' },
      medical: { conditions: ['Peanut allergy'] },
      totals: { calories: 500, carbs_g: 10, protein_g: 10, fat_g: 10, sugar_g: 0, sodium_mg: 0 },
      targetKcal: null,
      items: [{ name: 'Peanut butter' }],
    })

    expect(insights.some((i) => i.id === 'allergy-match' && i.severity === 'warning')).toBe(true)
  })
})
