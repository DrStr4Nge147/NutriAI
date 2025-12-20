import { useEffect, useRef, useState } from 'react'
import { readFileAsDataUrl } from '../utils/files'

function formatDatetimeLocalValue(date: Date) {
  const tzOffsetMs = date.getTimezoneOffset() * 60_000
  const local = new Date(date.getTime() - tzOffsetMs)
  return local.toISOString().slice(0, 16)
}

export function CaptureMealPicker(props: {
  eatenAt: string
  setEatenAt: (value: string) => void
  disabled: boolean
  onPhotoDataUrl: (dataUrl: string) => void
}) {
  const scanFileInputRef = useRef<HTMLInputElement | null>(null)
  const uploadFileInputRef = useRef<HTMLInputElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const isCoarsePointer =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)').matches
      : false

  const [cameraActive, setCameraActive] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    props.setEatenAt(formatDatetimeLocalValue(new Date()))
    try {
      const dataUrl = await readFileAsDataUrl(file)
      props.onPhotoDataUrl(dataUrl)
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

    props.setEatenAt(formatDatetimeLocalValue(new Date()))

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
    props.onPhotoDataUrl(dataUrl)
    stopCamera()
  }

  function openFilePicker() {
    setError(null)
    const el = scanFileInputRef.current
    if (!el) return
    el.value = ''
    el.click()
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <div className="text-base font-semibold">Scan meal</div>
          <div className="mt-1 text-sm text-slate-600">Take a photo or upload an image to estimate nutrition.</div>
        </div>

        <input
          ref={scanFileInputRef}
          className="sr-only"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
        />

        <label className="block text-sm">
          <div className="font-medium">Eaten at</div>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            value={props.eatenAt}
            onChange={(e) => props.setEatenAt(e.target.value)}
            type="datetime-local"
          />
        </label>

        {isCoarsePointer ? (
          <button
            className="w-full rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
            onClick={() => openFilePicker()}
            disabled={props.disabled}
            type="button"
          >
            Scan
          </button>
        ) : (
          <>
            <div className="flex gap-2">
              {!cameraActive ? (
                <button
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
                  onClick={() => void startCamera()}
                  disabled={props.disabled}
                  type="button"
                >
                  Open camera
                </button>
              ) : (
                <>
                  <button
                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 active:brightness-95"
                    onClick={() => captureFromCamera()}
                    type="button"
                  >
                    Capture
                  </button>
                  <button
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
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
                className="w-full rounded-xl border border-slate-200"
                autoPlay
                playsInline
                muted
              />
            ) : null}
          </>
        )}

        <label className="block text-sm">
          <div className="font-medium">Upload photo</div>
          <input
            className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-900 hover:file:bg-slate-200"
            ref={uploadFileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
          />
          <div className="mt-2 text-xs text-slate-600">If camera doesn’t open, your browser may not support it here. Try HTTPS or use Upload.</div>
        </label>

        {error ? (
          <div className="text-sm text-red-600" role="alert" aria-live="assertive">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  )
}
