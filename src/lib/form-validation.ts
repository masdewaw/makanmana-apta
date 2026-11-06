/** Whole rupiah only. Shared discounts may be negative, food prices may not. */
export function isValidRupiah(value: string | number, allowNegative = false): boolean {
  if (String(value).trim() === '') return false
  const amount = Number(value)
  return Number.isSafeInteger(amount) && (allowNegative || amount > 0)
}

export function validateFood(name: string, price: string | number): string | null {
  if (!name.trim()) return 'Nama makanan wajib diisi.'
  if (!isValidRupiah(price)) return 'Harga harus berupa rupiah bulat lebih dari 0.'
  return null
}

export function validateImage(file: File | null): string | null {
  if (!file) return 'Pilih foto bukti terlebih dahulu.'
  if (!file.type.startsWith('image/')) return 'File harus berupa gambar.'
  if (file.size === 0) return 'File gambar kosong. Pilih foto lain.'
  if (file.size > 10 * 1024 * 1024) return 'Ukuran gambar maksimal 10 MB.'
  return null
}
