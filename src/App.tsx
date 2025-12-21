import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useApp } from './state/AppContext'
import { MobileShell } from './components/MobileShell'
import { t } from './utils/i18n'
import { HomeRoute } from './routes/HomeRoute'
import { OnboardingRoute } from './routes/OnboardingRoute'
import { ManualEntryRoute } from './routes/ManualEntryRoute'
import { MealsRoute } from './routes/MealsRoute'
import { MealDetailRoute } from './routes/MealDetailRoute'
import { MealEditRoute } from './routes/MealEditRoute'
import { SettingsRoute } from './routes/SettingsRoute'
import { CaptureMealRoute } from './routes/CaptureMealRoute'
import { ProfileRoute } from './routes/ProfileRoute'
import { MedicalHistoryRoute } from './routes/MedicalHistoryRoute'

export default function App() {
  const { isHydrated, currentProfileId } = useApp()
  const location = useLocation()

  if (!isHydrated) {
    if (location.pathname === '/onboarding') {
      return (
        <div className="relative min-h-screen overflow-hidden bg-white text-slate-900">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-emerald-400/40 via-teal-400/30 to-white/0 blur-3xl" />
            <div className="absolute -bottom-56 left-[-160px] h-[560px] w-[560px] rounded-full bg-gradient-to-tr from-emerald-400/25 via-sky-300/15 to-white/0 blur-3xl" />
            <div className="absolute right-[-200px] top-10 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-sky-400/25 via-teal-300/15 to-white/0 blur-3xl" />
          </div>
          <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-10">
            <div className="onboarding-animate rounded-2xl border border-slate-200/70 bg-white/80 px-6 py-5 text-sm text-slate-700 shadow-xl shadow-slate-900/10 backdrop-blur-xl">
              Loading…
            </div>
          </div>
        </div>
      )
    }

    return (
      <MobileShell title={t('app_title')}>
        <div className="text-sm text-slate-600">Loading…</div>
      </MobileShell>
    )
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingRoute />} />

      <Route
        element={
          <MobileShell title={t('app_title')}>
            <Outlet />
          </MobileShell>
        }
      >
        <Route
          index
          element={
            currentProfileId ? <HomeRoute /> : <Navigate to="/onboarding" replace />
          }
        />
        <Route
          path="capture"
          element={
            currentProfileId ? (
              <CaptureMealRoute />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          }
        />
        <Route
          path="manual"
          element={
            currentProfileId ? (
              <ManualEntryRoute />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          }
        />
        <Route
          path="meals"
          element={
            currentProfileId ? <MealsRoute /> : <Navigate to="/onboarding" replace />
          }
        />
        <Route
          path="meals/:mealId/edit"
          element={
            currentProfileId ? (
              <MealEditRoute />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          }
        />
        <Route
          path="meals/:mealId"
          element={
            currentProfileId ? (
              <MealDetailRoute />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          }
        />
        <Route
          path="settings"
          element={
            currentProfileId ? (
              <SettingsRoute />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          }
        />
        <Route
          path="profile"
          element={
            currentProfileId ? (
              <ProfileRoute />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          }
        />
        <Route
          path="medical-history"
          element={
            currentProfileId ? (
              <MedicalHistoryRoute />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
