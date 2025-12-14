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

function OnboardingStepShell(props: {
  stepTitle: string
  stepIndex: number
  animateKey: string
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-emerald-400/40 via-teal-400/30 to-white/0 blur-3xl" />
        <div className="absolute -bottom-56 left-[-160px] h-[560px] w-[560px] rounded-full bg-gradient-to-tr from-emerald-400/25 via-sky-300/15 to-white/0 blur-3xl" />
        <div className="absolute right-[-200px] top-10 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-sky-400/25 via-teal-300/15 to-white/0 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Getting started</div>
            <div className="mt-1 text-lg font-semibold">{props.stepTitle}</div>
          </div>
          <div className="hidden sm:block text-xs text-slate-500">Step {props.stepIndex + 1} of 4</div>
        </div>

        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-slate-200/70">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 transition-[width] duration-500 ease-out"
            style={{ width: `${((props.stepIndex + 1) / 4) * 100}%` }}
            aria-hidden="true"
          />
        </div>

        <div className="mt-8 flex-1">
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-xl shadow-slate-900/10 backdrop-blur-xl sm:p-8">
            <div key={props.animateKey} className="onboarding-animate">
              {props.children}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-500">Your data is stored locally on this device.</div>
      </div>
    </div>
  )
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

  const stepIndex = step === 'welcome' ? 0 : step === 'body' ? 1 : step === 'medical' ? 2 : 3
  const stepTitle =
    step === 'welcome'
      ? 'Welcome'
      : step === 'body'
        ? 'Body details'
        : step === 'medical'
          ? 'Medical conditions'
          : 'Privacy & storage'

  if (step === 'welcome') {
    return (
      <OnboardingStepShell stepTitle={stepTitle} stepIndex={stepIndex} animateKey={step}>
        <div className="space-y-5">
          <div>
            <div className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Track meals locally and get nutrition breakdowns. Your data stays on your device.
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">Your name</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner shadow-slate-900/5 outline-none ring-0 transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Me"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/15 transition hover:brightness-110 active:brightness-95"
              onClick={() => setStep('body')}
            >
              Get started
            </button>
            <button
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              onClick={() => finish(DEFAULTS)}
            >
              Skip
            </button>
          </div>
        </div>
      </OnboardingStepShell>
    )
  }

  if (step === 'body') {
    return (
      <OnboardingStepShell stepTitle={stepTitle} stepIndex={stepIndex} animateKey={step}>
        <div className="space-y-6">
          <div>
            <div className="text-2xl font-semibold tracking-tight">Body details</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">Used to estimate daily needs. You can update this later.</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="font-medium text-slate-700">Height (cm)</div>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner shadow-slate-900/5 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <label className="text-sm">
              <div className="font-medium text-slate-700">Weight (kg)</div>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner shadow-slate-900/5 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <label className="text-sm">
              <div className="font-medium text-slate-700">Age</div>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner shadow-slate-900/5 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <label className="text-sm">
              <div className="font-medium text-slate-700">Sex</div>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner shadow-slate-900/5 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60"
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
              <div className="font-medium text-slate-700">Activity level</div>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner shadow-slate-900/5 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60"
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

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/15 transition hover:brightness-110 active:brightness-95"
              onClick={() => setStep('medical')}
            >
              Continue
            </button>
            <button
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              onClick={() => finish(DEFAULTS)}
            >
              Skip
            </button>
          </div>
        </div>
      </OnboardingStepShell>
    )
  }

  if (step === 'medical') {
    return (
      <OnboardingStepShell stepTitle={stepTitle} stepIndex={stepIndex} animateKey={step}>
        <div className="space-y-6">
          <div>
            <div className="text-2xl font-semibold tracking-tight">Medical conditions (optional)</div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Enter conditions separated by commas (e.g., diabetes, hypertension).
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">Conditions</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner shadow-slate-900/5 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60"
              value={conditionsText}
              onChange={(e) => setConditionsText(e.target.value)}
              placeholder="diabetes, hypertension"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/15 transition hover:brightness-110 active:brightness-95"
              onClick={() => setStep('privacy')}
            >
              Continue
            </button>
            <button
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              onClick={() => setStep('privacy')}
            >
              Skip
            </button>
          </div>
        </div>
      </OnboardingStepShell>
    )
  }

  return (
    <OnboardingStepShell stepTitle={stepTitle} stepIndex={stepIndex} animateKey={step}>
      <div className="space-y-6">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Privacy & storage</div>
          <div className="mt-2 text-sm leading-6 text-slate-600">
            Your meals and profile are stored locally on this device. Export in Settings for backup.
          </div>
        </div>

        <button
          className="w-full rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/15 transition hover:brightness-110 active:brightness-95"
          onClick={() => void finish()}
        >
          Finish
        </button>
      </div>
    </OnboardingStepShell>
  )
}
