export function hashStringFNV1a32(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  // unsigned 32-bit hex
  return (hash >>> 0).toString(16).padStart(8, '0')
}
