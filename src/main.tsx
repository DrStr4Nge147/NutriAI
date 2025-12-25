import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './state/AppContext'
import { MealPhotoAnalysisProvider } from './state/MealPhotoAnalysisContext'
import { MealPlanAnalysisProvider } from './state/MealPlanAnalysisContext'
import { UiFeedbackProvider } from './state/UiFeedbackContext'
import { registerServiceWorker } from './pwa/registerServiceWorker'
import { initReminderScheduler } from './notifications/reminders'
import { applyUiTheme, getUiTheme } from './ui/theme'
import './index.css'

applyUiTheme(getUiTheme())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <UiFeedbackProvider>
        <AppProvider>
          <MealPhotoAnalysisProvider>
            <MealPlanAnalysisProvider>
              <App />
            </MealPlanAnalysisProvider>
          </MealPhotoAnalysisProvider>
        </AppProvider>
      </UiFeedbackProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

void registerServiceWorker()
initReminderScheduler()
