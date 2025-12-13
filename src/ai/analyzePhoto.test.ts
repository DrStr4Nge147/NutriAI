import { describe, expect, it } from 'vitest'
import { parseAiJsonToFoodItems, parsePhotoDataUrl } from './analyzePhoto'

describe('ai/analyzePhoto', () => {
  it('parses photo data url', () => {
    const parsed = parsePhotoDataUrl('data:image/jpeg;base64,AAA')
    expect(parsed.mimeType).toBe('image/jpeg')
    expect(parsed.base64).toBe('AAA')
  })

  it('throws on invalid data url', () => {
    expect(() => parsePhotoDataUrl('not-a-data-url')).toThrow()
  })

  it('parses AI JSON payload with items field', () => {
    const items = parseAiJsonToFoodItems(
      JSON.stringify({
        items: [
          {
            name: 'White rice (cooked)',
            quantityGrams: 200,
            calories: 260,
            protein_g: 5.4,
            carbs_g: 56.4,
            fat_g: 0.6,
          },
        ],
      }),
    )

    expect(items).toHaveLength(1)
    expect(items[0].name).toBe('White rice (cooked)')
    expect(items[0].quantityGrams).toBe(200)
    expect(items[0].macros.calories).toBe(260)
    expect(items[0].macros.protein_g).toBe(5.4)
  })

  it('parses AI JSON when response is an array', () => {
    const items = parseAiJsonToFoodItems(
      JSON.stringify([
        {
          name: 'Egg',
          quantityGrams: '100',
          calories: '143',
          protein_g: '13',
          carbs_g: '0.7',
          fat_g: '9.5',
        },
      ]),
    )

    expect(items).toHaveLength(1)
    expect(items[0].quantityGrams).toBe(100)
    expect(items[0].macros.calories).toBe(143)
  })
})
