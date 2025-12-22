import { describe, expect, it, beforeEach, vi } from 'vitest'
import { applyUiTheme, getUiTheme, saveAndApplyUiTheme } from './theme'

describe('ui/theme', () => {
  beforeEach(() => {
    document.documentElement.className = ''
    document.documentElement.removeAttribute('style')
    window.localStorage.clear()
    ;(window as any).matchMedia = undefined
  })

  it('getUiTheme returns stored theme when present', () => {
    window.localStorage.setItem('ai-nutritionist.uiTheme', 'dark')
    expect(getUiTheme()).toBe('dark')

    window.localStorage.setItem('ai-nutritionist.uiTheme', 'light')
    expect(getUiTheme()).toBe('light')
  })

  it('getUiTheme falls back to prefers-color-scheme when no stored theme', () => {
    const matchMediaMock = vi.fn().mockReturnValue({ matches: true })
    ;(window as any).matchMedia = matchMediaMock

    expect(getUiTheme()).toBe('dark')
    expect(matchMediaMock).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
  })

  it('getUiTheme falls back to light when no stored theme and no matchMedia', () => {
    expect(getUiTheme()).toBe('light')
  })

  it('applyUiTheme toggles the root dark class and color-scheme', () => {
    applyUiTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')

    applyUiTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  it('saveAndApplyUiTheme persists and applies theme', () => {
    saveAndApplyUiTheme('dark')
    expect(window.localStorage.getItem('ai-nutritionist.uiTheme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })
})
