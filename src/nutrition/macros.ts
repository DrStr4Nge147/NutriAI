import type { FoodItem, MacroNutrients } from '../models/types'

export function emptyMacros(): MacroNutrients {
  return { calories: 0, carbs_g: 0, protein_g: 0, fat_g: 0 }
}

export function sumMacros(items: FoodItem[]): MacroNutrients {
  return items.reduce(
    (acc, item) => {
      acc.calories += item.macros.calories
      acc.carbs_g += item.macros.carbs_g
      acc.protein_g += item.macros.protein_g
      acc.fat_g += item.macros.fat_g
      return acc
    },
    emptyMacros(),
  )
}
