import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './state/AppContext'
import { UiFeedbackProvider } from './state/UiFeedbackContext'
import { registerServiceWorker } from './pwa/registerServiceWorker'
import { initReminderScheduler } from './notifications/reminders'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <UiFeedbackProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </UiFeedbackProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

void registerServiceWorker()
initReminderScheduler()
