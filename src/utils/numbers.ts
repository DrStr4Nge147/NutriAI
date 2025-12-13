export function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function safeNumber(input: string, fallback: number) {
  const v = Number(input)
  return Number.isFinite(v) ? v : fallback
}
