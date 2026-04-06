import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { CheckCircle, Image as ImageIcon, CalendarClock, ShoppingBag, MessageSquare, LogOut, Plus, Trash2, UtensilsCrossed, LayoutDashboard, Edit2, UserCheck, AlertTriangle, History, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '../components/ui/drawer'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
export type OBOrder = { 
  id: string; 
  food_name: string; 
  price: number; 
  created_at: string; 
  order_status: string; 
  payment_method: string; 
  payment_status: string; 
  assigned_to_ob: string | null; 
  proof_url: string | null; 
  catatan: string | null;
  profiles?: { name: string };
  category: string;
  updated_at?: string;
}

export type Menu = { 
  id: string; 
  food_name: string; 
  price: number; 
  category: string;
}

export type Category = {
  id: string;
  name: string;
}

export default function OBDashboard({ session }: { session: Session }) {
  const [orders, setOrders] = useState<OBOrder[]>([])
  const [menus, setMenus] = useState<Menu[]>([])
  const [view, setView] = useState<'orders' | 'history' | 'menu'>('orders')
  const [historyOrders, setHistoryOrders] = useState<OBOrder[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const [totalHistoryCount, setTotalHistoryCount] = useState(0)
  const [myObId, setMyObId] = useState<string | null>(null)
  
  // Menu Drawers
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false)
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null)
  
  // Form States
  const [newFoodName, setNewFoodName] = useState('')
  const [newFoodPrice, setNewFoodPrice] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Lainnya')
  const [dbCategories, setDbCategories] = useState<Category[]>([])
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [catFilter, setCatFilter] = useState('Semua')
  const [selectedObForDetail, setSelectedObForDetail] = useState<string | null>(null)

  useEffect(() => {
    fetchMyProfile()
    fetchActiveOrders()
    fetchMenus()
    fetchCategories()

    // Real-time subscription
    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders' 
      }, async (payload) => {
        // If it's a new order or an update, we might need the profile join
        // Real-time doesn't support joins, so we refetch to get the profile name
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const { data: freshOrder, error } = await supabase
            .from('orders')
            .select('*, profiles(name)')
            .eq('id', payload.new.id)
            .single()
          
          if (freshOrder && !error) {
            setOrders(current => {
              const exists = current.find(o => o.id === freshOrder.id)
              if (exists) {
                // If the order was just completed, we remove it (if it's not waiting anymore)
                if (freshOrder.order_status === 'done') {
                  // Refetch history when an order is done
                  fetchHistoryOrders()
                  return current.filter(o => o.id !== freshOrder.id)
                }
                return current.map(o => o.id === freshOrder.id ? freshOrder : o)
              } else {
                // Only add if it's within the active window (waiting and recent)
                if (freshOrder.order_status === 'waiting') {
                  return [...current, freshOrder].sort((a, b) => 
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                  )
                }
                return current
              }
            })
          }
        } else if (payload.eventType === 'DELETE') {
          setOrders(current => current.filter(o => o.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (myObId) {
      fetchHistoryOrders()
    }
  }, [myObId, historyPage])

  const fetchMyProfile = async () => {
    const { data } = await supabase.from('profiles').select('name').eq('id', session.user.id).single()
    if (data) {
      const name = data.name.toLowerCase()
      if (name.includes('bahul')) setMyObId('OB 1')
      else if (name.includes('masber')) setMyObId('OB 2')
      else setMyObId(data.name)
    }
  }

  const fetchMenus = async () => {
    const { data } = await supabase.from('menus').select('*').order('food_name')
    if (data) setMenus(data)
  }

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    if (data) {
      setDbCategories(data)
      if (data.length > 0 && !data.find(c => c.name === selectedCategory)) {
         // Optionally reset if current selected is gone, but we usually default to 'Lainnya'
      }
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName) return
    setIsBusy(true)
    const { error } = await supabase.from('categories').insert([{ name: newCategoryName }])
    if (error) toast.error("Gagal tambah kategori (mungkin sudah ada?)")
    else {
      toast.success("Kategori baru ditambahkan!")
      setNewCategoryName('')
      fetchCategories()
    }
    setIsBusy(false)
  }

  const deleteCategory = async (id: string, name: string) => {
    if (name === 'Lainnya') {
       toast.error("Kategori 'Lainnya' tidak bisa dihapus")
       return
    }
    if (!window.confirm(`Hapus kategori "${name}"? Menu dengan kategori ini akan tetap ada.`)) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) toast.error("Gagal hapus kategori")
    else {
      toast.success("Kategori dihapus")
      fetchCategories()
    }
  }

  const fetchActiveOrders = async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data } = await supabase
      .from('orders')
      .select('*, profiles(name)')
      .eq('order_status', 'waiting')
      .gt('created_at', yesterday)
      .order('created_at', { ascending: true })
      
    if (data) setOrders(data)
  }

  const fetchHistoryOrders = async () => {
    if (!myObId) return

    const start = (historyPage - 1) * 10
    const end = start + 9

    const { data, count } = await supabase
      .from('orders')
      .select('*, profiles(name)', { count: 'exact' })
      .eq('order_status', 'done')
      .eq('assigned_to_ob', myObId)
      .order('created_at', { ascending: false })
      .range(start, end)
      
    if (data) setHistoryOrders(data)
    if (count !== null) setTotalHistoryCount(count)
  }

  const takeOrder = async (id: string) => {
    if (!myObId) return
    
    // Optimistic Update
    const originalOrders = [...orders]
    setOrders(current => current.map(o => 
      o.id === id ? { ...o, assigned_to_ob: myObId } : o
    ))

    const { error } = await supabase.from('orders').update({ assigned_to_ob: myObId }).eq('id', id)
    if (error) {
      toast.error("Gagal mengambil pesanan")
      setOrders(originalOrders) // Rollback
    } else {
      toast.success(`Pesanan diambil oleh ${myObId}!`)
      // No need to fetch, realtime or manual state update handled it
    }
  }

  const releaseOrder = async (id: string) => {
    // Optimistic Update
    const originalOrders = [...orders]
    setOrders(current => current.map(o => 
      o.id === id ? { ...o, assigned_to_ob: null } : o
    ))

    const { error } = await supabase.from('orders').update({ assigned_to_ob: null }).eq('id', id)
    if (error) {
      toast.error("Gagal melepas pesanan")
      setOrders(originalOrders) // Rollback
    } else {
      toast.success("Pesanan dikembalikan ke daftar umum")
    }
  }

  const verifyPayment = async (order: OBOrder) => {
    if (order.assigned_to_ob !== myObId) {
      toast.error("Hanya OB yang ditugaskan yang bisa verifikasi!")
      return
    }

    // Optimistic Update
    const originalOrders = [...orders]
    setOrders(current => current.map(o => 
      o.id === order.id ? { ...o, payment_status: 'paid' } : o
    ))

    const { error } = await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', order.id)
    if (error) {
      toast.error("Gagal verifikasi pembayaran")
      setOrders(originalOrders) // Rollback
    } else {
      toast.success("Pembayaran berhasil diverifikasi!")
    }
  }

  const markAsDone = async (order: OBOrder) => {
    if (order.assigned_to_ob !== myObId) {
      toast.error("Hanya OB yang ditugaskan yang bisa menyelesaikan!")
      return
    }

    // Optimistic Update
    const originalOrders = [...orders]
    setOrders(current => current.filter(o => o.id !== order.id))

    const { error } = await supabase.from('orders').update({ order_status: 'done' }).eq('id', order.id)
    if (error) {
      toast.error("Gagal menyelesaikan pesanan")
      setOrders(originalOrders) // Rollback
    } else {
      toast.success("Pesanan diselesaikan!")
    }
  }

  const handleAddMenu = async () => {
    if (!newFoodName || !newFoodPrice) {
      toast.error("Nama dan harga harus diisi!")
      return
    }
    
    setIsBusy(true)
    const { error } = await supabase.from('menus').insert([
      { food_name: newFoodName, price: Number(newFoodPrice), category: selectedCategory }
    ])

    if (error) toast.error("Gagal menambah menu")
    else {
      toast.success("Menu baru ditambahkan!")
      setNewFoodName('')
      setNewFoodPrice('')
      setIsMenuDrawerOpen(false)
      fetchMenus()
    }
    setIsBusy(false)
  }

  const handleUpdateMenu = async () => {
    if (!editingMenu || !newFoodName || !newFoodPrice) return
    
    setIsBusy(true)
    const { error } = await supabase.from('menus').update({
      food_name: newFoodName,
      price: Number(newFoodPrice),
      category: selectedCategory
    }).eq('id', editingMenu.id)

    if (error) toast.error("Gagal update menu")
    else {
      toast.success("Menu berhasil diupdate!")
      setIsEditDrawerOpen(false)
      fetchMenus()
    }
    setIsBusy(false)
  }

  const openEditMenu = (menu: Menu) => {
    setEditingMenu(menu)
    setNewFoodName(menu.food_name)
    setNewFoodPrice(menu.price.toString())
    setSelectedCategory(menu.category || 'Lainnya')
    setIsEditDrawerOpen(true)
  }

  const deleteMenu = async (id: string) => {
    if (!window.confirm("Hapus menu ini?")) return
    const { error } = await supabase.from('menus').delete().eq('id', id)
    if (error) toast.error("Gagal menghapus menu")
    else {
      toast.success("Menu dihapus!")
      fetchMenus()
    }
  }

  const handleLogout = async () => {
    if (window.confirm("Apakah Anda yakin ingin keluar?")) {
      await supabase.auth.signOut()
    }
  }

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number)
  }

  const ob1Total = orders.filter(o => o.assigned_to_ob === 'OB 1').reduce((acc, o) => acc + o.price, 0)
  const ob2Total = orders.filter(o => o.assigned_to_ob === 'OB 2').reduce((acc, o) => acc + o.price, 0)
  const unassignedTotal = orders.filter(o => !o.assigned_to_ob).reduce((acc, o) => acc + o.price, 0)

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
      {/* Enhanced Header */}
      <div className="bg-white px-6 pt-6 pb-2 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] z-20 flex flex-col gap-4 sticky top-0 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-amber-500/20">
                <UtensilsCrossed className="w-6 h-6" />
             </div>
             <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">MakanMana Admin</h2>
                <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                   <UserCheck className="w-2.5 h-2.5" /> AKSES: {myObId || 'ADMIN'}
                </div>
             </div>
          </div>
          <button onClick={handleLogout} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Tab System */}
        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 mb-2">
          <button 
            onClick={() => setView('orders')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${view === 'orders' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Pesanan
          </button>
          <button 
            onClick={() => setView('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${view === 'history' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}
          >
            <History className="w-4 h-4" />
            Riwayat
          </button>
          <button 
            onClick={() => setView('menu')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${view === 'menu' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}
          >
            <ShoppingBag className="w-4 h-4" />
            Menu
          </button>
        </div>
      </div>

      <div className="p-5 space-y-6 flex-1">
        {view === 'orders' && (
          <>
            {/* Summaries */}
            <div className="grid grid-cols-2 gap-3">
              <div 
                onClick={() => setSelectedObForDetail('OB 1')}
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm active:scale-95 transition-all cursor-pointer hover:border-amber-200"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OB 1 (Bahul)</span>
                  <div className="bg-amber-100 text-amber-600 p-1 rounded-lg">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                </div>
                <p className="text-lg font-black text-slate-800">{formatRupiah(ob1Total)}</p>
                <p className="text-[10px] font-bold text-slate-500 mt-1 underline decoration-amber-200 underline-offset-2">{orders.filter(o => o.assigned_to_ob === 'OB 1').length} Pesanan (Lihat Detail)</p>
              </div>
              <div 
                onClick={() => setSelectedObForDetail('OB 2')}
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm active:scale-95 transition-all cursor-pointer hover:border-orange-200"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OB 2 (Masber)</span>
                  <div className="bg-orange-100 text-orange-600 p-1 rounded-lg">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                </div>
                <p className="text-lg font-black text-slate-800">{formatRupiah(ob2Total)}</p>
                <p className="text-[10px] font-bold text-slate-500 mt-1 underline decoration-orange-200 underline-offset-2">{orders.filter(o => o.assigned_to_ob === 'OB 2').length} Pesanan (Lihat Detail)</p>
              </div>
            </div>
            
            {unassignedTotal > 0 && (
              <div className="bg-red-50/80 rounded-xl p-3 border border-red-200 shadow-sm flex items-center justify-between">
                <span className="flex items-center text-sm font-bold text-red-600"><AlertTriangle className="w-4 h-4 mr-2" /> Belum Ditugaskan</span>
                <span className="font-extrabold text-red-700">{formatRupiah(unassignedTotal)}</span>
              </div>
            )}

            {/* Incoming Orders List */}
            <div>
              <h3 className="font-bold text-slate-800 mb-3 text-lg flex items-center gap-2">
                Pesanan Masuk ({orders.length})
              </h3>
              {orders.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center text-slate-400 bg-white rounded-[32px] border-2 border-slate-100 border-dashed">
                  <span className="text-5xl mb-4">😴</span>
                  <p className="font-bold text-slate-800 text-lg">Semua Aman!</p>
                  <p className="text-xs text-slate-500 font-medium">Belum ada pesanan masuk pagi ini.</p>
                </div>
              ) : (
                <div className="space-y-4 pb-10">
                  {orders.map(order => {
                    const isMyOrder = order.assigned_to_ob === myObId
                    const isSomeoneElseOrder = order.assigned_to_ob && order.assigned_to_ob !== myObId

                    return (
                      <Card key={order.id} className={`border-0 shadow-sm ring-1 rounded-2xl overflow-hidden transition-opacity ${isSomeoneElseOrder ? 'opacity-60 ring-slate-100' : 'opacity-100 ring-slate-100'}`}>
                        <div className={`h-1.5 w-full ${order.assigned_to_ob === 'OB 1' ? 'bg-amber-500' : order.assigned_to_ob === 'OB 2' ? 'bg-orange-500' : 'bg-slate-300'}`} />
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 pr-2">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded uppercase tracking-tighter shadow-xs">
                                  {order.profiles?.name || 'User'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold flex items-center"><CalendarClock className="w-3 h-3 mr-1"/> {new Date(order.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                              <h4 className="font-black text-lg text-slate-900 leading-tight">{order.food_name}</h4>
                              <p className="text-amber-600 font-black text-sm mt-0.5">{formatRupiah(order.price)}</p>
                            </div>
                            
                            <div className="shrink-0 flex flex-col items-end">
                              <span className="text-[10px] bg-slate-50 border border-slate-100 text-slate-500 px-2 py-1 rounded-lg uppercase font-black tracking-widest mb-2">
                                {order.payment_method}
                              </span>
                              {order.payment_status === 'paid' ? (
                                <span className="text-[10px] inline-flex items-center px-2 py-1.5 bg-green-50 text-green-700 font-black rounded-lg border border-green-100/50">
                                  <CheckCircle className="w-3 h-3 mr-1" /> LUNAS
                                </span>
                              ) : (
                                <span className="text-[10px] inline-flex items-center px-2 py-1.5 bg-red-50 text-red-600 font-black rounded-lg border border-red-100/50">
                                  BELUM BAYAR
                                </span>
                              )}
                            </div>
                          </div>

                          {order.catatan && (
                            <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/50 flex items-start gap-2 italic">
                              <MessageSquare className="w-3.5 h-3.5 text-amber-500 mt-1 shrink-0" />
                              <p className="text-xs text-amber-800 font-medium leading-relaxed">{order.catatan}</p>
                            </div>
                          )}

                          {order.payment_method === 'transfer' && order.proof_url && (
                            <div className="bg-slate-50/50 p-2.5 rounded-2xl border border-slate-200/50 flex justify-between items-center group">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-amber-500 transition-colors shadow-xs">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">BUKTI TF</span>
                              </div>
                              <a href={order.proof_url} target="_blank" rel="noopener noreferrer" className="text-white bg-slate-800 px-4 py-2 rounded-xl border border-slate-900 text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg">
                                Lihat Gambar
                              </a>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100">
                            {/* Assignment Button */}
                            {!order.assigned_to_ob ? (
                              <Button 
                                onClick={() => takeOrder(order.id)}
                                className="col-span-2 rounded-2xl font-black h-12 text-[10px] uppercase tracking-widest bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                              >
                                🚩 AMBIL PESANAN
                              </Button>
                            ) : isMyOrder ? (
                              <Button 
                                variant="outline"
                                onClick={() => releaseOrder(order.id)}
                                className="col-span-2 rounded-2xl font-black h-10 text-[10px] uppercase tracking-widest text-slate-400 border-slate-200 hover:bg-red-50 hover:text-red-500"
                              >
                                🔓 LEPAS PESANAN KE UMUM
                              </Button>
                            ) : (
                              <div className="col-span-2 bg-slate-50 rounded-2xl py-3 px-4 flex items-center justify-between border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase">DIAMBIL OLEH</span>
                                <span className="text-[10px] font-black text-slate-800 bg-white px-2 py-1 rounded-lg border border-slate-200">{order.assigned_to_ob}</span>
                              </div>
                            )}
                            
                            {/* Actions restricted to current OB */}
                            {isMyOrder && (
                              <>
                                {order.payment_status !== 'paid' ? (
                                  <Button 
                                    onClick={() => verifyPayment(order)}
                                    className="col-span-2 rounded-2xl font-black h-12 text-[10px] uppercase tracking-widest bg-slate-800 text-white hover:bg-black"
                                  >
                                    VERIFIKASI BAYAR
                                  </Button>
                                ) : (
                                  <Button 
                                    onClick={() => markAsDone(order)}
                                    className="col-span-2 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black h-12 text-[10px] uppercase tracking-widest shadow-lg shadow-green-500/20" 
                                  >
                                    SELESAI PESANAN ✅
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {view === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
               <h3 className="font-black text-slate-800 text-xl flex items-center gap-2">
                 Riwayat Saya 💪
               </h3>
               <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{historyOrders.length} Selesai</span>
            </div>

            {historyOrders.length === 0 ? (
              <div className="text-center py-20 flex flex-col items-center text-slate-400 bg-white rounded-[32px] border-2 border-slate-100 border-dashed">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                  <History className="w-8 h-8 text-slate-200" />
                </div>
                <p className="font-bold text-slate-800 text-lg">Belum Ada Riwayat</p>
                <p className="text-xs text-slate-500 font-medium max-w-[200px]">Semua pesanan yang kamu selesaikan akan muncul di sini.</p>
              </div>
            ) : (
              <div className="space-y-4 pb-10">
                {historyOrders.map(order => (
                  <Card key={order.id} className="border-0 shadow-sm ring-1 ring-slate-100 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                            {order.profiles?.name || 'User'} • {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-800 truncate leading-tight">{order.food_name}</h4>
                        <p className="text-slate-500 font-bold text-xs">{formatRupiah(order.price)}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1.5 bg-green-50 text-green-600 px-2.5 py-1 rounded-full border border-green-100">
                          <CheckCircle className="w-3 h-3" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Selesai</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400">{new Date(order.updated_at || order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {totalHistoryCount > 10 && (
              <div className="flex items-center justify-between pt-2 pb-12">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={historyPage === 1}
                  onClick={() => setHistoryPage(p => p - 1)}
                  className="rounded-xl font-bold bg-white border-slate-100 text-slate-500 h-10 px-4 active:scale-95 transition-all"
                >
                  <ChevronLeft className="w-4 h-4 mr-1 text-amber-500" /> Prev
                </Button>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Halaman</span>
                  <span className="text-sm font-black text-slate-800">{historyPage} <span className="text-slate-300 mx-1">/</span> {Math.ceil(totalHistoryCount / 10)}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={historyPage >= Math.ceil(totalHistoryCount / 10)}
                  onClick={() => setHistoryPage(p => p + 1)}
                  className="rounded-xl font-bold bg-white border-slate-100 text-slate-500 h-10 px-4 active:scale-95 transition-all"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1 text-amber-500" />
                </Button>
              </div>
            )}
          </div>
        )}

        {view === 'menu' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 text-xl tracking-tight">Katalog Menu</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{menus.length} Item Tersedia</p>
              </div>
              <Button onClick={() => {
                setEditingMenu(null)
                setNewFoodName('')
                setNewFoodPrice('')
                setIsMenuDrawerOpen(true)
              }} className="rounded-2xl h-12 px-6 bg-amber-500 hover:bg-amber-600 text-white font-black shadow-lg shadow-amber-500/30 flex items-center gap-2">
                <Plus className="w-5 h-5" /> TAMBAH MENU
              </Button>
            </div>

            <div className="flex gap-2 pb-4">
               <Button 
                 variant="outline" 
                 onClick={() => setIsCategoryDrawerOpen(true)}
                 className="rounded-xl font-bold text-xs border-slate-200 text-slate-500 flex items-center gap-2 hover:bg-slate-50"
               >
                 📂 KELOLA KATEGORI
               </Button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
              {['Semua', ...dbCategories.map(c => c.name)].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCatFilter(cat)}
                  className={`shrink-0 px-5 py-2.5 rounded-xl text-xs font-black transition-all border ${catFilter === cat ? 'bg-amber-500 border-amber-600 text-white shadow-lg shadow-amber-500/20' : 'bg-white border-slate-100 text-slate-500 hover:border-amber-200'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 pb-10">
              {(() => {
                const filteredMenus = menus.filter(m => catFilter === 'Semua' || m.category === catFilter)
                if (filteredMenus.length === 0) {
                  return (
                    <div className="text-center py-20 bg-white/50 rounded-[32px] border-2 border-slate-100 border-dashed backdrop-blur-sm">
                      <p className="text-slate-400 font-bold italic">
                        {catFilter === 'Semua' 
                          ? "Menu kosong. Klik tombol di atas untuk menambah." 
                          : `Tidak ada menu di kategori "${catFilter}".`}
                      </p>
                    </div>
                  )
                }
                return filteredMenus.map(m => (
                  <Card key={m.id} className="border border-slate-100 shadow-xs rounded-2xl overflow-hidden group">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🥡</div>
                         <div>
                            <h4 className="font-bold text-slate-800 leading-tight">{m.food_name}</h4>
                            <p className="text-amber-600 font-black text-sm">{formatRupiah(m.price)}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditMenu(m)} className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteMenu(m.id)} className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              })()}
            </div>

            {/* Footer Credit */}
            <div className="py-10 text-center opacity-30">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Application Created by Dewa</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Menu Drawer */}
      <Drawer open={isMenuDrawerOpen} onOpenChange={setIsMenuDrawerOpen}>
        <DrawerContent className="max-w-[430px] mx-auto rounded-t-[32px] px-6">
          <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mt-4 mb-8" />
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-2xl font-black text-slate-800">Makanan Baru 🥘</DrawerTitle>
            <DrawerDescription className="text-slate-500 font-medium">Tambahkan menu baru ke pilihan jajan user.</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-slate-700 font-bold text-sm ml-1 uppercase tracking-widest">Kategori</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {dbCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${selectedCategory === cat.name ? 'bg-amber-500 border-amber-600 text-white shadow-md scale-105' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-amber-200'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-bold text-sm ml-1 uppercase tracking-widest">Nama Makanan</Label>
              <Input 
                placeholder="Contoh: Nasi Goreng Gila" 
                value={newFoodName}
                onChange={(e) => setNewFoodName(e.target.value)}
                className="rounded-2xl h-14 bg-slate-50 border-slate-100 focus:bg-white transition-all text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-bold text-sm ml-1 uppercase tracking-widest">Harga (Rp)</Label>
              <Input 
                type="number"
                placeholder="Contoh: 15000" 
                value={newFoodPrice}
                onChange={(e) => setNewFoodPrice(e.target.value)}
                className="rounded-2xl h-14 bg-slate-50 border-slate-100 focus:bg-white transition-all text-base"
              />
            </div>
          </div>

          <DrawerFooter className="px-0 pb-8">
            <Button onClick={handleAddMenu} disabled={isBusy} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black text-base shadow-xl active:scale-95 transition-all">
              {isBusy ? 'Menambah...' : 'SIMPAN MENU 💾'}
            </Button>
            <Button variant="ghost" onClick={() => setIsMenuDrawerOpen(false)} className="w-full h-12 text-slate-400 font-bold">Batal</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Edit Menu Drawer */}
      <Drawer open={isEditDrawerOpen} onOpenChange={setIsEditDrawerOpen}>
        <DrawerContent className="max-w-[430px] mx-auto rounded-t-[32px] px-6">
          <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mt-4 mb-8" />
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-2xl font-black text-slate-800">Edit Menu 📝</DrawerTitle>
            <DrawerDescription className="text-slate-500 font-medium">Ubah detail menu jajan.</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-slate-700 font-bold text-sm ml-1 uppercase tracking-widest">Kategori</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {dbCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${selectedCategory === cat.name ? 'bg-amber-500 border-amber-600 text-white shadow-md scale-105' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-amber-200'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-bold text-sm ml-1 uppercase tracking-widest">Nama Makanan</Label>
              <Input 
                value={newFoodName}
                onChange={(e) => setNewFoodName(e.target.value)}
                className="rounded-2xl h-14 bg-slate-50 border-slate-100 focus:bg-white transition-all text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-bold text-sm ml-1 uppercase tracking-widest">Harga (Rp)</Label>
              <Input 
                type="number"
                value={newFoodPrice}
                onChange={(e) => setNewFoodPrice(e.target.value)}
                className="rounded-2xl h-14 bg-slate-50 border-slate-100 focus:bg-white transition-all text-base"
              />
            </div>
          </div>

          <DrawerFooter className="px-0 pb-8">
            <Button onClick={handleUpdateMenu} disabled={isBusy} className="w-full h-14 rounded-2xl bg-amber-500 text-white font-black text-base shadow-xl active:scale-95 transition-all">
              {isBusy ? 'Menyimpan...' : 'UPDATE MENU ✅'}
            </Button>
            <Button variant="ghost" onClick={() => setIsEditDrawerOpen(false)} className="w-full h-12 text-slate-400 font-bold">Batal</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      {/* Category Management Drawer */}
      <Drawer open={isCategoryDrawerOpen} onOpenChange={setIsCategoryDrawerOpen}>
        <DrawerContent className="max-w-[430px] mx-auto rounded-t-[32px] px-6">
          <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mt-4 mb-8" />
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-2xl font-black text-slate-800">Kelola Kategori 📂</DrawerTitle>
            <DrawerDescription className="text-slate-500 font-medium">Tambah atau hapus kategori menu jajan.</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-3">
              <Label className="text-slate-700 font-bold text-xs uppercase tracking-widest">Kategori Saat Ini</Label>
              <div className="flex flex-wrap gap-2">
                {dbCategories.map(cat => (
                  <div key={cat.id} className="group flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-700">{cat.name}</span>
                    {cat.name !== 'Lainnya' && (
                      <button 
                         onClick={() => deleteCategory(cat.id, cat.name)}
                         className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                         <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-100">
              <Label className="text-slate-700 font-bold text-xs uppercase tracking-widest">Tambah Kategori Baru</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Contoh: Takoyaki" 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="rounded-xl h-12 bg-slate-50 border-slate-100"
                />
                <Button 
                  onClick={handleAddCategory}
                  disabled={isBusy}
                  className="rounded-xl bg-slate-900 text-white px-6 font-bold"
                >
                  TAMBAH
                </Button>
              </div>
            </div>
          </div>

          <DrawerFooter className="px-0 pb-8">
            <Button variant="ghost" onClick={() => setIsCategoryDrawerOpen(false)} className="w-full h-12 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Tutup</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <Drawer open={!!selectedObForDetail} onOpenChange={() => setSelectedObForDetail(null)}>
        <DrawerContent className="max-w-[430px] mx-auto rounded-t-[32px] px-6 pb-8">
          <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mt-4 mb-4" />
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
              Detail Pesanan {selectedObForDetail}
            </DrawerTitle>
            <DrawerDescription className="text-slate-500 font-medium">
              Daftar makanan yang sedang diproses oleh {selectedObForDetail}.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-3 py-4 max-h-[50vh] overflow-y-auto pr-1">
            {orders.filter(o => o.assigned_to_ob === selectedObForDetail).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-xs font-black text-amber-600 uppercase tracking-tighter mb-1">{order.profiles?.name || 'User'}</p>
                  <h4 className="font-bold text-slate-800 truncate">{order.food_name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {order.payment_status === 'paid' ? 'LUNAS' : 'BELUM BAYAR'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{formatRupiah(order.price)}</span>
                  </div>
                </div>
                <div className="shrink-0">
                  <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-sm shadow-sm">🥡</div>
                </div>
              </div>
            ))}
            {orders.filter(o => o.assigned_to_ob === selectedObForDetail).length === 0 && (
              <div className="text-center py-10">
                <p className="text-slate-400 font-bold italic">Belum ada pesanan yang diambil.</p>
              </div>
            )}
          </div>

          <DrawerFooter className="px-0 pt-2">
            <Button onClick={() => setSelectedObForDetail(null)} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black text-base shadow-xl active:scale-95 transition-all">
              TUTUP ✅
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
