import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearAllData,
  deleteProfile,
  listMealPlansByProfile,
  listMealsByProfile,
  listProfiles,
  putMeal,
  putMealPlan,
  putProfile,
} from './db'
import type { Meal, MealPlan, UserProfile } from '../models/types'

describe('db', () => {
  beforeEach(async () => {
    await clearAllData()
  })

  it('stores and lists profiles', async () => {
    const p: UserProfile = {
      id: 'p1',
      createdAt: new Date().toISOString(),
      name: 'Me',
      body: {
        heightCm: 170,
        weightKg: 70,
        age: 30,
        sex: 'prefer_not_say',
        activityLevel: 'moderate',
      },
      medical: { conditions: [] },
    }

    await putProfile(p)
    const profiles = await listProfiles()
    expect(profiles.map((x) => x.id)).toEqual(['p1'])
  })

  it('stores and lists meals by profile', async () => {
    const m: Meal = {
      id: 'm1',
      profileId: 'p1',
      createdAt: new Date().toISOString(),
      eatenAt: new Date().toISOString(),
      items: [],
      totalMacros: { calories: 0, carbs_g: 0, protein_g: 0, fat_g: 0 },
    }

    await putMeal(m)
    const meals = await listMealsByProfile('p1')
    expect(meals.map((x) => x.id)).toEqual(['m1'])
  })

  it('stores and lists meal plans by profile', async () => {
    const mp1: MealPlan = {
      id: 'mp1',
      profileId: 'p1',
      createdAt: '2025-01-01T00:00:00.000Z',
      mealType: 'lunch',
      title: 'Adobo',
      intro: 'A classic.',
      ingredients: ['1 cup rice'],
      steps: ['Cook.'],
    }
    const mp2: MealPlan = {
      id: 'mp2',
      profileId: 'p1',
      createdAt: '2025-02-01T00:00:00.000Z',
      mealType: 'lunch',
      title: 'Sinigang',
      intro: 'Sour soup.',
      ingredients: ['1L water'],
      steps: ['Boil.'],
    }

    await putMealPlan(mp1)
    await putMealPlan(mp2)

    const plans = await listMealPlansByProfile('p1')
    expect(plans.map((x) => x.id)).toEqual(['mp2', 'mp1'])
  })

  it('deleting a profile deletes its meals', async () => {
    const p: UserProfile = {
      id: 'p1',
      createdAt: new Date().toISOString(),
      name: 'Me',
      body: {
        heightCm: 170,
        weightKg: 70,
        age: 30,
        sex: 'prefer_not_say',
        activityLevel: 'moderate',
      },
      medical: { conditions: [] },
    }
    await putProfile(p)

    await putMeal({
      id: 'm1',
      profileId: 'p1',
      createdAt: new Date().toISOString(),
      eatenAt: new Date().toISOString(),
      items: [],
      totalMacros: { calories: 0, carbs_g: 0, protein_g: 0, fat_g: 0 },
    })

    await putMealPlan({
      id: 'mp1',
      profileId: 'p1',
      createdAt: new Date().toISOString(),
      mealType: 'dinner',
      title: 'Tinola',
      intro: 'Comfort food.',
      ingredients: ['1 tbsp oil'],
      steps: ['Cook.'],
    })

    await deleteProfile('p1')

    expect((await listProfiles()).length).toBe(0)
    expect((await listMealsByProfile('p1')).length).toBe(0)
    expect((await listMealPlansByProfile('p1')).length).toBe(0)
  })
})
