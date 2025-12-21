import { describe, expect, it } from 'vitest'
import { dailyCalorieTarget, estimateBmr, estimateTdee } from './dailyNeeds'

describe('dailyNeeds', () => {
  it('estimates BMR with Mifflin-St Jeor', () => {
    const bmr = estimateBmr({
      heightCm: 170,
      weightKg: 70,
      age: 30,
      sex: 'male',
      activityLevel: 'moderate',
    })

    expect(bmr).toBe(1618)
  })

  it('estimates TDEE from activity multiplier', () => {
    const tdee = estimateTdee({
      heightCm: 170,
      weightKg: 70,
      age: 30,
      sex: 'male',
      activityLevel: 'moderate',
    })

    expect(tdee).toEqual({ bmr: 1618, multiplier: 1.55, tdee: 2508 })
  })

  it('supports manual calorie override', () => {
    const target = dailyCalorieTarget({
      body: { heightCm: 170, weightKg: 70, age: 30, sex: 'male', activityLevel: 'moderate' },
      goal: 'lose',
      targetCaloriesKcal: 1800,
    })

    expect(target).toMatchObject({ target: 1800, mode: 'override' })
  })

  it('applies goal-based target when no override is set', () => {
    const target = dailyCalorieTarget({
      body: { heightCm: 170, weightKg: 70, age: 30, sex: 'male', activityLevel: 'moderate' },
      goal: 'lose',
      targetCaloriesKcal: null,
    })

    expect(target).toMatchObject({ tdee: 2508, target: 2008, mode: 'goal' })
  })

  it('treats overall health goal like maintain when no override is set', () => {
    const target = dailyCalorieTarget({
      body: { heightCm: 170, weightKg: 70, age: 30, sex: 'male', activityLevel: 'moderate' },
      goal: 'overall_health',
      targetCaloriesKcal: null,
    })

    expect(target).toMatchObject({ tdee: 2508, target: 2508, mode: 'tdee' })
  })
})
