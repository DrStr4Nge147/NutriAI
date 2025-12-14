import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './state/AppContext'
import { clearAllData } from './storage/db'

async function renderApp(initialEntries: string[] = ['/']) {
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppProvider>
        <App />
      </AppProvider>
    </MemoryRouter>,
  )

  await screen.findByText('Welcome')
}

async function completeOnboarding(name: string) {
  const nameInput = screen.getByPlaceholderText('Me')
  fireEvent.change(nameInput, { target: { value: name } })

  fireEvent.click(screen.getByRole('button', { name: 'Get started' }))

  await screen.findByText('Body details')
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

  await screen.findByText('Medical conditions (optional)')
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

  await screen.findByText('Privacy & storage')
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
    expect(screen.getAllByRole('link', { name: 'Settings' }).length).toBeGreaterThan(0)
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
})
