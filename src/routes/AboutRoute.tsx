export function AboutRoute() {
  return (
    <div className="w-full">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl dark:text-slate-100">About HimsogAI</div>
        <div className="mt-3 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7 lg:text-lg lg:leading-8 dark:text-slate-300">
          <div className="space-y-4">
            <p>
              HimsogAI is a mobile-first AI nutrition companion designed to make meal tracking and nutrition insights feel simple, fast, and
              consistent.
            </p>
            <p>
              Track meals by scanning photos or entering items manually, review your meal history, and use the app’s guidance to spot patterns you
              can improve over time. The goal is practical progress: better awareness, better choices, and healthier daily habits.
            </p>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-10">
            <div>
              <div className="text-base font-semibold text-slate-900 sm:text-lg dark:text-slate-100">Our mission</div>
              <div className="mt-2 space-y-3">
                <p>
                  We want nutrition support to be approachable. HimsogAI combines straightforward tracking with optional AI-assisted analysis so you
                  can get helpful summaries without drowning in complexity.
                </p>
                <p>
                  Whether you’re focused on consistency, weight goals, or simply eating more mindfully, the app is built to help you stick with a
                  routine that fits your day.
                </p>
              </div>
            </div>

            <div>
              <div className="text-base font-semibold text-slate-900 sm:text-lg dark:text-slate-100">Privacy</div>
              <div className="mt-2 space-y-3">
                <p>
                  Your data is stored locally on your device. If you choose to use AI features, content may be sent to your selected provider for
                  processing depending on your configuration and consent.
                </p>
                <p>You stay in control of what you enter and which provider you use. You can also clear local data anytime from Settings.</p>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="text-base font-semibold text-slate-900 sm:text-lg dark:text-slate-100">Disclaimer</div>
              <div className="mt-2">
                <p>
                  HimsogAI is not a medical device and does not provide medical advice. It’s intended for general wellness and informational
                  purposes. For medical concerns or decisions, consult a licensed healthcare professional.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
