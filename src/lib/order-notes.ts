export const MAX_ORDER_NOTE_LENGTH = 500

export function normalizeOrderNote(note?: string | null): string | null {
  const value = note?.trim() || ''
  if (value.length > MAX_ORDER_NOTE_LENGTH) throw new Error(`Catatan maksimal ${MAX_ORDER_NOTE_LENGTH} karakter.`)
  return value || null
}
