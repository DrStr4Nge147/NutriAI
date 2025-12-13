import { describe, expect, it } from 'vitest'
import { estimateBmr, estimateTdee } from './dailyNeeds'

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
})
