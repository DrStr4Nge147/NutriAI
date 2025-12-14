import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './state/AppContext'
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
          <App />
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
})
