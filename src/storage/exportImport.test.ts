import { beforeEach, describe, expect, it } from 'vitest'
import { clearAllData } from './db'
import { exportAllData, importAllData } from './exportImport'

describe('exportImport', () => {
  beforeEach(async () => {
    await clearAllData()
    localStorage.clear()
  })

  it('round-trips weightHistory through import/export', async () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      currentProfileId: 'p1',
      profiles: [
        {
          id: 'p1',
          createdAt: new Date().toISOString(),
          name: 'Me',
          body: {
            heightCm: 170,
            weightKg: 70,
            age: 30,
            sex: 'male',
            activityLevel: 'moderate',
          },
          medical: { conditions: [] },
          weightHistory: [
            { date: '2025-01-01T00:00:00.000Z', weightKg: 70 },
            { date: '2025-02-01T00:00:00.000Z', weightKg: 71.5 },
          ],
        },
      ],
      meals: [],
    }

    await importAllData(payload)
    const exported = await exportAllData()

    expect(exported.profiles).toHaveLength(1)
    expect(exported.profiles[0].weightHistory).toEqual(payload.profiles[0].weightHistory)
  })
})
