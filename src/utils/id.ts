export function newId(): string {
  const anyCrypto = globalThis.crypto as unknown as { randomUUID?: () => string } | undefined
  if (anyCrypto?.randomUUID) return anyCrypto.randomUUID()

  const rand = Math.random().toString(16).slice(2)
  const time = Date.now().toString(16)
  return `${time}-${rand}`
}
