import type { FoodItem, MacroNutrients } from '../models/types'

export function emptyMacros(): MacroNutrients {
  return { calories: 0, carbs_g: 0, protein_g: 0, fat_g: 0, sugar_g: 0, sodium_mg: 0 }
}

function addOptional(acc: MacroNutrients, m: MacroNutrients) {
  acc.sugar_g = (acc.sugar_g ?? 0) + (m.sugar_g ?? 0)
  acc.sodium_mg = (acc.sodium_mg ?? 0) + (m.sodium_mg ?? 0)
}

export function sumMacros(items: FoodItem[]): MacroNutrients {
  return items.reduce(
    (acc, item) => {
      acc.calories += item.macros.calories
      acc.carbs_g += item.macros.carbs_g
      acc.protein_g += item.macros.protein_g
      acc.fat_g += item.macros.fat_g
      addOptional(acc, item.macros)
      return acc
    },
    emptyMacros(),
  )
}

export function sumMacroNutrients(list: MacroNutrients[]): MacroNutrients {
  return list.reduce(
    (acc, m) => {
      acc.calories += m.calories
      acc.carbs_g += m.carbs_g
      acc.protein_g += m.protein_g
      acc.fat_g += m.fat_g
      addOptional(acc, m)
      return acc
    },
    emptyMacros(),
  )
}
