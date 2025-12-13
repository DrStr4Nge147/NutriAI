import { openDB, type DBSchema } from 'idb'
import type { Meal, UserProfile } from '../models/types'

type DbProfile = UserProfile
type DbMeal = Meal

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
}

const DB_NAME = 'ai-nutritionist'
const DB_VERSION = 1

function getDb() {
  return openDB<AiNutritionistDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const profiles = db.createObjectStore('profiles', { keyPath: 'id' })
      void profiles

      const meals = db.createObjectStore('meals', { keyPath: 'id' })
      meals.createIndex('by-profile', 'profileId')
      meals.createIndex('by-eatenAt', 'eatenAt')
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

  const tx = db.transaction('meals', 'readwrite')
  const idx = tx.store.index('by-profile')
  let cursor = await idx.openCursor(profileId)
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
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

export async function clearAllData(): Promise<void> {
  const db = await getDb()
  await db.clear('meals')
  await db.clear('profiles')
  db.close()
}
