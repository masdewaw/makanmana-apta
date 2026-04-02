import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { LogOut, CheckCircle, MapPin, Search, ChevronRight, Star, ShoppingBag, Trash2, CreditCard, Wallet, Plus, Copy } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '../components/ui/drawer'

export type Menu = { id: string; food_name: string; price: number }
export type Order = { id: string; food_name: string; price: number; created_at: string; order_status: string; payment_method: string; payment_status: string; catatan: string | null }

function OrderCard({ order, formatRupiah }: { order: Order; formatRupiah: (n: number) => string }) {
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
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProfile()
    fetchMenus()
    fetchOrders()
  }, [])

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
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', session.user.id)
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

  const handleAddToCartManual = () => {
    if (!manualFoodName || !manualFoodPrice) {
      toast.error("Nama dan harga harus diisi!")
      return
    }
    const newItem: Menu = {
      id: `manual-${Date.now()}`,
      food_name: manualFoodName,
      price: Number(manualFoodPrice)
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

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number)
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

            {/* Pesanan Aktif (Top of Home) */}
            {orders.filter(o => o.order_status === 'waiting').length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                   <h3 className="font-bold text-slate-800 text-lg">Pesanan Aktif 🛵</h3>
                   <button onClick={() => setActiveTab('riwayat')} className="text-amber-600 text-xs font-bold px-2 py-1 bg-amber-50 rounded-lg">Lihat Semua</button>
                </div>
                <div className="space-y-3">
                  {orders.filter(o => o.order_status === 'waiting').slice(0, 2).map(order => (
                    <OrderCard key={order.id} order={order} formatRupiah={formatRupiah} />
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

            {/* Menu Tersedia (Grid) */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 text-lg">Menu Terpopuler 🔥</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {menus.filter(m => m.food_name.toLowerCase().includes(searchQuery.toLowerCase())).map(m => {
                  const isInCart = cart.some(c => c.id === m.id)
                  return (
                    <div 
                      key={m.id} 
                      onClick={() => toggleCart(m)}
                      className={`rounded-[28px] p-5 border shadow-sm active:scale-95 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden min-h-[140px] ${isInCart ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20' : 'bg-white border-slate-100 hover:border-amber-200'}`}
                    >
                      {isInCart && (
                        <div className="absolute top-0 right-0 p-2 bg-amber-500 text-white rounded-bl-2xl shadow-md">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl mb-3 flex items-center justify-center text-xl">
                          🍱
                        </div>
                        <h4 className="font-black text-sm text-slate-800 leading-tight tracking-tight line-clamp-2">{m.food_name}</h4>
                      </div>
                      <p className="text-amber-600 font-black text-sm mt-3">{formatRupiah(m.price)}</p>
                    </div>
                  )
                })}

                {/* Tambah Manual Button Card */}
                <div 
                  onClick={() => setIsManualDrawerOpen(true)}
                  className="rounded-[28px] p-5 border-2 border-dashed border-slate-200 bg-slate-50 active:scale-95 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[140px] text-center group hover:bg-amber-50 hover:border-amber-200"
                >
                  <div className="w-12 h-12 bg-white rounded-2xl mb-3 flex items-center justify-center text-slate-300 group-hover:text-amber-500 shadow-sm transition-colors">
                    <Plus className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest leading-tight group-hover:text-amber-600">Tambah Menu<br/>Manual</h4>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Riwayat View */
          <div className="space-y-6 pb-20">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-1">Riwayat Makan 🕰️</h1>
              <p className="text-slate-500 font-medium">List semua jajan yang pernah kamu pesan.</p>
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
                {orders.map(order => (
                  <OrderCard key={order.id} order={order} formatRupiah={formatRupiah} />
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
    </div>
  )
}
