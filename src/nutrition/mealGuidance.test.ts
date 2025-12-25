import { describe, expect, it } from 'vitest'
import type { Meal, UserProfile } from '../models/types'
import { buildMealWarnings, fallbackNutritionistNote, fallbackRiskNutritionistNote, hasMealWarnings } from './mealGuidance'

describe('mealGuidance', () => {
  it('returns warnings for meal based on profile medical history', () => {
    const profile: UserProfile = {
      id: 'p1',
      createdAt: new Date().toISOString(),
      name: 'Test',
      body: { heightCm: 170, weightKg: 70, age: 30, sex: 'male', activityLevel: 'moderate' },
      medical: { conditions: ['Hypertension'] },
      goal: 'overall_health',
      targetCaloriesKcal: null,
      weightHistory: [],
    }

    const meal: Meal = {
      id: 'm1',
      profileId: profile.id,
      createdAt: new Date().toISOString(),
      eatenAt: new Date().toISOString(),
      items: [{ id: 'i1', name: 'Salty food', quantityGrams: 100, macros: { calories: 300, carbs_g: 10, protein_g: 10, fat_g: 10, sodium_mg: 3000, sugar_g: 0 } }],
      totalMacros: { calories: 300, carbs_g: 10, protein_g: 10, fat_g: 10, sodium_mg: 3000, sugar_g: 0 },
    }

    const warnings = buildMealWarnings({ meal, profile })
    expect(warnings.some((w) => w.id === 'hypertension-high-sodium')).toBe(true)
    expect(hasMealWarnings({ meal, profile })).toBe(true)
  })

  it('provides a short fallback note for empty/invalid calories', () => {
    expect(fallbackNutritionistNote({ calories: 0, carbs_g: 0, protein_g: 0, fat_g: 0 })).toContain('Log a meal')
  })

  it('does not use the old macro split template in fallback notes', () => {
    const note = fallbackNutritionistNote({ calories: 300, carbs_g: 30, protein_g: 10, fat_g: 10 })
    expect(note).not.toContain('Macro split')
  })

  it('uses risk-focused messaging when warnings exist', () => {
    const note = fallbackRiskNutritionistNote({
      calories: 300,
      carbs_g: 30,
      protein_g: 10,
      fat_g: 10,
      conditions: ['Hypertension'],
      warnings: ['High sodium can increase blood pressure.'],
    })
    expect(note).toContain('risky')
    expect(note).toContain('Hypertension')
    expect(note).toContain('High sodium')
  })
})
