import { beforeEach, describe, expect, it } from 'vitest'
import {
  getReminderSettings,
  msUntilNextTime,
  normalizeTime,
  refreshReminderScheduler,
  requestNotificationPermission,
  setReminderSettings,
} from './reminders'

type TimeoutEntry = {
  id: number
  dueAt: number
  cb: () => void
}

function createFakeTimers(now: Date) {
  let nowMs = now.getTime()
  let nextId = 1
  const timeouts: TimeoutEntry[] = []

  function setTimeoutFn(cb: () => void, ms: number) {
    const id = nextId++
    timeouts.push({ id, dueAt: nowMs + ms, cb })
    return id
  }

  function clearTimeoutFn(id: number) {
    const idx = timeouts.findIndex((t) => t.id === id)
    if (idx >= 0) timeouts.splice(idx, 1)
  }

  function nowFn() {
    return new Date(nowMs)
  }

  function runNext() {
    if (timeouts.length === 0) throw new Error('No timeouts scheduled')
    timeouts.sort((a, b) => a.dueAt - b.dueAt)
    const next = timeouts.shift()!
    nowMs = next.dueAt
    next.cb()
  }

  return {
    timeouts,
    timers: {
      setTimeout: setTimeoutFn,
      clearTimeout: clearTimeoutFn,
      now: nowFn,
    },
    runNext,
  }
}

describe('reminders', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('normalizes times', () => {
    expect(normalizeTime('08:30', '00:00')).toBe('08:30')
    expect(normalizeTime('8:30', '00:00')).toBe('00:00')
    expect(normalizeTime('25:00', '09:00')).toBe('09:00')
  })

  it('computes ms until next time', () => {
    const now = new Date(2025, 0, 1, 7, 0, 0, 0)
    expect(msUntilNextTime(now, '07:30')).toBe(30 * 60 * 1000)

    const now2 = new Date(2025, 0, 1, 7, 0, 0, 0)
    expect(msUntilNextTime(now2, '06:00')).toBe(23 * 60 * 60 * 1000)
  })

  it('requestNotificationPermission returns unsupported when Notification is missing', async () => {
    const prev = (globalThis as any).Notification
    ;(globalThis as any).Notification = undefined
    await expect(requestNotificationPermission()).resolves.toBe('unsupported')
    ;(globalThis as any).Notification = prev
  })

  it('schedules enabled reminders and triggers notifications', () => {
    const created: Array<{ title: string; body?: string; tag?: string }> = []

    const prev = (globalThis as any).Notification

    class NotificationStub {
      static permission: NotificationPermission = 'granted'
      static async requestPermission() {
        return 'granted' as NotificationPermission
      }

      constructor(title: string, options?: NotificationOptions) {
        created.push({ title, body: options?.body, tag: options?.tag })
      }
    }

    ;(globalThis as any).Notification = NotificationStub

    const fake = createFakeTimers(new Date(2025, 0, 1, 7, 0, 0, 0))

    setReminderSettings({
      mealLog: { enabled: true, time: '07:30' },
      weighIn: { enabled: false, time: '08:00' },
    })

    const s = getReminderSettings()
    expect(s.mealLog.enabled).toBe(true)

    refreshReminderScheduler(fake.timers as any)
    expect(fake.timeouts).toHaveLength(1)

    const firstDelay = fake.timeouts[0].dueAt - fake.timers.now().getTime()
    expect(firstDelay).toBe(30 * 60 * 1000)

    fake.runNext()

    expect(created.length).toBe(1)
    expect(created[0].title).toBe('Meal reminder')

    expect(fake.timeouts).toHaveLength(1)
    const secondDelay = fake.timeouts[0].dueAt - fake.timers.now().getTime()
    expect(secondDelay).toBe(24 * 60 * 60 * 1000)

    ;(globalThis as any).Notification = prev
  })
})
