import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { newId } from '../utils/id'

type ToastKind = 'success' | 'error' | 'info'

type Toast = {
  id: string
  kind: ToastKind
  title?: string
  message: string
  timeoutMs: number
  phase: 'enter' | 'show' | 'exit'
}

type ConfirmRequest = {
  id: string
  title?: string
  message: string
  confirmText: string
  cancelText: string
  destructive: boolean
  resolve: (ok: boolean) => void
}

type UiFeedbackValue = {
  toast: (input: { kind?: ToastKind; title?: string; message: string; timeoutMs?: number }) => void
  confirm: (input: {
    title?: string
    message: string
    confirmText?: string
    cancelText?: string
    destructive?: boolean
  }) => Promise<boolean>
}

const UiFeedbackContext = createContext<UiFeedbackValue | null>(null)

function toastClasses(kind: ToastKind) {
  if (kind === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  if (kind === 'error') return 'border-red-200 bg-red-50 text-red-900'
  return 'border-slate-200 bg-white text-slate-900'
}

export function UiFeedbackProvider(props: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<string, { auto?: number; enter?: number; exit?: number }>>(new Map())

  const [confirmQueue, setConfirmQueue] = useState<ConfirmRequest[]>([])
  const activeConfirm = confirmQueue[0] ?? null

  const removeToast = useCallback((toastId: string) => {
    const timers = timersRef.current.get(toastId)
    if (timers?.auto) window.clearTimeout(timers.auto)
    if (timers?.enter) window.clearTimeout(timers.enter)
    if (timers?.exit) window.clearTimeout(timers.exit)
    timersRef.current.delete(toastId)
    setToasts((prev) => prev.filter((t) => t.id !== toastId))
  }, [])

  const dismissToast = useCallback(
    (toastId: string) => {
      const timers = timersRef.current.get(toastId)
      if (timers?.auto) {
        window.clearTimeout(timers.auto)
        timers.auto = undefined
      }
      if (timers?.exit) return

      setToasts((prev) => prev.map((t) => (t.id === toastId ? { ...t, phase: 'exit' } : t)))

      const exit = window.setTimeout(() => removeToast(toastId), 220)
      if (timers) timers.exit = exit
      else timersRef.current.set(toastId, { exit })
    },
    [removeToast],
  )

  const toast = useCallback(
    (input: { kind?: ToastKind; title?: string; message: string; timeoutMs?: number }) => {
      const id = newId()
      const t: Toast = {
        id,
        kind: input.kind ?? 'info',
        title: input.title,
        message: input.message,
        timeoutMs: input.timeoutMs ?? 3500,
        phase: 'enter',
      }

      setToasts((prev) => {
        const next = [...prev, t]
        if (next.length <= 4) return next

        const dropped = next[0]
        const timers = timersRef.current.get(dropped.id)
        if (timers?.auto) window.clearTimeout(timers.auto)
        if (timers?.enter) window.clearTimeout(timers.enter)
        if (timers?.exit) window.clearTimeout(timers.exit)
        timersRef.current.delete(dropped.id)
        return next.slice(1)
      })

      const enter = window.setTimeout(() => {
        setToasts((prev) => prev.map((x) => (x.id === id ? { ...x, phase: 'show' } : x)))
      }, 10)

      timersRef.current.set(id, { enter })

      const auto = window.setTimeout(() => dismissToast(id), t.timeoutMs)
      const timers = timersRef.current.get(id) ?? {}
      timers.auto = auto
      timersRef.current.set(id, timers)
    },
    [dismissToast],
  )

  const confirm = useCallback(
    (input: { title?: string; message: string; confirmText?: string; cancelText?: string; destructive?: boolean }) => {
      const id = newId()
      return new Promise<boolean>((resolve) => {
        const req: ConfirmRequest = {
          id,
          title: input.title,
          message: input.message,
          confirmText: input.confirmText ?? 'Confirm',
          cancelText: input.cancelText ?? 'Cancel',
          destructive: input.destructive ?? false,
          resolve,
        }
        setConfirmQueue((prev) => [...prev, req])
      })
    },
    [],
  )

  const closeConfirm = useCallback((confirmId: string, ok: boolean) => {
    setConfirmQueue((prev) => {
      const req = prev.find((r) => r.id === confirmId) ?? null
      req?.resolve(ok)
      return prev.filter((r) => r.id !== confirmId)
    })
  }, [])

  useEffect(() => {
    if (!activeConfirm) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeConfirm(activeConfirm.id, false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeConfirm, closeConfirm])

  useEffect(() => {
    return () => {
      for (const timers of timersRef.current.values()) {
        if (timers.auto) window.clearTimeout(timers.auto)
        if (timers.enter) window.clearTimeout(timers.enter)
        if (timers.exit) window.clearTimeout(timers.exit)
      }
      timersRef.current.clear()
    }
  }, [])

  const value = useMemo<UiFeedbackValue>(() => ({ toast, confirm }), [toast, confirm])

  return (
    <UiFeedbackContext.Provider value={value}>
      {props.children}

      <div className="fixed inset-x-0 top-3 z-50 flex justify-center px-3 sm:top-4 sm:right-4 sm:left-auto sm:block sm:w-[360px]">
        <div className="pointer-events-none grid gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={
                `pointer-events-auto rounded-xl border px-4 py-3 shadow-lg transition-all duration-200 ease-out motion-reduce:transition-none ` +
                `${toastClasses(t.kind)} ` +
                (t.phase === 'show' ? 'translate-y-0 opacity-100' : 'translate-y-[-8px] opacity-0')
              }
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {t.title ? <div className="text-sm font-semibold">{t.title}</div> : null}
                  <div className="text-sm">{t.message}</div>
                </div>
                <button
                  className="rounded-md px-2 py-1 text-xs text-slate-700 hover:bg-black/5"
                  onClick={() => dismissToast(t.id)}
                  type="button"
                  aria-label="Close"
                >
                  Close
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeConfirm ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            {activeConfirm.title ? (
              <div className="text-base font-semibold text-slate-900">{activeConfirm.title}</div>
            ) : null}
            <div className="mt-2 text-sm text-slate-700">{activeConfirm.message}</div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                onClick={() => closeConfirm(activeConfirm.id, false)}
                type="button"
              >
                {activeConfirm.cancelText}
              </button>
              <button
                className={
                  activeConfirm.destructive
                    ? 'rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700'
                    : 'rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800'
                }
                onClick={() => closeConfirm(activeConfirm.id, true)}
                type="button"
              >
                {activeConfirm.confirmText}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </UiFeedbackContext.Provider>
  )
}

export function useUiFeedback() {
  const ctx = useContext(UiFeedbackContext)
  if (!ctx) throw new Error('UiFeedbackProvider missing')
  return ctx
}
