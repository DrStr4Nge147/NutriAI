import type { FoodItem, MacroNutrients, MealAiAnalysis } from '../models/types'
import { emptyMacros, sumMacros } from '../nutrition/macros'
import { getAiSettings } from './settings'
import { parseAiJsonToFoodItems } from './analyzePhoto'

export async function analyzeMealText(input: { text: string }): Promise<{ items: FoodItem[]; totalMacros: MacroNutrients; ai: MealAiAnalysis }> {
  const settings = getAiSettings()
  const text = input.text.trim()
  if (!text) throw new Error('Meal text is empty')

  const prompt =
    'You are a nutrition assistant. Analyze the following meal plan/recipe text. ' +
    'Return ONLY valid JSON with the shape: {"items": [{"name": string, "quantityGrams": number, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "sugar_g": number, "sodium_mg": number}]}. ' +
    'Use numbers only. If uncertain, make a best guess.\n\n' +
    text

  if (settings.provider === 'gemini') {
    if (!settings.gemini.consentToSendData) {
      throw new Error('Gemini is an online AI provider. Enable consent in Settings before sending meal text.')
    }

    const apiKey = settings.gemini.apiKey.trim()
    if (!apiKey) throw new Error('Gemini API key is not set')

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(settings.gemini.model)}:generateContent`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!res.ok) {
      const t = await res.text().catch(() => '')
      throw new Error(`Gemini request failed (${res.status}): ${t || res.statusText}`)
    }

    const data = (await res.json()) as any
    const rawText: string = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join('\n') ?? ''

    const items = rawText ? parseAiJsonToFoodItems(rawText) : []
    const totalMacros = items.length ? sumMacros(items) : emptyMacros()

    return { items, totalMacros, ai: { provider: 'gemini', analyzedAt: new Date().toISOString(), rawText } }
  }

  if (settings.provider === 'ollama') {
    const baseUrl = settings.ollama.baseUrl.replace(/\/+$/, '')
    const url = `${baseUrl}/api/chat`

    const responseSchema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantityGrams: { type: 'number' },
              calories: { type: 'number' },
              protein_g: { type: 'number' },
              carbs_g: { type: 'number' },
              fat_g: { type: 'number' },
              sugar_g: { type: 'number' },
              sodium_mg: { type: 'number' },
            },
            required: ['name', 'quantityGrams', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'sugar_g', 'sodium_mg'],
          },
        },
      },
      required: ['items'],
    } as const

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.ollama.model,
        format: responseSchema,
        options: {
          temperature: 0,
        },
        stream: false,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const t = await res.text().catch(() => '')
      throw new Error(`Ollama request failed (${res.status}): ${t || res.statusText}`)
    }

    const data = (await res.json()) as any
    const rawText: string = data?.message?.content ?? ''

    if (!rawText.trim()) {
      throw new Error('Ollama returned an empty response. Ensure the model is running and try again.')
    }

    const items = rawText ? parseAiJsonToFoodItems(rawText) : []

    if (items.length === 0) {
      throw new Error('AI did not return any items. Try regenerating the plan or a different model.')
    }

    const totalMacros = items.length ? sumMacros(items) : emptyMacros()

    return { items, totalMacros, ai: { provider: 'ollama', analyzedAt: new Date().toISOString(), rawText } }
  }

  throw new Error('Unsupported AI provider')
}
