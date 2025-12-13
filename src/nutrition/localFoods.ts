import type { MacroNutrients } from '../models/types'

export type FoodRef = {
  id: string
  name: string
  per100g: MacroNutrients
}

export const LOCAL_FOODS: FoodRef[] = [
  {
    id: 'rice-white-cooked',
    name: 'White rice (cooked)',
    per100g: { calories: 130, carbs_g: 28.2, protein_g: 2.7, fat_g: 0.3 },
  },
  {
    id: 'chicken-breast-cooked',
    name: 'Chicken breast (cooked)',
    per100g: { calories: 165, carbs_g: 0, protein_g: 31, fat_g: 3.6 },
  },
  {
    id: 'egg-whole',
    name: 'Egg (whole)',
    per100g: { calories: 143, carbs_g: 0.7, protein_g: 13, fat_g: 9.5 },
  },
  {
    id: 'banana',
    name: 'Banana',
    per100g: { calories: 89, carbs_g: 22.8, protein_g: 1.1, fat_g: 0.3 },
  },
  {
    id: 'pork-adobo',
    name: 'Pork adobo',
    per100g: { calories: 220, carbs_g: 3, protein_g: 18, fat_g: 15 },
  },
]

export function findFoods(query: string): FoodRef[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return LOCAL_FOODS.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 10)
}

export function macrosForGrams(per100g: MacroNutrients, grams: number): MacroNutrients {
  const factor = grams / 100
  return {
    calories: round1(per100g.calories * factor),
    carbs_g: round1(per100g.carbs_g * factor),
    protein_g: round1(per100g.protein_g * factor),
    fat_g: round1(per100g.fat_g * factor),
  }
}

function round1(value: number) {
  return Math.round(value * 10) / 10
}
