export type TourRole = 'user' | 'ob'
export const tourPreferenceKey = (userId: string, role: TourRole) => `makanmana:tour:v1:${role}:${userId}`
export function isTourHidden(userId: string, role: TourRole): boolean {
  try { return localStorage.getItem(tourPreferenceKey(userId, role)) === 'hidden' }
  catch { return false }
}
export function saveTourPreference(userId: string, role: TourRole, hidden: boolean): boolean {
  try {
    if (hidden) localStorage.setItem(tourPreferenceKey(userId, role), 'hidden')
    else localStorage.removeItem(tourPreferenceKey(userId, role))
    return true
  } catch { return false }
}
export interface TourStep { target: string; fallback?: string; title: string; description: string }
export const tourSteps: Record<TourRole, TourStep[]> = {
  user: [
    { target: 'user-search', title: 'Mau makan apa hari ini?', description: 'Cari makanan, minuman, atau camilan di sini. Kamu juga bisa memilih kategori di bawah untuk mempersempit pilihan.' },
    { target: 'user-inspiration', title: 'Butuh ide makan siang?', description: 'Ketuk Cari inspirasi untuk melihat pilihan teman kantor. Cocok saat kamu belum tahu mau pesan apa.' },
    { target: 'user-manual', title: 'Menu favoritmu belum ada?', description: 'Tulis sendiri nama makanan dan harganya lewat tombol ini. Pesanan manual juga bisa ditambahkan ke keranjang.' },
    { target: 'user-menu', title: 'Tambah menu dan simpan favorit', description: 'Ketuk Tambah untuk memasukkan menu ke keranjang. Gunakan tombol + dan − untuk mengatur jumlah, serta ikon hati untuk menyimpan menu di Favorit.' },
    { target: 'user-cart', fallback: 'user-menu', title: 'Catatan berbeda untuk tiap menu', description: 'Setelah menambahkan menu, tombol keranjang muncul di bagian bawah. Buka keranjang untuk mengatur jumlah dan menulis catatan khusus pada setiap menu, misalnya sambal dipisah atau es sedikit.' },
    { target: 'user-cart', fallback: 'user-menu', title: 'Periksa pembayaran sebelum pesan', description: 'Di keranjang, periksa menu dan totalnya, lalu pilih tunai atau transfer. Untuk transfer, pilih penerima dan unggah bukti pembayaran sebelum mengirim pesanan.' },
    { target: 'user-services', title: 'Ada layanan lain juga', description: 'Tarik duit membantu kamu mengajukan penarikan tunai lewat OB. Menu populer menampilkan menu yang sering dipesan teman kantor.' },
    { target: 'user-orders-nav', title: 'Pantau dan lihat riwayat pesanan', description: 'Pesanan aktif muncul di beranda. Setelah ditangani OB, buka pelacakan jika lokasi OB tersedia. Untuk pesanan sebelumnya, buka tab Pesanan ini.' },
    { target: 'user-settings', title: 'Panduan bisa dibuka lagi', description: 'Buka pengaturan akun lewat tombol ini, lalu pilih Panduan penggunaan. Centang Jangan tampilkan lagi jika sudah terbiasa. Hapus centangnya saat mengulang panduan jika ingin tur muncul lagi saat membuka aplikasi.' },
  ],
  ob: [
    { target: 'ob-queues', title: 'Ruang kerja OB yang lebih praktis', description: 'Pekerjaan dibagi menjadi Pesanan baru, Tugas saya, dan Pembayaran. Angka di setiap tab membantu kamu melihat apa yang perlu ditangani.' },
    { target: 'ob-new', title: 'Ambil pesanan dari antrean', description: 'Buka Pesanan baru. Periksa nama pemesan, menu, harga, dan catatannya, lalu ketuk Saya tangani pesanan ini. Pesanan akan berpindah ke Tugas saya.' },
    { target: 'ob-mine', title: 'Fokus pada tugas sendiri', description: 'Tugas saya berisi pesanan yang kamu tangani. Perhatikan catatan pada setiap menu. Jika perlu melepas tugas, pilih Kembalikan ke antrean pada pesanan.' },
    { target: 'ob-mine', title: 'Selesaikan setelah diterima', description: 'Setelah pemesan menerima makanannya, ketuk Pesanan sudah diterima. Salah menekan? Segera ketuk Urungkan pada notifikasi. Aturan otomatis selesai setelah 8 jam tetap berlaku.' },
    { target: 'ob-payment', title: 'Periksa sebelum konfirmasi', description: 'Di Pembayaran, buka bukti transfer dan cocokkan nominalnya sebelum menekan Transfer sudah sesuai. Untuk tunai, tekan Uang sudah diterima setelah menerima uang. Pesanan selesai yang belum dikonfirmasi tetap bisa ditinjau.' },
    { target: 'ob-tardut-nav', title: 'Tangani permintaan tarik duit', description: 'Buka Tarik duit untuk melihat dan menangani permintaan penarikan tunai. Angka pada navigasi menandakan adanya permintaan yang menunggu.' },
    { target: 'ob-more-nav', title: 'Riwayat, menu, dan panduan', description: 'Buka Lainnya untuk melihat riwayat dan mengelola menu. Untuk mengulang tur ini, pilih Pengaturan akun lalu Panduan penggunaan. Centang Jangan tampilkan lagi jika sudah terbiasa.' },
  ],
}

export interface TourRect { left: number; top: number; width: number; height: number }
// Keep the tooltip inside the mobile shell and visible viewport, including short screens.
export function positionTourCard(shell: TourRect, target: TourRect | null, cardHeight: number, viewport: TourRect) {
  const margin = 12
  const left = Math.max(viewport.left + margin, shell.left + margin)
  const width = Math.max(0, Math.min(shell.left + shell.width, viewport.left + viewport.width) - left - margin)
  let maxHeight = Math.max(0, viewport.height - margin * 2)
  if (target) {
    const belowRoom = viewport.top + viewport.height - margin - target.top - target.height - 16
    const aboveRoom = target.top - 16 - viewport.top - margin
    const available = Math.max(belowRoom, aboveRoom)
    if (available >= 220 && cardHeight > available) maxHeight = Math.min(maxHeight, available)
  }
  const height = Math.min(cardHeight, maxHeight)
  const minimumTop = viewport.top + margin
  const maximumTop = viewport.top + viewport.height - margin - height
  let top = viewport.top + (viewport.height - height) / 2
  let side: 'above' | 'below' | 'center' = 'center'
  if (target) {
    const below = target.top + target.height + 16
    const above = target.top - height - 16
    if (below <= maximumTop) { top = below; side = 'below' }
    else if (above >= minimumTop) { top = above; side = 'above' }
  }
  return { left, width, top: Math.max(minimumTop, Math.min(top, maximumTop)), maxHeight, side }
}
