import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { 
  LogOut, CheckCircle, MapPin, Search, ChevronRight, Star, ShoppingBag, 
  Trash2, CreditCard, Wallet, Plus, Copy, Heart, ChevronLeft, 
  Camera, Zap, Check, Banknote, Clock, Users, ChevronDown
} from 'lucide-react'
import Tesseract from 'tesseract.js';
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '../components/ui/drawer'
import TrackingMap from '../components/TrackingMap'

export type Menu = { id: string; food_name: string; price: number; category: string }
export type Order = { id: string; food_name: string; price: number; created_at: string; order_status: string; payment_method: string; payment_status: string; catatan: string | null; profiles?: { name: string }; assigned_to_ob?: string; transfer_to?: string }
export type TardutRequest = { id: string; user_id: string; amount: number; proof_url: string; status: string; created_at: string; profiles?: { name: string }; assigned_to_ob?: string }

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
  const [activeView, setActiveView] = useState<'personal' | 'teman_makan' | 'split_bill'>('personal')
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
  const [transferTo, setTransferTo] = useState<'Bahul' | 'Masber' | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  
  // Teman Makan States
  const [tmGroups, setTmGroups] = useState<any[]>([])
  const [activeTmGroup, setActiveTmGroup] = useState<any | null>(null)
  const [tmOrders, setTmOrders] = useState<any[]>([])
  const [isTmCreateOpen, setIsTmCreateOpen] = useState(false)
  const [newTmTitle, setNewTmTitle] = useState('')
  const [newTmBank, setNewTmBank] = useState('')
  const [newTmDeadline, setNewTmDeadline] = useState('')
  const [tmCreating, setTmCreating] = useState(false)
  const [joinTmItemName, setJoinTmItemName] = useState('')
  const [joinTmItemPrice, setJoinTmItemPrice] = useState('')

  // Split Bill States
  const [ocrLoading, setOcrLoading] = useState(false)
  const [splitItems, setSplitItems] = useState<{name: string, price: number, users: string[], itemType: 'food' | 'shared'}[]>([])
  const [ocrImage, setOcrImage] = useState<string | null>(null)
  const [isOcrDrawerOpen, setIsOcrDrawerOpen] = useState(false)
  const [splitBills, setSplitBills] = useState<any[]>([])
  const [selectedSplitBill, setSelectedSplitBill] = useState<any | null>(null)
  const [isRecapDrawerOpen, setIsRecapDrawerOpen] = useState(false)
  const [recapItems, setRecapItems] = useState<any[]>([])
  const [allProfiles, setAllProfiles] = useState<{id: string, name: string}[]>([])
  const [itemAssignments, setItemAssignments] = useState<Record<number, string>>({})
  const [assignmentStep, setAssignmentStep] = useState<'edit' | 'assign' | 'payment' | 'summary'>('edit')
  const [splitBillPaymentInfo, setSplitBillPaymentInfo] = useState('')

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
    fetchSplitBills()
    fetchAllProfiles()
    fetchTmGroups()

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

    if (paymentMethod === 'transfer') {
      if (!transferTo) {
        toast.error("Pilih tujuan transfer (Bahul/Masber)!")
        return
      }
      if (!proofFile) {
        toast.error("Mohon upload bukti transfer")
        return
      }
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
        catatan: catatan || null,
        transfer_to: paymentMethod === 'transfer' ? transferTo : null
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

  // Teman Makan Logic
  const fetchTmGroups = async () => {
    const { data } = await supabase.from('teman_makan_groups').select('*, profiles(name)').in('status', ['open', 'finished']).order('created_at', { ascending: false })
    if (data) setTmGroups(data)
  }

  const fetchTmOrders = async (groupId: string) => {
    const { data } = await supabase.from('teman_makan_orders').select('*, profiles(name)').eq('group_id', groupId)
    if (data) setTmOrders(data)
  }

  const handleCreateTmGroup = async () => {
    if (!newTmTitle.trim()) {
      toast.error("Judul room harus diisi!")
      return
    }

    setTmCreating(true)
    try {
      let deadlineTimestamp = null
      if (newTmDeadline) {
        const today = new Date()
        const [hours, minutes] = newTmDeadline.split(':')
        today.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0)
        deadlineTimestamp = today.toISOString()
      }

      const { data, error } = await supabase.from('teman_makan_groups').insert([{
        creator_id: session.user.id,
        title: newTmTitle.trim(),
        bank_info: newTmBank.trim(),
        deadline: deadlineTimestamp,
        status: 'open'
      }]).select().single()

      if (error) throw error

      toast.success("Room Teman Makan Dibuat! 🎉")
      setIsTmCreateOpen(false)
      setNewTmTitle('')
      setNewTmBank('')
      setNewTmDeadline('')
      setTmOrders([])
      setActiveTmGroup(data)
      fetchTmGroups()
    } catch (err: any) {
      toast.error("Gagal buat room: " + err.message)
    } finally {
      setTmCreating(false)
    }
  }



  const fetchSplitBills = async () => {
    const { data } = await supabase
      .from('split_bills')
      .select('*, profiles:creator_id(name)')
      .in('status', ['open', 'finished'])
      .order('created_at', { ascending: false })
    setSplitBills(data || [])
  }

  const handleFinishSplitBill = async (billId: string) => {
    const { error } = await supabase.from('split_bills').update({ status: 'finished' }).eq('id', billId)
    if (error) {
      toast.error('Gagal menutup patungan')
    } else {
      toast.success('Patungan ditutup!')
      fetchSplitBills()
    }
  }

  const fetchAllProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'user')
      .order('name')
    if (data) setAllProfiles(data)
  }

  const fetchRecapItems = async (billId: string) => {
    const { data } = await supabase
      .from('split_bill_items')
      .select('*, profiles:user_id(name)')
      .eq('split_bill_id', billId)
    setRecapItems(data || [])
  }

  const handleDeleteTmOrder = async (orderId: string) => {
    if (!activeTmGroup) return

    const { error } = await supabase.from('teman_makan_orders').delete().eq('id', orderId)

    if (error) {
      toast.error("Gagal menghapus pesanan")
    } else {
      toast.success("Pesanan berhasil dihapus!")
      fetchTmOrders(activeTmGroup.id) // Refresh orders
    }
  }

  const handleJoinTmOrder = async (menuName: string, price: number) => {
    if (!activeTmGroup) return

    const { error } = await supabase.from('teman_makan_orders').insert([{
      group_id: activeTmGroup.id,
      user_id: session.user.id,
      menu_name: menuName,
      price: price
    }])

    if (error) {
      toast.error("Gagal join order")
    } else {
      toast.success("Pesanan ditambahkan ke grup!")
      fetchTmOrders(activeTmGroup.id) // Refresh orders
    }
  }

  const handleSelectTmGroup = async (group: any) => {
    setActiveTmGroup(group)
    await fetchTmOrders(group.id)

    // Subscribe to real-time updates for this group
    const channel = supabase
      .channel(`tm_orders:${group.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'teman_makan_orders',
        filter: `group_id=eq.${group.id}`
      }, async () => {
        // Fetch updated orders with profile info
        await fetchTmOrders(group.id)
        toast.success("Ada pesanan baru masuk! 🎉")
      })
      .subscribe()

    // Store channel for cleanup (optional - you might want to keep it active)
    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleFinishTmGroup = async () => {
     if (!activeTmGroup) return
     const { error } = await supabase.from('teman_makan_groups').update({ status: 'finished' }).eq('id', activeTmGroup.id)
     if (error) {
       toast.error("Gagal menutup room")
       return
     }
     toast.success("Room ditutup & selesai!")
     setActiveTmGroup({ ...activeTmGroup, status: 'finished' })
     fetchTmGroups()
  }

  // Split Bill OCR Logic
  const handleOcrProcess = async (file: File) => {
    setOcrLoading(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string
      setOcrImage(imageUrl)
      
      try {
        const { data: { text } } = await Tesseract.recognize(imageUrl, 'ind', {
          logger: m => console.log(m)
        })
        
        // Simple Parser Logic
        const lines = text.split('\n')
        const items: {name: string, price: number, users: string[], itemType: 'food' | 'shared'}[] = []
        
        lines.forEach(line => {
          const lowerLine = line.toLowerCase()
          
          // STRICT BLACKLIST: ONLY ignore absolute summary totals
          // Keep line items, taxes, and discounts
          const blacklist = [
            'total', 'otal', 'subtotal', 'ubtotal', 'bayar', 'jumlah', 'kembali', 
            'cash', 'tunai', 'change', 'rincian', 'pesanan', 'tagihan'
          ]
          
          if (blacklist.some(kw => lowerLine.includes(kw))) return

          // Enhanced price pattern: catch numbers, including leading '-' or '( )' for negatives
          // Using a more flexible regex for Indonesian number formatting
          const priceMatch = line.match(/\(?(-?\d+[,.]?\d*)\)?/g)
          if (priceMatch && priceMatch.length > 0) {
             const rawMatch = priceMatch[priceMatch.length - 1]
             const isNegative = rawMatch.startsWith('-') || (rawMatch.startsWith('(') && rawMatch.endsWith(')'))
             const cleanedPrice = rawMatch.replace(/[^0-9]/g, '')
             const price = parseInt(cleanedPrice) * (isNegative ? -1 : 1)
             
             // Detect Quantity (e.g., "2 x ", "1x ")
             const qtyMatch = line.match(/^(\d+)\s*[xX]/) || line.match(/\s(\d+)\s*[xX]/)
             const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1
             
             // Extract name: remove the price and common artifacts (Rp, quantities)
             let name = line.replace(/\(?(-?\d+[,.]?\d*)\)?/g, '')
                 .replace(/rp/gi, '')
                 .replace(/\s?\d+\s?[xX]\s?/g, ' ') // Remove 1x, 2 x, etc.
                 .replace(/[.:\-/_()]/g, ' ') // Clean remaining symbols
                 .trim()
             
             // Logic: items >= 100 IDR or negative discounts
             if (Math.abs(price) >= 100 && name.length > 2 && isNaN(Number(name))) {
                // AUTO-NEGATIVE: If name contains discount keywords, force negative
                let finalPrice = price
                const discountKeywords = ['diskon', 'voucher', 'promo', 'potongan', 'discount']
                const sharedKeywords = ['diskon', 'voucher', 'promo', 'potongan', 'discount', 'biaya', 'ongkir', 'pengiriman', 'layanan', 'pajak', 'ppn', 'tax', 'fee', 'delivery', 'service']
                if (discountKeywords.some(kw => name.toLowerCase().includes(kw))) {
                   finalPrice = -Math.abs(price)
                }

                // Classify: shared cost or food?
                const isShared = sharedKeywords.some(kw => name.toLowerCase().includes(kw))

                // If quantity > 1, split into multiple items
                const unitPrice = Math.floor(finalPrice / qty)
                for (let i = 0; i < qty; i++) {
                   items.push({ 
                     name: qty > 1 ? `${name.substring(0, 25)} (#${i+1})` : name.substring(0, 30), 
                     price: unitPrice, 
                     users: [],
                     itemType: isShared ? 'shared' : 'food'
                   })
                }
             }
          }
        })
        
        setSplitItems(items)
      } catch (err) {
        toast.error("Gagal membaca gambar")
      } finally {
        setOcrLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSaveSplitBill = async () => {
     if (splitItems.length === 0) return

     // Check all food items are assigned
     const foodIndices = splitItems.map((item, idx) => item.itemType === 'food' ? idx : -1).filter(i => i >= 0)
     const missingAssignment = foodIndices.some(idx => !itemAssignments[idx])
     if (missingAssignment) return toast.error('Semua item makanan harus dipilih orangnya!')

     const { data: group, error: gError } = await supabase.from('split_bills').insert([{
        creator_id: session.user.id,
        title: `Split Bill ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`,
        bank_info: splitBillPaymentInfo.trim() || null,
        status: 'open'
     }]).select().single()

     if (gError) { console.error('Split bill error:', gError); return toast.error('Gagal simpan grup: ' + gError.message) }

     const itemsToInsert = splitItems.map((item, idx) => ({
        split_bill_id: group.id,
        item_name: item.name,
        price: item.price,
        item_type: item.itemType,
        user_id: item.itemType === 'food' ? itemAssignments[idx] : null
     }))

     const { error: iError } = await supabase.from('split_bill_items').insert(itemsToInsert)
     if (iError) toast.error('Gagal simpan item: ' + iError.message)
     else {
        toast.success('Split Bill disimpan! 🎉')
        setIsOcrDrawerOpen(false)
        setSplitItems([])
        setItemAssignments({})
        setAssignmentStep('edit')
        setSplitBillPaymentInfo('')
        fetchSplitBills()
     }
  }

  const removeSplitItem = (idx: number) => {
    setSplitItems(current => current.filter((_, i) => i !== idx))
    // Clean up assignment for removed item
    setItemAssignments(prev => {
      const next = { ...prev }
      delete next[idx]
      return next
    })
  }

  const addManualSplitItem = () => {
    setSplitItems(current => [...current, { name: 'Item Baru', price: 0, users: [], itemType: 'food' }])
  }

  const toggleItemSign = (idx: number) => {
    setSplitItems(current => {
      const newItems = [...current]
      newItems[idx].price = -newItems[idx].price
      return newItems
    })
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
      </div>

      {activeTab === 'home' && (
        <div className="bg-white px-5 pb-4 border-b border-slate-100 flex gap-4 sticky top-[80px] z-10">
          <button 
            onClick={() => setActiveView('personal')}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-tighter transition-all border-b-2 ${activeView === 'personal' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400 opacity-60'}`}
          >
            Personal 🍱
          </button>
          <button 
            onClick={() => setActiveView('teman_makan')}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-tighter transition-all border-b-2 ${activeView === 'teman_makan' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400 opacity-60'}`}
          >
            Teman Makan 🤝
          </button>
          <button 
            onClick={() => setActiveView('split_bill')}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-tighter transition-all border-b-2 ${activeView === 'split_bill' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400 opacity-60'}`}
          >
            Split Bill 🧾
          </button>
        </div>
      )}

      <div className="p-5 space-y-6 flex-1">
        {activeTab === 'home' ? (
          <>
            {activeView === 'personal' && (
              <>
                {/* Header Welcome */}
            <div className="mb-2">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Halo, {profileName || 'Agus'}! 👋</h1>
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

            {/* Search Bar */}
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Cari makanan favoritmu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-2xl leading-5 bg-slate-100 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:text-sm transition-all shadow-sm font-medium"
              />
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
            )}

            {activeView === 'teman_makan' && (
              <div className="space-y-6">
                {!activeTmGroup ? (
                  <>
                    <div className="bg-linear-to-r from-amber-500 to-orange-500 rounded-[32px] p-6 text-white shadow-xl shadow-amber-500/20">
                      <h3 className="text-xl font-black mb-1">Makan Rame-Rame! 🤝</h3>
                      <p className="text-white/80 text-xs font-medium mb-4 italic">Malas pesan sendiri? Gabung temen yang lagi pesan ojol aja!</p>
                      <Button
                        onClick={() => setIsTmCreateOpen(true)}
                        className="w-full h-12 rounded-2xl bg-white text-amber-600 font-black text-sm shadow-lg hover:bg-amber-50 transition-all border-0"
                      >
                        + BUAT ROOM BARU
                      </Button>
                    </div>

                    <div className="space-y-4 pb-20">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Room Tersedia</h4>
                      {tmGroups.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                          <p className="text-slate-400 font-bold italic text-sm">Belum ada room terbuka...</p>
                        </div>
                      ) : (
                        tmGroups.map(group => (
                          <div
                            key={group.id}
                            onClick={() => handleSelectTmGroup(group)}
                            className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer hover:border-amber-300"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="bg-amber-100 text-amber-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">OWNER: {group.profiles?.name?.split(' ')[0] || 'Agus'}</span>
                                <span className="text-[10px] text-slate-400 font-medium">{getRelativeTime(group.created_at)}</span>
                              </div>
                              <h4 className="font-black text-slate-800 text-base truncate">{group.title}</h4>
                              {group.bank_info && (
                                <p className="text-[10px] text-slate-400 font-medium mt-1 truncate">{group.bank_info}</p>
                              )}
                            </div>
                            <div className="bg-slate-50 p-3 rounded-2xl flex flex-col items-center">
                              <span className="text-[10px] font-black text-slate-400 leading-none">JOIN</span>
                              <ChevronRight className="w-5 h-5 text-amber-500 mt-1" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-6 pb-32">
                    <button 
                      onClick={() => setActiveTmGroup(null)}
                      className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-amber-600 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" /> Kembali ke List
                    </button>

                    <div className="bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-6 opacity-10">
                          <ShoppingBag className="w-20 h-20" />
                       </div>
                       <div className="relative z-10">
                         <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-tight mb-2">{activeTmGroup.title}</h3>
                         <p className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2 mb-3">
                            Hosted by {activeTmGroup.profiles?.name} 👑
                         </p>

                         {/* Payment Info */}
                         {activeTmGroup.bank_info && (
                           <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mb-4">
                              <div className="flex items-start gap-2">
                                 <div className="bg-amber-100 p-1.5 rounded-lg">
                                    <CreditCard className="w-4 h-4 text-amber-600" />
                                 </div>
                                 <div className="flex-1">
                                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider mb-1">Info Pembayaran</p>
                                    <p className="text-xs font-bold text-slate-700 leading-tight">{activeTmGroup.bank_info}</p>
                                 </div>
                              </div>
                           </div>
                         )}

                         <div className="flex gap-2">
                            <div className="bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 flex items-center gap-2">
                               <span className="text-xs font-black text-amber-700">{tmOrders.length} Orang Gabung</span>
                            </div>
                            {activeTmGroup.deadline && (
                              <div className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span className="text-[10px] font-black text-slate-600">{new Date(activeTmGroup.deadline).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})}</span>
                              </div>
                            )}
                            {activeTmGroup.creator_id === session.user.id && (
                               activeTmGroup.status === 'finished' ? (
                                 <div className="bg-slate-200 text-slate-500 px-3 py-1.5 rounded-xl text-xs font-black cursor-not-allowed">
                                    ROOM DITUTUP 🔒
                                 </div>
                               ) : (
                                 <button
                                   onClick={handleFinishTmGroup}
                                   className="bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-black active:scale-95 transition-all shadow-lg"
                                 >
                                    TUTUP ROOM ✅
                                 </button>
                               )
                            )}
                         </div>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Pesanan Terkumpul</h4>
                       {tmOrders.length === 0 ? (
                         <div className="bg-slate-50/50 p-6 rounded-[32px] border-2 border-dashed border-slate-200 text-center">
                            <p className="text-slate-400 font-bold text-xs italic">Belum ada yang pesan nih...</p>
                         </div>
                       ) : (
                         <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden">
                            {tmOrders.map((o, idx) => (
                               <div key={idx} className={`p-4 flex items-center justify-between ${idx !== tmOrders.length - 1 ? 'border-b border-slate-50' : ''}`}>
                                  <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-sm">🍱</div>
                                     <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{o.profiles?.name}</p>
                                        <p className="font-bold text-slate-800 text-sm leading-tight">{o.menu_name}</p>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                     <p className="font-black text-slate-900 text-sm">{formatRupiah(o.price)}</p>
                                     {(activeTmGroup.status === 'open' && (o.user_id === session.user.id || activeTmGroup?.creator_id === session.user.id)) && (
                                       <button 
                                         onClick={() => handleDeleteTmOrder(o.id)}
                                         className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-full transition-colors active:scale-95"
                                         title="Hapus Pesanan"
                                       >
                                         <Trash2 size={14} strokeWidth={3} />
                                       </button>
                                     )}
                                  </div>
                               </div>
                            ))}
                            <div className="bg-slate-50 p-4 flex justify-between items-center">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Patungan</p>
                               <p className="font-black text-slate-900 text-base">{formatRupiah(tmOrders.reduce((acc, o) => acc + o.price, 0))}</p>
                            </div>
                         </div>
                       )}
                    </div>

                    {/* Join Actions */}
                    {activeTmGroup.status === 'open' ? (
                      <div className="pt-4 space-y-3 border-t border-slate-100">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Pesanan Custom Kamu:</h4>
                        
                        <div className="space-y-3">
                          <Input 
                            placeholder="Makan apa? (misal: Sate Telor)"
                            value={joinTmItemName}
                            onChange={(e) => setJoinTmItemName(e.target.value)}
                          />
                          <Input 
                            type="number"
                            placeholder="Harganya berapa?"
                            value={joinTmItemPrice}
                            onChange={(e) => setJoinTmItemPrice(e.target.value)}
                          />
                          <Button 
                            className="w-full bg-slate-900 text-white rounded-xl h-12"
                            disabled={!joinTmItemName.trim() || !joinTmItemPrice.trim()}
                            onClick={() => {
                              handleJoinTmOrder(joinTmItemName.trim(), parseInt(joinTmItemPrice))
                              setJoinTmItemName('')
                              setJoinTmItemPrice('')
                            }}
                          >
                            GABUNG PESANAN
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-4 space-y-3 border-t border-slate-100 text-center">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                           <p className="text-sm font-black text-slate-400">Room Sudah Ditutup 🙏</p>
                           <p className="text-[10px] font-bold text-slate-400 mt-1">Kamu sudah tidak bisa pesan atau edit ya.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeView === 'split_bill' && (
              <div className="space-y-6">
                <div className="bg-linear-to-r from-pink-500 to-rose-500 rounded-[32px] p-6 text-white shadow-xl shadow-pink-500/20">
                  <h3 className="text-xl font-black mb-1">Split Bill 🤖</h3>
                  <p className="text-white/80 text-xs font-medium mb-4 italic">Foto struk makan, biar AI yang hitung patungannya!</p>
                  
                  <div className="flex gap-2">
                    <input 
                      type="file" 
                      id="ocr-upload" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleOcrProcess(file)
                          setIsOcrDrawerOpen(true)
                        }
                      }}
                    />
                    <label 
                      htmlFor="ocr-upload"
                      className="flex-1 h-12 rounded-2xl bg-white text-pink-600 font-black text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                    >
                      <Camera className="w-4 h-4" /> SCAN STRUK
                    </label>
                  </div>
                </div>

                <div className="space-y-4 pb-20">
                   {/* Active Split Bills */}
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Patungan Yang Aktif:</h4>
                   {splitBills.filter(b => b.status === 'open').length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 font-bold italic text-sm">Belum ada patungan aktif.</p>
                    </div>
                   ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {splitBills.filter(b => b.status === 'open').map(bill => (
                        <div 
                          key={bill.id}
                          className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-xs text-left group hover:border-pink-200 transition-all"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Dibuat oleh {bill.profiles?.name?.split(' ')[0] || 'Agus'}</p>
                              <h5 className="font-black text-slate-800 text-base leading-tight">{bill.title}</h5>
                            </div>
                            <div className="bg-pink-50 text-pink-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                              ACTIVE ⚡️
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {getRelativeTime(bill.created_at)}</span>
                              <span>•</span>
                              <button 
                                onClick={() => {
                                  setSelectedSplitBill(bill)
                                  fetchRecapItems(bill.id)
                                  setIsRecapDrawerOpen(true)
                                }}
                                className="text-pink-500 active:scale-95"
                              >
                                LIHAT REKAP →
                              </button>
                            </div>
                            {bill.creator_id === session.user.id && (
                              <button 
                                onClick={() => handleFinishSplitBill(bill.id)}
                                className="bg-slate-800 text-white px-3 py-1 rounded-xl text-[10px] font-black active:scale-95 transition-all"
                              >
                                TUTUP ✅
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                   )}

                   {/* Finished Split Bills */}
                   {splitBills.filter(b => b.status === 'finished').length > 0 && (
                     <>
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mt-6">Riwayat Patungan:</h4>
                       <div className="grid grid-cols-1 gap-4">
                         {splitBills.filter(b => b.status === 'finished').map(bill => (
                           <button 
                             key={bill.id}
                             onClick={() => {
                               setSelectedSplitBill(bill)
                               fetchRecapItems(bill.id)
                               setIsRecapDrawerOpen(true)
                             }}
                             className="bg-white/60 p-5 rounded-[32px] border border-slate-100 shadow-xs text-left group active:scale-[0.98] transition-all opacity-70 hover:opacity-100"
                           >
                             <div className="flex justify-between items-start mb-3">
                               <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Dibuat oleh {bill.profiles?.name?.split(' ')[0] || 'Agus'}</p>
                                 <h5 className="font-black text-slate-800 text-base leading-tight">{bill.title}</h5>
                               </div>
                               <div className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                                 SELESAI 🔒
                               </div>
                             </div>
                             <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                               <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {getRelativeTime(bill.created_at)}</span>
                               <span>•</span>
                               <span className="text-slate-500">LIHAT REKAP →</span>
                             </div>
                           </button>
                         ))}
                       </div>
                     </>
                   )}
                </div>
              </div>
            )}
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

      {/* Teman Makan Create Room Drawer */}
      <Drawer open={isTmCreateOpen} onOpenChange={setIsTmCreateOpen}>
        <DrawerContent className="max-w-[430px] mx-auto rounded-t-[40px] px-6 pb-10 border-0 shadow-2xl">
          <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mt-4 mb-4" />
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-2xl font-black text-slate-800">Buat Room Baru 🤝</DrawerTitle>
            <DrawerDescription className="text-slate-500 font-medium">Ajak temen-temen makan rame-rame!</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Judul Room*</Label>
              <Input
                placeholder="Mau makan apa bareng temen?"
                value={newTmTitle}
                onChange={(e) => setNewTmTitle(e.target.value)}
                className="rounded-2xl h-14 bg-slate-50 border-slate-100 focus:bg-white transition-all text-base font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Info Pembayaran (Opsional)</Label>
              <textarea
                placeholder="Nomor rekening & nama bank buat transfer (opsional)"
                value={newTmBank}
                onChange={(e) => setNewTmBank(e.target.value)}
                className="w-full min-h-[80px] p-4 bg-slate-50 border border-slate-100 rounded-[28px] text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all font-medium placeholder:text-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Deadline Order (Opsional)</Label>
              <Input
                type="time"
                value={newTmDeadline}
                onChange={(e) => setNewTmDeadline(e.target.value)}
                className="rounded-2xl h-14 bg-slate-50 border-slate-100 focus:bg-white transition-all text-base font-bold"
              />
            </div>
          </div>

          <DrawerFooter className="px-0 pt-2">
            <Button
              onClick={handleCreateTmGroup}
              disabled={tmCreating || !newTmTitle.trim()}
              className="w-full h-16 rounded-3xl bg-slate-900 text-white font-black text-lg shadow-2xl active:scale-95 transition-all disabled:opacity-50"
            >
              {tmCreating ? (
                <div className="flex items-center gap-2">
                   <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                   Membuat Room...
                </div>
              ) : (
                "BUAT ROOM SEKARANG 🚀"
              )}
            </Button>
            <Button variant="ghost" onClick={() => setIsTmCreateOpen(false)} className="w-full h-12 text-slate-400 font-bold">Batal</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

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
                placeholder="Nama makanan yang ingin dipesan" 
                value={manualFoodName}
                onChange={(e) => setManualFoodName(e.target.value)}
                className="rounded-2xl h-14 bg-slate-50 border-slate-100 focus:bg-white transition-all text-base font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Estimasi Harga (Rp)</Label>
              <Input 
                type="number"
                placeholder="Estimasi harga makanan" 
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
                      <p className="font-black text-slate-800 text-xs">Informasi Pembayaran (Wajib Pilih)</p>
                      <p className="text-[10px] text-amber-700 font-medium leading-relaxed">Silakan pilih target transfer & upload bukti:</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setTransferTo('Bahul')}
                    className={`px-4 py-3 rounded-xl border-2 font-black text-xs transition-all ${transferTo === 'Bahul' ? 'bg-amber-500 border-amber-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500'}`}
                  >
                    BAHUL (BCA)
                  </button>
                  <button 
                    onClick={() => setTransferTo('Masber')}
                    className={`px-4 py-3 rounded-xl border-2 font-black text-xs transition-all ${transferTo === 'Masber' ? 'bg-amber-500 border-amber-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500'}`}
                  >
                    MASBER (BCA)
                  </button>
                </div>

                {transferTo && (
                  <div className="space-y-2">
                    <div className="bg-white/60 p-3 rounded-2xl border border-amber-200/50 flex justify-between items-center transition-all animate-in zoom-in-95">
                        <div>
                          <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest">
                            {transferTo === 'Bahul' ? 'BCA - MISBAKHUL UMAM' : 'BCA - BERNADUS KOPONG'}
                          </p>
                          <p className="font-black text-slate-800 text-sm">
                            {transferTo === 'Bahul' ? '2381149902' : '0280248151'}
                          </p>
                        </div>
                        <button onClick={() => copyToClipboard(transferTo === 'Bahul' ? '2381149902' : '0280248151', 'Nomor Rekening')} className="p-2 bg-white rounded-xl shadow-sm text-amber-600 active:scale-90 transition-all border border-amber-100">
                          <Copy className="w-4 h-4" />
                        </button>
                    </div>
                  </div>
                )}

                <div className="h-px bg-amber-200/50 w-full" />

                <div className="space-y-2">
                   <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                      <p className="text-[9px] font-black text-amber-800 uppercase">Input Bukti Foto</p>
                   </div>
                   <input 
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
                      className={`w-full h-14 border-dashed border-2 rounded-2xl font-black transition-all ${proofFile ? 'border-green-500 bg-green-50 text-green-700' : 'border-amber-300 bg-white text-amber-700 hover:bg-amber-50'}`}
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
                placeholder="Catatan tambahan untuk pesanan (opsional)" 
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
                        {commOrder.profiles?.name?.split(' ')[0] || 'Agus'} • {getRelativeTime(commOrder.created_at)}
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
                          toast.success(`Nyontek pesanan ${commOrder.profiles?.name?.split(' ')[0] || 'Agus'} dikit! 😂`)
                        } else {
                          const manualItem: Menu = {
                            id: `duplicate-${Date.now()}`,
                            food_name: commOrder.food_name,
                            price: commOrder.price,
                            category: 'Lainnya'
                          }
                          setCart(prev => [...prev, manualItem])
                          toast.success(`Nyontek pesanan ${commOrder.profiles?.name?.split(' ')[0] || 'Agus'} dikit! 😂`)
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
                    placeholder="Nominal yang ingin ditarik"
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

      {/* OCR PROCESSING DRAWER */}
      <Drawer open={isOcrDrawerOpen} onOpenChange={setIsOcrDrawerOpen}>
        <DrawerContent className="max-w-[430px] mx-auto rounded-t-[40px] px-6 pb-12 border-0 shadow-2xl h-[85vh]">
          <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mt-4 mb-4" />
          
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
              {assignmentStep === 'edit' && "Edit Struk 🧾"}
              {assignmentStep === 'assign' && "Siapa Makan Apa? 👥"}
              {assignmentStep === 'payment' && "Info Pembayaran 💳"}
              {assignmentStep === 'summary' && "Hasil Patungan 💰"}
            </DrawerTitle>
            <DrawerDescription className="text-xs text-slate-400 font-medium">
              {assignmentStep === 'edit' && "Cek lagi nama dan harga item yang terbaca AI."}
              {assignmentStep === 'assign' && "Pilih siapa yang pesan masing-masing menu."}
              {assignmentStep === 'payment' && "Masukkan info transfer agar teman kamu tahu bayar ke mana."}
              {assignmentStep === 'summary' && "Review hasil pembagian patungan sebelum simpan."}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pt-4 scrollbar-hide">
             {ocrLoading ? (
               <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-pink-100 border-t-pink-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <Zap className="w-6 h-6 text-pink-500 animate-pulse" />
                    </div>
                  </div>
                  <p className="font-black text-slate-800 text-lg">AI lagi baca strukmu...</p>
                  <p className="text-xs text-slate-400 font-bold uppercase animate-pulse">Mohon tunggu sebentar</p>
               </div>
             ) : (
               <>
                 {assignmentStep === 'edit' && (
                   <div className="space-y-6">
                     {ocrImage && (
                       <div className="relative rounded-3xl overflow-hidden border-2 border-slate-100 h-48 bg-slate-50">
                          <img src={ocrImage} alt="Receipt" className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent flex items-bottom p-4">
                             <p className="text-white text-[10px] font-black uppercase tracking-widest">Preview Struk</p>
                          </div>
                       </div>
                     )}

                     <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hasil Deteksi ({splitItems.length})</h4>
                        {splitItems.length === 0 ? (
                          <p className="text-center py-10 text-slate-400 italic">Maaf, AI gagal baca struknya. Coba foto lebih jelas ya!</p>
                        ) : (
                          <div className="space-y-2">
                            {splitItems.map((item, idx) => (
                               <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex justify-between items-center group hover:border-pink-300 transition-all">
                                  <div className="flex-1 mr-4">
                                     <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase ${item.itemType === 'shared' ? 'bg-amber-100 text-amber-600' : 'bg-pink-100 text-pink-600'}`}>
                                           {item.itemType === 'shared' ? 'BIAYA BERSAMA' : 'MENU'}
                                        </span>
                                     </div>
                                     <input 
                                       value={item.name}
                                       onChange={(e) => {
                                          const newItems = [...splitItems]
                                          newItems[idx].name = e.target.value
                                          setSplitItems(newItems)
                                       }}
                                       className="font-bold text-slate-800 text-sm focus:outline-none bg-transparent w-full"
                                     />
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                     <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                                       <button 
                                         onClick={() => toggleItemSign(idx)}
                                         className={`w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black transition-all ${item.price < 0 ? 'bg-emerald-500 text-white shadow-xs' : 'bg-slate-200 text-slate-600'}`}
                                       >
                                         {item.price < 0 ? '−' : '+'}
                                       </button>
                                       <input 
                                         type="number"
                                         value={Math.abs(item.price)}
                                         onChange={(e) => {
                                            const val = Math.abs(parseInt(e.target.value) || 0)
                                            const newItems = [...splitItems]
                                            newItems[idx].price = item.price < 0 ? -val : val
                                            setSplitItems(newItems)
                                         }}
                                         className={`font-black text-sm w-16 text-right focus:outline-none bg-transparent ${item.price < 0 ? 'text-emerald-600' : 'text-slate-900'}`}
                                       />
                                     </div>
                                     <button 
                                       onClick={() => removeSplitItem(idx)}
                                       className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                     >
                                       <Trash2 className="w-4 h-4" />
                                     </button>
                                  </div>
                               </div>
                            ))}
                          </div>
                        )}
                        
                        <button 
                          onClick={addManualSplitItem}
                          className="w-full py-4 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center gap-2 text-slate-400 font-bold hover:bg-slate-50 hover:border-pink-200 hover:text-pink-500 transition-all text-sm mb-4"
                        >
                          <Plus className="w-4 h-4" />
                          Tambah Item Manual
                        </button>
                     </div>
                     
                     <div className="pt-6 space-y-3 border-t border-slate-100">
                        <div className="flex justify-between items-center px-2">
                           <p className="text-sm font-black text-slate-800 uppercase tracking-widest">Total Tagihan</p>
                           <p className="text-xl font-black text-pink-600">
                              {formatRupiah(splitItems.reduce((acc, i) => acc + i.price, 0))}
                           </p>
                        </div>
                        <Button 
                          onClick={() => setAssignmentStep('assign')}
                          className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black shadow-xl shadow-slate-900/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
                        >
                          Lanjut Pilih Orang →
                        </Button>
                     </div>
                   </div>
                 )}

                 {assignmentStep === 'assign' && (
                   <div className="space-y-6">
                     <div className="bg-pink-50 p-4 rounded-3xl border border-pink-100">
                        <p className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-1">Tips 💡</p>
                        <p className="text-xs text-slate-700 font-medium italic">Biaya bersama (pajak, diskon, dll) tidak perlu dipilih orangnya, nanti otomatis dibagi rata ke semua orang yang ada di daftar.</p>
                     </div>

                     <div className="space-y-4">
                        {splitItems.map((item, idx) => (
                           item.itemType === 'food' && (
                             <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm transition-all hover:border-pink-200">
                                <div className="flex justify-between items-start mb-4">
                                   <div className="flex-1 pr-2">
                                      <h6 className="font-black text-slate-800 text-sm leading-tight wrap-break-word">{item.name}</h6>
                                      <p className="text-xs font-bold text-slate-400 mt-0.5">{formatRupiah(item.price)}</p>
                                   </div>
                                   <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 shrink-0">
                                      <Users className="w-4 h-4 text-slate-400" />
                                   </div>
                                </div>

                                <div className="relative">
                                   <select 
                                     value={itemAssignments[idx] || ""}
                                     onChange={(e) => setItemAssignments(prev => ({ ...prev, [idx]: e.target.value }))}
                                     className="w-full h-12 rounded-2xl bg-slate-50 border-0 px-4 font-black text-xs text-slate-800 appearance-none focus:ring-2 focus:ring-pink-500/20 transition-all cursor-pointer"
                                   >
                                      <option value="" disabled>Pilih siapa yang makan...</option>
                                      {allProfiles.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                      ))}
                                   </select>
                                   <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                      <ChevronDown className="w-4 h-4 text-slate-400" />
                                   </div>
                                </div>
                             </div>
                           )
                        ))}
                     </div>

                     <div className="pt-6 space-y-3 border-t border-slate-100">
                        <div className="flex gap-3">
                           <Button 
                             variant="ghost"
                             onClick={() => setAssignmentStep('edit')}
                             className="flex-1 h-14 rounded-2xl bg-slate-50 text-slate-400 font-black hover:bg-slate-100"
                           >
                              ← KEMBALI
                           </Button>
                           <Button 
                             onClick={() => {
                                const foodIndices = splitItems.map((item, idx) => item.itemType === 'food' ? idx : -1).filter(i => i >= 0);
                                const missingAssignment = foodIndices.some(idx => !itemAssignments[idx]);
                                if (missingAssignment) return toast.error('Semua item makanan harus dipilih orangnya!');
                                setAssignmentStep('payment');
                             }}
                             className="flex-2 h-14 rounded-2xl bg-slate-900 text-white font-black shadow-xl shadow-slate-900/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
                           >
                             Lanjut →
                           </Button>
                        </div>
                     </div>
                   </div>
                 )}

                 {assignmentStep === 'payment' && (
                   <div className="space-y-6">
                      <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100">
                         <div className="flex items-center gap-3 mb-4">
                            <div className="bg-amber-100 p-2 rounded-xl">
                               <CreditCard className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                               <p className="font-black text-sm text-slate-800">Transfer ke mana?</p>
                               <p className="text-[10px] text-slate-400 font-medium">Contoh: BCA 1234567890 a.n. Budi</p>
                            </div>
                         </div>
                         <Input 
                           placeholder="BCA 1234567890 a.n. Budi"
                           value={splitBillPaymentInfo}
                           onChange={(e) => setSplitBillPaymentInfo(e.target.value)}
                           className="bg-white"
                         />
                      </div>

                      <div className="flex gap-3">
                         <Button 
                           onClick={() => setAssignmentStep('assign')}
                           variant="outline"
                           className="flex-1 h-14 rounded-2xl font-black text-sm"
                         >
                           ← Kembali
                         </Button>
                         <Button 
                           onClick={() => {
                              if (!splitBillPaymentInfo.trim()) return toast.error('Info pembayaran harus diisi!');
                              setAssignmentStep('summary');
                           }}
                           className="flex-2 h-14 rounded-2xl bg-slate-900 text-white font-black shadow-xl shadow-slate-900/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
                         >
                           Lihat Recap →
                         </Button>
                      </div>
                   </div>
                 )}

                 {assignmentStep === 'summary' && (
                    <div className="space-y-6">
                       <div className="space-y-4">
                          {(() => {
                             const assignedUserIds = [...new Set(Object.values(itemAssignments))];
                             const sharedTotal = splitItems.filter(i => i.itemType === 'shared').reduce((acc, i) => acc + i.price, 0);
                             const splitShared = assignedUserIds.length > 0 ? Math.floor(sharedTotal / assignedUserIds.length) : 0;

                             return assignedUserIds.map(uid => {
                                const profile = allProfiles.find(p => p.id === uid);
                                const foodTotal = splitItems.reduce((acc, item, idx) => {
                                   return (item.itemType === 'food' && itemAssignments[idx] === uid) ? acc + item.price : acc;
                                }, 0);
                                const total = foodTotal + splitShared;

                                return (
                                   <div key={uid} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-xs flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                         <div className="w-10 h-10 bg-pink-100 rounded-2xl flex items-center justify-center text-pink-600 font-black uppercase">
                                            {profile?.name?.[0] || "?"}
                                         </div>
                                         <div>
                                            <h6 className="font-black text-slate-800 text-sm leading-tight">{profile?.name}</h6>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                                               {formatRupiah(foodTotal)} + {formatRupiah(splitShared)} (beban)
                                            </p>
                                         </div>
                                      </div>
                                      <div className="text-right">
                                         <p className="font-black text-pink-600 text-base">{formatRupiah(total)}</p>
                                      </div>
                                   </div>
                                )
                             })
                          })()}
                       </div>

                       <div className="pt-6 space-y-3 border-t border-slate-100">
                          <div className="flex gap-3">
                             <Button 
                               variant="ghost"
                               onClick={() => setAssignmentStep('assign')}
                               className="flex-1 h-14 rounded-2xl bg-slate-50 text-slate-400 font-black hover:bg-slate-100"
                             >
                                ← KEMBALI
                             </Button>
                             <Button 
                               onClick={handleSaveSplitBill}
                               className="flex-2 h-14 rounded-2xl bg-slate-900 text-white font-black shadow-xl shadow-pink-500/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
                             >
                               SIMPAN BILL 🎉
                             </Button>
                          </div>
                       </div>
                    </div>
                 )}
               </>
             )}
          </div>
        </DrawerContent>
      </Drawer>

        {/* PARTIAL CLAIM DRAWER */}
      {/* RECAP DRAWER (View Only Summary) */}
      <Drawer open={isRecapDrawerOpen} onOpenChange={setIsRecapDrawerOpen}>
        <DrawerContent className="max-w-[430px] mx-auto rounded-t-[40px] px-6 pb-12 border-0 shadow-2xl h-[80vh]">
          <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mt-4 mb-4" />
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
               Rekap Patungan 📝
            </DrawerTitle>
            <DrawerDescription className="text-slate-500 font-medium font-outfit">
               Rincian pembagian tagihan {selectedSplitBill?.title || 'ini'}.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pt-4 scrollbar-hide">
             {/* Payment Info */}
             {selectedSplitBill?.bank_info && (
               <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                  <div className="flex items-start gap-2">
                     <div className="bg-amber-100 p-1.5 rounded-lg">
                        <CreditCard className="w-4 h-4 text-amber-600" />
                     </div>
                     <div className="flex-1">
                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider mb-1">Transfer Ke</p>
                        <p className="text-xs font-bold text-slate-700 leading-tight">{selectedSplitBill.bank_info}</p>
                     </div>
                  </div>
               </div>
             )}
             {(() => {
                const foodItems = recapItems.filter(i => i.item_type === 'food');
                const sharedItems = recapItems.filter(i => i.item_type === 'shared');
                const sharedTotal = sharedItems.reduce((acc, i) => acc + (parseFloat(i.price) || 0), 0);
                
                // Group food items by user
                const userTotals: Record<string, {name: string, foodTotal: number, items: any[]}> = {};
                foodItems.forEach(item => {
                   const uid = item.user_id;
                   const name = item.profiles?.name || 'Anonim';
                   if (!userTotals[uid]) {
                      userTotals[uid] = { name, foodTotal: 0, items: [] };
                   }
                   userTotals[uid].foodTotal += parseFloat(item.price) || 0;
                   userTotals[uid].items.push(item);
                });

                const participantCount = Object.keys(userTotals).length;
                const splitShared = participantCount > 0 ? Math.floor(sharedTotal / participantCount) : 0;

                return (
                   <>
                      {/* Shared Costs Summary */}
                      {sharedItems.length > 0 && (
                        <div className="bg-amber-50 rounded-3xl p-5 border border-amber-100/50">
                           <h6 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3">Biaya Bersama (Dibagi Rata)</h6>
                           <div className="space-y-2">
                              {sharedItems.map(item => (
                                <div key={item.id} className="flex justify-between items-center">
                                   <span className="text-xs font-bold text-slate-600">{item.item_name}</span>
                                   <span className={`text-xs font-black ${parseFloat(item.price) < 0 ? 'text-emerald-500' : 'text-slate-800'}`}>
                                      {formatRupiah(parseFloat(item.price))}
                                   </span>
                                </div>
                              ))}
                              <div className="pt-2 mt-2 border-t border-amber-200/50 flex justify-between items-center">
                                 <span className="text-xs font-black text-amber-700 uppercase">Total Dibagi ke {participantCount} orang</span>
                                 <span className="text-sm font-black text-amber-700">{formatRupiah(sharedTotal)}</span>
                              </div>
                           </div>
                        </div>
                      )}

                      {/* Participant Totals */}
                      <div className="space-y-4">
                         <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pembagian Per Orang:</h6>
                         {Object.entries(userTotals).map(([uid, data]) => {
                            const total = data.foodTotal + splitShared;
                            return (
                               <div key={uid} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-xs">
                                  <div className="flex items-center justify-between mb-4">
                                     <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-pink-100 rounded-2xl flex items-center justify-center text-pink-600 font-black uppercase">
                                           {data.name[0]}
                                        </div>
                                        <div>
                                           <h6 className="font-black text-slate-800 text-sm leading-tight">{data.name}</h6>
                                           <p className="text-[10px] font-bold text-pink-500 uppercase mt-0.5">Total: {formatRupiah(total)}</p>
                                        </div>
                                     </div>
                                     <div className="text-right">
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Porsi Patungan</p>
                                        <p className="font-black text-slate-800 text-sm">{formatRupiah(total)}</p>
                                     </div>
                                  </div>

                                  <div className="space-y-1.5 pl-2 border-l-2 border-slate-50 py-1">
                                     {data.items.map(i => (
                                       <div key={i.id} className="flex justify-between items-center text-[10px] font-medium text-slate-500">
                                          <span>{i.item_name}</span>
                                          <span>{formatRupiah(parseFloat(i.price))}</span>
                                       </div>
                                     ))}
                                     <div className="flex justify-between items-center text-[10px] font-medium text-amber-600 italic">
                                        <span>Beban Bersama (1/{participantCount})</span>
                                        <span>{formatRupiah(splitShared)}</span>
                                     </div>
                                  </div>
                               </div>
                            );
                         })}
                      </div>
                   </>
                );
             })()}
          </div>

          <DrawerFooter className="px-0 mt-6">
            <Button onClick={() => setIsRecapDrawerOpen(false)} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black text-base shadow-xl active:scale-95 transition-all uppercase tracking-widest">
               Tutup Rekap
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      </div>
  )
}
