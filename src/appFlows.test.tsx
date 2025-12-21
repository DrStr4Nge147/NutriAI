import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

  it('can preview and analyze uploaded medical files, and marks summary stale when files change', async () => {
    const prevFileReader = (globalThis as any).FileReader
    const prevFetch = (globalThis as any).fetch

    class FileReaderStub {
      result: string | ArrayBuffer | null = null
      onload: null | (() => void) = null
      onerror: null | (() => void) = null

      readAsDataURL() {
        this.result = 'data:image/png;base64,AAA'
        this.onload?.()
      }
    }

    ;(globalThis as any).FileReader = FileReaderStub

    ;(globalThis as any).fetch = vi.fn(async () => {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ summary: 'Summary: all good.' }) }],
              },
            },
          ],
        }),
        text: async () => '',
      }
    })

    localStorage.setItem(
      'ai-nutritionist.aiSettings',
      JSON.stringify({
        provider: 'gemini',
        gemini: { apiKey: 'x', model: 'gemini-2.0-flash', consentToSendData: true },
        ollama: { baseUrl: 'http://localhost:11434', model: 'qwen3-vl:8b' },
      }),
    )

    try {
      await renderApp(['/'])
      await completeOnboarding('Test')

      fireEvent.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Medical' }))
      await screen.findByText('Medical History')

      const uploadInput = screen.getByLabelText('Upload medical files') as HTMLInputElement
      const file = new File(['x'], 'lab.png', { type: 'image/png' })
      fireEvent.change(uploadInput, { target: { files: [file] } })
      await screen.findByText('lab.png')

      fireEvent.click(screen.getByRole('button', { name: 'View' }))
      await screen.findByRole('dialog', { name: 'File preview' })
      expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
      const wheelBox = screen.getByTestId('file-preview-wheel')
      fireEvent.wheel(wheelBox, { ctrlKey: true, deltaY: -100 })
      fireEvent.wheel(wheelBox, { ctrlKey: true, deltaY: 100 })

      const viewport = screen.getByTestId('file-preview-viewport')
      fireEvent.pointerDown(viewport, { pointerId: 1, clientX: 10, clientY: 10 })
      fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 30, clientY: 30 })
      fireEvent.pointerUp(viewport, { pointerId: 1, clientX: 30, clientY: 30 })

      fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: 'File preview' })).not.toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Analyze' }))
      await screen.findByText('Summary: all good.')
      expect(screen.queryByText(/Out of date/i)).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Save medical history' }))
      await screen.findByRole('button', { name: 'Export data' })

      const profiles = await listProfiles()
      const profile = profiles.find((p) => p.name === 'Test')
      expect(profile?.medical.filesSummary?.summary).toBe('Summary: all good.')

      fireEvent.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Medical' }))
      await screen.findByText('Medical History')

      const uploadInput2 = screen.getByLabelText('Upload medical files') as HTMLInputElement
      const file2 = new File(['x'], 'lab2.png', { type: 'image/png' })
      fireEvent.change(uploadInput2, { target: { files: [file2] } })
      await screen.findByText('lab2.png')

      expect(screen.getByText(/Out of date/i)).toBeInTheDocument()
    } finally {
      ;(globalThis as any).FileReader = prevFileReader
      ;(globalThis as any).fetch = prevFetch
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

  it('can set goal to Overall Health and persists', async () => {
    await renderApp(['/'])
    await completeOnboarding('Test')

    fireEvent.click(screen.getByRole('link', { name: 'Profile' }))
    await screen.findByText('Edit profile')

    const goalSelect = screen.getByRole('combobox', { name: 'Goal' })
    fireEvent.change(goalSelect, { target: { value: 'overall_health' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))
    await act(async () => {
      await new Promise((r) => setTimeout(r, 25))
    })

    await waitFor(async () => {
      const profiles = await listProfiles()
      const profile = profiles.find((p) => p.name === 'Test')
      expect(profile?.goal).toBe('overall_health')
    })
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

  it('can delete multiple meals and delete all from meal history', async () => {
    await renderApp(['/'])
    await completeOnboarding('Test')

    async function createManualMeal(minuteOffset: number) {
      fireEvent.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Manual Entry' }))
      await screen.findByText('Add item')

      const eatenAtInput = screen.getByLabelText('Eaten at') as HTMLInputElement
      fireEvent.change(eatenAtInput, { target: { value: formatDatetimeLocalValue(new Date(Date.now() - minuteOffset * 60_000)) } })

      fireEvent.change(screen.getByLabelText('Food'), { target: { value: 'White rice' } })
      fireEvent.change(screen.getByLabelText('Grams'), { target: { value: '100' } })
      fireEvent.click(screen.getByRole('button', { name: 'Add item (estimate)' }))
      fireEvent.click(screen.getByRole('button', { name: 'Save meal' }))

      await screen.findByText('Items consumed')
      fireEvent.click(screen.getByRole('link', { name: 'Back' }))
      await screen.findByText('All meals saved on this device.')
    }

    fireEvent.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Meal History' }))
    await screen.findByText('All meals saved on this device.')

    await createManualMeal(0)
    await createManualMeal(1)
    await createManualMeal(2)

    fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    expect(screen.getByText('0 selected')).toBeInTheDocument()

    const boxes = screen.getAllByRole('checkbox')
    expect(boxes.length).toBeGreaterThanOrEqual(3)
    fireEvent.click(boxes[0])
    fireEvent.click(boxes[1])

    expect(screen.getByText('2 selected')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete selected' }))
    const confirm1 = await screen.findByRole('dialog')
    fireEvent.click(within(confirm1).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getAllByRole('checkbox').length).toBe(1)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Delete all' }))
    const confirm2 = await screen.findByRole('dialog')
    fireEvent.click(within(confirm2).getByRole('button', { name: 'Delete all' }))
    await screen.findByText('No meals yet.')
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
