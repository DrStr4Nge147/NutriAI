import { useEffect, useMemo, useState } from 'react'
import { ProfileManager } from '../components/ProfileManager'
import { WeightTracker } from '../components/WeightTracker'
import type { ActivityLevel, Goal, Sex } from '../models/types'
import { useApp } from '../state/AppContext'
import { useUiFeedback } from '../state/UiFeedbackContext'
import { clampNumber, safeNumber } from '../utils/numbers'

export function ProfileRoute() {
  const { currentProfile, saveProfile } = useApp()
  const { toast } = useUiFeedback()

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<Sex>('prefer_not_say')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate')
  const [conditionsText, setConditionsText] = useState('')
  const [goal, setGoal] = useState<Goal>('maintain')
  const [targetCaloriesKcal, setTargetCaloriesKcal] = useState('')

  useEffect(() => {
    setError(null)

    if (!currentProfile) return

    setName(currentProfile.name)
    setHeightCm(String(currentProfile.body.heightCm))
    setWeightKg(String(currentProfile.body.weightKg))
    setAge(String(currentProfile.body.age))
    setSex(currentProfile.body.sex)
    setActivityLevel(currentProfile.body.activityLevel)
    setConditionsText((currentProfile.medical.conditions ?? []).join(', '))
    setGoal(currentProfile.goal ?? 'maintain')
    setTargetCaloriesKcal(
      currentProfile.targetCaloriesKcal == null || !Number.isFinite(currentProfile.targetCaloriesKcal)
        ? ''
        : String(currentProfile.targetCaloriesKcal),
    )
  }, [currentProfile?.id])

  const parsedConditions = useMemo(() => {
    return conditionsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }, [conditionsText])

  async function onSave() {
    if (!currentProfile) return

    setBusy(true)
    setError(null)

    try {
      const nextProfile = {
        ...currentProfile,
        name: name.trim() || currentProfile.name,
        body: {
          heightCm: clampNumber(safeNumber(heightCm, currentProfile.body.heightCm), 50, 250),
          weightKg: clampNumber(safeNumber(weightKg, currentProfile.body.weightKg), 20, 400),
          age: clampNumber(safeNumber(age, currentProfile.body.age), 1, 120),
          sex,
          activityLevel,
        },
        medical: {
          ...currentProfile.medical,
          conditions: parsedConditions,
        },
        goal,
        targetCaloriesKcal:
          targetCaloriesKcal.trim() === '' ? null : Math.max(0, safeNumber(targetCaloriesKcal, 0)),
      }

      await saveProfile(nextProfile)
      toast({ kind: 'success', message: 'Profile saved' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save'
      setError(msg)
      toast({ kind: 'error', message: msg })
    } finally {
      setBusy(false)
    }
  }

  if (!currentProfile) {
    return (
      <div className="space-y-4">
        <ProfileManager />
        <div className="rounded-lg bg-white p-4 shadow-sm text-sm text-slate-600">No profile selected.</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ProfileManager />

      <WeightTracker profile={currentProfile} onSaveProfile={saveProfile} />

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="text-base font-semibold">Edit profile</div>
        <div className="mt-1 text-sm text-slate-600">Update details used for daily needs and health insights.</div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm space-y-3">
        <label className="block text-sm">
          <div className="font-medium">Name</div>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            placeholder="Me"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <div className="font-medium">Height (cm)</div>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              inputMode="numeric"
              disabled={busy}
            />
          </label>

          <label className="block text-sm">
            <div className="font-medium">Weight (kg)</div>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              inputMode="decimal"
              disabled={busy}
            />
          </label>

          <label className="block text-sm">
            <div className="font-medium">Age</div>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              inputMode="numeric"
              disabled={busy}
            />
          </label>

          <label className="block text-sm">
            <div className="font-medium">Sex</div>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={sex}
              onChange={(e) => setSex(e.target.value as Sex)}
              disabled={busy}
            >
              <option value="prefer_not_say">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="col-span-2 block text-sm">
            <div className="font-medium">Activity level</div>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
              disabled={busy}
            >
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
              <option value="very_active">Very active</option>
            </select>
          </label>
        </div>

        <label className="block text-sm">
          <div className="font-medium">Medical conditions (optional)</div>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={conditionsText}
            onChange={(e) => setConditionsText(e.target.value)}
            placeholder="diabetes, hypertension"
            disabled={busy}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <div className="font-medium">Goal</div>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={goal}
              onChange={(e) => setGoal(e.target.value as Goal)}
              disabled={busy}
            >
              <option value="maintain">Maintain</option>
              <option value="lose">Lose weight</option>
              <option value="gain">Gain weight</option>
            </select>
          </label>

          <label className="block text-sm">
            <div className="font-medium">Daily target (kcal) (optional)</div>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={targetCaloriesKcal}
              onChange={(e) => setTargetCaloriesKcal(e.target.value)}
              inputMode="numeric"
              placeholder="e.g., 2000"
              disabled={busy}
            />
          </label>
        </div>

        <button
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => void onSave()}
          disabled={busy}
          type="button"
        >
          Save profile
        </button>

        {error ? (
          <div className="text-sm text-red-600" role="alert" aria-live="assertive">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  )
}
