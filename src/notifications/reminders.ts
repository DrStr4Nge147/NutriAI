export type ReminderSchedule = {
  enabled: boolean
  time: string
}

export type ReminderSettings = {
  mealLog: ReminderSchedule
  weighIn: ReminderSchedule
}

const STORAGE_REMINDER_SETTINGS = 'ai-nutritionist.reminders'

function defaultSettings(): ReminderSettings {
  return {
    mealLog: { enabled: false, time: '19:00' },
    weighIn: { enabled: false, time: '08:00' },
  }
}

export function normalizeTime(value: string, fallback: string): string {
  const m = /^([0-1]\d|2[0-3]):([0-5]\d)$/.exec(value.trim())
  if (!m) return fallback
  return `${m[1]}:${m[2]}`
}

export function getReminderSettings(): ReminderSettings {
  if (typeof localStorage === 'undefined') return defaultSettings()
  const raw = localStorage.getItem(STORAGE_REMINDER_SETTINGS)
  if (!raw) return defaultSettings()

  try {
    const parsed = JSON.parse(raw) as Partial<ReminderSettings>
    const d = defaultSettings()

    return {
      mealLog: {
        enabled: Boolean(parsed.mealLog?.enabled ?? d.mealLog.enabled),
        time: normalizeTime(parsed.mealLog?.time ?? d.mealLog.time, d.mealLog.time),
      },
      weighIn: {
        enabled: Boolean(parsed.weighIn?.enabled ?? d.weighIn.enabled),
        time: normalizeTime(parsed.weighIn?.time ?? d.weighIn.time, d.weighIn.time),
      },
    }
  } catch {
    return defaultSettings()
  }
}

export function setReminderSettings(settings: ReminderSettings) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_REMINDER_SETTINGS, JSON.stringify(settings))
}

export function msUntilNextTime(now: Date, timeHHMM: string): number {
  const normalized = normalizeTime(timeHHMM, '00:00')
  const [hh, mm] = normalized.split(':').map((x) => Number(x))

  const next = new Date(now)
  next.setHours(hh, mm, 0, 0)
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)

  return next.getTime() - now.getTime()
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

type TimerId = ReturnType<typeof setTimeout>

type Timers = {
  setTimeout: (cb: () => void, ms: number) => TimerId
  clearTimeout: (id: TimerId) => void
  now: () => Date
}

function defaultTimers(): Timers {
  return {
    setTimeout: (cb, ms) => setTimeout(cb, ms),
    clearTimeout: (id) => clearTimeout(id),
    now: () => new Date(),
  }
}

function notify(title: string, body: string, tag: string) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, tag })
  } catch {
    return
  }
}

function scheduleDaily(timeHHMM: string, callback: () => void, timers: Timers): () => void {
  let canceled = false
  let id: TimerId | null = null

  function arm() {
    if (canceled) return
    const delay = msUntilNextTime(timers.now(), timeHHMM)
    id = timers.setTimeout(() => {
      if (canceled) return
      callback()
      arm()
    }, delay)
  }

  arm()

  return () => {
    canceled = true
    if (id != null) timers.clearTimeout(id)
  }
}

let stops: (() => void)[] = []
let initialized = false

export function refreshReminderScheduler(timers?: Timers) {
  for (const stop of stops) stop()
  stops = []

  const t = timers ?? defaultTimers()
  const settings = getReminderSettings()

  if (settings.mealLog.enabled) {
    stops.push(
      scheduleDaily(
        settings.mealLog.time,
        () => notify('Meal reminder', 'Log your meal if you haven\'t yet.', 'ai-nutritionist:mealLog'),
        t,
      ),
    )
  }

  if (settings.weighIn.enabled) {
    stops.push(
      scheduleDaily(
        settings.weighIn.time,
        () => notify('Weigh-in reminder', 'Log today\'s weight.', 'ai-nutritionist:weighIn'),
        t,
      ),
    )
  }
}

export function initReminderScheduler() {
  if (initialized) return
  initialized = true

  if (typeof window === 'undefined') return

  refreshReminderScheduler()

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_REMINDER_SETTINGS) refreshReminderScheduler()
  })
}
