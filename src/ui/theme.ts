export type UiTheme = 'light' | 'dark'

const STORAGE_UI_THEME = 'ai-nutritionist.uiTheme'

export function getUiTheme(): UiTheme {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_UI_THEME) : null
    if (raw === 'light' || raw === 'dark') return raw
  } catch {
    // ignore
  }

  return 'light'
}

export function setUiTheme(theme: UiTheme) {
  try {
    window.localStorage.setItem(STORAGE_UI_THEME, theme)
  } catch {
    // ignore
  }
}

export function applyUiTheme(theme: UiTheme) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  if (typeof document.body !== 'undefined' && document.body) {
    document.body.classList.toggle('dark', theme === 'dark')
  }
  root.style.colorScheme = theme
}

export function saveAndApplyUiTheme(theme: UiTheme) {
  setUiTheme(theme)
  applyUiTheme(theme)
}
