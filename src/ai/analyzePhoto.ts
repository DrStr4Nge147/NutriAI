import type { FoodItem, MacroNutrients, MealAiAnalysis } from '../models/types'
import { emptyMacros, sumMacros } from '../nutrition/macros'
import { newId } from '../utils/id'
import { getAiSettings } from './settings'

type ParsedDataUrl = { mimeType: string; base64: string }

export function parsePhotoDataUrl(dataUrl: string): ParsedDataUrl {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl)
  if (!match) throw new Error('Invalid photo data')
  return { mimeType: match[1], base64: match[2] }
}

type AiItemJson = {
  name?: unknown
  quantityGrams?: unknown
  calories?: unknown
  protein_g?: unknown
  carbs_g?: unknown
  fat_g?: unknown
}

type AiPayloadJson = {
  items?: unknown
}

export function parseAiJsonToFoodItems(jsonText: string): FoodItem[] {
  const parsed = JSON.parse(jsonText) as unknown

  const itemsRaw = Array.isArray(parsed)
    ? parsed
    : (parsed as Partial<AiPayloadJson>)?.items

  if (!Array.isArray(itemsRaw)) throw new Error('AI response did not include items')

  return itemsRaw.map((raw) => {
    const r = raw as AiItemJson
    const name = typeof r.name === 'string' ? r.name.trim() : ''
    const quantityGrams = typeof r.quantityGrams === 'number' ? r.quantityGrams : Number(r.quantityGrams)

    const macros: MacroNutrients = {
      calories: numberOrZero(r.calories),
      protein_g: numberOrZero(r.protein_g),
      carbs_g: numberOrZero(r.carbs_g),
      fat_g: numberOrZero(r.fat_g),
    }

    if (!name) throw new Error('AI item missing name')

    return {
      id: newId(),
      name,
      quantityGrams: Number.isFinite(quantityGrams) ? Math.max(0, quantityGrams) : 0,
      macros,
    }
  })
}

function numberOrZero(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 10) / 10) : 0
}

export async function analyzeMealPhoto(input: {
  photoDataUrl: string
}): Promise<{ items: FoodItem[]; totalMacros: MacroNutrients; ai: MealAiAnalysis }> {
  const settings = getAiSettings()

  if (settings.provider === 'gemini') {
    const { mimeType, base64 } = parsePhotoDataUrl(input.photoDataUrl)
    const apiKey = settings.gemini.apiKey.trim()
    if (!apiKey) throw new Error('Gemini API key is not set')

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(settings.gemini.model)}:generateContent`

    const prompt =
      'You are a nutrition assistant. Analyze the meal photo. Return ONLY valid JSON with the shape: {"items": [{"name": string, "quantityGrams": number, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}]}. Use numbers only. If uncertain, make a best guess.'

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: mimeType, data: base64 } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Gemini request failed (${res.status}): ${text || res.statusText}`)
    }

    const data = (await res.json()) as any
    const rawText: string =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join('\n') ?? ''

    const items = rawText ? parseAiJsonToFoodItems(rawText) : []
    const totalMacros = items.length ? sumMacros(items) : emptyMacros()

    return {
      items,
      totalMacros,
      ai: { provider: 'gemini', analyzedAt: new Date().toISOString(), rawText },
    }
  }

  if (settings.provider === 'ollama') {
    const { base64 } = parsePhotoDataUrl(input.photoDataUrl)
    const baseUrl = settings.ollama.baseUrl.replace(/\/+$/, '')
    const url = `${baseUrl}/api/chat`

    const prompt =
      'Analyze the meal photo. Return ONLY valid JSON with the shape: {"items": [{"name": string, "quantityGrams": number, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}]}. Use numbers only. If uncertain, make a best guess.'

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.ollama.model,
        stream: false,
        messages: [
          {
            role: 'user',
            content: prompt,
            images: [base64],
          },
        ],
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Ollama request failed (${res.status}): ${text || res.statusText}`)
    }

    const data = (await res.json()) as any
    const rawText: string = data?.message?.content ?? ''

    const items = rawText ? parseAiJsonToFoodItems(rawText) : []
    const totalMacros = items.length ? sumMacros(items) : emptyMacros()

    return {
      items,
      totalMacros,
      ai: { provider: 'ollama', analyzedAt: new Date().toISOString(), rawText },
    }
  }

  throw new Error('Unsupported AI provider')
}
