export const AI_CHAT_BUBBLE_SETTINGS_EVENT = 'ai-nutritionist.aiChatBubbleChanged'

const STORAGE_AI_CHAT_BUBBLE_ENABLED = 'ai-nutritionist.aiChatBubbleEnabled'

export function getAiChatBubbleEnabled(): boolean {
  if (typeof window === 'undefined') return true

  const raw = window.localStorage.getItem(STORAGE_AI_CHAT_BUBBLE_ENABLED)
  if (raw == null) return true
  return raw === '1'
}

export function setAiChatBubbleEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(STORAGE_AI_CHAT_BUBBLE_ENABLED, enabled ? '1' : '0')
  window.dispatchEvent(new Event(AI_CHAT_BUBBLE_SETTINGS_EVENT))
}

export function clearAiChatBubbleSettings() {
  if (typeof window === 'undefined') return

  window.localStorage.removeItem(STORAGE_AI_CHAT_BUBBLE_ENABLED)
  window.localStorage.removeItem('ai-nutritionist.aiChatBubblePos')
}
