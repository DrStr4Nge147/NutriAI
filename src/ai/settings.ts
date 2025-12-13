import type { AiProvider } from '../models/types'

export type AiSettingsProvider = Extract<AiProvider, 'gemini' | 'ollama'>

export type AiSettings = {
  provider: AiSettingsProvider
  gemini: {
    apiKey: string
    model: string
    consentToSendData: boolean
  }
  ollama: {
    baseUrl: string
    model: string
  }
}

const STORAGE_AI_SETTINGS = 'ai-nutritionist.aiSettings'

function defaultSettings(): AiSettings {
  const env = import.meta.env as unknown as {
    VITE_AI_PROVIDER?: string
    VITE_GEMINI_API_KEY?: string
    VITE_GEMINI_MODEL?: string
    VITE_OLLAMA_BASE_URL?: string
    VITE_OLLAMA_MODEL?: string
  }

  return {
    provider: env.VITE_AI_PROVIDER === 'ollama' ? 'ollama' : 'gemini',
    gemini: {
      apiKey: env.VITE_GEMINI_API_KEY ?? '',
      model: env.VITE_GEMINI_MODEL ?? 'gemini-2.0-flash',
      consentToSendData: false,
    },
    ollama: {
      baseUrl: env.VITE_OLLAMA_BASE_URL ?? 'http://localhost:11434',
      model: env.VITE_OLLAMA_MODEL ?? 'qwen3-vl:8b',
    },
  }
}

export function getAiSettings(): AiSettings {
  const raw = localStorage.getItem(STORAGE_AI_SETTINGS)
  if (!raw) return defaultSettings()

  try {
    const parsed = JSON.parse(raw) as Partial<AiSettings>
    const d = defaultSettings()

    const provider: AiSettingsProvider = parsed.provider === 'ollama' ? 'ollama' : 'gemini'

    return {
      provider,
      gemini: {
        apiKey: parsed.gemini?.apiKey ?? d.gemini.apiKey,
        model: parsed.gemini?.model ?? d.gemini.model,
        consentToSendData: Boolean((parsed.gemini as any)?.consentToSendData ?? d.gemini.consentToSendData),
      },
      ollama: {
        baseUrl: parsed.ollama?.baseUrl ?? d.ollama.baseUrl,
        model: parsed.ollama?.model ?? d.ollama.model,
      },
    }
  } catch {
    return defaultSettings()
  }
}

export function setAiSettings(settings: AiSettings) {
  localStorage.setItem(STORAGE_AI_SETTINGS, JSON.stringify(settings))
}
