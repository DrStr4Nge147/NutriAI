import { useEffect, useMemo, useState } from 'react'
import type { FoodItem, Meal } from '../models/types'
import { estimateFromLocalFoods, findFoods } from '../nutrition/localFoods'
import { emptyMacros, sumMacros } from '../nutrition/macros'
import { analyzeFoodItem } from '../ai/analyzeItem'
import { useUiFeedback } from '../state/UiFeedbackContext'
import { safeNumber } from '../utils/numbers'
import { newId } from '../utils/id'

export function MealItemsEditor(props: {
  meal: Meal
  onSaveMeal: (meal: Meal) => Promise<void>
  saveLabel?: string
  successMessage?: string
  disableSaveWhenEmpty?: boolean
}) {
  const { toast } = useUiFeedback()
  const [draftItems, setDraftItems] = useState<FoodItem[]>(props.meal.items)
  const [newName, setNewName] = useState('')
  const [newGrams, setNewGrams] = useState('150')
  const [busy, setBusy] = useState(false)
  const [analyzingItemId, setAnalyzingItemId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraftItems(props.meal.items)
    setError(null)
  }, [props.meal.id, props.meal.aiAnalysis?.analyzedAt])

  const totals = useMemo(() => sumMacros(draftItems), [draftItems])

  const suggestions = useMemo(() => findFoods(newName), [newName])

  function scaleMacros(item: FoodItem, nextGrams: number) {
    if (!item.quantityGrams || item.quantityGrams <= 0) return item.macros
    const factor = nextGrams / item.quantityGrams
    const round1 = (n: number) => Math.round(n * 10) / 10
    return {
      calories: round1(item.macros.calories * factor),
      carbs_g: round1(item.macros.carbs_g * factor),
      protein_g: round1(item.macros.protein_g * factor),
      fat_g: round1(item.macros.fat_g * factor),
      sugar_g: item.macros.sugar_g != null ? round1(item.macros.sugar_g * factor) : undefined,
      sodium_mg: item.macros.sodium_mg != null ? round1(item.macros.sodium_mg * factor) : undefined,
    }
  }

  function isZeroMacros(item: FoodItem) {
    return (
      item.macros.calories === 0 &&
      item.macros.protein_g === 0 &&
      item.macros.carbs_g === 0 &&
      item.macros.fat_g === 0
    )
  }

  function estimateOrEmpty(name: string, grams: number) {
    const est = estimateFromLocalFoods(name, grams)
    if (!est) return { name: name.trim(), macros: emptyMacros(), found: false }
    return { name: est.name, macros: est.macros, found: true }
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

    const name = newName.trim()
    if (!name) {
      setError('Enter a food name')
      return
    }

    const grams = Math.max(1, safeNumber(newGrams, 0))
    const est = estimateOrEmpty(name, grams)

    const item: FoodItem = {
      id: newId(),
      name: est.name || name,
      quantityGrams: grams,
      macros: est.macros,
    }

    setDraftItems((prev) => [...prev, item])
    setNewName('')
  }

  async function analyzeItem(item: FoodItem) {
    setError(null)
    setAnalyzingItemId(item.id)
    try {
      const grams = Math.max(1, safeNumber(String(item.quantityGrams), 0))
      const result = await analyzeFoodItem({ name: item.name, grams })
      updateItem(item.id, {
        name: result.name || item.name,
        quantityGrams: grams,
        macros: result.macros,
      })
      toast({ kind: 'success', message: 'Macros analyzed' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to analyze item'
      setError(msg)
      toast({ kind: 'error', message: msg })
    } finally {
      setAnalyzingItemId(null)
    }
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await props.onSaveMeal({
        ...props.meal,
        items: draftItems,
        totalMacros: totals,
      })
      toast({ kind: 'success', message: props.successMessage ?? 'Meal updated' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save'
      setError(msg)
      toast({ kind: 'error', message: msg })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-medium">Totals</div>
        <div className="mt-2 text-sm">
          <div>{totals.calories} kcal</div>
          <div>Protein: {totals.protein_g}g</div>
          <div>Carbs: {totals.carbs_g}g</div>
          <div>Fat: {totals.fat_g}g</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-medium">Add item</div>

        <label className="block text-sm">
          <div className="font-medium text-slate-900 dark:text-slate-100">Food</div>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g., White rice (cooked)"
          />
        </label>

        {suggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.id}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-900 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                onClick={() => setNewName(s.name)}
                type="button"
              >
                {s.name}
              </button>
            ))}
          </div>
        ) : null}

        <label className="block text-sm">
          <div className="font-medium text-slate-900 dark:text-slate-100">Grams</div>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            value={newGrams}
            onChange={(e) => setNewGrams(e.target.value)}
            inputMode="numeric"
          />
        </label>

        <button
          className="w-full rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
          onClick={() => addItem()}
          disabled={busy || analyzingItemId !== null}
          type="button"
        >
          Add item (estimate)
        </button>

        <div className="text-xs text-slate-600 dark:text-slate-300">
          Estimation uses the built-in food list. If an item isn’t recognized, macros will be 0.
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-medium">Items</div>

        {draftItems.length === 0 ? (
          <div className="text-sm text-slate-600 dark:text-slate-300">No items yet.</div>
        ) : (
          <div className="space-y-3">
            {draftItems.map((i) => (
              <div key={i.id} className="rounded-xl border border-slate-200 p-4 space-y-2 dark:border-slate-800">
                <label className="block text-sm">
                  <div className="font-medium text-slate-900 dark:text-slate-100">Name</div>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    value={i.name}
                    onChange={(e) => {
                      const nextName = e.target.value
                      const grams = Math.max(1, safeNumber(String(i.quantityGrams), 0))
                      const est = estimateOrEmpty(nextName, grams)
                      updateItem(i.id, { name: est.name || nextName, macros: est.macros })
                    }}
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm">
                    <div className="font-medium text-slate-900 dark:text-slate-100">Grams</div>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      value={String(i.quantityGrams)}
                      onChange={(e) => {
                        const nextGrams = Math.max(1, safeNumber(e.target.value, i.quantityGrams))
                        const est = estimateFromLocalFoods(i.name, nextGrams)
                        if (est) {
                          updateItem(i.id, { name: est.name || i.name, quantityGrams: nextGrams, macros: est.macros })
                        } else {
                          const nextMacros = isZeroMacros(i) ? i.macros : scaleMacros(i, nextGrams)
                          updateItem(i.id, { quantityGrams: nextGrams, macros: nextMacros })
                        }
                      }}
                      inputMode="numeric"
                    />
                  </label>

                  <div className="text-sm">
                    <div className="font-medium text-slate-900 dark:text-slate-100">Macros</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {i.macros.calories} kcal · P {i.macros.protein_g}g · C {i.macros.carbs_g}g · F {i.macros.fat_g}g
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {isZeroMacros(i) ? (
                    <button
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                      onClick={() => void analyzeItem(i)}
                      disabled={busy || analyzingItemId !== null}
                      type="button"
                    >
                      {analyzingItemId === i.id ? 'Analyzing…' : 'Analyze (AI)'}
                    </button>
                  ) : null}
                  <button
                    className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm text-red-700 disabled:opacity-50 dark:bg-slate-950"
                    onClick={() => removeItem(i.id)}
                    disabled={busy || analyzingItemId === i.id}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {error ? (
          <div className="text-sm text-red-600" role="alert" aria-live="assertive">
            {error}
          </div>
        ) : null}

        <button
          className="w-full rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
          onClick={() => void save()}
          disabled={busy || analyzingItemId !== null || (props.disableSaveWhenEmpty && draftItems.length === 0)}
          type="button"
        >
          {props.saveLabel ?? 'Save items'}
        </button>
      </div>
    </div>
  )
}
