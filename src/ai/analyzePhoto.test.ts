import { describe, expect, it } from 'vitest'
import { analyzeMealPhoto, parseAiJsonToFoodItems, parsePhotoDataUrl } from './analyzePhoto'

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
            sugar_g: 0.2,
            sodium_mg: 12,
          },
        ],
      }),
    )

    expect(items).toHaveLength(1)
    expect(items[0].name).toBe('White rice (cooked)')
    expect(items[0].quantityGrams).toBe(200)
    expect(items[0].macros.calories).toBe(260)
    expect(items[0].macros.protein_g).toBe(5.4)
    expect(items[0].macros.sugar_g).toBe(0.2)
    expect(items[0].macros.sodium_mg).toBe(12)
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

  it('requires explicit consent before using Gemini', async () => {
    localStorage.setItem(
      'ai-nutritionist.aiSettings',
      JSON.stringify({
        provider: 'gemini',
        gemini: { apiKey: '', model: 'gemini-2.0-flash', consentToSendData: false },
        ollama: { baseUrl: 'http://localhost:11434', model: 'qwen3-vl:8b' },
      }),
    )

    await expect(analyzeMealPhoto({ photoDataUrl: 'data:image/jpeg;base64,AAA' })).rejects.toThrow(
      /Enable consent in Settings/i,
    )
  })
})
