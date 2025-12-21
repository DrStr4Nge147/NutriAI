import type { ExportPayloadV1, Meal, UserProfile } from '../models/types'
import { listMealsByProfile, listProfiles, putMeal, putProfile } from './db'

const STORAGE_CURRENT_PROFILE_ID = 'ai-nutritionist.currentProfileId'

export function getCurrentProfileId(): string | null {
  return localStorage.getItem(STORAGE_CURRENT_PROFILE_ID)
}

export function setCurrentProfileId(profileId: string | null) {
  if (!profileId) {
    localStorage.removeItem(STORAGE_CURRENT_PROFILE_ID)
    return
  }
  localStorage.setItem(STORAGE_CURRENT_PROFILE_ID, profileId)
}

export async function exportAllData(): Promise<ExportPayloadV1> {
  const profiles = await listProfiles()
  const currentProfileId = getCurrentProfileId()

  const meals: Meal[] = []
  for (const p of profiles) {
    const profileMeals = await listMealsByProfile(p.id)
    meals.push(...profileMeals)
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    currentProfileId,
    profiles,
    meals,
  }
}

export async function importAllData(payload: unknown): Promise<{ profiles: number; meals: number }> {
  const parsed = parsePayload(payload)

  for (const p of parsed.profiles) {
    await putProfile(p)
  }
  for (const m of parsed.meals) {
    await putMeal(m)
  }

  setCurrentProfileId(parsed.currentProfileId)

  return { profiles: parsed.profiles.length, meals: parsed.meals.length }
}

function parsePayload(payload: unknown): ExportPayloadV1 {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid import file')

  const p = payload as Partial<ExportPayloadV1>
  if (p.version !== 1) throw new Error('Unsupported export version')
  if (!Array.isArray(p.profiles) || !Array.isArray(p.meals)) throw new Error('Invalid export')

  const profiles = p.profiles.map(parseProfile)
  const meals = p.meals.map(parseMeal)

  const currentProfileId = typeof p.currentProfileId === 'string' ? p.currentProfileId : null

  return {
    version: 1,
    exportedAt: typeof p.exportedAt === 'string' ? p.exportedAt : new Date().toISOString(),
    currentProfileId,
    profiles,
    meals,
  }
}

function parseProfile(value: unknown): UserProfile {
  if (!value || typeof value !== 'object') throw new Error('Invalid profile')
  const v = value as UserProfile
  if (!v.id || !v.name || !v.createdAt) throw new Error('Invalid profile')
  if (!v.body) throw new Error('Invalid profile')
  if (!v.medical) throw new Error('Invalid profile')
  if (!Array.isArray(v.medical.conditions)) throw new Error('Invalid profile')

  const notes = (v.medical as any).notes
  if (typeof notes !== 'undefined' && typeof notes !== 'string') throw new Error('Invalid profile')

  const labs = (v.medical as any).labs
  if (typeof labs !== 'undefined') {
    if (!Array.isArray(labs)) throw new Error('Invalid profile')
    for (const lab of labs) {
      if (!lab || typeof lab !== 'object') throw new Error('Invalid profile')
      if (typeof (lab as any).id !== 'string') throw new Error('Invalid profile')
      if (typeof (lab as any).uploadedAt !== 'string') throw new Error('Invalid profile')
      if (typeof (lab as any).name !== 'string') throw new Error('Invalid profile')
      if (typeof (lab as any).mimeType !== 'string') throw new Error('Invalid profile')
      if (typeof (lab as any).dataUrl !== 'string') throw new Error('Invalid profile')
    }
  }

  const filesSummary = (v.medical as any).filesSummary
  if (typeof filesSummary !== 'undefined') {
    if (!filesSummary || typeof filesSummary !== 'object') throw new Error('Invalid profile')
    if (typeof (filesSummary as any).provider !== 'string') throw new Error('Invalid profile')
    if (typeof (filesSummary as any).analyzedAt !== 'string') throw new Error('Invalid profile')
    if (typeof (filesSummary as any).inputSignature !== 'string') throw new Error('Invalid profile')
    if (typeof (filesSummary as any).summary !== 'string') throw new Error('Invalid profile')
    if (typeof (filesSummary as any).rawText !== 'undefined' && typeof (filesSummary as any).rawText !== 'string') {
      throw new Error('Invalid profile')
    }
  }

  if (typeof (v as any).weightHistory !== 'undefined') {
    const wh = (v as any).weightHistory
    if (!Array.isArray(wh)) throw new Error('Invalid profile')
    for (const e of wh) {
      if (!e || typeof e !== 'object') throw new Error('Invalid profile')
      if (typeof (e as any).date !== 'string') throw new Error('Invalid profile')
      if (typeof (e as any).weightKg !== 'number') throw new Error('Invalid profile')
    }
  }

  return v
}

function parseMeal(value: unknown): Meal {
  if (!value || typeof value !== 'object') throw new Error('Invalid meal')
  const v = value as Meal
  if (!v.id || !v.profileId || !v.createdAt || !v.eatenAt) throw new Error('Invalid meal')
  if (!Array.isArray(v.items)) throw new Error('Invalid meal')
  if (!v.totalMacros) throw new Error('Invalid meal')
  return v
}
