import { Navigate, Route, Routes } from 'react-router-dom'
import { useApp } from './state/AppContext'
import { MobileShell } from './components/MobileShell'
import { HomeRoute } from './routes/HomeRoute'
import { OnboardingRoute } from './routes/OnboardingRoute'
import { ManualEntryRoute } from './routes/ManualEntryRoute'
import { MealsRoute } from './routes/MealsRoute'
import { MealDetailRoute } from './routes/MealDetailRoute'
import { SettingsRoute } from './routes/SettingsRoute'
import { CaptureMealRoute } from './routes/CaptureMealRoute'
import { ProfileRoute } from './routes/ProfileRoute'

export default function App() {
  const { isHydrated, currentProfileId } = useApp()

  if (!isHydrated) {
    return (
      <MobileShell title="AI Nutritionist">
        <div className="text-sm text-slate-600">Loading…</div>
      </MobileShell>
    )
  }

  return (
    <MobileShell title="AI Nutritionist">
      <Routes>
        <Route path="/onboarding" element={<OnboardingRoute />} />
        <Route
          path="/"
          element={
            currentProfileId ? <HomeRoute /> : <Navigate to="/onboarding" replace />
          }
        />
        <Route
          path="/capture"
          element={
            currentProfileId ? (
              <CaptureMealRoute />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          }
        />
        <Route
          path="/manual"
          element={
            currentProfileId ? (
              <ManualEntryRoute />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          }
        />
        <Route
          path="/meals"
          element={
            currentProfileId ? <MealsRoute /> : <Navigate to="/onboarding" replace />
          }
        />
        <Route
          path="/meals/:mealId"
          element={
            currentProfileId ? (
              <MealDetailRoute />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          }
        />
        <Route
          path="/settings"
          element={
            currentProfileId ? (
              <SettingsRoute />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          }
        />
        <Route
          path="/profile"
          element={
            currentProfileId ? (
              <ProfileRoute />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MobileShell>
  )
}
