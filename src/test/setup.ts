import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'

if (typeof window !== 'undefined') {
  const anyLocalStorage = (globalThis as any).localStorage
  const looksValid =
    anyLocalStorage &&
    typeof anyLocalStorage.getItem === 'function' &&
    typeof anyLocalStorage.setItem === 'function' &&
    typeof anyLocalStorage.removeItem === 'function' &&
    typeof anyLocalStorage.clear === 'function'

  if (!looksValid) {
    const store = new Map<string, string>()
    const polyfill = {
      get length() {
        return store.size
      },
      clear() {
        store.clear()
      },
      getItem(key: string) {
        return store.has(String(key)) ? store.get(String(key))! : null
      },
      key(index: number) {
        return Array.from(store.keys())[index] ?? null
      },
      removeItem(key: string) {
        store.delete(String(key))
      },
      setItem(key: string, value: string) {
        store.set(String(key), String(value))
      },
    }

    Object.defineProperty(globalThis, 'localStorage', {
      value: polyfill,
      configurable: true,
      enumerable: true,
      writable: true,
    })
  }
}
