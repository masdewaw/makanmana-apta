import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/button'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-900 min-h-screen w-full">
      <div className="relative mb-12">
        <div className="text-[120px] font-black text-white leading-none opacity-5 select-none">404</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-8xl animate-bounce">🙈</div>
        </div>
      </div>

      <h1 className="text-3xl font-black text-white mb-4 tracking-tight">Waduh! Nyasar ya?</h1>
      <p className="text-slate-400 font-medium mb-12 max-w-[280px] mx-auto">Halaman yang kamu cari tidak ditemukan atau mungkin sudah dipindah ke meja lain.</p>

      <div className="w-full space-y-4">
        <Button 
          onClick={() => navigate(-1)} 
          className="w-full h-16 rounded-2xl bg-slate-800 text-white font-black uppercase tracking-widest text-xs border border-slate-700 hover:bg-slate-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali Dulu
        </Button>
        <Button 
          onClick={() => navigate('/')} 
          className="w-full h-16 rounded-2xl bg-amber-500 text-slate-900 font-black uppercase tracking-widest text-xs hover:bg-amber-400 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" /> Ke Beranda 🍱
        </Button>
      </div>

    </div>
  )
}
