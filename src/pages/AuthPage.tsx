import { assertOnline } from '../lib/connectivity'
import { useOnline } from '../hooks/useOnline'
import { PwaInstallButton } from '../components/organisms/PwaProvider'
import { BrandLogo } from '../components/molecules/BrandLogo'
import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { FoodArt } from '../components/illustrations/FoodArt'
import { Eye, EyeOff } from 'lucide-react'

export default function AuthPage() {
  const online = useOnline()
  const [isLogin, setIsLogin] = useState(true)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!/^08\d{8,12}$/.test(phone.trim())) {
      toast.error('Nomor HP harus diawali 08 dan berisi 10 sampai 14 digit')
      return
    }

    if (!isLogin && !fullName.trim()) return toast.error('Nama lengkap wajib diisi.')
    if (!isLogin && password.length < 6) return toast.error('Password minimal 6 karakter.')

    // Virtual Email for Supabase Auth bypass
    const email = `${phone.trim()}@makanmana.com`

    setLoading(true)

    try {
      assertOnline()
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw new Error("Akses ditolak. Nomor HP atau password salah.")
      } else {
        const { error: signUpError, data } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: fullName.trim() } }
        })
        if (signUpError) throw new Error(signUpError.message)

        if (data.user) {
          toast.success('Pendaftaran berhasil! Silakan masuk.')
          setIsLogin(true)
          setPassword('')
        }
      }
    } catch (err: any) {
      console.error('[Auth Error]', err)

      if (err.message?.includes('rate limit')) {
        toast.error('Terlalu banyak percobaan pendaftaran. Mohon tunggu beberapa menit atau gunakan akun OB yang sudah tersedia.')
      } else if (err.message?.includes('Failed to fetch') || err.message?.includes('JSON')) {
        toast.error('Koneksi ke server gagal. Pastikan internet stabil atau coba beberapa saat lagi.')
      } else {
        toast.error(err.message || 'Terjadi kesalahan sistem.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page flex-1 flex flex-col">
      <div className="auth-hero">
        <BrandLogo />
        <PwaInstallButton />
        <div className="auth-food-scene"><span className="auth-orbit" /><FoodArt kind="meal" className="auth-meal" /><FoodArt kind="drink" className="auth-drink" /><span className="auth-star">✦</span></div>
        <p className="eyebrow">Teman istirahat di kantor</p>
        <h1>Makan enak.<br />Kerja lebih semangat.</h1>
        <p>Pesan favoritmu, biar OB yang antar.</p>
      </div>

      {/* Auth Form Container */}
      <div className="flex-1 px-7 pt-7 pb-8 flex flex-col">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">{isLogin ? 'Selamat datang kembali' : 'Kenalan dulu, yuk'}</h2>
          <p className="text-slate-500 text-sm mt-1">
            {isLogin ? 'Silakan masuk menggunakan nomor HP Anda.' : 'Lengkapi data di bawah untuk memesan makan!'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4 flex-1">
          {!isLogin && (
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold" htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                placeholder="Contoh: Budi Santoso"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={!isLogin}
                className="bg-slate-50 border-slate-200 h-12 rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-emerald-500 focus-visible:bg-white transition-all shadow-xs"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-slate-700 font-semibold" htmlFor="phone">Nomor handphone</Label>
            <Input
              id="phone"
              type="tel" autoComplete="tel"
              placeholder="08123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="bg-slate-50 border-slate-200 h-12 rounded-xl focus-visible:ring-emerald-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700 font-semibold" htmlFor="password">Kata sandi</Label>
            <div className="relative">
              <Input
                id="password" autoComplete={isLogin ? "current-password" : "new-password"}
                type={showPassword ? "text" : "password"}
                value={password}
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-50 border-slate-200 h-12 rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-emerald-500 focus-visible:bg-white transition-all shadow-xs pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} className="min-w-11 min-h-11 grid place-items-center absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 focus:outline-none transition-colors"

              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full mt-6 h-14 rounded-xl font-bold text-base shadow-lg shadow-emerald-500/20 bg-emerald-500 hover:bg-emerald-600 text-white" disabled={loading || !online}>
            {!online ? 'Hubungkan internet untuk masuk' : loading ? 'Memproses...' : (isLogin ? 'Masuk' : 'Buat akun')}
          </Button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            {isLogin ? 'Belum punya akun? ' : 'Sudah terdaftar? '}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setPhone(''); setPassword(''); setFullName('') }}
              className="text-emerald-600 font-bold hover:text-emerald-700 hover:underline inline-flex"
            >
              {isLogin ? 'Daftar di sini' : 'Masuk di sini'}
            </button>
          </p>
        </div>
      </div>

      {/* Footer Credit */}
      <div className="py-5 text-center mt-2">
        <p className="text-[12px] font-semibold uppercase tracking-[0.3em] text-slate-400">Dibuat dengan sepenuh hati oleh Dewa</p>
      </div>
    </div>
  )
}
