export const OFFLINE_MESSAGE = 'Kamu sedang offline. Sambungkan internet lalu coba lagi. Keranjangmu tetap tersimpan.'
export function assertOnline() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error(OFFLINE_MESSAGE)
}
