import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type Pos = { x: number; y: number }

const STORAGE_POS = 'ai-nutritionist.aiChatBubblePos'

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function readPos(): Pos | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(STORAGE_POS)
    if (!raw) return null
    const parsed = JSON.parse(raw) as any
    if (!parsed || typeof parsed !== 'object') return null
    const x = typeof parsed.x === 'number' ? parsed.x : Number(parsed.x)
    const y = typeof parsed.y === 'number' ? parsed.y : Number(parsed.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null
    return { x, y }
  } catch {
    return null
  }
}

function savePos(pos: Pos) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_POS, JSON.stringify(pos))
}

export function AiChatBubble(props: { hidden?: boolean }) {
  const navigate = useNavigate()

  const size = 56
  const padding = 12

  const defaultPos = useMemo<Pos>(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 }
    return { x: window.innerWidth - size - padding, y: window.innerHeight - size - 110 }
  }, [])

  const [pos, setPos] = useState<Pos>(() => readPos() ?? defaultPos)
  const [animScale, setAnimScale] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)

  const posRef = useRef<Pos>(pos)
  const targetPosRef = useRef<Pos>(pos)
  const rafRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)
  const hasPersistedRef = useRef(false)

  useEffect(() => {
    posRef.current = pos
  }, [pos])

  useEffect(() => {
    targetPosRef.current = pos
  }, [pos])

  const dragRef = useRef<{
    active: boolean
    startClientX: number
    startClientY: number
    startX: number
    startY: number
    moved: boolean
  } | null>(null)

  const suppressClickRef = useRef(false)
  const bounceTimerRef = useRef<number | null>(null)

  function stopRaf() {
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  function ensureRaf() {
    if (rafRef.current != null) return

    const tick = () => {
      rafRef.current = null

      const cur = posRef.current
      const target = targetPosRef.current

      const dx = target.x - cur.x
      const dy = target.y - cur.y

      const settled = Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5
      if (settled) {
        posRef.current = target
        setPos(target)
        if (!isDraggingRef.current && !hasPersistedRef.current) {
          savePos(target)
          hasPersistedRef.current = true
        }
        stopRaf()
        return
      }

      const friction = 0.28
      const next: Pos = {
        x: cur.x + dx * friction,
        y: cur.y + dy * friction,
      }

      posRef.current = next
      setPos(next)
      ensureRaf()
    }

    rafRef.current = window.requestAnimationFrame(tick)
  }

  useEffect(() => {
    return () => {
      if (bounceTimerRef.current != null) window.clearTimeout(bounceTimerRef.current)
      stopRaf()
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return

    function compute() {
      setModalOpen(Boolean(document.querySelector('[aria-modal="true"]')))
    }

    compute()

    const obs = new MutationObserver(() => compute())
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-modal'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    function onResize() {
      setPos((prev) => {
        const maxX = window.innerWidth - size - padding
        const maxY = window.innerHeight - size - padding
        const next = { x: clamp(prev.x, padding, maxX), y: clamp(prev.y, padding, maxY) }
        savePos(next)
        return next
      })
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (props.hidden) return null

  return (
    <button
      type="button"
      aria-label="Open AI chat"
      className="fixed z-40 flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 text-white shadow-xl ring-4 ring-white/70 active:brightness-95 dark:ring-slate-950/60"
      style={{
        width: size,
        height: size,
        left: pos.x,
        top: pos.y,
        touchAction: 'none',
        zIndex: modalOpen ? 10 : 40,
        pointerEvents: modalOpen ? 'none' : 'auto',
        transform: `scale(${animScale})`,
        transition: 'transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
      onPointerDown={(e) => {
        const el = e.currentTarget
        el.setPointerCapture(e.pointerId)

        if (bounceTimerRef.current != null) {
          window.clearTimeout(bounceTimerRef.current)
          bounceTimerRef.current = null
        }
        setAnimScale(0.96)

        targetPosRef.current = posRef.current
        isDraggingRef.current = true
        hasPersistedRef.current = false
        ensureRaf()

        dragRef.current = {
          active: true,
          startClientX: e.clientX,
          startClientY: e.clientY,
          startX: pos.x,
          startY: pos.y,
          moved: false,
        }
      }}
      onPointerMove={(e) => {
        const st = dragRef.current
        if (!st?.active) return

        const dx = e.clientX - st.startClientX
        const dy = e.clientY - st.startClientY

        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) st.moved = true

        const maxX = (typeof window !== 'undefined' ? window.innerWidth : 0) - size - padding
        const maxY = (typeof window !== 'undefined' ? window.innerHeight : 0) - size - padding

        const next = {
          x: clamp(st.startX + dx, padding, maxX),
          y: clamp(st.startY + dy, padding, maxY),
        }
        targetPosRef.current = next
        ensureRaf()
      }}
      onPointerUp={() => {
        const st = dragRef.current
        dragRef.current = null
        if (!st) return

        isDraggingRef.current = false
        hasPersistedRef.current = false
        ensureRaf()

        setAnimScale(1.04)
        bounceTimerRef.current = window.setTimeout(() => {
          setAnimScale(1)
          bounceTimerRef.current = null
        }, 140)

        if (st.moved) {
          suppressClickRef.current = true
          window.setTimeout(() => {
            suppressClickRef.current = false
          }, 0)
        }
      }}
      onClick={() => {
        if (suppressClickRef.current) return
        navigate('/ai-chat')
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate('/ai-chat')
        }
      }}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        <path
          d="M4 5.5h16v10H7.5L4 19v-3.5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 10h.01M12 10h.01M16 10h.01"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
