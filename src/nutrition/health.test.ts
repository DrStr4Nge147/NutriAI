import { describe, expect, it } from 'vitest'
import { buildHealthInsights } from './health'

describe('health', () => {
  it('warns on underweight BMI', () => {
    const insights = buildHealthInsights({
      body: { heightCm: 180, weightKg: 50, age: 30, sex: 'male', activityLevel: 'moderate' },
      medical: { conditions: [] },
      totals: { calories: 0, carbs_g: 0, protein_g: 0, fat_g: 0 },
      tdeeKcal: null,
    })

    expect(insights.some((i) => i.id === 'bmi-underweight' && i.severity === 'warning')).toBe(true)
  })

  it('warns on very high calories vs target', () => {
    const insights = buildHealthInsights({
      body: { heightCm: 170, weightKg: 70, age: 30, sex: 'male', activityLevel: 'moderate' },
      medical: { conditions: [] },
      totals: { calories: 2600, carbs_g: 0, protein_g: 0, fat_g: 0 },
      tdeeKcal: 2000,
    })

    expect(insights.some((i) => i.id === 'calories-high' && i.severity === 'warning')).toBe(true)
  })

  it('warns on low protein vs suggested', () => {
    const insights = buildHealthInsights({
      body: { heightCm: 170, weightKg: 80, age: 30, sex: 'male', activityLevel: 'moderate' },
      medical: { conditions: [] },
      totals: { calories: 1200, carbs_g: 100, protein_g: 10, fat_g: 20 },
      tdeeKcal: 2200,
    })

    expect(insights.some((i) => i.id === 'protein-low' && i.severity === 'warning')).toBe(true)
  })

  it('warns on high carbs when diabetes is listed', () => {
    const insights = buildHealthInsights({
      body: { heightCm: 170, weightKg: 70, age: 30, sex: 'male', activityLevel: 'moderate' },
      medical: { conditions: ['Diabetes'] },
      totals: { calories: 1600, carbs_g: 260, protein_g: 30, fat_g: 10 },
      tdeeKcal: 2000,
    })

    expect(insights.some((i) => i.id === 'diabetes-high-carbs' && i.severity === 'warning')).toBe(true)
  })
})
