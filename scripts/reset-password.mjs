#!/usr/bin/env node
// Local admin utility. Never import this file from the web application.
import { createClient } from '@supabase/supabase-js'
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

if (process.argv.includes('--help')) {
  console.log('Jalankan: node scripts/reset-password.mjs\nIkuti pertanyaan di terminal. Tidak menyimpan kunci admin atau password ke file. Tidak mengirim email.')
  process.exit(0)
}
if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error('Jalankan langsung di terminal interaktif, bukan lewat pipe atau redirect.')
  process.exit(1)
}
let muted = false
const output = new Writable({ write(chunk, encoding, done) {
  if (!muted) process.stdout.write(chunk, encoding)
  done()
} })
const rl = createInterface({ input: process.stdin, output, terminal: true })
rl.on('SIGINT', () => { muted = false; console.log('\nDibatalkan.'); rl.close(); process.exit(130) })
async function secret(label) {
  process.stdout.write(label)
  muted = true
  try { return await rl.question('') }
  finally { muted = false; process.stdout.write('\n') }
}
let defaultUrl = process.env.VITE_SUPABASE_URL || ''
try { defaultUrl ||= parseEnv(readFileSync(new URL('../.env', import.meta.url), 'utf8')).VITE_SUPABASE_URL || '' } catch {}

try {
  console.log('Reset password MakanMana. Tidak ada akun yang berubah sebelum konfirmasi terakhir.\n')
  const url = (await rl.question(`Project URL${defaultUrl ? ` [Enter untuk ${defaultUrl}]` : ''}: `)).trim() || defaultUrl
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw Error('Project URL harus berupa URL HTTPS Supabase.')
  const uid = (await rl.question('User UID dari Authentication → Users: ')).trim()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)) throw Error('User UID tidak valid. Salin UID, bukan nomor HP atau email.')
  let key = (await secret('Kunci admin service_role / secret key (tidak terlihat saat diketik): ')).trim()
  if (!key || key.startsWith('sb_publishable_')) throw Error('Gunakan kunci admin, bukan anon atau publishable key.')
  if (key.split('.').length === 3) {
    try { if (JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon') throw Error('anon') }
    catch (error) { if (error.message === 'anon') throw Error('Kunci anon tidak bisa digunakan untuk reset password.') }
  }
  const admin = createClient(parsed.origin, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  key = ''
  const { data, error: lookupError } = await admin.auth.admin.getUserById(uid)
  if (lookupError) throw lookupError
  const email = data.user?.email
  if (!email || !/^08\d{8,12}@makanmana\.com$/.test(email)) throw Error('Akun ini bukan akun nomor HP MakanMana. Reset dibatalkan.')
  console.log(`\nAkun tujuan: ${email}\nUID: ${uid}\nPastikan pemohon memang pemilik akun ini.\n`)
  let password = await secret('Password sementara baru, minimal 8 karakter (tidak terlihat): ')
  if (password.length < 8) throw Error('Password sementara minimal 8 karakter.')
  if (password !== await secret('Ulangi password sementara: ')) throw Error('Kedua password tidak sama. Belum ada perubahan.')
  const confirmation = (await rl.question(`Untuk mengganti password, ketik ulang email akun: `)).trim()
  if (confirmation !== email) { console.log('Dibatalkan. Tidak ada perubahan akun.'); process.exitCode = 1 }
  else {
    const { error } = await admin.auth.admin.updateUserById(uid, { password })
    password = ''
    if (error) throw error
    console.log('\nBerhasil mengganti password akun tersebut. Riwayat pesanan tidak dihapus.\nSampaikan password sementara lewat chat pribadi, lalu minta pengguna menggantinya melalui Pengaturan → Ganti Password.')
  }
} catch (error) {
  console.error(`\nReset tidak dapat dikonfirmasi berhasil: ${error.message || 'Terjadi kesalahan.'}\nJika koneksi terputus saat penyimpanan, periksa hasilnya sebelum mencoba lagi.`)
  process.exitCode = 1
} finally { rl.close() }
