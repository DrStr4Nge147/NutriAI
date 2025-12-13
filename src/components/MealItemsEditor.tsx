import { useEffect, useMemo, useState } from 'react'
import type { FoodItem, Meal } from '../models/types'
import { estimateFromLocalFoods } from '../nutrition/localFoods'
import { emptyMacros, sumMacros } from '../nutrition/macros'
import { safeNumber } from '../utils/numbers'
import { newId } from '../utils/id'

export function MealItemsEditor(props: {
  meal: Meal
  onSaveMeal: (meal: Meal) => Promise<void>
}) {
  const [draftItems, setDraftItems] = useState<FoodItem[]>(props.meal.items)
  const [newName, setNewName] = useState('')
  const [newGrams, setNewGrams] = useState('150')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setDraftItems(props.meal.items)
    setMessage(null)
    setError(null)
  }, [props.meal.id, props.meal.aiAnalysis?.analyzedAt])

  const totals = useMemo(() => sumMacros(draftItems), [draftItems])

  function scaleMacros(item: FoodItem, nextGrams: number) {
    if (!item.quantityGrams || item.quantityGrams <= 0) return item.macros
    const factor = nextGrams / item.quantityGrams
    const round1 = (n: number) => Math.round(n * 10) / 10
    return {
      calories: round1(item.macros.calories * factor),
      carbs_g: round1(item.macros.carbs_g * factor),
      protein_g: round1(item.macros.protein_g * factor),
      fat_g: round1(item.macros.fat_g * factor),
    }
  }

  function estimateFor(name: string, grams: number) {
    const est = estimateFromLocalFoods(name, grams)
    if (!est) return { name: name.trim(), macros: emptyMacros() }
    return est
  }

  function updateItem(itemId: string, patch: Partial<Pick<FoodItem, 'name' | 'quantityGrams' | 'macros'>>) {
    setDraftItems((prev) =>
      prev.map((i) => {
        if (i.id !== itemId) return i
        return { ...i, ...patch }
      }),
    )
  }

  function removeItem(itemId: string) {
    setDraftItems((prev) => prev.filter((i) => i.id !== itemId))
  }

  function addItem() {
    setError(null)
    setMessage(null)

    const name = newName.trim()
    if (!name) {
      setError('Enter a food name')
      return
    }

    const grams = Math.max(1, safeNumber(newGrams, 0))
    const est = estimateFor(name, grams)

    const item: FoodItem = {
      id: newId(),
      name: est.name || name,
      quantityGrams: grams,
      macros: est.macros,
    }

    setDraftItems((prev) => [...prev, item])
    setNewName('')
  }

  function estimateItem(item: FoodItem) {
    const grams = Math.max(1, safeNumber(String(item.quantityGrams), 0))
    const est = estimateFor(item.name, grams)
    updateItem(item.id, { name: est.name || item.name, quantityGrams: grams, macros: est.macros })
  }

  async function save() {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await props.onSaveMeal({
        ...props.meal,
        items: draftItems,
        totalMacros: totals,
      })
      setMessage('Saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="text-sm font-medium">Totals</div>
        <div className="mt-2 text-sm">
          <div>{totals.calories} kcal</div>
          <div>Protein: {totals.protein_g}g</div>
          <div>Carbs: {totals.carbs_g}g</div>
          <div>Fat: {totals.fat_g}g</div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm space-y-3">
        <div className="text-sm font-medium">Add item</div>

        <label className="block text-sm">
          <div className="font-medium">Food</div>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g., White rice (cooked)"
          />
        </label>

        <label className="block text-sm">
          <div className="font-medium">Grams</div>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={newGrams}
            onChange={(e) => setNewGrams(e.target.value)}
            inputMode="numeric"
          />
        </label>

        <button
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => addItem()}
          disabled={busy}
          type="button"
        >
          Add item (estimate)
        </button>

        <div className="text-xs text-slate-600">
          Estimation uses the built-in food list. If an item isn’t recognized, macros will be 0.
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm space-y-3">
        <div className="text-sm font-medium">Items</div>

        {draftItems.length === 0 ? (
          <div className="text-sm text-slate-600">No items yet.</div>
        ) : (
          <div className="space-y-3">
            {draftItems.map((i) => (
              <div key={i.id} className="rounded-md border border-slate-200 p-3 space-y-2">
                <label className="block text-sm">
                  <div className="font-medium">Name</div>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={i.name}
                    onChange={(e) => updateItem(i.id, { name: e.target.value })}
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm">
                    <div className="font-medium">Grams</div>
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={String(i.quantityGrams)}
                      onChange={(e) => {
                        const nextGrams = Math.max(1, safeNumber(e.target.value, i.quantityGrams))
                        updateItem(i.id, { quantityGrams: nextGrams, macros: scaleMacros(i, nextGrams) })
                      }}
                      inputMode="numeric"
                    />
                  </label>

                  <div className="text-sm">
                    <div className="font-medium">Macros</div>
                    <div className="mt-1 text-xs text-slate-600">
                      {i.macros.calories} kcal · P {i.macros.protein_g}g · C {i.macros.carbs_g}g · F {i.macros.fat_g}g
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    onClick={() => estimateItem(i)}
                    disabled={busy}
                    type="button"
                  >
                    Re-estimate
                  </button>
                  <button
                    className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-red-700 disabled:opacity-50"
                    onClick={() => removeItem(i.id)}
                    disabled={busy}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        {message ? <div className="text-sm text-green-700">{message}</div> : null}

        <button
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => void save()}
          disabled={busy}
          type="button"
        >
          Save items
        </button>
      </div>
    </div>
  )
}
