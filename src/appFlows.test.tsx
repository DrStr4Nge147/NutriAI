import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './state/AppContext'
import { MealPhotoAnalysisProvider } from './state/MealPhotoAnalysisContext'
import { UiFeedbackProvider } from './state/UiFeedbackContext'
import { clearAllData } from './storage/db'

function formatDatetimeLocalValue(date: Date) {
  const tzOffsetMs = date.getTimezoneOffset() * 60_000
  const local = new Date(date.getTime() - tzOffsetMs)
  return local.toISOString().slice(0, 16)
}

async function renderApp(initialEntries: string[] = ['/']) {
  render(
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

  await screen.findByRole('button', { name: 'Get started' })
}

async function completeOnboarding(name: string) {
  const nameInput = screen.getByPlaceholderText('Me')
  fireEvent.change(nameInput, { target: { value: name } })

  fireEvent.click(screen.getByRole('button', { name: 'Get started' }))

  await screen.findByRole('button', { name: 'Continue' })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

  await screen.findByText('Medical conditions (optional)')
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

  await screen.findByRole('button', { name: 'Finish' })
  fireEvent.click(screen.getByRole('button', { name: 'Finish' }))

  await screen.findByText('Calories left')
  expect(screen.getByText(name)).toBeInTheDocument()
}

describe('app flows', () => {
  beforeEach(async () => {
    localStorage.clear()
    await clearAllData()
  })

  it('onboarding creates a profile and lands on home', async () => {
    await renderApp(['/'])
    await completeOnboarding('Nick')
    expect(screen.getByText('Calories left')).toBeInTheDocument()
  })

  it('manual meal entry creates a meal and shows totals', async () => {
    await renderApp(['/'])
    await completeOnboarding('Test')

    fireEvent.click(screen.getAllByRole('link', { name: 'Manual' })[0])

    await screen.findByText('Manual meal entry')

    fireEvent.change(screen.getByLabelText('Food'), { target: { value: 'White rice' } })
    fireEvent.change(screen.getByLabelText('Grams'), { target: { value: '100' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save meal' }))

    await screen.findByText('Totals')
    expect(screen.getByText('130 kcal')).toBeInTheDocument()
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

      await screen.findByText('Scan meal')
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
      await screen.findByText('Scan meal')
      await screen.findByAltText('Meal photo preview')

      fireEvent.click(screen.getByRole('button', { name: 'Save photo meal' }))
      await screen.findByText('Photo analysis')

      fireEvent.click(screen.getByRole('button', { name: 'Analyze photo' }))
      await waitFor(() => expect((globalThis as any).fetch).toHaveBeenCalledTimes(1))

      fireEvent.click(screen.getByRole('link', { name: 'Back' }))
      await screen.findByText('All meals saved on this device.')
      await screen.findByText('Analyzing in background')

      fireEvent.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Scan' }))
      await screen.findByText('Scan meal')
      const upload = screen.getByLabelText(/Upload photo/i) as HTMLInputElement
      fireEvent.change(upload, { target: { files: [new File(['x'], 'm2.jpg', { type: 'image/jpeg' })] } })
      await screen.findByAltText('Meal photo preview')

      fireEvent.click(screen.getByRole('button', { name: 'Save photo meal' }))
      await screen.findByText('Photo analysis')

      fireEvent.click(screen.getByRole('button', { name: 'Analyze photo' }))
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
})
