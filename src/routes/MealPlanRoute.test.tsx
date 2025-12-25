import { describe, expect, it } from 'vitest'
import { isHourWithinMealType } from '../utils/mealType'

describe('MealPlanRoute (logic)', () => {
  it('detects unusual times for meal types', () => {
    expect(isHourWithinMealType('breakfast', 8)).toBe(true)
    expect(isHourWithinMealType('breakfast', 13)).toBe(false)

    expect(isHourWithinMealType('lunch', 13)).toBe(true)
    expect(isHourWithinMealType('lunch', 9)).toBe(false)

    expect(isHourWithinMealType('dinner', 20)).toBe(true)
    expect(isHourWithinMealType('dinner', 2)).toBe(false)
  })
})
