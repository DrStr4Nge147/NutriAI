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
  sugar_g?: unknown
  sodium_mg?: unknown
}

type AiPayloadJson = {
  items?: unknown
}

function normalizeAiJsonText(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed

  const fenced = /^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```$/.exec(trimmed)
  if (fenced?.[1]) return fenced[1].trim()

  const braceStart = trimmed.indexOf('{')
  const bracketStart = trimmed.indexOf('[')

  if (braceStart === -1 && bracketStart === -1) return trimmed

  const useBrace = braceStart !== -1 && (bracketStart === -1 || braceStart < bracketStart)

  const start = useBrace ? braceStart : bracketStart
  const end = useBrace ? trimmed.lastIndexOf('}') : trimmed.lastIndexOf(']')

  if (end === -1 || end <= start) return trimmed

  return trimmed.slice(start, end + 1).trim()
}

export function parseAiJsonToFoodItems(jsonText: string): FoodItem[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText) as unknown
  } catch {
    const normalized = normalizeAiJsonText(jsonText)
    try {
      parsed = JSON.parse(normalized) as unknown
    } catch {
      const preview = jsonText.replace(/\s+/g, ' ').trim().slice(0, 200)
      throw new Error(`AI response was not valid JSON. Received: ${preview || '(empty)'}`)
    }
  }

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
      sugar_g: numberOrZero(r.sugar_g),
      sodium_mg: numberOrZero(r.sodium_mg),
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
  description?: string
}): Promise<{ items: FoodItem[]; totalMacros: MacroNutrients; ai: MealAiAnalysis }> {
  const settings = getAiSettings()

  if (settings.provider === 'gemini') {
    if (!settings.gemini.consentToSendData) {
      throw new Error('Gemini is an online AI provider. Enable consent in Settings before sending photos.')
    }
    const { mimeType, base64 } = parsePhotoDataUrl(input.photoDataUrl)
    const apiKey = settings.gemini.apiKey.trim()
    if (!apiKey) throw new Error('Gemini API key is not set')

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(settings.gemini.model)}:generateContent`

    const description = input.description?.trim()
    const prompt =
      'You are a nutrition assistant. Analyze the meal photo.' +
      (description ? ` The user describes the meal as: "${description}".` : '') +
      ' Return ONLY valid JSON with the shape: {"items": [{"name": string, "quantityGrams": number, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "sugar_g": number, "sodium_mg": number}]}. Use numbers only. If uncertain, make a best guess.'

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

    const description = input.description?.trim()
    const prompt =
      'Analyze the meal photo.' +
      (description ? ` The user describes the meal as: "${description}".` : '') +
      ' Return ONLY valid JSON (no markdown, no backticks, no code fences, no extra text) with the shape: {"items": [{"name": string, "quantityGrams": number, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "sugar_g": number, "sodium_mg": number}]}. Use numbers only. If uncertain, make a best guess.'

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

    if (!rawText.trim()) {
      throw new Error('Ollama returned an empty response. Ensure the model supports vision and try again.')
    }

    const items = rawText ? parseAiJsonToFoodItems(rawText) : []

    if (items.length === 0) {
      throw new Error('AI did not return any items. Try a clearer photo or a different model.')
    }

    const totalMacros = items.length ? sumMacros(items) : emptyMacros()

    return {
      items,
      totalMacros,
      ai: { provider: 'ollama', analyzedAt: new Date().toISOString(), rawText },
    }
  }

  throw new Error('Unsupported AI provider')
}
