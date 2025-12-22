import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export function FilePreviewModal(props: {
  open: boolean
  file: { name: string; mimeType: string; dataUrl: string } | null
  onClose: () => void
}) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const wheelRef = useRef<HTMLDivElement | null>(null)
  const zoomRef = useRef(zoom)
  const panRef = useRef(pan)
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; startPanX: number; startPanY: number } | null>(null)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchRef = useRef<{ startDistance: number; startZoom: number } | null>(null)

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    panRef.current = pan
  }, [pan])

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

  useEffect(() => {
    if (!props.open) return
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setDragging(false)
    dragRef.current = null
  }, [props.open, props.file?.dataUrl])

  const kind = useMemo(() => {
    const mime = props.file?.mimeType ?? ''
    if (mime.startsWith('image/')) return 'image'
    if (mime === 'application/pdf') return 'pdf'
    return 'other'
  }, [props.file?.mimeType])

  const canZoom = kind === 'image' || kind === 'pdf'
  const canGestureZoom = kind === 'image'

  useEffect(() => {
    const el = wheelRef.current
    if (!props.open || !el) return

    function onWheelRaw(e: WheelEvent) {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()

      const delta = e.deltaY
      if (!Number.isFinite(delta) || delta === 0) return
      const direction = delta > 0 ? -1 : 1

      const next = clampZoom(zoomRef.current + direction * 0.25)
      setZoom(next)
      if (next === 1) setPan({ x: 0, y: 0 })
    }

    el.addEventListener('wheel', onWheelRaw, { passive: false })
    return () => el.removeEventListener('wheel', onWheelRaw as any)
  }, [props.open])

  if (!props.open || !props.file) return null

  function clampZoom(next: number) {
    if (!Number.isFinite(next)) return 1
    return Math.max(0.5, Math.min(3, Math.round(next * 4) / 4))
  }

  function setZoomClamped(next: number) {
    const z = clampZoom(next)
    setZoom(z)
    if (z === 1) setPan({ x: 0, y: 0 })
  }

  function zoomIn() {
    setZoomClamped(zoomRef.current + 0.25)
  }

  function zoomOut() {
    setZoomClamped(zoomRef.current - 0.25)
  }

  function resetZoom() {
    setZoomClamped(1)
  }

  function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!canGestureZoom) return

    const nextPointers = pointersRef.current
    nextPointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    const target = e.currentTarget as any
    if (typeof target.setPointerCapture === 'function') {
      try {
        target.setPointerCapture(e.pointerId)
      } catch {
        // ignore
      }
    }

    if (nextPointers.size >= 2) {
      const pts = Array.from(nextPointers.values())
      const d = dist(pts[0], pts[1])
      pinchRef.current = { startDistance: d || 1, startZoom: zoomRef.current }
      dragRef.current = null
      setDragging(false)
      return
    }

    if (zoomRef.current <= 1) return

    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: panRef.current.x,
      startPanY: panRef.current.y,
    }
    setDragging(true)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const pts = pointersRef.current
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY })

    const pinch = pinchRef.current
    if (pinch && pts.size >= 2) {
      const values = Array.from(pts.values())
      const nextDistance = dist(values[0], values[1])
      if (!Number.isFinite(nextDistance) || nextDistance <= 0) return
      const ratio = nextDistance / (pinch.startDistance || 1)
      setZoomClamped(pinch.startZoom * ratio)
      return
    }

    const d = dragRef.current
    if (!d) return
    if (d.pointerId !== e.pointerId) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    setPan({ x: d.startPanX + dx, y: d.startPanY + dy })
  }

  function endDrag(e?: React.PointerEvent<HTMLDivElement>) {
    if (e && pointersRef.current.has(e.pointerId)) {
      pointersRef.current.delete(e.pointerId)
      if (pointersRef.current.size < 2) pinchRef.current = null
    }

    const d = dragRef.current
    if (e && d && d.pointerId === e.pointerId) {
      const target = e.currentTarget as any
      if (typeof target.releasePointerCapture === 'function') {
        try {
          target.releasePointerCapture(e.pointerId)
        } catch {
          // ignore
        }
      }
    }

    dragRef.current = null
    setDragging(false)
  }

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="File preview"
    >
      <button className="absolute inset-0" onClick={props.onClose} type="button" aria-label="Close preview" />

      <div className="relative flex w-full max-w-4xl max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">{props.file.name}</div>
            <div className="mt-1 text-xs text-slate-600">{props.file.mimeType}</div>
          </div>
          <button
            className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            onClick={props.onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {canZoom ? (
              <>
                <button
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                  onClick={zoomOut}
                  type="button"
                  disabled={zoom <= 0.5}
                  aria-label="Zoom out"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <path d="M11 11H7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path
                      d="M20 20l-4-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
                <button
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                  onClick={zoomIn}
                  type="button"
                  disabled={zoom >= 3}
                  aria-label="Zoom in"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <path d="M11 7v8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M7 11h8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path
                      d="M20 20l-4-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
                <button
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                  onClick={resetZoom}
                  type="button"
                  disabled={zoom === 1}
                  aria-label="Reset zoom"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <path
                      d="M21 12a9 9 0 1 1-2.64-6.36"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M21 3v6h-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <div className="text-xs text-slate-600">{Math.round(zoom * 100)}%</div>
              </>
            ) : null}
          </div>
        </div>

        <div
          ref={wheelRef}
          data-testid="file-preview-wheel"
          className="mt-3 min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
        >
          {kind === 'image' ? (
            <div
              data-testid="file-preview-viewport"
              className={
                'relative flex h-full w-full touch-none items-center justify-center p-2 ' +
                (zoom > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : '')
              }
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => endDrag(e)}
              onPointerCancel={(e) => endDrag(e)}
            >
              <div
                data-testid="file-preview-content"
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center' }}
              >
                <img src={props.file.dataUrl} alt={props.file.name} className="max-w-full rounded-lg" draggable={false} />
              </div>
            </div>
          ) : kind === 'pdf' ? (
            <div
              data-testid="file-preview-viewport"
              className={
                'relative flex h-full w-full items-center justify-center p-2 ' +
                (zoom > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : '')
              }
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => endDrag(e)}
              onPointerCancel={(e) => endDrag(e)}
            >
              <div
                data-testid="file-preview-content"
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center' }}
              >
                <iframe
                  title={props.file.name}
                  src={props.file.dataUrl}
                  className="h-full w-full max-w-4xl rounded-lg"
                  style={{ pointerEvents: zoom > 1 ? 'none' : 'auto' }}
                />
              </div>
            </div>
          ) : (
            <div className="p-2 text-sm text-slate-700">Preview not supported for this file type.</div>
          )}
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return content
  return createPortal(content, document.body)
}
