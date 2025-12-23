import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { askHealthAssistant, type HealthChatMessage } from '../ai/healthChat'
import { useApp } from '../state/AppContext'
import { useUiFeedback } from '../state/UiFeedbackContext'

function historyKey(profileId: string) {
  return `ai-nutritionist.healthChatHistory.${profileId}`
}

function loadHistory(profileId: string): HealthChatMessage[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(historyKey(profileId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as any
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((m) => {
        const role: HealthChatMessage['role'] = m?.role === 'assistant' ? 'assistant' : 'user'
        const content = typeof m?.content === 'string' ? m.content : ''
        return { role, content }
      })
      .filter((m) => m.content.trim())
      .slice(-40)
  } catch {
    return []
  }
}

function saveHistory(profileId: string, messages: HealthChatMessage[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(historyKey(profileId), JSON.stringify(messages.slice(-60)))
}

function defaultGreeting(name: string): string {
  const trimmed = name.trim()
  return trimmed
    ? `Hi ${trimmed}, what health question can I help you with today?`
    : 'Hi, what health question can I help you with today?'
}

export function AiChatRoute() {
  const { currentProfile } = useApp()
  const { toast } = useUiFeedback()

  const profileId = currentProfile?.id ?? null
  const name = (currentProfile?.name ?? '').trim()

  const [messages, setMessages] = useState<HealthChatMessage[]>(() => {
    if (!profileId) return []
    return loadHistory(profileId)
  })

  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!profileId) return

    setMessages((prev) => {
      const existing = prev.length ? prev : loadHistory(profileId)
      if (existing.length > 0) return existing

      const seeded: HealthChatMessage[] = [{ role: 'assistant', content: defaultGreeting(name) }]
      saveHistory(profileId, seeded)
      return seeded
    })
  }, [profileId, name])

  function onResetChat() {
    if (!profileId) return
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(historyKey(profileId))
    }
    const seeded: HealthChatMessage[] = [{ role: 'assistant', content: defaultGreeting(name) }]
    saveHistory(profileId, seeded)
    setMessages(seeded)
    setInput('')
    toast({ kind: 'success', message: 'Chat reset' })
  }

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

  const context = useMemo(() => {
    return {
      name: name || 'User',
      profile: {
        age: currentProfile?.body.age,
        sex: currentProfile?.body.sex,
        heightCm: currentProfile?.body.heightCm,
        weightKg: currentProfile?.body.weightKg,
        activityLevel: currentProfile?.body.activityLevel,
        goal: currentProfile?.goal,
      },
      medical: {
        conditions: currentProfile?.medical.conditions ?? [],
        notes: currentProfile?.medical.notes ?? '',
        filesSummary: (currentProfile?.medical.filesSummary?.summary ?? '').slice(0, 1200),
      },
    }
  }, [name, currentProfile])

  async function onSend() {
    const text = input.trim()
    if (!text || busy) return
    if (!profileId) return

    setBusy(true)
    setInput('')

    const nextMessages: HealthChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)

    try {
      const res = await askHealthAssistant({
        context,
        messages: nextMessages,
      })

      const withAssistant: HealthChatMessage[] = [...nextMessages, { role: 'assistant', content: res.text }]
      setMessages(withAssistant)
      saveHistory(profileId, withAssistant)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to contact AI'
      toast({ kind: 'error', message: msg })

      const withAssistant: HealthChatMessage[] = [
        ...nextMessages,
        { role: 'assistant', content: 'I could not answer that right now. Please try again.' },
      ]
      setMessages(withAssistant)
      saveHistory(profileId, withAssistant)
    } finally {
      setBusy(false)
    }
  }

  if (!currentProfile) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          No profile selected.
        </div>
        <Link to="/" className="inline-block text-sm text-slate-900 underline dark:text-slate-100">
          Back
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI Health Chat</div>
          <div className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-300">Private health questions based on your profile</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => onResetChat()}
            disabled={busy}
            className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
          >
            Reset Chat
          </button>
          <Link to="/" className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900">
            Back
          </Link>
        </div>
      </div>

      <div
        ref={listRef}
        className="h-[55vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:h-[60vh] dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="space-y-3">
          {messages.map((m, idx) => (
            <div key={idx} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[85%] rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-4 py-3 text-sm text-white'
                    : 'max-w-[85%] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'
                }
              >
                {m.content}
              </div>
            </div>
          ))}
          {busy ? (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                Thinking…
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void onSend()
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault()
                void onSend()
              }
            }}
            placeholder="Ask a health question…"
            className="min-h-[44px] w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Send
          </button>
        </form>
      </div>

      <div className="text-[11px] text-slate-500 dark:text-slate-400">
        This chat does not replace a doctor. For emergencies, seek urgent care.
      </div>
    </div>
  )
}
