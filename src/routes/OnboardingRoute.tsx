import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ActivityLevel, Sex, UserProfile } from '../models/types'
import { useApp } from '../state/AppContext'
import { clampNumber, safeNumber } from '../utils/numbers'

type Step = 'welcome' | 'body' | 'medical' | 'privacy'

const DEFAULTS: Omit<UserProfile, 'id' | 'createdAt'> = {
  name: 'Me',
  body: {
    heightCm: 170,
    weightKg: 70,
    age: 30,
    sex: 'prefer_not_say',
    activityLevel: 'moderate',
  },
  medical: {
    conditions: [],
  },
  goal: 'maintain',
  targetCaloriesKcal: null,
}

export function OnboardingRoute() {
  const navigate = useNavigate()
  const { createProfile } = useApp()

  const [step, setStep] = useState<Step>('welcome')
  const [name, setName] = useState(DEFAULTS.name)
  const [heightCm, setHeightCm] = useState(String(DEFAULTS.body.heightCm))
  const [weightKg, setWeightKg] = useState(String(DEFAULTS.body.weightKg))
  const [age, setAge] = useState(String(DEFAULTS.body.age))
  const [sex, setSex] = useState<Sex>(DEFAULTS.body.sex)
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(DEFAULTS.body.activityLevel)
  const [conditionsText, setConditionsText] = useState('')

  const conditions = useMemo(() => {
    return conditionsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }, [conditionsText])

  async function finish(profileOverrides?: Partial<Omit<UserProfile, 'id' | 'createdAt'>>) {
    const profileInput: Omit<UserProfile, 'id' | 'createdAt'> = {
      ...DEFAULTS,
      name,
      body: {
        heightCm: clampNumber(safeNumber(heightCm, DEFAULTS.body.heightCm), 50, 250),
        weightKg: clampNumber(safeNumber(weightKg, DEFAULTS.body.weightKg), 20, 400),
        age: clampNumber(safeNumber(age, DEFAULTS.body.age), 1, 120),
        sex,
        activityLevel,
      },
      medical: {
        conditions,
      },
      ...profileOverrides,
    }

    await createProfile(profileInput)
    navigate('/', { replace: true })
  }

  if (step === 'welcome') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="text-base font-semibold">Welcome</div>
          <div className="mt-1 text-sm text-slate-600">
            Track meals locally and get nutrition breakdowns. Your data stays on your device.
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium">Your name</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Me"
          />
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
            onClick={() => setStep('body')}
          >
            Get started
          </button>
          <button
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            onClick={() => finish(DEFAULTS)}
          >
            Skip
          </button>
        </div>
      </div>
    )
  }

  if (step === 'body') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="text-base font-semibold">Body details</div>
          <div className="mt-1 text-sm text-slate-600">
            Used to estimate daily needs. You can update this later.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-lg bg-white p-4 shadow-sm">
          <label className="text-sm">
            <div className="font-medium">Height (cm)</div>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className="text-sm">
            <div className="font-medium">Weight (kg)</div>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className="text-sm">
            <div className="font-medium">Age</div>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className="text-sm">
            <div className="font-medium">Sex</div>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={sex}
              onChange={(e) => setSex(e.target.value as Sex)}
            >
              <option value="prefer_not_say">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="col-span-2 text-sm">
            <div className="font-medium">Activity level</div>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
            >
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
              <option value="very_active">Very active</option>
            </select>
          </label>
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
            onClick={() => setStep('medical')}
          >
            Continue
          </button>
          <button
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            onClick={() => finish(DEFAULTS)}
          >
            Skip
          </button>
        </div>
      </div>
    )
  }

  if (step === 'medical') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="text-base font-semibold">Medical conditions (optional)</div>
          <div className="mt-1 text-sm text-slate-600">
            Enter conditions separated by commas (e.g., diabetes, hypertension).
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium">Conditions</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={conditionsText}
            onChange={(e) => setConditionsText(e.target.value)}
            placeholder="diabetes, hypertension"
          />
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
            onClick={() => setStep('privacy')}
          >
            Continue
          </button>
          <button
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            onClick={() => setStep('privacy')}
          >
            Skip
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="text-base font-semibold">Privacy & storage</div>
        <div className="mt-1 text-sm text-slate-600">
          Your meals and profile are stored locally on this device. Export in Settings for backup.
        </div>
      </div>

      <button
        className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
        onClick={() => void finish()}
      >
        Finish
      </button>
    </div>
  )
}
