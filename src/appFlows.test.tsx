import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './state/AppContext'
import { MealPhotoAnalysisProvider } from './state/MealPhotoAnalysisContext'
import { UiFeedbackProvider } from './state/UiFeedbackContext'
import { clearAllData, listProfiles } from './storage/db'

function formatDatetimeLocalValue(date: Date) {
  const tzOffsetMs = date.getTimezoneOffset() * 60_000
  const local = new Date(date.getTime() - tzOffsetMs)
  return local.toISOString().slice(0, 16)
}

async function renderApp(initialEntries: string[] = ['/'], options?: { expectOnboarding?: boolean }) {
  const r = render(
    <MemoryRouter initialEntries={initialEntries}>
      <UiFeedbackProvider>
        <AppProvider>
          <MealPhotoAnalysisProvider>
            <App />
          </MealPhotoAnalysisProvider>
        </AppProvider>
      </UiFeedbackProvider>
    </MemoryRouter>,
  )

  const expectOnboarding = options?.expectOnboarding ?? true
  if (expectOnboarding) {
    await screen.findByRole('button', { name: 'Get started' })
  } else {
    await screen.findByText('Calories left')
  }

  return r
}

async function completeOnboarding(name: string) {
  const nameInput = screen.getByPlaceholderText('Your name')
  fireEvent.change(nameInput, { target: { value: name } })

  fireEvent.click(screen.getByRole('button', { name: 'Get started' }))

  await screen.findByRole('button', { name: 'Continue' })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

  await screen.findByText('Medical conditions (optional)')
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

  await screen.findByRole('button', { name: 'Finish' })
  fireEvent.click(screen.getByRole('button', { name: 'Finish' }))

  const disclaimer = await screen.findByText('AI analysis & cloud processing')
  expect(disclaimer).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'I understand' }))

  await screen.findByText('Calories left')
  expect(screen.getByText(name)).toBeInTheDocument()
}

describe('app flows', () => {
  beforeEach(async () => {
    localStorage.clear()
    await clearAllData()
  })

  it('can edit medical history, upload a file, and persists to storage', async () => {
    const prevFileReader = (globalThis as any).FileReader

    class FileReaderStub {
      result: string | ArrayBuffer | null = null
      onload: null | (() => void) = null
      onerror: null | (() => void) = null

      readAsDataURL() {
        this.result = 'data:application/pdf;base64,AAA'
        this.onload?.()
      }
    }

    ;(globalThis as any).FileReader = FileReaderStub

    try {
      await renderApp(['/'])
      await completeOnboarding('Test')

      fireEvent.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Medical' }))
      await screen.findByText('Medical History')

      fireEvent.change(screen.getByPlaceholderText('Medications, allergies, surgeries, family history, symptoms, etc.'), {
        target: { value: 'Allergy: penicillin' },
      })

      const uploadInput = screen.getByLabelText('Upload medical files') as HTMLInputElement
      const file = new File(['x'], 'lab.pdf', { type: 'application/pdf' })
      fireEvent.change(uploadInput, { target: { files: [file] } })
      await screen.findByText('lab.pdf')

      fireEvent.click(screen.getByRole('button', { name: 'Save medical history' }))
      await screen.findByRole('button', { name: 'Export data' })

      const profiles = await listProfiles()
      const profile = profiles.find((p) => p.name === 'Test')
      expect(profile).toBeTruthy()
      expect(profile?.medical.notes).toBe('Allergy: penicillin')
      expect(profile?.medical.labs?.length).toBe(1)
      expect(profile?.medical.labs?.[0]?.name).toBe('lab.pdf')
      expect(profile?.medical.labs?.[0]?.dataUrl).toMatch(/^data:application\/pdf;base64,/)
    } finally {
      ;(globalThis as any).FileReader = prevFileReader
    }
  })

  it('keeps profile management and weight tracking on profile page, not in settings', async () => {
    await renderApp(['/'])
    await completeOnboarding('Test')

    fireEvent.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Settings' }))
    await screen.findByRole('button', { name: 'Export data' })
    expect(screen.queryByText('Profiles')).not.toBeInTheDocument()
    expect(screen.queryByText('Weight tracking')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Profile' }))
    await screen.findByText('Edit profile')
    expect(screen.getByText('Profiles')).toBeInTheDocument()
    expect(screen.getByText('Weight tracking')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create new profile' })).toBeInTheDocument()
  })

  it('onboarding creates a profile and lands on home', async () => {
    await renderApp(['/'])
    await completeOnboarding('Nick')
    expect(screen.getByText('Calories left')).toBeInTheDocument()
  })

  it('does not allow getting started to proceed when name is blank', async () => {
    await renderApp(['/'])

    const getStarted = screen.getByRole('button', { name: 'Get started' })
    expect(getStarted).toBeDisabled()
    expect(screen.getByText('Please enter your name to continue.')).toBeInTheDocument()
  })

  it('shows AI cloud disclaimer after onboarding and respects do not show again', async () => {
    const prevFileReader = (globalThis as any).FileReader

    class FileReaderStub {
      result: string | ArrayBuffer | null = null
      onload: null | (() => void) = null
      onerror: null | (() => void) = null

      readAsDataURL() {
        this.result = 'data:application/pdf;base64,AAA'
        this.onload?.()
      }
    }

    ;(globalThis as any).FileReader = FileReaderStub

    try {
      const r1 = await renderApp(['/'])

      const nameInput = screen.getByPlaceholderText('Your name')
      fireEvent.change(nameInput, { target: { value: 'Test' } })
      fireEvent.click(screen.getByRole('button', { name: 'Get started' }))

      await screen.findByRole('button', { name: 'Continue' })
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      await screen.findByText('Medical conditions (optional)')
      expect(screen.getByText('Upload lab results (optional)')).toBeInTheDocument()
      expect(
        screen.getByText("Before uploading, it’s suggested to crop out your name and your physician’s name for privacy."),
      ).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      await screen.findByRole('button', { name: 'Finish' })
      fireEvent.click(screen.getByRole('button', { name: 'Finish' }))

      await screen.findByText('AI analysis & cloud processing')
      fireEvent.click(screen.getByLabelText('Do not show again'))
      fireEvent.click(screen.getByRole('button', { name: 'I understand' }))

      await screen.findByText('Calories left')

      r1.unmount()

      await renderApp(['/'], { expectOnboarding: false })
      expect(screen.queryByText('AI analysis & cloud processing')).not.toBeInTheDocument()
    } finally {
      ;(globalThis as any).FileReader = prevFileReader
    }
  })

  it('manual meal entry creates a meal and shows totals', async () => {
    await renderApp(['/'])
    await completeOnboarding('Test')

    expect(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Meal History' })).toBeInTheDocument()

    fireEvent.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Manual Entry' }))

    await screen.findByText('Add item')

    fireEvent.change(screen.getByLabelText('Food'), { target: { value: 'White rice' } })
    fireEvent.change(screen.getByLabelText('Grams'), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add item (estimate)' }))

    fireEvent.click(screen.getByRole('button', { name: 'Save meal' }))

    await screen.findByText('Items consumed')
    expect(screen.getByRole('button', { name: 'Delete meal' })).toBeInTheDocument()
    expect(screen.getAllByText((_, el) => el?.textContent === '130 kcal').length).toBeGreaterThan(0)
  })

  it('scan button lets user pick a photo and prefills eaten-at time', async () => {
    const prevFileReader = (globalThis as any).FileReader

    class FileReaderStub {
      result: string | ArrayBuffer | null = null
      onload: null | (() => void) = null
      onerror: null | (() => void) = null

      readAsDataURL() {
        this.result = 'data:image/jpeg;base64,AAA'
        this.onload?.()
      }
    }

    ;(globalThis as any).FileReader = FileReaderStub

    try {
      await renderApp(['/'])
      await completeOnboarding('Test')

      const scanButton = screen.getByRole('button', { name: 'Scan' })
      const scanInput = screen.getByTestId('scan-file-input') as HTMLInputElement
      const clickSpy = vi.spyOn(scanInput, 'click')

      fireEvent.click(scanButton)
      expect(clickSpy).toHaveBeenCalled()

      const beforePickMs = Date.now()
      const file = new File(['x'], 'meal.jpg', { type: 'image/jpeg' })
      fireEvent.change(scanInput, { target: { files: [file] } })

      await screen.findByText('Describe this meal')
      expect(await screen.findByAltText('Meal photo preview')).toBeInTheDocument()

      const eatenAtInput = screen.getByLabelText('Eaten at') as HTMLInputElement
      const pickedMs = new Date(eatenAtInput.value).getTime()
      expect(Math.abs(pickedMs - beforePickMs)).toBeLessThanOrEqual(60_000)
    } finally {
      ;(globalThis as any).FileReader = prevFileReader
    }
  })

  it('runs photo analysis in background across navigation and processes jobs sequentially', async () => {
    const prevFetch = (globalThis as any).fetch
    const prevFileReader = (globalThis as any).FileReader

    function deferred<T>() {
      let resolve: (value: T) => void = () => {}
      let reject: (reason?: any) => void = () => {}
      const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
      })
      return { promise, resolve, reject }
    }

    const fetchDefers: Array<ReturnType<typeof deferred<any>>> = []
    ;(globalThis as any).fetch = vi.fn(() => {
      const d = deferred<any>()
      fetchDefers.push(d)
      return d.promise
    })

    class FileReaderStub {
      result: string | ArrayBuffer | null = null
      onload: null | (() => void) = null
      onerror: null | (() => void) = null

      readAsDataURL() {
        this.result = 'data:image/jpeg;base64,AAA'
        this.onload?.()
      }
    }
    ;(globalThis as any).FileReader = FileReaderStub

    localStorage.setItem(
      'ai-nutritionist.aiSettings',
      JSON.stringify({
        provider: 'ollama',
        gemini: { apiKey: '', model: 'gemini-2.0-flash', consentToSendData: false },
        ollama: { baseUrl: 'http://localhost:11434', model: 'qwen3-vl:8b' },
      }),
    )

    try {
      await renderApp(['/'])
      await completeOnboarding('Test')

      const scanButton = screen.getByRole('button', { name: 'Scan' })
      const scanInput = screen.getByTestId('scan-file-input') as HTMLInputElement

      fireEvent.click(scanButton)
      fireEvent.change(scanInput, { target: { files: [new File(['x'], 'm1.jpg', { type: 'image/jpeg' })] } })
      await screen.findByText('Describe this meal')
      await screen.findByAltText('Meal photo preview')

      fireEvent.click(screen.getByRole('button', { name: 'Analyze Meal →' }))
      expect(screen.queryByText('Meal not found')).not.toBeInTheDocument()
      await screen.findByText('Analyzing your food…')
      await waitFor(() => expect((globalThis as any).fetch).toHaveBeenCalledTimes(1))

      const preview = await screen.findByAltText('Meal photo preview')
      const previewContainer = preview.parentElement
      if (!previewContainer) throw new Error('Preview container not found')
      fireEvent.click(within(previewContainer).getByRole('button', { name: 'Close' }))
      await screen.findByText('Calories left')
      await screen.findByText('Analyzing in background')

      fireEvent.click(screen.getByRole('button', { name: 'Scan' }))
      fireEvent.change(scanInput, { target: { files: [new File(['x'], 'm2.jpg', { type: 'image/jpeg' })] } })
      await screen.findByText('Describe this meal')
      await screen.findByAltText('Meal photo preview')
      fireEvent.click(screen.getByRole('button', { name: 'Analyze Meal →' }))
      expect((globalThis as any).fetch).toHaveBeenCalledTimes(1)

      fetchDefers[0].resolve({
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              items: [{ name: 'Item 1', quantityGrams: 100, calories: 100, protein_g: 10, carbs_g: 10, fat_g: 10 }],
            }),
          },
        }),
      })

      await waitFor(() => expect((globalThis as any).fetch).toHaveBeenCalledTimes(2))

      fetchDefers[1].resolve({
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              items: [{ name: 'Item 2', quantityGrams: 100, calories: 100, protein_g: 10, carbs_g: 10, fat_g: 10 }],
            }),
          },
        }),
      })

      await waitFor(() => {
        expect(screen.getAllByText('Meal photo analysis complete.').length).toBeGreaterThanOrEqual(2)
      })
    } finally {
      ;(globalThis as any).fetch = prevFetch
      ;(globalThis as any).FileReader = prevFileReader
    }
  })

  it('mobile scan button does not navigate to scan page until a photo is chosen', async () => {
    await renderApp(['/'])
    await completeOnboarding('Test')

    expect(screen.getByText('Calories left')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Scan' }))

    expect(screen.getByText('Calories left')).toBeInTheDocument()
    expect(screen.queryByText('Describe this meal')).not.toBeInTheDocument()
  })
})
