import type { AiProvider, MealPlanMealType } from '../models/types'
import { normalizeAiJsonText } from './analyzePhoto'
import { getAiSettings } from './settings'

export type GeneratedMealPlan = {
  title: string
  intro: string
  ingredients: string[]
  steps: string[]
  ai: {
    provider: AiProvider
    generatedAt: string
    rawText?: string
  }
}

type MealPlanJson = {
  title?: unknown
  intro?: unknown
  ingredients?: unknown
  steps?: unknown
}

function parseMealPlanJson(text: string): Omit<GeneratedMealPlan, 'ai'> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    const normalized = normalizeAiJsonText(text)
    try {
      parsed = JSON.parse(normalized) as unknown
    } catch {
      const preview = text.replace(/\s+/g, ' ').trim().slice(0, 200)
      throw new Error(`AI response was not valid JSON. Received: ${preview || '(empty)'}`)
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('AI response was not a JSON object')
  }

  const p = parsed as MealPlanJson

  const title = typeof p.title === 'string' ? p.title.trim() : ''
  const intro = typeof p.intro === 'string' ? p.intro.trim() : ''
  const ingredientsRaw = Array.isArray(p.ingredients) ? p.ingredients : []
  const stepsRaw = Array.isArray(p.steps) ? p.steps : []

  const ingredients = ingredientsRaw
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean)
  const steps = stepsRaw
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean)

  if (!title) throw new Error('AI response missing title')
  if (!intro) throw new Error('AI response missing intro')
  if (ingredients.length === 0) throw new Error('AI response missing ingredients')
  if (steps.length === 0) throw new Error('AI response missing steps')

  return { title, intro, ingredients, steps }
}

function mealTypeLabel(mealType: MealPlanMealType) {
  if (mealType === 'breakfast') return 'breakfast'
  if (mealType === 'lunch') return 'lunch'
  return 'dinner'
}

export async function generateMealPlan(input: {
  mealType: MealPlanMealType
  avoidTitles?: string[]
  medicalContext?: {
    conditions?: string[]
    notes?: string
    filesSummary?: string
  }
}): Promise<GeneratedMealPlan> {
  const settings = getAiSettings()

  const avoidTitles = (input.avoidTitles ?? []).map((x) => x.trim()).filter(Boolean).slice(0, 30)

  const avoidBlock = avoidTitles.length
    ? ` Avoid repeating any of these dish titles: ${avoidTitles.map((t) => `"${t}"`).join(', ')}.`
    : ''

  const conditions = (input.medicalContext?.conditions ?? []).map((x) => x.trim()).filter(Boolean).slice(0, 25)
  const notes = input.medicalContext?.notes?.trim() ?? ''
  const filesSummary = input.medicalContext?.filesSummary?.trim() ?? ''
  const hasMedicalContext = conditions.length > 0 || Boolean(notes) || Boolean(filesSummary)
  const medicalBlock = hasMedicalContext
    ?
        ' The user has the following health context:' +
        (conditions.length ? ` Conditions: ${conditions.join('; ')}.` : '') +
        (notes ? ` Notes/medications: ${notes}.` : '') +
        (filesSummary ? ` Lab summary: ${filesSummary}.` : '') +
        ' Respect any explicit dietary restrictions or ingredient avoidances implied by this context.' +
        ' Do not invent restrictions. If a restriction is unclear, choose a safer, more conservative option.'
    : ''

  const prompt =
    'You are a helpful home cook assistant specializing in Filipino home cooking.' +
    ` Create a simple ${mealTypeLabel(input.mealType)} plan for today that is easy to find ingredients for and easy to cook.` +
    ' Prefer common grocery items, minimal steps, and low hassle.' +
    medicalBlock +
    avoidBlock +
    ' Return ONLY valid JSON (no markdown, no backticks, no code fences, no extra text) with this exact shape:' +
    ' {"title": string, "intro": string, "ingredients": string[], "steps": string[]}.' +
    ' Keep intro 1-2 short sentences. Ingredients must include quantities. Steps must be concise and numbered implicitly by order.'

  if (settings.provider === 'gemini') {
    if (hasMedicalContext && !settings.gemini.consentToSendData) {
      throw new Error('Gemini is an online AI provider. Enable consent in Settings before sending medical context.')
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

    if (!rawText.trim()) throw new Error('Gemini returned an empty response')

    const parsed = parseMealPlanJson(rawText)

    return {
      ...parsed,
      ai: { provider: 'gemini', generatedAt: new Date().toISOString(), rawText },
    }
  }

  if (settings.provider === 'ollama') {
    const baseUrl = settings.ollama.baseUrl.replace(/\/+$/, '')
    const url = `${baseUrl}/api/chat`

    const responseSchema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        intro: { type: 'string' },
        ingredients: { type: 'array', items: { type: 'string' } },
        steps: { type: 'array', items: { type: 'string' } },
      },
      required: ['title', 'intro', 'ingredients', 'steps'],
    } as const

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.ollama.model,
        format: responseSchema,
        options: { temperature: 0.7 },
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

    const parsed = parseMealPlanJson(rawText)

    return {
      ...parsed,
      ai: { provider: 'ollama', generatedAt: new Date().toISOString(), rawText },
    }
  }

  throw new Error('Unsupported AI provider')
}
