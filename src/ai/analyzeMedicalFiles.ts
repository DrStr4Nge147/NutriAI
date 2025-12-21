import type { MedicalFilesAiSummary, MedicalLabUpload } from '../models/types'
import { computeMedicalFilesSignature } from '../utils/medicalFiles'
import { getAiSettings } from './settings'

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl)
  if (!match) throw new Error('Invalid file data')
  return { mimeType: match[1], base64: match[2] }
}

export async function analyzeMedicalFiles(input: {
  files: MedicalLabUpload[]
}): Promise<MedicalFilesAiSummary> {
  const files = input.files
  if (!files || files.length === 0) throw new Error('No medical files uploaded')

  const settings = getAiSettings()
  const inputSignature = computeMedicalFilesSignature(files)

  if (settings.provider === 'gemini') {
    if (!settings.gemini.consentToSendData) {
      throw new Error('Gemini is an online AI provider. Enable consent in Settings before sending medical files.')
    }

    const apiKey = settings.gemini.apiKey.trim()
    if (!apiKey) throw new Error('Gemini API key is not set')

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(settings.gemini.model)}:generateContent`

    const prompt =
      'You are a helpful health assistant.' +
      ' Summarize the uploaded medical files for a personal nutrition and overall health app.' +
      ' The user may upload new lab results over time; focus on key findings, trends, and actionable items.' +
      ' Avoid sensitive identifiers. Do not guess values that are not present.' +
      ' Return ONLY valid JSON with the shape: {"summary": string}.'

    const parts: any[] = []

    for (const f of files.slice().sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt))) {
      const { mimeType, base64 } = parseDataUrl(f.dataUrl)
      parts.push({ text: `File: ${f.name} (${mimeType})` })
      parts.push({ inline_data: { mime_type: mimeType, data: base64 } })
    }

    parts.push({ text: prompt })

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Gemini request failed (${res.status}): ${text || res.statusText}`)
    }

    const data = (await res.json()) as any
    const rawText: string = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join('\n') ?? ''

    let summary = ''
    try {
      const parsed = JSON.parse(rawText) as any
      summary = typeof parsed?.summary === 'string' ? parsed.summary.trim() : ''
    } catch {
      summary = rawText.trim()
    }

    if (!summary) throw new Error('AI returned an empty summary')

    return {
      provider: 'gemini',
      analyzedAt: new Date().toISOString(),
      inputSignature,
      summary,
      rawText,
    }
  }

  if (settings.provider === 'ollama') {
    const baseUrl = settings.ollama.baseUrl.replace(/\/+$/, '')
    const url = `${baseUrl}/api/chat`

    const prompt =
      'Summarize the uploaded medical files for a personal nutrition and overall health app.' +
      ' Focus on key findings, possible trends, and practical follow-ups.' +
      ' Avoid sensitive identifiers. Do not guess values that are not present.'

    const messages: any[] = []

    for (const f of files.slice().sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt))) {
      const { base64 } = parseDataUrl(f.dataUrl)
      messages.push({
        role: 'user',
        content: `File: ${f.name}. ${prompt}`,
        images: [base64],
      })
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.ollama.model,
        options: { temperature: 0 },
        stream: false,
        messages,
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

    return {
      provider: 'ollama',
      analyzedAt: new Date().toISOString(),
      inputSignature,
      summary: rawText.trim(),
      rawText,
    }
  }

  throw new Error('Unsupported AI provider')
}
