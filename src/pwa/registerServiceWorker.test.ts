import { describe, expect, it, vi } from 'vitest'
import { registerServiceWorker } from './registerServiceWorker'

describe('registerServiceWorker', () => {
  it('does nothing when disabled', async () => {
    const register = vi.fn().mockResolvedValue(undefined)
    await registerServiceWorker({ enabled: false, serviceWorker: { register } as any })
    expect(register).not.toHaveBeenCalled()
  })

  it('registers when enabled and serviceWorker is available', async () => {
    const register = vi.fn().mockResolvedValue(undefined)
    await registerServiceWorker({ enabled: true, serviceWorker: { register } as any })
    expect(register).toHaveBeenCalledWith('/sw.js')
  })
})
