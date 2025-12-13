import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Meal, UserProfile } from '../models/types'
import { emptyMacros, sumMacros } from '../nutrition/macros'
import { findFoods, macrosForGrams } from '../nutrition/localFoods'
import {
  deleteMeal,
  deleteProfile as deleteProfileFromDb,
  listMealsByProfile,
  listProfiles,
  putMeal,
  putProfile,
} from '../storage/db'
import { getCurrentProfileId, setCurrentProfileId } from '../storage/exportImport'
import { newId } from '../utils/id'

type AppContextValue = {
  isHydrated: boolean
  profiles: UserProfile[]
  currentProfileId: string | null
  currentProfile: UserProfile | null
  meals: Meal[]
  refresh: () => Promise<void>
  selectProfile: (profileId: string) => Promise<void>
  createProfile: (profile: Omit<UserProfile, 'id' | 'createdAt'>) => Promise<UserProfile>
  saveProfile: (profile: UserProfile) => Promise<void>
  deleteProfile: (profileId: string) => Promise<void>
  addManualMeal: (input: { name: string; grams: number; eatenAt: string }) => Promise<Meal>
  addPhotoMeal: (input: { photoDataUrl: string; eatenAt: string }) => Promise<Meal>
  updateMeal: (meal: Meal) => Promise<void>
  removeMeal: (mealId: string) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider(props: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false)
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [currentProfileId, setCurrentProfileIdState] = useState<string | null>(null)
  const [meals, setMeals] = useState<Meal[]>([])

  const refresh = useCallback(async () => {
    const loadedProfiles = await listProfiles()
    setProfiles(loadedProfiles)

    const savedId = getCurrentProfileId()
    const nextProfileId =
      (savedId && loadedProfiles.some((p) => p.id === savedId) && savedId) ||
      (loadedProfiles[0]?.id ?? null)

    setCurrentProfileId(nextProfileId)
    setCurrentProfileIdState(nextProfileId)

    if (nextProfileId) {
      const loadedMeals = await listMealsByProfile(nextProfileId)
      setMeals(loadedMeals)
    } else {
      setMeals([])
    }

    setIsHydrated(true)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const selectProfile = useCallback(async (profileId: string) => {
    setCurrentProfileId(profileId)
    setCurrentProfileIdState(profileId)
    const loadedMeals = await listMealsByProfile(profileId)
    setMeals(loadedMeals)
  }, [])

  const createProfile = useCallback(
    async (profileInput: Omit<UserProfile, 'id' | 'createdAt'>) => {
      const profile: UserProfile = {
        ...profileInput,
        id: newId(),
        createdAt: new Date().toISOString(),
      }
      await putProfile(profile)

      const nextProfiles = [profile, ...(await listProfiles())].reduce<UserProfile[]>(
        (acc, p) => {
          if (acc.some((x) => x.id === p.id)) return acc
          acc.push(p)
          return acc
        },
        [],
      )
      setProfiles(nextProfiles)

      await selectProfile(profile.id)
      return profile
    },
    [selectProfile],
  )

  const saveProfile = useCallback(
    async (profile: UserProfile) => {
      await putProfile(profile)
      const nextProfiles = (await listProfiles()).sort((a, b) => a.name.localeCompare(b.name))
      setProfiles(nextProfiles)
    },
    [],
  )

  const deleteProfile = useCallback(
    async (profileId: string) => {
      await deleteProfileFromDb(profileId)

      const loadedProfiles = await listProfiles()
      setProfiles(loadedProfiles)

      const nextProfileId =
        profileId === currentProfileId
          ? (loadedProfiles[0]?.id ?? null)
          : currentProfileId && loadedProfiles.some((p) => p.id === currentProfileId)
            ? currentProfileId
            : (loadedProfiles[0]?.id ?? null)

      setCurrentProfileId(nextProfileId)
      setCurrentProfileIdState(nextProfileId)

      if (nextProfileId) {
        const loadedMeals = await listMealsByProfile(nextProfileId)
        setMeals(loadedMeals)
      } else {
        setMeals([])
      }
    },
    [currentProfileId],
  )

  const updateMeal = useCallback(async (meal: Meal) => {
    await putMeal(meal)
    setMeals((prev) => prev.map((m) => (m.id === meal.id ? meal : m)))
  }, [])

  const addManualMeal = useCallback(
    async (input: { name: string; grams: number; eatenAt: string }) => {
      if (!currentProfileId) throw new Error('No profile selected')

      const match = findFoods(input.name)[0]
      const macros = match ? macrosForGrams(match.per100g, input.grams) : emptyMacros()

      const item = {
        id: newId(),
        name: match?.name ?? input.name,
        quantityGrams: input.grams,
        macros,
      }

      const meal: Meal = {
        id: newId(),
        profileId: currentProfileId,
        createdAt: new Date().toISOString(),
        eatenAt: input.eatenAt,
        items: [item],
        totalMacros: sumMacros([item]),
      }

      await putMeal(meal)
      setMeals((prev) => [meal, ...prev])
      return meal
    },
    [currentProfileId],
  )

  const addPhotoMeal = useCallback(
    async (input: { photoDataUrl: string; eatenAt: string }) => {
      if (!currentProfileId) throw new Error('No profile selected')

      const meal: Meal = {
        id: newId(),
        profileId: currentProfileId,
        createdAt: new Date().toISOString(),
        eatenAt: input.eatenAt,
        photoDataUrl: input.photoDataUrl,
        items: [],
        totalMacros: emptyMacros(),
      }

      await putMeal(meal)
      setMeals((prev) => [meal, ...prev])
      return meal
    },
    [currentProfileId],
  )

  const removeMeal = useCallback(async (mealId: string) => {
    await deleteMeal(mealId)
    setMeals((prev) => prev.filter((m) => m.id !== mealId))
  }, [])

  const currentProfile = useMemo(
    () => profiles.find((p) => p.id === currentProfileId) ?? null,
    [profiles, currentProfileId],
  )

  const value: AppContextValue = {
    isHydrated,
    profiles,
    currentProfileId,
    currentProfile,
    meals,
    refresh,
    selectProfile,
    createProfile,
    saveProfile,
    deleteProfile,
    addManualMeal,
    addPhotoMeal,
    updateMeal,
    removeMeal,
  }

  return <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('AppProvider missing')
  return ctx
}
