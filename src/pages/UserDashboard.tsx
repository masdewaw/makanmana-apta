import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { LogOut, CheckCircle, MapPin, Search, ChevronRight, Star, ShoppingBag, Trash2, CreditCard, Wallet, Plus, Copy, Heart } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '../components/ui/drawer'

export type Menu = { id: string; food_name: string; price: number; category: string }
export type Order = { id: string; food_name: string; price: number; created_at: string; order_status: string; payment_method: string; payment_status: string; catatan: string | null; profiles?: { name: string }; assigned_to_ob?: string }
export type TardutRequest = { id: string; user_id: string; amount: number; proof_url: string; status: string; created_at: string; profiles?: { name: string }; assigned_to_ob?: string }

import TrackingMap from '../components/TrackingMap'
import { Banknote, Camera, Check } from 'lucide-react'

function OrderCard({ order, formatRupiah, onTrack }: { order: Order; formatRupiah: (n: number) => string, onTrack?: (ob: string) => void }) {
  const isAutoDone = new Date().getTime() - new Date(order.created_at).getTime() > 24 * 60 * 60 * 1000
  const displayStatus = isAutoDone ? 'done' : order.order_status

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div className="h-1.5 w-full bg-slate-100">
        {displayStatus === 'waiting' && <div className="h-full bg-amber-500 w-1/3 animate-pulse rounded-r-full" />}
        {displayStatus === 'done' && <div className="h-full bg-green-500 w-full" />}
      </div>
      <div className="p-4 flex items-center justify-between">
        <div className="flex-1 min-w-0 pr-4">
          <h4 className="font-bold text-slate-800 text-sm truncate">{order.food_name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded uppercase">{order.payment_method}</span>
            <span className="text-xs text-slate-500 font-medium">{formatRupiah(order.price)}</span>
          </div>
          {order.catatan && (
            <p className="text-[10px] text-amber-600 font-medium mt-2 bg-amber-50/50 p-1.5 rounded-lg border border-amber-100/50 italic flex items-start gap-1">
              <span className="shrink-0">📝</span> {order.catatan}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end shrink-0">
          {displayStatus === 'waiting' ? (
            <div className="flex flex-col items-end">
              <span className="text-amber-600 font-black text-[10px] bg-amber-50 px-2 py-1 rounded-full border border-amber-100 uppercase tracking-tight">Proses OB</span>
              <span className="text-[9px] text-slate-400 mt-1 font-medium italic">Sabar ya...</span>
            </div>
          ) : (
            <span className="text-green-600 font-black text-[10px] bg-green-50 px-2 py-1 rounded-full border border-green-100 uppercase tracking-tight flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Selesai
            </span>
          )}
        </div>
      </div>
      {displayStatus === 'waiting' && order.assigned_to_ob && (
        <div className="px-4 pb-4">
           <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onTrack?.(order.assigned_to_ob!)}
            className="h-8 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 hover:bg-amber-100 flex items-center gap-2 w-full justify-center transition-all active:scale-95 border border-amber-200/50"
          >
            <MapPin className="w-3 h-3" /> Pantau Lokasi {order.assigned_to_ob}
          </Button>
        </div>
      )}
    </div>
  )
}

export default function UserDashboard({ session }: { session: Session }) {
  const [profileName, setProfileName] = useState('')
  const [role, setRole] = useState('user')
  const [menus, setMenus] = useState<Menu[]>([])
  const [recommendation, setRecommendation] = useState<Menu | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'home' | 'riwayat'>('home')
  const [communityOrders, setCommunityOrders] = useState<any[]>([])
  const [isCommunityDrawerOpen, setIsCommunityDrawerOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('Semua')
  const [dbCategories, setDbCategories] = useState<string[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  
  const categories = ['Semua', '🌟 Favoritku', ...dbCategories]
  
  // Cart state
  const [cart, setCart] = useState<Menu[]>([])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [catatan, setCatatan] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('transfer')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)

  // Manual entry state
  const [isManualDrawerOpen, setIsManualDrawerOpen] = useState(false)
  const [manualFoodName, setManualFoodName] = useState('')
  const [manualFoodPrice, setManualFoodPrice] = useState('')
  const [trackingOb, setTrackingOb] = useState<string | null>(null)
  
  // Tardut state
  const [isTardutDrawerOpen, setIsTardutDrawerOpen] = useState(false)
  const [tardutAmount, setTardutAmount] = useState<number | null>(null)
  const [customTardutAmount, setCustomTardutAmount] = useState('')
  const [tardutProofFile, setTardutProofFile] = useState<File | null>(null)
  const [isSubmittingTardut, setIsSubmittingTardut] = useState(false)
  const tardutFileInputRef = useRef<HTMLInputElement>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProfile()
    fetchMenus()
    fetchOrders()
    fetchCommunityOrders()
    fetchCategories()
    fetchFavorites()

    // Real-time subscription for this user's orders
    const channel = supabase
      .channel(`public:orders:user:${session.user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders',
        filter: `user_id=eq.${session.user.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setOrders(current => [payload.new as Order, ...current])
        } else if (payload.eventType === 'UPDATE') {
          setOrders(current => current.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o))
        } else if (payload.eventType === 'DELETE') {
          setOrders(current => current.filter(o => o.id !== payload.old.id))
        }
      })
      .subscribe()

    // Real-time for community inspiration feed
    const communityChannel = supabase
      .channel('public:orders:all')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'orders' 
      }, async (payload) => {
        // We refetch to get the profile name (since it's not in the payload)
        const { data, error } = await supabase
          .from('orders')
          .select('*, profiles(name)')
          .eq('id', payload.new.id)
          .single()
        
        if (data && !error) {
          setCommunityOrders(current => [data, ...current].slice(0, 10))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(communityChannel)
    }
  }, [session.user.id])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('name')
      .order('name', { ascending: true })
    if (data) setDbCategories(data.map(c => c.name))
  }

  const fetchFavorites = async () => {
    const { data } = await supabase
      .from('favorites')
      .select('menu_id')
      .eq('user_id', session.user.id)
    if (data) setFavorites(data.map(f => f.menu_id))
  }

  const fetchCommunityOrders = async () => {
    // Get last 50 orders from last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('orders')
      .select('*, profiles(name)')
      .gt('created_at', twoHoursAgo)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setCommunityOrders(data)
  }

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (data) {
      setProfileName(data.name)
      setRole(data.role)
    }
  }

  const fetchMenus = async () => {
    const { data } = await supabase.from('menus').select('*')
    if (data) {
      setMenus(data)
      if (data.length > 0) {
        const random = data[Math.floor(Math.random() * data.length)]
        setRecommendation(random)
      }
    }
  }

  const fetchOrders = async () => {
    // 5 hari kerja (kurang lebih 7 hari kalender)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
    if (data) setOrders(data)
  }

  const toggleCart = (menu: Menu) => {
    setCart(prev => {
      const exists = prev.find(item => item.id === menu.id)
      if (exists) {
        return prev.filter(item => item.id !== menu.id)
      } else {
        return [...prev, menu]
      }
    })
  }

  const handleToggleFavorite = async (e: React.MouseEvent, menuId: string) => {
    e.stopPropagation() // Prevent adding to cart when clicking heart
    const isFavorite = favorites.includes(menuId)
    
    // Optimistic update
    if (isFavorite) {
      setFavorites(prev => prev.filter(id => id !== menuId))
      await supabase.from('favorites').delete().eq('user_id', session.user.id).eq('menu_id', menuId)
      toast.success("Dihapus dari favorit!")
    } else {
      setFavorites(prev => [...prev, menuId])
      await supabase.from('favorites').insert({ user_id: session.user.id, menu_id: menuId })
      toast.success("Ditambahkan ke favorit!")
    }
  }

  const handleAddToCartManual = () => {
    if (!manualFoodName || !manualFoodPrice) {
      toast.error("Nama dan harga harus diisi!")
      return
    }
    const newItem: Menu = {
      id: `manual-${Date.now()}`,
      food_name: manualFoodName,
      price: Number(manualFoodPrice),
      category: 'Lainnya'
    }
    setCart(prev => [...prev, newItem])
    setManualFoodName('')
    setManualFoodPrice('')
    setIsManualDrawerOpen(false)
    toast.success("Ditambahkan ke keranjang!")
  }

  const handleLogout = async () => {
    if (window.confirm("Apakah Anda yakin ingin keluar?")) {
      await supabase.auth.signOut()
    }
  }

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      toast.error("Keranjang kosong!")
      return
    }

    if (paymentMethod === 'transfer' && !proofFile) {
      toast.error("Mohon upload bukti transfer")
      return
    }

    setIsPlacingOrder(true)
    try {
      let proofUrl = null
      if (proofFile) {
        const fileExt = proofFile.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${session.user.id}/${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(filePath, proofFile)
        
        if (uploadError) throw uploadError
        
        const { data: { publicUrl } } = supabase.storage.from('payment-proofs').getPublicUrl(filePath)
        proofUrl = publicUrl
      }

      // Batch insert orders
      const orderRecords = cart.map(item => ({
        user_id: session.user.id,
        food_name: item.food_name,
        price: item.price,
        payment_method: paymentMethod,
        payment_status: 'pending',
        order_status: 'waiting',
        proof_url: proofUrl,
        catatan: catatan || null
      }))

      const { error: orderErr } = await supabase.from('orders').insert(orderRecords)
      
      if (orderErr) throw orderErr
      
      setCart([])
      setCatatan('')
      setProofFile(null)
      fetchOrders()
      
      toast.success(`${cart.length} Pesanan berhasil dibuat!`)
      setIsDrawerOpen(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsPlacingOrder(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} disalin ke clipboard!`)
  }

  const getRelativeTime = (dateString: string) => {
    const now = new Date()
    const past = new Date(dateString)
    const diffInMs = now.getTime() - past.getTime()
    const diffInMins = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))

    if (diffInMins < 1) return "Baru saja"
    if (diffInMins < 60) return `${diffInMins} menit lalu`
    if (diffInHours < 24) return `${diffInHours} jam lalu`
    return "Kemarin"
  }

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number)
  }

  const handleSubmitTardut = async () => {
    const finalAmount = tardutAmount || Number(customTardutAmount)
    if (!finalAmount || finalAmount <= 0) {
      toast.error("Pilih atau masukkan nominal yang valid")
      return
    }

    if (!tardutProofFile) {
      toast.error("Mohon upload bukti transfer ke OB")
      return
    }

    setIsSubmittingTardut(true)
    try {
      // 1. Upload proof
      const fileExt = tardutProofFile.name.split('.').pop()
      const fileName = `tardut-${Math.random()}.${fileExt}`
      const filePath = `${session.user.id}/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, tardutProofFile)
      
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage.from('payment-proofs').getPublicUrl(filePath)

      // 2. Insert request
      const { error: tardutErr } = await supabase.from('tardut_requests').insert({
        user_id: session.user.id,
        amount: finalAmount,
        proof_url: publicUrl,
        status: 'waiting'
      })

      if (tardutErr) throw tardutErr

      toast.success("Permintaan Tardut terkirim! Silakan tunggu OB.")
      setIsTardutDrawerOpen(false)
      setTardutAmount(null)
      setCustomTardutAmount('')
      setTardutProofFile(null)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmittingTardut(false)
    }
  }

  const totalPrice = cart.reduce((acc, item) => acc + item.price, 0)

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto w-full relative pb-32">
      {/* App Header */}
      <div className="bg-white px-5 pt-6 pb-4 shadow-sm z-10 sticky top-0">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-amber-100 p-2 rounded-full">
              <MapPin className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">Lokasi Pengantaran</p>
              <h2 className="text-sm font-bold tracking-tight text-slate-800 flex items-center">Kantor Utama <ChevronRight className="h-3 w-3 ml-1 text-slate-400"/></h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {role === 'OB' && (
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/admin'} className="text-xs h-8 font-bold text-amber-600 border-amber-200 bg-amber-50">
                Panel OB
              </Button>
            )}
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition p-1">
              <LogOut className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Cari makanan favoritmu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-100 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:text-sm transition-all"
          />
        </div>
      </div>

      <div className="p-5 space-y-6 flex-1">
        {activeTab === 'home' ? (
          <>
            {/* Header Welcome */}
            <div className="mb-2">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Halo, {profileName || 'Teman'}! 👋</h1>
              <p className="text-slate-500 font-medium">Lagi pengen makan apa hari ini?</p>
            </div>

            {/* Intip Pesanan CTA Card */}
            <div 
              onClick={() => setIsCommunityDrawerOpen(true)}
              className="bg-linear-to-br from-amber-500 to-orange-600 rounded-[32px] p-6 shadow-xl shadow-amber-500/20 relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
                <ShoppingBag className="w-32 h-32 text-white" />
              </div>
              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">LIVE INSPIRASI</span>
                  </div>
                  <h3 className="text-xl font-black text-white leading-tight mb-2">Bingung mau makan apa? 🤔</h3>
                  <p className="text-white/80 text-xs font-bold flex items-center gap-1.5">
                    Intip pesanan yang lain <ChevronRight className="w-4 h-4 bg-white/20 rounded-full p-0.5" />
                  </p>
                </div>
                <div className="w-16 h-16 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white/10">
                   🥘
                </div>
              </div>
              
              {communityOrders.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 overflow-hidden">
                   <div className="flex -space-x-2 shrink-0">
                      {communityOrders.slice(0, 3).map((o, idx) => (
                        <div key={idx} className="w-6 h-6 rounded-full bg-white border-2 border-amber-600 flex items-center justify-center text-[8px] font-black text-amber-700">
                          {o.profiles?.name?.[0]}
                        </div>
                      ))}
                   </div>
                   <p className="text-[9px] font-black text-white/70 uppercase tracking-tighter truncate">
                      Lagi ada {communityOrders.length} orang jajan sekarang!
                   </p>
                </div>
              )}
            </div>

            {/* QUICK ACTIONS: Tardut */}
            <div className="grid grid-cols-1 gap-4">
               <div 
                  onClick={() => setIsTardutDrawerOpen(true)}
                  className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center gap-4 hover:border-amber-200 transition-all cursor-pointer group active:scale-95"
               >
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                    <Banknote className="w-6 h-6 text-amber-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-slate-800 text-sm tracking-tight">Tardut (Tarik Duit) 🚀</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nitip tarik tunai ke OB</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-amber-500 transition-colors" />
               </div>
            </div>

            {/* Pesanan Aktif (Top of Home) */}
            {orders.filter(o => o.order_status === 'waiting').length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                   <h3 className="font-bold text-slate-800 text-lg">Pesanan Aktif 🛵</h3>
                   <button onClick={() => setActiveTab('riwayat')} className="text-amber-600 text-xs font-bold px-2 py-1 bg-amber-50 rounded-lg">Lihat Semua</button>
                </div>
                <div className="space-y-3">
                  {orders.filter(o => o.order_status === 'waiting').slice(0, 2).map(order => (
                    <OrderCard key={order.id} order={order} formatRupiah={formatRupiah} onTrack={setTrackingOb} />
                  ))}
                </div>
              </div>
            )}

            {/* Recommendation */}
            {recommendation && (
              <div>
                <h3 className="font-bold text-slate-800 mb-3 text-lg">Pilihan Spesial! 🌟</h3>
                <div 
                  onClick={() => toggleCart(recommendation)}
                  className={`rounded-3xl p-6 text-white shadow-xl relative overflow-hidden cursor-pointer transition-all active:scale-95 ${cart.some(c => c.id === recommendation.id) ? 'bg-linear-to-br from-amber-600 to-orange-700 ring-4 ring-amber-500/30' : 'bg-linear-to-br from-amber-500 to-orange-500'}`}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4">
                    <Star className="h-32 w-32" fill="currentColor" />
                  </div>
                  {cart.some(c => c.id === recommendation.id) && (
                    <div className="absolute top-6 right-6 bg-white text-amber-600 p-1.5 rounded-full shadow-2xl z-10 animate-in zoom-in-50 duration-300">
                      <CheckCircle className="h-7 w-7" />
                    </div>
                  )}
                  <p className="text-amber-100 font-black text-[10px] mb-2 uppercase tracking-[0.2em]">Chef's Special Recommendation</p>
                  <h2 className="text-2xl font-black drop-shadow-md leading-tight max-w-[80%]">{recommendation.food_name}</h2>
                  <div className="flex items-center gap-2 mt-4">
                    <p className="font-black text-slate-900 bg-white px-4 py-1.5 rounded-2xl text-base shadow-lg">{formatRupiah(recommendation.price)}</p>
                    <span className="text-xs font-bold text-amber-50">Klik untuk pilih</span>
                  </div>
                </div>
              </div>
            )}

            {/* Category Chips */}
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-5 px-5">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 px-6 py-3 rounded-full text-xs font-black transition-all border ${selectedCategory === cat ? 'bg-amber-500 border-amber-600 text-white shadow-lg shadow-amber-500/20 scale-105' : 'bg-white border-slate-100 text-slate-500 hover:border-amber-200'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Menu Tersedia (Grid) */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 text-lg">Pilihan Menu 🥙</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Tambah Manual Button Card - TOP POSITION */}
                <div 
                  onClick={() => setIsManualDrawerOpen(true)}
                  className="rounded-[32px] p-5 border-2 border-dashed border-amber-200 bg-amber-50/30 flex flex-col items-center justify-center text-center gap-2 cursor-pointer active:scale-95 transition-all group hover:bg-amber-50 hover:border-amber-400 min-h-[160px]"
                >
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-amber-500 group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6" />
                  </div>
                  <p className="text-[10px] font-black text-amber-700 leading-tight uppercase tracking-tight">Ketik Menu<br/>Manual ✏️</p>
                </div>

                {menus
                  .filter(m => {
                    const matchSearch = (m.food_name || '').toLowerCase().includes((searchQuery || '').toLowerCase())
                    const matchCat = selectedCategory === 'Semua' 
                                  || (selectedCategory === '🌟 Favoritku' && favorites.includes(m.id))
                                  || m.category === selectedCategory
                    return searchQuery ? matchSearch : matchCat
                  })
                  .map(m => {
                    const isInCart = cart.some(c => c.id === m.id)
                    return (
                      <div 
                        key={m.id} 
                        onClick={() => toggleCart(m)}
                        className={`rounded-[32px] p-4 border shadow-sm active:scale-95 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden min-h-[160px] group ${isInCart ? 'border-amber-500 bg-amber-50 ring-4 ring-amber-500/10' : 'bg-white border-slate-100 hover:border-amber-200 hover:shadow-md'}`}
                      >
                        {isInCart && (
                          <div className="absolute top-0 right-0 p-3 bg-amber-500 text-white rounded-bl-[20px] shadow-lg animate-in zoom-in-50 duration-200">
                            <CheckCircle className="h-4 w-4" />
                          </div>
                        )}
                        <div className="absolute top-0 left-0 p-3 z-10">
                           <button 
                             onClick={(e) => handleToggleFavorite(e, m.id)}
                             className={`p-1.5 rounded-full backdrop-blur-sm transition-all shadow-sm ${favorites.includes(m.id) ? 'bg-pink-50 text-pink-500' : 'bg-white/50 text-slate-300 hover:text-pink-400 hover:bg-white'}`}
                           >
                              <Heart className={`w-4 h-4 ${favorites.includes(m.id) ? 'fill-pink-500' : ''}`} />
                           </button>
                        </div>
                        
                        <div>
                          <div className={`w-12 h-12 rounded-2xl mb-3 flex items-center justify-center text-2xl transition-transform group-hover:rotate-12 ${isInCart ? 'bg-white shadow-sm' : 'bg-slate-50'}`}>
                            {m.category === 'Minuman' ? '🥤' : m.category === 'Dkriuk' ? '🍗' : m.category === 'Nasi Padang' ? '🍛' : m.category === 'Texeo' ? '🌯' : '🍱'}
                          </div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">
                            {m.category || 'LAINNYA'}
                          </span>
                          <h4 className="font-black text-xs text-slate-800 leading-tight tracking-tight line-clamp-2">{m.food_name}</h4>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3">
                           <p className="text-slate-900 font-black text-sm">{formatRupiah(m.price)}</p>
                           <div className={`text-[10px] font-black uppercase tracking-tighter ${isInCart ? 'text-amber-600' : 'text-slate-300'}`}>
                              {isInCart ? 'HAPUS' : 'PILIH'}
                           </div>
                        </div>
                      </div>
                    )
                  })
                }
              </div>
            </div>
          </>
        ) : (
          /* Riwayat View */
          <div className="space-y-6 pb-20">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-1">Riwayat Makan 🕰️</h1>
              <p className="text-slate-500 font-medium">List semua jajan yang pernah kamu pesan.</p>
              <div className="mt-3 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                <span className="text-lg">ℹ️</span>
                Riwayat hanya menampilkan pesanan dalam 5 hari kerja terakhir (mingguan).
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-16 px-6 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">📭</div>
                <p className="font-black text-slate-800 text-lg">Wah, masih kosong nih!</p>
                <p className="text-sm text-slate-400 mt-2 font-medium">Belum ada riwayat pesanan. Yuk mulai jajan sekarang!</p>
                <Button 
                  onClick={() => setActiveTab('home')}
                  className="mt-6 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl px-8 h-12"
                >
                  Mulai Pesan
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.filter(o => o.order_status === 'waiting' || (new Date().getTime() - new Date(o.created_at).getTime() < 24 * 60 * 60 * 1000)).map(order => (
                  <OrderCard key={order.id} order={order} formatRupiah={formatRupiah} onTrack={setTrackingOb} />
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Footer Credit */}
        <div className="py-10 text-center opacity-30">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Application Created by Dewa</p>
        </div>
      </div>

      {/* Floating Cart Bar */}
      {cart.length > 0 && activeTab === 'home' && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 z-40 animate-in slide-in-from-bottom-10 duration-300">
          <div 
            onClick={() => setIsDrawerOpen(true)}
            className="bg-black text-white p-4 rounded-[28px] shadow-2xl flex items-center justify-between cursor-pointer active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="bg-amber-500 p-2 rounded-2xl relative">
                <ShoppingBag className="h-6 w-6" />
                <span className="absolute -top-2 -right-2 bg-white text-black text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-black">
                  {cart.length}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Keranjang Kamu</p>
                <p className="text-base font-black">{formatRupiah(totalPrice)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-amber-400 pr-2">
              Lanjut <ChevronRight className="h-5 w-5" />
            </div>
          </div>
        </div>
      )}

      {/* Modern Navigation Bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/80 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center pt-3 pb-8 px-8 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === 'home' ? 'text-amber-600 scale-110' : 'text-slate-400 opacity-60'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${activeTab === 'home' ? 'bg-amber-50' : ''}`}>
            <Star className={`w-6 h-6 ${activeTab === 'home' ? 'fill-amber-600' : ''}`} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Jajan</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('riwayat')}
          className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === 'riwayat' ? 'text-amber-600 scale-110' : 'text-slate-400 opacity-60'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${activeTab === 'riwayat' ? 'bg-amber-50' : ''}`}>
            <ShoppingBag className={`w-6 h-6 ${activeTab === 'riwayat' ? 'fill-amber-600' : ''}`} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Riwayat</span>
        </button>
      </div>

      {/* Manual Entry Drawer */}
      <Drawer open={isManualDrawerOpen} onOpenChange={setIsManualDrawerOpen}>
        <DrawerContent className="max-w-[430px] mx-auto rounded-t-[40px] px-6 pb-10 border-0 shadow-2xl">
          <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mt-4 mb-4" />
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-2xl font-black text-slate-800">Menu Manual 🥘</DrawerTitle>
            <DrawerDescription className="text-slate-500 font-medium">Input makanan baru yang belum ada di daftar.</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Nama Makanan</Label>
              <Input 
                placeholder="Contoh: Nasi Gila Kebon Sirih" 
                value={manualFoodName}
                onChange={(e) => setManualFoodName(e.target.value)}
                className="rounded-2xl h-14 bg-slate-50 border-slate-100 focus:bg-white transition-all text-base font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Estimasi Harga (Rp)</Label>
              <Input 
                type="number"
                placeholder="Contoh: 15000" 
                value={manualFoodPrice}
                onChange={(e) => setManualFoodPrice(e.target.value)}
                className="rounded-2xl h-14 bg-slate-50 border-slate-100 focus:bg-white transition-all text-base font-bold"
              />
            </div>
          </div>

          <DrawerFooter className="px-0 pt-2">
            <Button 
               onClick={handleAddToCartManual} 
               className="w-full h-16 rounded-3xl bg-slate-900 text-white font-black text-lg shadow-2xl active:scale-95 transition-all"
            >
              TAMBAHKAN KE KERANJANG
            </Button>
            <Button variant="ghost" onClick={() => setIsManualDrawerOpen(false)} className="w-full h-12 text-slate-400 font-bold">Batal</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Checkout Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="max-w-[430px] mx-auto rounded-t-[40px] px-6 pb-10 border-0 shadow-2xl">
          <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mt-4 mb-4" />
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-2xl font-black text-slate-800 text-center">Konfirmasi Jajan 🛍️</DrawerTitle>
            <DrawerDescription className="text-center font-bold text-slate-400 uppercase tracking-widest text-[10px]">Periksa kembali pesananmu sebelum membayari</DrawerDescription>
          </DrawerHeader>

          <div className="mt-4 space-y-6 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide pb-4">
            {/* Cart Items List */}
            <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ml-1">Pesanan Anda</p>
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-sm shadow-sm group-hover:scale-110 transition-transform">🥡</div>
                      <p className="font-bold text-slate-700 text-sm">{item.food_name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                       <p className="font-black text-slate-900 text-sm">{formatRupiah(item.price)}</p>
                       <button onClick={() => toggleCart(item)} className="p-1 rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-px bg-slate-200 w-full my-5" />
              <div className="flex justify-between items-center">
                <p className="font-black text-slate-900">Total Bayar</p>
                <p className="text-xl font-black text-amber-600">{formatRupiah(totalPrice)}</p>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Metode Pembayaran</p>
              <div className="grid grid-cols-2 gap-4">
                 <div 
                   onClick={() => setPaymentMethod('cash')}
                   className={`p-4 rounded-[28px] border-2 cursor-pointer transition-all flex flex-col items-center gap-2 ${paymentMethod === 'cash' ? 'border-amber-500 bg-amber-50 shadow-md ring-2 ring-amber-500/10' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                 >
                    <div className={`p-2 rounded-xl ${paymentMethod === 'cash' ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
                       <Wallet className="w-6 h-6" />
                    </div>
                    <span className={`text-[11px] font-black uppercase tracking-widest ${paymentMethod === 'cash' ? 'text-amber-800' : 'text-slate-400'}`}>Tunai / COD</span>
                 </div>
                 <div 
                   onClick={() => setPaymentMethod('transfer')}
                   className={`p-4 rounded-[28px] border-2 cursor-pointer transition-all flex flex-col items-center gap-2 ${paymentMethod === 'transfer' ? 'border-amber-500 bg-amber-50 shadow-md ring-2 ring-amber-500/10' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                 >
                    <div className={`p-2 rounded-xl ${paymentMethod === 'transfer' ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
                       <CreditCard className="w-6 h-6" />
                    </div>
                    <span className={`text-[11px] font-black uppercase tracking-widest ${paymentMethod === 'transfer' ? 'text-amber-800' : 'text-slate-400'}`}>Transfer QRIS</span>
                 </div>
              </div>
            </div>

            {paymentMethod === 'transfer' && (
              <div className="space-y-4 bg-amber-50 p-6 rounded-[32px] border border-amber-100 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-start gap-4">
                   <div className="bg-white p-2 rounded-2xl shadow-sm text-2xl shrink-0">📸</div>
                   <div className="space-y-1">
                      <p className="font-black text-slate-800 text-xs">Informasi Pembayaran</p>
                      <p className="text-[10px] text-amber-700 font-medium leading-relaxed">Silakan transfer ke salah satu rekening OB di bawah ini:</p>
                   </div>
                </div>

                <div className="space-y-2">
                   <div className="bg-white/60 p-3 rounded-2xl border border-amber-200/50 flex justify-between items-center">
                      <div>
                         <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest">BCA - MISBAKHUL UMAM</p>
                         <p className="font-black text-slate-800 text-sm">2381149902</p>
                      </div>
                      <button onClick={() => copyToClipboard('2381149902', 'Nomor Rekening')} className="p-2 bg-white rounded-xl shadow-sm text-amber-600 active:scale-90 transition-all border border-amber-100">
                         <Copy className="w-4 h-4" />
                      </button>
                   </div>
                   <div className="bg-white/60 p-3 rounded-2xl border border-amber-200/50 flex justify-between items-center">
                      <div>
                         <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest">BCA - BERNADUS KOPONG KOREBIMA</p>
                         <p className="font-black text-slate-800 text-sm">0280248151</p>
                      </div>
                      <button onClick={() => copyToClipboard('0280248151', 'Nomor Rekening')} className="p-2 bg-white rounded-xl shadow-sm text-amber-600 active:scale-90 transition-all border border-amber-100">
                         <Copy className="w-4 h-4" />
                      </button>
                   </div>
                </div>

                <div className="h-px bg-amber-200/50 w-full" />

                <div className="space-y-2">
                   <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                      <p className="text-[9px] font-black text-amber-800 uppercase">Input Bukti Foto</p>
                   </div>
                   <Input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      className="hidden" 
                      accept="image/*"
                   />
                   <Button 
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full h-14 border-dashed border-2 rounded-2xl font-bold transition-all ${proofFile ? 'border-green-500 bg-green-50 text-green-700' : 'border-amber-300 bg-white text-amber-700 hover:bg-amber-50'}`}
                   >
                      {proofFile ? `✅ ${proofFile.name}` : 'Pilih Foto Bukti'}
                   </Button>
                </div>
              </div>
            )}

            {/* Catatan */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Catatan Tambahan (Opsional)</Label>
              <textarea 
                placeholder="Contoh: Ga pakai pedas, kecap dikit aja ya..." 
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full min-h-[100px] p-4 bg-slate-50 border border-slate-100 rounded-[28px] text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all font-medium placeholder:text-slate-300"
              />
            </div>
          </div>

          <DrawerFooter className="px-0 pt-6">
            <Button 
               onClick={handleSubmitOrder} 
               disabled={isPlacingOrder || cart.length === 0} 
               className="w-full h-16 rounded-3xl bg-slate-900 text-white font-black text-lg shadow-2xl shadow-slate-900/40 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isPlacingOrder ? (
                <div className="flex items-center gap-2">
                   <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                   Memproses...
                </div>
              ) : (
                `PESAN SEKARANG (${cart.length})`
              )}
            </Button>
            <Button variant="ghost" onClick={() => setIsDrawerOpen(false)} className="w-full h-12 text-slate-400 font-bold hover:text-slate-600">Terus Jajan Aja Dulu</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Community Inspiration Drawer */}
      <Drawer open={isCommunityDrawerOpen} onOpenChange={setIsCommunityDrawerOpen}>
        <DrawerContent className="max-w-[430px] mx-auto rounded-t-[32px] px-6 pb-8">
          <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mt-4 mb-4" />
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
              Intip Pesanan yang Lain 👀
            </DrawerTitle>
            <DrawerDescription className="text-slate-500 font-medium italic">
              "Hmm, temen-temen hari ini makan apa ya?"
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
            {communityOrders.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <p className="text-slate-400 font-bold">Belum ada pesanan masuk pagi ini...</p>
              </div>
            ) : (
              communityOrders.map((commOrder) => (
                <div 
                  key={commOrder.id}
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-4 h-4 bg-amber-100 rounded-full flex items-center justify-center text-[8px] font-black text-amber-700 uppercase">
                        {commOrder.profiles?.name?.[0] || '?'}
                      </div>
                      <span className="text-[10px] font-black text-slate-400 tracking-tighter uppercase truncate">
                        {commOrder.profiles?.name.split(' ')[0]} • {getRelativeTime(commOrder.created_at)}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">{commOrder.food_name}</h4>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => {
                        const menuMatch = menus.find(m => m.food_name === commOrder.food_name)
                        if (menuMatch) {
                          toggleCart(menuMatch)
                          toast.success(`Nyontek pesanan ${commOrder.profiles?.name.split(' ')[0]} dikit! 😂`)
                        } else {
                          const manualItem: Menu = {
                            id: `duplicate-${Date.now()}`,
                            food_name: commOrder.food_name,
                            price: commOrder.price,
                            category: 'Lainnya'
                          }
                          setCart(prev => [...prev, manualItem])
                          toast.success(`Nyontek pesanan ${commOrder.profiles?.name.split(' ')[0]} dikit! 😂`)
                        }
                    }}
                    className="h-8 rounded-xl bg-amber-500 text-white font-black text-[10px] shadow-sm hover:bg-amber-600 transition-all hover:scale-105 active:scale-95"
                  >
                    PESEN JUGA
                  </Button>
                </div>
              ))
            )}
          </div>

          <DrawerFooter className="px-0 pt-2">
            <Button onClick={() => setIsCommunityDrawerOpen(false)} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black text-base shadow-xl active:scale-95 transition-all">
              TUTUP ✅
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
       {/* Tracking Map Drawer */}
       <Drawer open={!!trackingOb} onOpenChange={(open) => !open && setTrackingOb(null)}>
         <DrawerContent className="max-w-[430px] mx-auto rounded-t-[40px] px-6 pb-12 border-0 shadow-2xl">
           <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mt-4 mb-4" />
           <DrawerHeader className="px-0">
             <DrawerTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
                Pantau OB 🛵
             </DrawerTitle>
             <DrawerDescription className="text-slate-500 font-medium">
                Posisi real-time {trackingOb} saat ini.
             </DrawerDescription>
           </DrawerHeader>

           <div className="py-4">
              {trackingOb && <TrackingMap obName={trackingOb} />}
              
              <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                <div className="text-xl">💡</div>
                <p className="text-[10px] text-amber-800 font-bold leading-relaxed uppercase tracking-tight">
                  Lokasi diupdate setiap 10 detik. Jika posisi tidak bergerak, kemungkinan OB sedang di dalam gedung atau sinyal GPS lemah.
                </p>
              </div>
           </div>

           <DrawerFooter className="px-0 mt-2">
             <Button onClick={() => setTrackingOb(null)} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black text-base shadow-xl active:scale-95 transition-all">
               OK, SIAP! ✅
             </Button>
           </DrawerFooter>
         </DrawerContent>
       </Drawer>

       {/* TARDUT DRAWER */}
       <Drawer open={isTardutDrawerOpen} onOpenChange={setIsTardutDrawerOpen}>
         <DrawerContent className="max-w-[430px] mx-auto rounded-t-[40px] px-6 pb-12 border-0 shadow-2xl">
           <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mt-4 mb-4" />
           <DrawerHeader className="px-0">
             <DrawerTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
                Tardut (Tarik Duit) 💳
             </DrawerTitle>
             <DrawerDescription className="text-slate-500 font-medium">
                Pilih nominal yang ingin ditarik tunai.
             </DrawerDescription>
           </DrawerHeader>

           <div className="space-y-6 pt-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Nominal Options */}
              <div className="grid grid-cols-2 gap-3">
                {[50000, 100000, 150000, 200000, 250000, 300000].map(amount => (
                  <button 
                    key={amount}
                    onClick={() => {
                      setTardutAmount(amount)
                      setCustomTardutAmount('')
                    }}
                    className={`h-14 rounded-2xl border-2 font-black transition-all flex items-center justify-center gap-2 ${tardutAmount === amount ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md ring-2 ring-amber-500/10' : 'border-slate-100 bg-white text-slate-500'}`}
                  >
                    {formatRupiah(amount).replace('Rp', '')}
                    {tardutAmount === amount && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>

              {/* Custom Nominal */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Atau Masukan Nominal Lain</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">Rp</span>
                  <Input 
                    type="number"
                    placeholder="Contoh: 75000"
                    value={customTardutAmount}
                    onChange={(e) => {
                      setCustomTardutAmount(e.target.value)
                      setTardutAmount(null)
                    }}
                    className="h-14 pl-12 rounded-2xl bg-slate-50 border-slate-100 font-bold focus:ring-amber-500/20"
                  />
                </div>
              </div>

              {/* Upload Proof */}
              <div className="space-y-3 bg-amber-50 p-6 rounded-[32px] border border-amber-100">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 bg-amber-500 text-white rounded-xl flex items-center justify-center">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-xs">Upload Bukti Transfer</p>
                    <p className="text-[9px] text-amber-700 font-bold uppercase tracking-tighter">Wajib sebelum diproses OB</p>
                  </div>
                </div>
                
                <input 
                  type="file"
                  className="hidden"
                  ref={tardutFileInputRef}
                  accept="image/*"
                  onChange={(e) => setTardutProofFile(e.target.files?.[0] || null)}
                />
                
                <Button 
                  onClick={() => tardutFileInputRef.current?.click()}
                  variant="outline"
                  className={`w-full h-14 border-dashed border-2 rounded-2xl font-black transition-all ${tardutProofFile ? 'border-green-500 bg-green-50 text-green-700' : 'border-amber-300 bg-white text-amber-700 hover:bg-amber-50'}`}
                >
                  {tardutProofFile ? `✅ ${tardutProofFile.name}` : 'AMBIL FOTO BUKTI'}
                </Button>
              </div>
           </div>

           <DrawerFooter className="px-0 pt-6">
              <Button 
                onClick={handleSubmitTardut}
                disabled={isSubmittingTardut || (!tardutAmount && !customTardutAmount) || !tardutProofFile}
                className="w-full h-16 rounded-3xl bg-slate-900 text-white font-black text-lg shadow-2xl shadow-slate-900/40 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmittingTardut ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Memproses...
                  </div>
                ) : (
                  'KIRIM PERMINTAAN ✅'
                )}
              </Button>
              <Button variant="ghost" onClick={() => setIsTardutDrawerOpen(false)} className="w-full h-12 text-slate-400 font-bold hover:text-slate-600 uppercase tracking-widest text-[10px]">Batal</Button>
           </DrawerFooter>
         </DrawerContent>
       </Drawer>
    </div>
  )
}
