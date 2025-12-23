import type { AiProvider } from '../models/types'
import { getAiSettings } from './settings'

export type HealthChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type HealthChatContext = {
  name: string
  profile?: {
    age?: number
    sex?: string
    heightCm?: number
    weightKg?: number
    activityLevel?: string
    goal?: string
  }
  medical?: {
    conditions?: string[]
    notes?: string
    filesSummary?: string
  }
}

export type HealthChatResponse = {
  provider: AiProvider
  respondedAt: string
  text: string
  rawText?: string
}

function sanitizeAssistantText(text: string): string {
  return text.replace(/[\u2013\u2014]/g, '-').trim()
}

function buildContextBlock(ctx: HealthChatContext): string {
  const name = ctx.name.trim()

  const age = Number.isFinite(ctx.profile?.age) ? ctx.profile?.age : null
  const heightCm = Number.isFinite(ctx.profile?.heightCm) ? ctx.profile?.heightCm : null
  const weightKg = Number.isFinite(ctx.profile?.weightKg) ? ctx.profile?.weightKg : null
  const sex = (ctx.profile?.sex ?? '').trim()
  const activityLevel = (ctx.profile?.activityLevel ?? '').trim()
  const goal = (ctx.profile?.goal ?? '').trim()

  const profileBlock =
    age || heightCm || weightKg || sex || activityLevel || goal
      ?
          'User profile:' +
          ` Name: ${name}.` +
          (age ? ` Age: ${age}.` : '') +
          (sex ? ` Sex: ${sex}.` : '') +
          (heightCm ? ` Height: ${heightCm} cm.` : '') +
          (weightKg ? ` Weight: ${weightKg} kg.` : '') +
          (activityLevel ? ` Activity level: ${activityLevel}.` : '') +
          (goal ? ` Goal: ${goal}.` : '')
      : `User name: ${name}.`

  const conditions = (ctx.medical?.conditions ?? []).map((x) => x.trim()).filter(Boolean).slice(0, 25)
  const notes = (ctx.medical?.notes ?? '').trim()
  const filesSummary = (ctx.medical?.filesSummary ?? '').trim()

  const medicalBlock =
    conditions.length || notes || filesSummary
      ?
          'Medical history (if present):' +
          (conditions.length ? ` Conditions: ${conditions.join('; ')}.` : '') +
          (notes ? ` Notes: ${notes}.` : '') +
          (filesSummary ? ` Lab summary: ${filesSummary}.` : '')
      : 'Medical history: none on record.'

  return `${profileBlock}\n${medicalBlock}`
}

function buildConversationTranscript(messages: HealthChatMessage[]): string {
  return messages
    .slice(-14)
    .map((m) => {
      const content = m.content.trim().replace(/\s+/g, ' ')
      if (m.role === 'assistant') return `Assistant: ${content}`
      return `User: ${content}`
    })
    .join('\n')
}

function buildPrompt(input: {
  context: HealthChatContext
  messages: HealthChatMessage[]
}): string {
  const name = input.context.name.trim()

  return (
    'You are a careful, supportive personal health adviser inside a health app.' +
    ` The user\'s name is ${name}.` +
    ' Start your first reply with "Hi <name>," if this is the first assistant reply in the conversation.' +
    ' Detect the language and style of the user\'s latest messages and reply in the same language and similar tone (formal vs casual).' +
    ' If the user explicitly requests a language (example: "Reply in Tagalog"), follow that language preference until changed.' +
    ' Only discuss health and the user\'s health. If the user asks about non-health topics, politely refuse and ask a health-related follow-up question.' +
    ' Use the user\'s profile and medical history if present, but do not invent facts, diagnoses, lab values, or medications.' +
    ' If information is missing, ask 1-3 brief clarifying questions.' +
    ' Keep replies short and human-like (typically 2-6 sentences) unless the user asks for more detail.' +
    ' Be clear and confident, but do not overstate certainty.' +
    ' Avoid em-dashes.' +
    ' Do not use markdown.' +
    ' If symptoms could be urgent or severe, advise seeking urgent medical care.' +
    '\n\n' +
    buildContextBlock(input.context) +
    '\n\nConversation:\n' +
    buildConversationTranscript(input.messages) +
    '\n\nAssistant:'
  )
}

export async function askHealthAssistant(input: {
  context: HealthChatContext
  messages: HealthChatMessage[]
}): Promise<HealthChatResponse> {
  const settings = getAiSettings()

  const prompt = buildPrompt({ context: input.context, messages: input.messages })

  if (settings.provider === 'gemini') {
    if (!settings.gemini.consentToSendData) {
      throw new Error('Gemini is an online AI provider. Enable consent in Settings before using AI health chat.')
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
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Gemini request failed (${res.status}): ${text || res.statusText}`)
    }

    const data = (await res.json()) as any
    const rawText: string =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join('\n') ?? ''

    const text = sanitizeAssistantText(rawText)
    if (!text) throw new Error('Gemini returned an empty response')

    return { provider: 'gemini', respondedAt: new Date().toISOString(), text, rawText }
  }

  if (settings.provider === 'ollama') {
    const baseUrl = settings.ollama.baseUrl.replace(/\/+$/, '')
    const url = `${baseUrl}/api/chat`

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.ollama.model,
        options: { temperature: 0.4 },
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

    const text = sanitizeAssistantText(rawText)

    if (!text) {
      throw new Error('Ollama returned an empty response. Ensure the model is running and try again.')
    }

    return { provider: 'ollama', respondedAt: new Date().toISOString(), text, rawText }
  }

  throw new Error('Unsupported AI provider')
}
