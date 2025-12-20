import type { MacroNutrients } from '../models/types'
import { emptyMacros } from '../nutrition/macros'
import { getAiSettings } from './settings'
import { parseAiJsonToFoodItems } from './analyzePhoto'

function normalizeGrams(value: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.round(value)) : 1
}

function firstItemOrThrow(items: ReturnType<typeof parseAiJsonToFoodItems>): {
  name: string
  quantityGrams: number
  macros: MacroNutrients
} {
  const first = items[0]
  if (!first) throw new Error('AI did not return any items')
  return { name: first.name, quantityGrams: first.quantityGrams, macros: first.macros }
}

export async function analyzeFoodItem(input: {
  name: string
  grams: number
}): Promise<{ name: string; quantityGrams: number; macros: MacroNutrients }> {
  const name = input.name.trim()
  if (!name) throw new Error('Enter a food name')

  const grams = normalizeGrams(input.grams)
  const settings = getAiSettings()

  if (settings.provider === 'gemini') {
    const apiKey = settings.gemini.apiKey.trim()
    if (!apiKey) throw new Error('Gemini API key is not set')

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(settings.gemini.model)}:generateContent`

    const prompt =
      'You are a nutrition assistant.' +
      ` Estimate macros for this food: "${name}" with quantityGrams: ${grams}.` +
      ' Return ONLY valid JSON with the shape: {"items": [{"name": string, "quantityGrams": number, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "sugar_g": number, "sodium_mg": number}]}. Use numbers only. If uncertain, make a best guess.'

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Gemini request failed (${res.status}): ${text || res.statusText}`)
    }

    const data = (await res.json()) as any
    const rawText: string =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join('\n') ?? ''

    const parsed = rawText ? parseAiJsonToFoodItems(rawText) : []
    const item = firstItemOrThrow(parsed)
    return {
      name: item.name || name,
      quantityGrams: Number.isFinite(item.quantityGrams) && item.quantityGrams > 0 ? item.quantityGrams : grams,
      macros: item.macros ?? emptyMacros(),
    }
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

    const prompt =
      'Estimate macros for a single food item.' +
      ` Food: "${name}".` +
      ` quantityGrams: ${grams}.` +
      ' Return ONLY valid JSON (no markdown, no backticks, no code fences, no extra text) with the shape: {"items": [{"name": string, "quantityGrams": number, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "sugar_g": number, "sodium_mg": number}]}. Use numbers only. If uncertain, make a best guess.'

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.ollama.model,
        format: responseSchema,
        options: { temperature: 0 },
        stream: false,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Ollama request failed (${res.status}): ${text || res.statusText}`)
    }

    const data = (await res.json()) as any
    const rawText: string = data?.message?.content ?? ''

    if (!rawText.trim()) {
      throw new Error('Ollama returned an empty response. Ensure the model is running and try again.')
    }

    const parsed = parseAiJsonToFoodItems(rawText)
    const item = firstItemOrThrow(parsed)

    return {
      name: item.name || name,
      quantityGrams: Number.isFinite(item.quantityGrams) && item.quantityGrams > 0 ? item.quantityGrams : grams,
      macros: item.macros ?? emptyMacros(),
    }
  }

  throw new Error('Unsupported AI provider')
}
