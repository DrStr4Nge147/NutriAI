import { describe, expect, it, vi } from 'vitest'
import { askHealthAssistant } from './healthChat'

describe('ai/healthChat', () => {
  it('requires explicit consent before using Gemini', async () => {
    localStorage.setItem(
      'ai-nutritionist.aiSettings',
      JSON.stringify({
        provider: 'gemini',
        gemini: { apiKey: 'x', model: 'gemini-flash-latest', consentToSendData: false },
        ollama: { baseUrl: 'http://localhost:11434', model: 'ministral-3:8b' },
      }),
    )

    await expect(
      askHealthAssistant({
        context: { name: 'Test' },
        messages: [{ role: 'user', content: 'How can I sleep better?' }],
      }),
    ).rejects.toThrow(/Enable consent in Settings/i)
  })

  it('sanitizes em-dashes from responses', async () => {
    const prevFetch = (globalThis as any).fetch

    ;(globalThis as any).fetch = vi.fn(async () => {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Hi Test, here is an answer — with an em-dash.' }],
              },
            },
          ],
        }),
        text: async () => '',
      }
    })

    localStorage.setItem(
      'ai-nutritionist.aiSettings',
      JSON.stringify({
        provider: 'gemini',
        gemini: { apiKey: 'x', model: 'gemini-flash-latest', consentToSendData: true },
        ollama: { baseUrl: 'http://localhost:11434', model: 'ministral-3:8b' },
      }),
    )

    try {
      const res = await askHealthAssistant({
        context: { name: 'Test' },
        messages: [{ role: 'user', content: 'How can I sleep better?' }],
      })

      expect(res.text).not.toContain('—')
      expect(res.text).toContain('Hi Test')
    } finally {
      ;(globalThis as any).fetch = prevFetch
    }
  })

  it('instructs the model to mirror user language and tone', async () => {
    const prevFetch = (globalThis as any).fetch

    const bodies: any[] = []

    ;(globalThis as any).fetch = vi.fn(async (_url: any, init: any) => {
      try {
        bodies.push(init?.body ? JSON.parse(init.body) : null)
      } catch {
        bodies.push(null)
      }

      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Hi Test, ok.' }],
              },
            },
          ],
        }),
        text: async () => '',
      }
    })

    localStorage.setItem(
      'ai-nutritionist.aiSettings',
      JSON.stringify({
        provider: 'gemini',
        gemini: { apiKey: 'x', model: 'gemini-flash-latest', consentToSendData: true },
        ollama: { baseUrl: 'http://localhost:11434', model: 'ministral-3:8b' },
      }),
    )

    try {
      await askHealthAssistant({
        context: { name: 'Test' },
        messages: [{ role: 'user', content: 'Pwede Tagalog?' }],
      })

      expect(bodies.length).toBeGreaterThan(0)
      const prompt =
        bodies?.[0]?.contents?.[0]?.parts?.[0]?.text ??
        bodies?.[0]?.contents?.[0]?.parts?.map((p: any) => p?.text).filter(Boolean).join('\n') ??
        ''

      expect(typeof prompt).toBe('string')
      expect(prompt).toMatch(/reply in the same language/i)
      expect(prompt).toMatch(/language preference/i)
      expect(prompt).toMatch(/similar tone/i)
    } finally {
      ;(globalThis as any).fetch = prevFetch
    }
  })
})
