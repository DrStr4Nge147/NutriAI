export function AboutRoute() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-base font-semibold text-slate-900 dark:text-slate-100">About HimsogAI</div>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          HimsogAI is your mobile-first AI nutrition companion for meal tracking, nutrition insights, and healthier daily habits.
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Our mission</div>
        <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          We aim to make nutrition guidance more approachable by combining simple tracking with AI-assisted analysis.
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Privacy</div>
        <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Your data is stored locally on your device. When you use AI features, content may be sent for processing depending on your configured
          provider and consent.
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Disclaimer</div>
        <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          HimsogAI is not a medical device and does not provide medical advice. For medical concerns, consult a licensed healthcare
          professional.
        </div>
      </div>
    </div>
  )
}
