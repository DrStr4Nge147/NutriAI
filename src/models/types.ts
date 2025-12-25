export type Sex = 'male' | 'female' | 'other' | 'prefer_not_say'

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active'

export type Goal = 'maintain' | 'lose' | 'gain' | 'overall_health'

export type MacroNutrients = {
  calories: number
  carbs_g: number
  protein_g: number
  fat_g: number
  sugar_g?: number
  sodium_mg?: number
}

export type BodyMetrics = {
  heightCm: number
  weightKg: number
  age: number
  sex: Sex
  activityLevel: ActivityLevel
}

export type MedicalLabUpload = {
  id: string
  uploadedAt: string
  name: string
  mimeType: string
  dataUrl: string
}

export type MedicalFilesAiSummary = {
  provider: AiProvider
  analyzedAt: string
  inputSignature: string
  summary: string
  rawText?: string
}

export type MedicalInfo = {
  conditions: string[]
  labs?: MedicalLabUpload[]
  notes?: string
  filesSummary?: MedicalFilesAiSummary
}

export type WeightEntry = {
  date: string
  weightKg: number
}

export type UserProfile = {
  id: string
  createdAt: string
  name: string
  body: BodyMetrics
  medical: MedicalInfo
  goal?: Goal
  targetCaloriesKcal?: number | null
  weightHistory?: WeightEntry[]
}

export type FoodItem = {
  id: string
  name: string
  quantityGrams: number
  macros: MacroNutrients
}

export type AiProvider = 'gemini' | 'ollama' | 'openai'

export type MealAiAnalysis = {
  provider: AiProvider
  analyzedAt: string
  rawText?: string
}

export type Meal = {
  id: string
  profileId: string
  createdAt: string
  eatenAt: string
  photoDataUrl?: string
  aiAnalysis?: MealAiAnalysis
  items: FoodItem[]
  totalMacros: MacroNutrients
}

export type ExportPayloadV1 = {
  version: 1
  exportedAt: string
  currentProfileId: string | null
  profiles: UserProfile[]
  meals: Meal[]
  mealPlans: MealPlan[]
}

export type MealPlanMealType = 'breakfast' | 'am_snack' | 'lunch' | 'pm_snack' | 'dinner'

export type MealPlanAi = {
  provider: AiProvider
  generatedAt: string
  rawText?: string
}

export type MealPlan = {
  id: string
  profileId: string
  createdAt: string
  mealType: MealPlanMealType
  title: string
  intro: string
  ingredients: string[]
  steps: string[]
  ai?: MealPlanAi
}
