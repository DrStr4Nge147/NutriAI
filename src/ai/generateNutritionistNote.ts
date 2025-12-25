import type { MacroNutrients, UserProfile } from '../models/types'
import { getAiSettings } from './settings'

function safeArray(arr: unknown): string[] {
  return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string').map((x) => x.trim()).filter(Boolean) : []
}

export async function generateNutritionistNote(input: {
  profile: UserProfile
  totals: MacroNutrients
  items?: { name: string }[]
  warnings?: string[]
}): Promise<string> {
  const settings = getAiSettings()

  const conditions = safeArray(input.profile.medical?.conditions)
  const goal = input.profile.goal ?? 'overall_health'
  const items = (input.items ?? []).map((i) => i.name).filter(Boolean).slice(0, 12)
  const warnings = (input.warnings ?? []).filter(Boolean).slice(0, 6)

  const prompt =
    'You are a registered dietitian writing a short in-app note. ' +
    'Write ONE brief note (max 2 sentences) tailored to the user\'s goal and medical history. ' +
    'If warnings are provided, treat them as potential RISKS for the user\'s conditions (say why it\'s risky in plain language) and give ONE practical adjustment or safer swap. ' +
    'Be direct and supportive. Avoid lecturing. Avoid numbers unless essential. ' +
    'Return ONLY valid JSON: {"note": string}.\n\n' +
    `Goal: ${goal}\n` +
    `Medical history: ${conditions.length ? conditions.join(', ') : 'none listed'}\n` +
    `Meal macros (kcal, protein_g, carbs_g, fat_g, sugar_g, sodium_mg): ${JSON.stringify(input.totals)}\n` +
    `Detected items: ${items.length ? items.join(', ') : 'unknown'}\n` +
    `Warnings: ${warnings.length ? warnings.join(' | ') : 'none'}\n`

  if (settings.provider === 'gemini') {
    if (!settings.gemini.consentToSendData) {
      throw new Error('Gemini is an online AI provider. Enable consent in Settings before sending nutrition notes.')
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
    const parsed = rawText ? (JSON.parse(rawText) as any) : null
    const note = typeof parsed?.note === 'string' ? parsed.note.trim() : ''
    if (!note) throw new Error('AI did not return a note')
    return note
  }

  if (settings.provider === 'ollama') {
    const baseUrl = settings.ollama.baseUrl.replace(/\/+$/, '')
    const url = `${baseUrl}/api/chat`

    const responseSchema = {
      type: 'object',
      properties: {
        note: { type: 'string' },
      },
      required: ['note'],
    } as const

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.ollama.model,
        format: responseSchema,
        options: {
          temperature: 0.2,
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
    const parsed = rawText ? (JSON.parse(rawText) as any) : null
    const note = typeof parsed?.note === 'string' ? parsed.note.trim() : ''
    if (!note) throw new Error('AI did not return a note')
    return note
  }

  throw new Error('Unsupported AI provider')
}
