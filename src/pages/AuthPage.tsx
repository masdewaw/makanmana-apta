import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Eye, EyeOff } from 'lucide-react'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phone.startsWith('08')) {
      toast.error('Nomor handphone harus diawali dengan 08')
      return
    }
    
    // Virtual Email for Supabase Auth bypass
    const email = `${phone}@makanmana.com`
    
    setLoading(true)
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw new Error("Akses ditolak. Nomor HP atau password salah.")
      } else {
        const { error: signUpError, data } = await supabase.auth.signUp({ 
          email, 
          password 
        })
        if (signUpError) throw new Error(signUpError.message)
        
        if (data.user) {
          // Create profile
          const { error: profileError } = await supabase.from('profiles').insert([
            { id: data.user.id, name: fullName }
          ])
          if (profileError) throw profileError
          
          toast.success('Pendaftaran berhasil! Silakan masuk.')
          setIsLogin(true)
          setPassword('')
        }
      }
    } catch (err: any) {
      if (err.message?.includes('rate limit')) {
        toast.error('Terlalu banyak percobaan pendaftaran. Mohon tunggu beberapa menit atau gunakan akun OB yang sudah tersedia.')
      } else {
        toast.error(err.message || 'Terjadi kesalahan sistem.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* App Launch Header Graphic */}
      <div className="bg-amber-500 rounded-b-[40px] pt-20 pb-12 px-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4">
           <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor"><path d="M11 20A7 7 0 0 1 4 13v-3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a7 7 0 0 1-7 7Zm-4-8V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v8"/><path d="M12 2v3"/><path d="M8 5v2"/><path d="M16 5v2"/></svg>
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="bg-white p-4 rounded-full shadow-xl mb-4">
            <span className="text-4xl leading-none block">🍔</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">MakanMana Office</h1>
          <p className="text-amber-100/90 text-sm font-medium mt-1">Cepat, Praktis, Kenyang!</p>
        </div>
      </div>

      {/* Auth Form Container */}
      <div className="flex-1 px-8 pt-8 pb-12 flex flex-col">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">{isLogin ? 'Selamat Datang Kembali! 👋' : 'Daftar Akun Baru 🚀'}</h2>
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
                className="bg-slate-50 border-slate-200 h-12 rounded-xl focus-visible:ring-amber-500"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-slate-700 font-semibold" htmlFor="phone">Nomor Hanphone</Label>
            <Input 
              id="phone" 
              type="tel" 
              placeholder="08123456789" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="bg-slate-50 border-slate-200 h-12 rounded-xl focus-visible:ring-amber-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700 font-semibold" htmlFor="password">Password</Label>
            <div className="relative">
              <Input 
                id="password" 
                type={showPassword ? "text" : "password"} 
                value={password}
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-50 border-slate-200 h-12 rounded-xl focus-visible:ring-amber-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-600 focus:outline-none transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          
          <Button type="submit" size="lg" className="w-full mt-6 h-14 rounded-xl font-bold text-base shadow-lg shadow-amber-500/20 bg-amber-500 hover:bg-amber-600 text-white" disabled={loading}>
            {loading ? 'Memproses...' : (isLogin ? 'Masuk Sekarang' : 'Daftar Sekarang')}
          </Button>
        </form>
        
        <div className="mt-8 text-center pt-6 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            {isLogin ? 'Belum punya akun? ' : 'Sudah terdaftar? '}
            <button 
              type="button" 
              onClick={() => { setIsLogin(!isLogin); setPhone(''); setPassword(''); setFullName('') }}
              className="text-amber-600 font-bold hover:text-amber-700 hover:underline inline-flex"
            >
              {isLogin ? 'Daftar di sini' : 'Masuk di sini'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
