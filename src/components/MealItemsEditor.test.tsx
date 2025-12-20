import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MealItemsEditor } from './MealItemsEditor'
import { UiFeedbackProvider } from '../state/UiFeedbackContext'
import type { Meal } from '../models/types'
import { emptyMacros } from '../nutrition/macros'

vi.mock('../ai/analyzeItem', () => {
  return {
    analyzeFoodItem: vi.fn(async () => ({
      name: 'Chicken adobo',
      quantityGrams: 150,
      macros: { calories: 321, protein_g: 20, carbs_g: 5, fat_g: 22, sugar_g: 1, sodium_mg: 500 },
    })),
  }
})

function renderEditor(meal: Meal) {
  const onSaveMeal = vi.fn(async () => {})

  render(
    <UiFeedbackProvider>
      <MealItemsEditor meal={meal} onSaveMeal={onSaveMeal} />
    </UiFeedbackProvider>,
  )

  return { onSaveMeal }
}

describe('MealItemsEditor', () => {
  it('shows Analyze (AI) only when macros are zero and uses AI to fill macros', async () => {
    const meal: Meal = {
      id: 'm1',
      profileId: 'p1',
      createdAt: new Date().toISOString(),
      eatenAt: new Date().toISOString(),
      items: [
        {
          id: 'i1',
          name: 'Chicken Adobo',
          quantityGrams: 150,
          macros: emptyMacros(),
        },
      ],
      totalMacros: emptyMacros(),
    }

    renderEditor(meal)

    expect(screen.getByRole('button', { name: 'Analyze (AI)' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Analyze (AI)' }))

    await waitFor(() => {
      expect(
        screen.getAllByText((_, el) => /321\s*kcal/i.test(el?.textContent ?? '')).length,
      ).toBeGreaterThan(0)
    })
  })

  it('auto re-estimates macros when name changes to a known local food (no manual button)', async () => {
    const meal: Meal = {
      id: 'm1',
      profileId: 'p1',
      createdAt: new Date().toISOString(),
      eatenAt: new Date().toISOString(),
      items: [
        {
          id: 'i1',
          name: 'Unknown food',
          quantityGrams: 100,
          macros: emptyMacros(),
        },
      ],
      totalMacros: emptyMacros(),
    }

    renderEditor(meal)

    const nameInput = screen.getByDisplayValue('Unknown food')
    fireEvent.change(nameInput, { target: { value: 'White rice (cooked)' } })

    await waitFor(() => {
      expect(
        screen.getAllByText((_, el) => /130\s*kcal/i.test(el?.textContent ?? '')).length,
      ).toBeGreaterThan(0)
    })

    expect(screen.queryByRole('button', { name: /re-estimate/i })).not.toBeInTheDocument()
  })
})
