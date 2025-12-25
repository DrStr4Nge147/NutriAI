import type { MealPlanMealType } from '../models/types'

export function mealTypeLabel(mealType: MealPlanMealType): string {
  if (mealType === 'breakfast') return 'Breakfast'
  if (mealType === 'am_snack') return 'AM snack'
  if (mealType === 'lunch') return 'Lunch'
  if (mealType === 'pm_snack') return 'PM snack'
  return 'Dinner'
}

export function mealTypeFromHour(hour: number): MealPlanMealType {
  if (hour >= 5 && hour < 10) return 'breakfast'
  if (hour >= 10 && hour < 12) return 'am_snack'
  if (hour >= 12 && hour < 15) return 'lunch'
  if (hour >= 15 && hour < 18) return 'pm_snack'
  return 'dinner'
}

export function isHourWithinMealType(mealType: MealPlanMealType, hour: number): boolean {
  if (mealType === 'breakfast') return hour >= 5 && hour < 10
  if (mealType === 'am_snack') return hour >= 10 && hour < 12
  if (mealType === 'lunch') return hour >= 12 && hour < 15
  if (mealType === 'pm_snack') return hour >= 15 && hour < 18
  return hour >= 18 && hour < 23
}

export function formatDatetimeLocalValue(date: Date) {
  const tzOffsetMs = date.getTimezoneOffset() * 60_000
  const local = new Date(date.getTime() - tzOffsetMs)
  return local.toISOString().slice(0, 16)
}
