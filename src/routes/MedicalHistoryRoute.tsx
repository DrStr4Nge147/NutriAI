import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { MedicalLabUpload } from '../models/types'
import { useApp } from '../state/AppContext'
import { useUiFeedback } from '../state/UiFeedbackContext'
import { readFileAsDataUrl } from '../utils/files'
import { newId } from '../utils/id'

export function MedicalHistoryRoute() {
  const navigate = useNavigate()
  const { currentProfile, saveProfile } = useApp()
  const { toast } = useUiFeedback()

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [conditionsText, setConditionsText] = useState('')
  const [notes, setNotes] = useState('')
  const [uploads, setUploads] = useState<MedicalLabUpload[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    setError(null)

    if (!currentProfile) return

    setConditionsText((currentProfile.medical.conditions ?? []).join(', '))
    setNotes(currentProfile.medical.notes ?? '')
    setUploads(currentProfile.medical.labs ?? [])
  }, [currentProfile?.id])

  const parsedConditions = useMemo(() => {
    return conditionsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }, [conditionsText])

  async function onAddUploads(files: FileList | null) {
    setUploadError(null)
    if (!files || files.length === 0) return

    try {
      const picked = Array.from(files)
      const next: MedicalLabUpload[] = []
      for (const f of picked) {
        const dataUrl = await readFileAsDataUrl(f)
        next.push({
          id: newId(),
          uploadedAt: new Date().toISOString(),
          name: f.name,
          mimeType: f.type || 'application/octet-stream',
          dataUrl,
        })
      }

      setUploads((prev) => [...prev, ...next])
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Failed to read file')
    }
  }

  async function onSave() {
    if (!currentProfile) return

    setBusy(true)
    setError(null)

    try {
      const trimmedNotes = notes.trim()

      const nextProfile = {
        ...currentProfile,
        medical: {
          ...currentProfile.medical,
          conditions: parsedConditions,
          labs: uploads,
          notes: trimmedNotes ? trimmedNotes : undefined,
        },
      }

      await saveProfile(nextProfile)
      toast({ kind: 'success', message: 'Medical history saved' })
      navigate('/settings')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save'
      setError(msg)
      toast({ kind: 'error', message: msg })
    } finally {
      setBusy(false)
    }
  }

  if (!currentProfile) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-sm text-slate-600">No profile selected.</div>
        <Link to="/settings" className="inline-block text-sm text-slate-900 underline">
          Back to settings
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-base font-semibold">Medical History</div>
        <div className="mt-1 text-sm text-slate-600">Update details to help personalize insights and recommendations.</div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <label className="block text-sm">
          <div className="font-medium">Medical conditions (optional)</div>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            value={conditionsText}
            onChange={(e) => setConditionsText(e.target.value)}
            placeholder="diabetes, hypertension"
            disabled={busy}
          />
        </label>

        <label className="block text-sm">
          <div className="font-medium">Notes (optional)</div>
          <textarea
            className="mt-1 min-h-[120px] w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Medications, allergies, surgeries, family history, symptoms, etc."
            disabled={busy}
          />
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">Upload medical files (optional)</div>
        <div className="mt-1 text-xs text-slate-600">
          Before uploading, it’s suggested to crop out your name and your physician’s name for privacy.
        </div>

        <div className="mt-3">
          <label className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Upload files
            <input
              className="sr-only"
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={(e) => void onAddUploads(e.target.files)}
              aria-label="Upload medical files"
              disabled={busy}
            />
          </label>
        </div>

        {uploadError ? <div className="mt-2 text-xs text-red-600">{uploadError}</div> : null}

        {uploads.length > 0 ? (
          <div className="mt-3 space-y-2">
            <div className="text-xs font-medium text-slate-700">Uploaded</div>
            {uploads.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-slate-900">{u.name}</div>
                  <div className="text-[11px] text-slate-600">{new Date(u.uploadedAt).toLocaleString()}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50"
                    href={u.dataUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                  <button
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50"
                    onClick={() => setUploads((prev) => prev.filter((x) => x.id !== u.id))}
                    type="button"
                    disabled={busy}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-600">No files uploaded yet.</div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <button
          className="w-full rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
          onClick={() => void onSave()}
          disabled={busy}
          type="button"
        >
          Save medical history
        </button>

        <Link to="/settings" className="inline-block text-sm text-slate-900 underline">
          Cancel
        </Link>

        {error ? (
          <div className="text-sm text-red-600" role="alert" aria-live="assertive">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  )
}
