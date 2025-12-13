import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { readFileAsDataUrl } from '../utils/files'
import { useApp } from '../state/AppContext'

export function CaptureMealRoute() {
  const navigate = useNavigate()
  const { addPhotoMeal } = useApp()

  const [eatenAt, setEatenAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (!videoRef.current) return
    if (!stream) {
      ;(videoRef.current as HTMLVideoElement & { srcObject?: MediaStream | null }).srcObject = null
      return
    }

    ;(videoRef.current as HTMLVideoElement & { srcObject?: MediaStream | null }).srcObject = stream
    void videoRef.current.play().catch(() => {})
  }, [stream])

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [stream])

  async function onPickFile(file: File | null) {
    setError(null)
    if (!file) return
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setPhotoPreview(dataUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read image')
    }
  }

  async function startCamera() {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not available in this browser.')
      return
    }

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      setStream(nextStream)
      setCameraActive(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to access camera'
      setError(msg)
      setCameraActive(false)
      setStream(null)
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)
    setCameraActive(false)
  }

  function captureFromCamera() {
    setError(null)
    const video = videoRef.current
    if (!video) return

    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) {
      setError('Camera not ready yet. Please wait a moment and try again.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setError('Unable to capture image.')
      return
    }

    ctx.drawImage(video, 0, 0, w, h)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setPhotoPreview(dataUrl)
    stopCamera()
  }

  async function save() {
    if (!photoPreview) return
    setSubmitting(true)
    setError(null)
    try {
      const iso = new Date(eatenAt).toISOString()
      const meal = await addPhotoMeal({ photoDataUrl: photoPreview, eatenAt: iso })
      navigate(`/meals/${meal.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save meal')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="text-base font-semibold">Take photo / Upload meal</div>
        <div className="mt-1 text-sm text-slate-600">
          Photo meals are saved locally. AI analysis will be added next.
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm space-y-3">
        <label className="block text-sm">
          <div className="font-medium">Eaten at</div>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={eatenAt}
            onChange={(e) => setEatenAt(e.target.value)}
            type="datetime-local"
          />
        </label>

        <div className="flex gap-2">
          {!cameraActive ? (
            <button
              className="flex-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              onClick={() => void startCamera()}
              disabled={submitting}
              type="button"
            >
              Open camera
            </button>
          ) : (
            <>
              <button
                className="flex-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                onClick={() => captureFromCamera()}
                type="button"
              >
                Capture
              </button>
              <button
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                onClick={() => stopCamera()}
                type="button"
              >
                Close
              </button>
            </>
          )}
        </div>

        {cameraActive ? (
          <video
            ref={videoRef}
            className="w-full rounded-md border border-slate-200"
            autoPlay
            playsInline
            muted
          />
        ) : null}

        <div className="text-xs text-slate-600">
          If camera doesn’t open, your browser may not support it here. Try HTTPS or use Upload.
        </div>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
        />

        {photoPreview ? (
          <img src={photoPreview} alt="Meal photo preview" className="w-full rounded-md border border-slate-200" />
        ) : null}

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <button
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => void save()}
          disabled={submitting || !photoPreview}
          type="button"
        >
          Save photo meal
        </button>

        <button
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          onClick={() => navigate('/manual')}
          type="button"
        >
          Or use manual entry
        </button>
      </div>
    </div>
  )
}
