import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { analyzeMedicalFiles } from '../ai/analyzeMedicalFiles'
import { FilePreviewModal } from '../components/FilePreviewModal'
import type { MedicalFilesAiSummary, MedicalLabUpload } from '../models/types'
import { useApp } from '../state/AppContext'
import { useUiFeedback } from '../state/UiFeedbackContext'
import { computeMedicalFilesSignature } from '../utils/medicalFiles'
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

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<MedicalLabUpload | null>(null)

  const [analyzeBusy, setAnalyzeBusy] = useState(false)
  const [filesSummary, setFilesSummary] = useState<MedicalFilesAiSummary | null>(null)

  useEffect(() => {
    setError(null)

    if (!currentProfile) return

    setConditionsText((currentProfile.medical.conditions ?? []).join(', '))
    setNotes(currentProfile.medical.notes ?? '')
    setUploads(currentProfile.medical.labs ?? [])
    setFilesSummary(currentProfile.medical.filesSummary ?? null)
  }, [currentProfile?.id])

  const parsedConditions = useMemo(() => {
    return conditionsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }, [conditionsText])

  const filesSignature = useMemo(() => {
    if (uploads.length === 0) return null
    return computeMedicalFilesSignature(uploads)
  }, [uploads])

  const summaryIsStale = useMemo(() => {
    if (!filesSignature) return false
    if (!filesSummary?.inputSignature) return false
    return filesSignature !== filesSummary.inputSignature
  }, [filesSignature, filesSummary?.inputSignature])

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

  async function onAnalyzeFiles() {
    setError(null)
    if (!uploads.length) return

    setAnalyzeBusy(true)
    try {
      const result = await analyzeMedicalFiles({ files: uploads })
      setFilesSummary(result)
      toast({ kind: 'success', message: 'Medical files summarized. Remember to save medical history.' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to analyze medical files'
      toast({ kind: 'error', message: msg })
    } finally {
      setAnalyzeBusy(false)
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
          labs: uploads.length > 0 ? uploads : undefined,
          notes: trimmedNotes ? trimmedNotes : undefined,
          filesSummary: uploads.length > 0 ? (filesSummary ?? undefined) : undefined,
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">No profile selected.</div>
        <Link to="/settings" className="inline-block text-sm text-slate-900 underline dark:text-slate-100">
          Back to settings
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-base font-semibold text-slate-900 dark:text-slate-100">Medical History</div>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Update details to help personalize insights and recommendations.</div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 dark:border-slate-800 dark:bg-slate-900">
        <label className="block text-sm">
          <div className="font-medium text-slate-900 dark:text-slate-100">Medical conditions (optional)</div>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            value={conditionsText}
            onChange={(e) => setConditionsText(e.target.value)}
            placeholder="diabetes, hypertension"
            disabled={busy}
          />
        </label>

        <label className="block text-sm">
          <div className="font-medium text-slate-900 dark:text-slate-100">Notes (optional)</div>
          <textarea
            className="mt-1 min-h-[120px] w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Medications, allergies, surgeries, family history, symptoms, etc."
            disabled={busy}
          />
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Upload medical files (optional)</div>
        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          Before uploading, it’s suggested to crop out your name and your physician’s name for privacy.
        </div>

        <div className="mt-3">
          <label className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
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
            <div className="text-xs font-medium text-slate-700 dark:text-slate-200">Uploaded</div>
            {uploads.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">{u.name}</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">{new Date(u.uploadedAt).toLocaleString()}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      setPreviewFile(u)
                      setPreviewOpen(true)
                    }}
                    type="button"
                  >
                    View
                  </button>
                  <button
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    onClick={() => setUploads((prev) => prev.filter((x) => x.id !== u.id))}
                    type="button"
                    disabled={busy}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Medical files summary</div>
                  {filesSummary ? (
                    <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                      Last analyzed: {new Date(filesSummary.analyzedAt).toLocaleString()}
                      {summaryIsStale ? ' • Out of date' : ''}
                    </div>
                  ) : (
                    <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">Not analyzed yet.</div>
                  )}
                </div>
                <button
                  className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                  onClick={() => void onAnalyzeFiles()}
                  type="button"
                  disabled={busy || analyzeBusy}
                >
                  {analyzeBusy ? 'Analyzing…' : filesSummary ? 'Analyze again' : 'Analyze'}
                </button>
              </div>

              {filesSummary ? (
                <div className="mt-2 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100">{filesSummary.summary}</div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">No files uploaded yet.</div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 dark:border-slate-800 dark:bg-slate-900">
        <button
          className="w-full rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
          onClick={() => void onSave()}
          disabled={busy}
          type="button"
        >
          Save medical history
        </button>

        <Link to="/settings" className="inline-block text-sm text-slate-900 underline dark:text-slate-100">
          Cancel
        </Link>

        {error ? (
          <div className="text-sm text-red-600" role="alert" aria-live="assertive">
            {error}
          </div>
        ) : null}
      </div>

      <FilePreviewModal
        open={previewOpen}
        file={previewFile ? { name: previewFile.name, mimeType: previewFile.mimeType, dataUrl: previewFile.dataUrl } : null}
        onClose={() => {
          setPreviewOpen(false)
          setPreviewFile(null)
        }}
      />
    </div>
  )
}
