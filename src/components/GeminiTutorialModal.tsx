import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export function GeminiTutorialModal(props: {
  open: boolean
  onClose: () => void
}) {
  useEffect(() => {
    if (!props.open) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') props.onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [props])

  useEffect(() => {
    if (!props.open) return
    if (typeof document === 'undefined') return

    const body = document.body
    const prevOverflow = body.style.overflow
    body.style.overflow = 'hidden'

    return () => {
      body.style.overflow = prevOverflow
    }
  }, [props.open])

  if (!props.open) return null

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Gemini API key tutorial"
    >
      <button className="absolute inset-0" onClick={props.onClose} type="button" aria-label="Close" />

      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white p-4 shadow-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">How to get a Gemini API key</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              You’ll create a key in Google AI Studio, then paste it back into this app.
            </div>
          </div>
          <button
            className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
            onClick={props.onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-900 dark:text-slate-100">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
            Keep your key private. Don’t share it or commit it to Git.
          </div>

          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Open the API keys page and sign in with your Google account.
              <div className="mt-2">
                <a
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-3 py-2 text-xs font-medium text-white transition hover:brightness-110 active:brightness-95"
                  href="https://aistudio.google.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Google AI Studio API Keys
                </a>
              </div>
            </li>
            <li>
              If prompted, choose or create a project and accept any terms.
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Sometimes Google will ask you to select a Google Cloud project or enable required settings. This is normal and the UI will guide you.
              </div>
            </li>
            <li>
              Click <span className="font-medium">Create API key</span> (or similar), then copy the key.
            </li>
            <li>
              Come back here and paste it into <span className="font-medium">Settings → AI → Gemini → API key</span>.
            </li>
            <li>
              Click <span className="font-medium">Save AI settings</span>.
            </li>
          </ol>

          <div className="text-xs text-slate-600 dark:text-slate-300">
            If your key doesn’t work, double-check that you copied it fully and that your Google account/project has access enabled.
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
            onClick={props.onClose}
            type="button"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return content
  return createPortal(content, document.body)
}
