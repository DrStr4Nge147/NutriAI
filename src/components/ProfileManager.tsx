import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { useUiFeedback } from '../state/UiFeedbackContext'

export function ProfileManager() {
  const { profiles, currentProfileId, selectProfile, deleteProfile } = useApp()
  const { toast, confirm } = useUiFeedback()
  const [busy, setBusy] = useState(false)

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm space-y-3 dark:bg-slate-900">
      <div className="text-sm font-medium">Profiles</div>

      <div className="space-y-2">
        {profiles.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
            <div>
              <div className="text-sm font-medium">
                {p.name}{' '}
                {p.id === currentProfileId ? <span className="text-xs font-normal text-slate-600 dark:text-slate-300">(current)</span> : null}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                {p.body.heightCm}cm · {p.body.weightKg}kg · {p.body.age}y
              </div>
            </div>

            <div className="flex gap-2">
              {p.id !== currentProfileId ? (
                <button
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1 text-xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                  onClick={() =>
                    void (async () => {
                      setBusy(true)
                      try {
                        await selectProfile(p.id)
                        toast({ kind: 'success', message: `Switched to ${p.name}` })
                      } catch (e) {
                        toast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to switch profile' })
                      } finally {
                        setBusy(false)
                      }
                    })()
                  }
                  disabled={busy}
                  type="button"
                >
                  Switch
                </button>
              ) : null}

              <button
                className="rounded-xl border border-red-300 bg-white px-3 py-1 text-xs text-red-700 disabled:opacity-50 dark:bg-slate-950"
                onClick={() => {
                  void (async () => {
                    const ok = await confirm({
                      title: 'Delete profile',
                      message: `Delete profile "${p.name}"? This deletes its meals.`,
                      confirmText: 'Delete',
                      cancelText: 'Cancel',
                      destructive: true,
                    })
                    if (!ok) return

                    setBusy(true)
                    try {
                      await deleteProfile(p.id)
                      toast({ kind: 'success', message: 'Profile deleted' })
                    } catch (e) {
                      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to delete profile' })
                    } finally {
                      setBusy(false)
                    }
                  })()
                }}
                disabled={busy}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <Link to="/onboarding" className="inline-block rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900">
        Create new profile
      </Link>
    </div>
  )
}
