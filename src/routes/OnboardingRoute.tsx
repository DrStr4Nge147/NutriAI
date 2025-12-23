import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ActivityLevel, Goal, MedicalLabUpload, Sex, UserProfile } from '../models/types'
import { PwaInstallButton } from '../pwa/PwaInstallButton'
import { useApp } from '../state/AppContext'
import { readFileAsDataUrl } from '../utils/files'
import { newId } from '../utils/id'
import { clampNumber, safeNumber } from '../utils/numbers'

type Step = 'welcome' | 'body' | 'goal' | 'medical' | 'privacy'

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
    <div className="relative min-h-screen overflow-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-emerald-400/40 via-teal-400/30 to-white/0 blur-3xl" />
        <div className="absolute -bottom-56 left-[-160px] h-[560px] w-[560px] rounded-full bg-gradient-to-tr from-emerald-400/25 via-sky-300/15 to-white/0 blur-3xl" />
        <div className="absolute right-[-200px] top-10 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-sky-400/25 via-teal-300/15 to-white/0 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Getting started</div>
            <div className="mt-1 text-lg font-semibold">{props.stepTitle}</div>
          </div>
          <div className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">Step {props.stepIndex + 1} of 5</div>
        </div>

        <div className="mt-4 md:hidden">
          <PwaInstallButton />
        </div>

        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800/70">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 transition-[width] duration-500 ease-out"
            style={{ width: `${((props.stepIndex + 1) / 5) * 100}%` }}
            aria-hidden="true"
          />
        </div>

        <div className="mt-8 flex-1">
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-xl shadow-slate-900/10 backdrop-blur-xl sm:p-8 dark:border-slate-800/70 dark:bg-slate-900/80">
            <div key={props.animateKey} className="onboarding-animate">
              {props.children}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">Your data is stored locally on this device.</div>
      </div>
    </div>
  )
}

export function OnboardingRoute() {
  const navigate = useNavigate()
  const { createProfile } = useApp()

  const [step, setStep] = useState<Step>('welcome')
  const [name, setName] = useState('')
  const [heightCm, setHeightCm] = useState(String(DEFAULTS.body.heightCm))
  const [weightKg, setWeightKg] = useState(String(DEFAULTS.body.weightKg))
  const [age, setAge] = useState(String(DEFAULTS.body.age))
  const [sex, setSex] = useState<Sex>(DEFAULTS.body.sex)
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(DEFAULTS.body.activityLevel)
  const [goal, setGoal] = useState<Goal>(DEFAULTS.goal ?? 'maintain')
  const [conditionsText, setConditionsText] = useState('')
  const [labUploads, setLabUploads] = useState<MedicalLabUpload[]>([])
  const [labError, setLabError] = useState<string | null>(null)
  const [medicalBlankError, setMedicalBlankError] = useState<string | null>(null)

  const conditions = useMemo(() => {
    return conditionsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }, [conditionsText])

  function onEnter(e: React.KeyboardEvent, action: () => void, enabled = true) {
    if (!enabled) return
    if (e.key !== 'Enter') return
    if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return

    e.preventDefault()
    action()
  }

  async function finish(profileOverrides?: Partial<Omit<UserProfile, 'id' | 'createdAt'>>) {
    const profileInput: Omit<UserProfile, 'id' | 'createdAt'> = {
      ...DEFAULTS,
      name: name.trim() || DEFAULTS.name,
      body: {
        heightCm: clampNumber(safeNumber(heightCm, DEFAULTS.body.heightCm), 50, 250),
        weightKg: clampNumber(safeNumber(weightKg, DEFAULTS.body.weightKg), 20, 400),
        age: clampNumber(safeNumber(age, DEFAULTS.body.age), 1, 120),
        sex,
        activityLevel,
      },
      medical: {
        conditions,
        labs: labUploads,
      },
      goal,
      ...profileOverrides,
    }

    await createProfile(profileInput)
    navigate('/', { replace: true })
  }

  const stepIndex = step === 'welcome' ? 0 : step === 'body' ? 1 : step === 'goal' ? 2 : step === 'medical' ? 3 : 4
  const stepTitle =
    step === 'welcome'
      ? 'Welcome'
      : step === 'body'
        ? 'Body details'
        : step === 'goal'
          ? 'Goal'
          : step === 'medical'
            ? 'Medical conditions'
            : 'Privacy & storage'

  if (step === 'welcome') {
    const canContinue = name.trim().length > 0
    return (
      <OnboardingStepShell stepTitle={stepTitle} stepIndex={stepIndex} animateKey={step}>
        <div className="space-y-5" onKeyDown={(e) => onEnter(e, () => setStep('body'), canContinue)}>
          <div>
            <div className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome</div>
            <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Track meals locally and get nutrition breakdowns. Your data stays on your device.
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Your name</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner shadow-slate-900/5 outline-none ring-0 transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/15 transition hover:brightness-110 active:brightness-95"
              onClick={() => setStep('body')}
              disabled={!canContinue}
            >
              Get started
            </button>
          </div>

          {!canContinue ? <div className="text-xs text-slate-600 dark:text-slate-300">Please enter your name to continue.</div> : null}
        </div>
      </OnboardingStepShell>
    )
  }

  if (step === 'body') {
    return (
      <OnboardingStepShell stepTitle={stepTitle} stepIndex={stepIndex} animateKey={step}>
        <div className="space-y-6" onKeyDown={(e) => onEnter(e, () => setStep('goal'))}>
          <div>
            <div className="text-2xl font-semibold tracking-tight">Body details</div>
            <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Used to estimate daily needs. You can update this later.</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="font-medium text-slate-700 dark:text-slate-200">Height (cm)</div>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner shadow-slate-900/5 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <label className="text-sm">
              <div className="font-medium text-slate-700 dark:text-slate-200">Weight (kg)</div>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner shadow-slate-900/5 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <label className="text-sm">
              <div className="font-medium text-slate-700 dark:text-slate-200">Age</div>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner shadow-slate-900/5 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <label className="text-sm">
              <div className="font-medium text-slate-700 dark:text-slate-200">Sex</div>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner shadow-slate-900/5 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
              <div className="font-medium text-slate-700 dark:text-slate-200">Activity level</div>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner shadow-slate-900/5 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
              >
                <option value="sedentary">Sedentary — mostly sitting, little to no exercise</option>
                <option value="light">Light — light exercise 1–3 days/week</option>
                <option value="moderate">Moderate — moderate exercise 3–5 days/week</option>
                <option value="active">Active — hard exercise 6–7 days/week</option>
                <option value="very_active">Very active — very hard exercise or physical job</option>
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
              onClick={() => setStep('welcome')}
            >
              Previous
            </button>
            <button
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/15 transition hover:brightness-110 active:brightness-95"
              onClick={() => setStep('goal')}
            >
              Next
            </button>
            <button
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
              onClick={() => finish(DEFAULTS)}
            >
              Skip
            </button>
          </div>
        </div>
      </OnboardingStepShell>
    )
  }

  if (step === 'goal') {
    return (
      <OnboardingStepShell stepTitle={stepTitle} stepIndex={stepIndex} animateKey={step}>
        <div className="space-y-6" onKeyDown={(e) => onEnter(e, () => setStep('medical'))}>
          <div>
            <div className="text-2xl font-semibold tracking-tight">Goal</div>
            <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Used to tailor recommendations. You can change this later.
            </div>
          </div>

          <label className="text-sm">
            <div className="font-medium text-slate-700 dark:text-slate-200">Your goal</div>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner shadow-slate-900/5 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={goal}
              onChange={(e) => setGoal(e.target.value as Goal)}
            >
              <option value="maintain">Maintain weight</option>
              <option value="lose">Lose weight</option>
              <option value="gain">Gain weight</option>
              <option value="overall_health">Overall health</option>
            </select>
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
              onClick={() => setStep('body')}
            >
              Previous
            </button>
            <button
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/15 transition hover:brightness-110 active:brightness-95"
              onClick={() => setStep('medical')}
            >
              Next
            </button>
            <button
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
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
    async function onAddLabs(files: FileList | null) {
      setLabError(null)
      setMedicalBlankError(null)
      if (!files || files.length === 0) return

      try {
        const picked = Array.from(files)
        const next: MedicalLabUpload[] = []
        for (const f of picked) {
          const dataUrl = await readFileAsDataUrl(f)
          next.push({
            id: newId(),
            uploadedAt: new Date().toISOString(),
            name: f.name,
            mimeType: f.type || 'application/octet-stream',
            dataUrl,
          })
        }

        setLabUploads((prev) => [...prev, ...next])
      } catch (e) {
        setLabError(e instanceof Error ? e.message : 'Failed to read file')
      }
    }

    function onNext() {
      const isBlank = conditions.length === 0 && labUploads.length === 0
      if (isBlank) {
        setMedicalBlankError('Medical conditions and uploads are blank — you can add them, or you can just skip.')
        return
      }

      setMedicalBlankError(null)
      setStep('privacy')
    }

    return (
      <OnboardingStepShell stepTitle={stepTitle} stepIndex={stepIndex} animateKey={step}>
        <div className="space-y-6" onKeyDown={(e) => onEnter(e, onNext)}>
          <div>
            <div className="text-2xl font-semibold tracking-tight">Medical conditions (optional)</div>
            <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Enter conditions separated by commas (e.g., diabetes, hypertension).
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Conditions</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner shadow-slate-900/5 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
              value={conditionsText}
              onChange={(e) => {
                setConditionsText(e.target.value)
                setMedicalBlankError(null)
              }}
              placeholder="diabetes, hypertension"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Upload lab results (optional)</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Before uploading, it’s suggested to crop out your name and your physician’s name for privacy.
            </div>

            <div className="mt-3">
              <label className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
                Upload labs
                <input
                  className="sr-only"
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={(e) => void onAddLabs(e.target.files)}
                />
              </label>
            </div>

            {labError ? <div className="mt-2 text-xs text-red-600">{labError}</div> : null}

            {medicalBlankError ? <div className="mt-2 text-xs text-red-600">{medicalBlankError}</div> : null}

            {labUploads.length > 0 ? (
              <div className="mt-3 space-y-2">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-200">Uploaded</div>
                {labUploads.map((lab) => (
                  <div key={lab.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">{lab.name}</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300">{new Date(lab.uploadedAt).toLocaleString()}</div>
                    </div>
                    <button
                      className="shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                      onClick={() => setLabUploads((prev) => prev.filter((x) => x.id !== lab.id))}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
              onClick={() => {
                setMedicalBlankError(null)
                setStep('goal')
              }}
            >
              Previous
            </button>
            <button
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/15 transition hover:brightness-110 active:brightness-95"
              onClick={onNext}
            >
              Next
            </button>
            <button
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
              onClick={() => {
                setMedicalBlankError(null)
                setStep('privacy')
              }}
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
      <div className="space-y-6" onKeyDown={(e) => onEnter(e, () => void finish())}>
        <div>
          <div className="text-2xl font-semibold tracking-tight">Privacy & storage</div>
          <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Your meals and profile are stored locally on this device. Export in Settings for backup.
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
            onClick={() => setStep('medical')}
          >
            Previous
          </button>
          <button
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/15 transition hover:brightness-110 active:brightness-95"
            onClick={() => void finish()}
          >
            Finish
          </button>
        </div>
      </div>
    </OnboardingStepShell>
  )
}
