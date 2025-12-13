export async function registerServiceWorker(options?: {
  enabled?: boolean
  serviceWorker?: ServiceWorkerContainer | undefined
}): Promise<void> {
  const enabled = options?.enabled ?? import.meta.env.PROD
  if (!enabled) return

  const sw = options?.serviceWorker ?? (typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined)
  if (!sw) return

  try {
    await sw.register('/sw.js')
  } catch {
    return
  }
}
