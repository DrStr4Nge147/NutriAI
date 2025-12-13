import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearAllData,
  deleteProfile,
  listMealsByProfile,
  listProfiles,
  putMeal,
  putProfile,
} from './db'
import type { Meal, UserProfile } from '../models/types'

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

    await deleteProfile('p1')

    expect((await listProfiles()).length).toBe(0)
    expect((await listMealsByProfile('p1')).length).toBe(0)
  })
})
