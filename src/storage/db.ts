import { openDB, type DBSchema } from 'idb'
import type { Meal, MealPlan, UserProfile } from '../models/types'

type DbProfile = UserProfile
type DbMeal = Meal
type DbMealPlan = MealPlan

interface AiNutritionistDb extends DBSchema {
  profiles: {
    key: string
    value: DbProfile
  }
  meals: {
    key: string
    value: DbMeal
    indexes: { 'by-profile': string; 'by-eatenAt': string }
  }
  mealPlans: {
    key: string
    value: DbMealPlan
    indexes: { 'by-profile': string; 'by-createdAt': string }
  }
}

const DB_NAME = 'ai-nutritionist'
const DB_VERSION = 2

function getDb() {
  return openDB<AiNutritionistDb>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const profiles = db.createObjectStore('profiles', { keyPath: 'id' })
        void profiles

        const meals = db.createObjectStore('meals', { keyPath: 'id' })
        meals.createIndex('by-profile', 'profileId')
        meals.createIndex('by-eatenAt', 'eatenAt')
      }

      if (oldVersion < 2) {
        const mealPlans = db.createObjectStore('mealPlans', { keyPath: 'id' })
        mealPlans.createIndex('by-profile', 'profileId')
        mealPlans.createIndex('by-createdAt', 'createdAt')
      }
    },
  })
}

export async function listProfiles(): Promise<UserProfile[]> {
  const db = await getDb()
  return await db.getAll('profiles')
}

export async function putProfile(profile: UserProfile): Promise<void> {
  const db = await getDb()
  await db.put('profiles', profile)
}

export async function deleteProfile(profileId: string): Promise<void> {
  const db = await getDb()
  await db.delete('profiles', profileId)

  const tx = db.transaction(['meals', 'mealPlans'], 'readwrite')

  const mealsIdx = tx.objectStore('meals').index('by-profile')
  let mealCursor = await mealsIdx.openCursor(profileId)
  while (mealCursor) {
    await mealCursor.delete()
    mealCursor = await mealCursor.continue()
  }

  const plansIdx = tx.objectStore('mealPlans').index('by-profile')
  let planCursor = await plansIdx.openCursor(profileId)
  while (planCursor) {
    await planCursor.delete()
    planCursor = await planCursor.continue()
  }

  await tx.done
}

export async function listMealsByProfile(profileId: string): Promise<Meal[]> {
  const db = await getDb()
  const meals = await db.getAllFromIndex('meals', 'by-profile', profileId)
  return meals.sort((a, b) => b.eatenAt.localeCompare(a.eatenAt))
}

export async function getMeal(mealId: string): Promise<Meal | undefined> {
  const db = await getDb()
  return await db.get('meals', mealId)
}

export async function putMeal(meal: Meal): Promise<void> {
  const db = await getDb()
  await db.put('meals', meal)
}

export async function deleteMeal(mealId: string): Promise<void> {
  const db = await getDb()
  await db.delete('meals', mealId)
}

export async function deleteMeals(mealIds: string[]): Promise<void> {
  const ids = mealIds.filter(Boolean)
  if (ids.length === 0) return
  const db = await getDb()
  const tx = db.transaction('meals', 'readwrite')
  for (const id of ids) {
    await tx.store.delete(id)
  }
  await tx.done
}

export async function deleteMealsByProfile(profileId: string): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('meals', 'readwrite')
  const idx = tx.store.index('by-profile')
  let cursor = await idx.openCursor(profileId)
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }
  await tx.done
}

export async function listMealPlansByProfile(profileId: string): Promise<MealPlan[]> {
  const db = await getDb()
  const plans = await db.getAllFromIndex('mealPlans', 'by-profile', profileId)
  return plans.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function putMealPlan(plan: MealPlan): Promise<void> {
  const db = await getDb()
  await db.put('mealPlans', plan)
}

export async function deleteMealPlan(mealPlanId: string): Promise<void> {
  const db = await getDb()
  await db.delete('mealPlans', mealPlanId)
}

export async function deleteMealPlansByProfile(profileId: string): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('mealPlans', 'readwrite')
  const idx = tx.store.index('by-profile')
  let cursor = await idx.openCursor(profileId)
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }
  await tx.done
}

export async function clearAllData(): Promise<void> {
  const db = await getDb()
  await db.clear('meals')
  await db.clear('profiles')
  await db.clear('mealPlans')
  db.close()
}
