import { describe, expect, it } from 'vitest'
import { sumMacros } from './macros'

describe('sumMacros', () => {
  it('sums item macros', () => {
    const total = sumMacros([
      {
        id: '1',
        name: 'a',
        quantityGrams: 1,
        macros: { calories: 100, carbs_g: 10, protein_g: 5, fat_g: 2 },
      },
      {
        id: '2',
        name: 'b',
        quantityGrams: 1,
        macros: { calories: 50, carbs_g: 5, protein_g: 2, fat_g: 1 },
      },
    ])

    expect(total).toEqual({ calories: 150, carbs_g: 15, protein_g: 7, fat_g: 3 })
  })
})
