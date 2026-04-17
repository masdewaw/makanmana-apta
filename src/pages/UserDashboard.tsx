import { useEffect, useState, useRef } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { 
	MapPin, 
	ChevronRight, 
	LogOut, 
	ShoppingBag, 
	Banknote, 
	Star, 
	CheckCircle, 
	Search, 
	Plus, 
	Heart 
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '../components/ui/drawer'
import { Label } from '../components/ui/label'
import { Input } from '../components/ui/input'

import { useOrders } from '../hooks/useOrders'
import { useTardut } from '../hooks/useTardut'
import { useSplitBill } from '../hooks/useSplitBill'
import { useTemanMakan } from '../hooks/useTemanMakan'

import { CartDrawer } from '../components/organisms/CartDrawer'
import { OrderCard } from '../components/molecules/OrderCard'
import { TardutDrawer } from '../components/organisms/TardutDrawer'
import { TemanMakanList } from '../components/organisms/TemanMakanList'
import { TemanMakanDrawer } from '../components/organisms/TemanMakanDrawer'
import { CreateTmRoomDrawer } from '../components/organisms/CreateTmRoomDrawer'
import { SplitBillList } from '../components/organisms/SplitBillList'
import { SplitBillRecapDrawer } from '../components/organisms/SplitBillRecapDrawer'
import { OcrDrawer } from '../components/organisms/OcrDrawer'
import { InspirationDrawer } from '../components/organisms/InspirationDrawer'
import TrackingMap from '../components/molecules/TrackingMap'

import { Menu, TemanMakanGroup, SplitBill } from '../types'

interface CartItem extends Menu {
	quantity: number
}

export default function UserDashboard({ session }: { session: Session }) {
	// Standard State
	const [profileName, setProfileName] = useState('')
	const [menus, setMenus] = useState<Menu[]>([])
	const [searchQuery, setSearchQuery] = useState('')
	const [activeTab, setActiveTab] = useState<'home' | 'riwayat'>('home')
	const [activeView, setActiveView] = useState<'personal' | 'teman_makan' | 'split_bill'>('personal')
	const [recommendation, setRecommendation] = useState<Menu | null>(null)
	const [communityOrders, setCommunityOrders] = useState<any[]>([])
	const [isCommunityDrawerOpen, setIsCommunityDrawerOpen] = useState(false)
	const [selectedCategory, setSelectedCategory] = useState('Semua')
	const [dbCategories, setDbCategories] = useState<string[]>([])
	const [favorites, setFavorites] = useState<string[]>([])
	const [cart, setCart] = useState<CartItem[]>([])
	const [allProfiles, setAllProfiles] = useState<{ id: string, name: string }[]>([])
	const [isDrawerOpen, setIsDrawerOpen] = useState(false)
	const [historyPage, setHistoryPage] = useState(1)
	const itemsPerPage = 10
	
	// Feature State
	const [activeTmGroup, setActiveTmGroup] = useState<TemanMakanGroup | null>(null)
	const [isTmCreateOpen, setIsTmCreateOpen] = useState(false)
	const [selectedSplitBill, setSelectedSplitBill] = useState<SplitBill | null>(null)
	const [isRecapDrawerOpen, setIsRecapDrawerOpen] = useState(false)
	const [isOcrDrawerOpen, setIsOcrDrawerOpen] = useState(false)
	const [ocrFile, setOcrFile] = useState<File | null>(null)
	const [trackingOb, setTrackingOb] = useState<string | null>(null)
	const [isTardutDrawerOpen, setIsTardutDrawerOpen] = useState(false)
	const [isManualDrawerOpen, setIsManualDrawerOpen] = useState(false)
	const [manualFoodName, setManualFoodName] = useState('')
	const [manualFoodPrice, setManualFoodPrice] = useState('')
	
	const fileInputRef = useRef<HTMLInputElement>(null)
	const categories = ['Semua', '🌟 Favoritku', ...dbCategories]

	// Hook usage
	const userId = session.user.id
	
	// Active Orders (polled)
	const { activeOrders, createOrder, isCreating: isPlacingOrder } = useOrders({ 
		role: 'user', 
		userId 
	})

	// Paginated History Orders
	const { historyOrders, totalCount: totalHistory } = useOrders({
		role: 'user',
		userId,
		status: 'done',
		limit: itemsPerPage,
		offset: (historyPage - 1) * itemsPerPage
	})
	const { requests: tardutRequests, submitTardut, isSubmitting: isSubmittingTardut } = useTardut({ userId })
	const { rooms: tmGroups } = useTemanMakan()
	const { bills: splitBills, finishBill } = useSplitBill()

	useEffect(() => {
		fetchProfile()
		fetchMenus()
		fetchCommunityOrders()
		fetchCategories()
		fetchFavorites()
		fetchAllProfiles()
	}, [])

	const fetchProfile = async () => {
		const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
		if (data) {
			setProfileName(data.name)
		}
	}

	const fetchMenus = async () => {
		const { data } = await supabase.from('menus').select('*').order('food_name')
		if (data) {
			setMenus(data)
			if (data.length > 0) {
				const random = data[Math.floor(Math.random() * data.length)]
				setRecommendation(random)
			}
		}
	}

	const fetchCategories = async () => {
		const { data } = await supabase.from('categories').select('name').order('name')
		if (data) setDbCategories(data.map(c => c.name))
	}

	const fetchFavorites = async () => {
		const { data } = await supabase.from('favorites').select('menu_id').eq('user_id', userId)
		if (data) setFavorites(data.map(f => f.menu_id))
	}

	const fetchAllProfiles = async () => {
		const { data } = await supabase.from('profiles').select('id, name').order('name')
		if (data) setAllProfiles(data)
	}

	const fetchCommunityOrders = async () => {
		const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
		const { data } = await supabase
			.from('orders')
			.select('*, profiles(name)')
			.gt('created_at', twoHoursAgo)
			.order('created_at', { ascending: false })
			.limit(10)
		if (data) setCommunityOrders(data)
	}

	const formatRupiah = (number: number) => {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number)
	}

	const toggleCart = (menu: Menu) => {
		setCart(prev => {
			const exists = prev.find(item => item.id === menu.id)
			if (exists) return prev.filter(item => item.id !== menu.id)
			return [...prev, { ...menu, quantity: 1 }]
		})
	}

	const updateQuantity = (id: string, delta: number) => {
		setCart(prev => prev.map(item => {
			if (item.id === id) {
				return { ...item, quantity: item.quantity + delta }
			}
			return item
		}).filter(item => item.quantity > 0))
	}

	const handleToggleFavorite = async (e: React.MouseEvent, menuId: string) => {
		e.stopPropagation()
		const isFavorite = favorites.includes(menuId)
		if (isFavorite) {
			setFavorites(prev => prev.filter(id => id !== menuId))
			await supabase.from('favorites').delete().eq('user_id', userId).eq('menu_id', menuId)
		} else {
			setFavorites(prev => [...prev, menuId])
			await supabase.from('favorites').insert({ user_id: userId, menu_id: menuId })
		}
	}

	const handleAddToCartManual = () => {
		if (!manualFoodName || !manualFoodPrice) {
			toast.error("Nama dan harga harus diisi!")
			return
		}
		const newItem: CartItem = {
			id: `manual-${Date.now()}`,
			food_name: manualFoodName,
			price: Number(manualFoodPrice),
			category: 'Lainnya',
			quantity: 1
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

	const getRelativeTime = (dateString: string) => {
		if (!dateString) return 'Baru saja'
		const date = new Date(dateString)
		if (isNaN(date.getTime())) return 'Baru saja'
		const diff = Date.now() - date.getTime()
		const mins = Math.floor(diff / 60000)
		if (mins < 1) return "Baru saja"
		if (mins < 60) return `${mins} menit lalu`
		const hours = Math.floor(mins / 60)
		if (hours < 24) return `${hours} jam lalu`
		return "Kemarin"
	}

	const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)

	return (
		<div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto w-full relative pb-32">
			{/* Header */}
			<div className="bg-white px-5 pt-6 pb-4 shadow-sm z-10 sticky top-0">
				<div className="flex justify-between items-center mb-4">
					<div className="flex items-center gap-2">
						<div className="bg-amber-100 p-2 rounded-full">
							<MapPin className="h-5 w-5 text-amber-600" />
						</div>
						<div>
							<p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">Lokasi Pengantaran</p>
							<h2 className="text-sm font-bold tracking-tight text-slate-800 flex items-center">Kantor Utama <ChevronRight className="h-3 w-3 ml-1 text-slate-400" /></h2>
						</div>
					</div>
					<button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition p-1">
						<LogOut className="h-6 w-6" />
					</button>
				</div>
			</div>

			{activeTab === 'home' && (
				<div className="bg-white px-5 pb-4 border-b border-slate-100 flex gap-4 sticky top-[80px] z-10">
					{(['personal', 'teman_makan', 'split_bill'] as const).map(view => (
						<button
							key={view}
							onClick={() => setActiveView(view)}
							className={`flex-1 py-3 text-[10px] font-black uppercase tracking-tighter transition-all border-b-2 ${activeView === view ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400 opacity-60'}`}
						>
							{view.replace('_', ' ')} {view === 'personal' ? '🍱' : view === 'teman_makan' ? '🤝' : '🧾'}
						</button>
					))}
				</div>
			)}

			<div className="p-5 space-y-6 flex-1">
				{activeTab === 'home' ? (
					<>
						{activeView === 'personal' && (
							<>
								<div className="mb-2">
									<h1 className="text-2xl font-black text-slate-800 tracking-tight">Halo, {profileName || 'User'}! 👋</h1>
									<p className="text-slate-500 font-medium">Lagi pengen makan apa hari ini?</p>
								</div>

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
										<div className="w-16 h-16 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white/10">🥘</div>
									</div>
									
									{communityOrders.length > 0 && (
										<div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
											<div className="flex -space-x-2 shrink-0">
												{communityOrders.slice(0, 3).map((o, idx) => (
													<div key={idx} className="w-6 h-6 rounded-full bg-white border-2 border-amber-600 flex items-center justify-center text-[8px] font-black text-amber-700 shadow-sm">
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

								{recommendation && (
									<div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
										<div className="flex items-center justify-between mb-3 px-1">
											<h3 className="font-bold text-slate-800 text-lg">Pilihan Spesial! 🌟</h3>
										</div>
										<div 
											onClick={() => toggleCart(recommendation)}
											className={`rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden cursor-pointer transition-all active:scale-[0.98] group ${cart.some(c => c.id === recommendation.id) ? 'bg-linear-to-br from-amber-600 to-orange-700 ring-4 ring-amber-500/20' : 'bg-linear-to-br from-amber-500 to-orange-500 hover:shadow-amber-500/30'}`}
										>
											<div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
												<Star className="h-40 w-40" fill="currentColor" />
											</div>
											{cart.some(c => c.id === recommendation.id) && (
												<div className="absolute top-6 right-6 bg-white text-amber-600 p-2 rounded-full shadow-2xl z-10 animate-in zoom-in-50 duration-500">
													<CheckCircle className="h-6 w-6" />
												</div>
											)}
											<p className="text-amber-100 font-black text-[10px] mb-2 uppercase tracking-[0.2em] opacity-80">Chef's Special Recommendation</p>
											<h2 className="text-2xl font-black drop-shadow-md leading-tight max-w-[80%] mb-4">{recommendation.food_name}</h2>
											<div className="flex items-center justify-between mt-auto">
												<div className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-2xl border border-white/10 font-black text-lg">
													{formatRupiah(recommendation.price)}
												</div>
												<span className="text-[10px] font-black uppercase tracking-widest bg-white text-amber-600 px-4 py-2 rounded-full shadow-lg group-hover:bg-slate-900 group-hover:text-white transition-colors">
													{cart.some(c => c.id === recommendation.id) ? 'DIPILIH ✅' : 'AMBIL INI! 😋'}
												</span>
											</div>
										</div>
									</div>
								)}

								{activeOrders.length > 0 && (
									<div>
										<div className="flex items-center justify-between mb-3 px-1">
											<h3 className="font-bold text-slate-800 text-lg">Pesanan Aktif 🛵</h3>
										</div>
										<div className="space-y-3">
											{activeOrders.map(order => (
												<OrderCard key={order.id} role="user" order={order} formatRupiah={formatRupiah} onTrack={setTrackingOb} />
											))}
										</div>
									</div>
								)}

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

								<div className="relative mb-6">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
									<input
										type="text"
										placeholder="Cari makanan..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-2xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm font-medium h-12"
									/>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div
										onClick={() => setIsManualDrawerOpen(true)}
										className="rounded-[32px] p-5 border-2 border-dashed border-amber-200 bg-amber-50/30 flex flex-col items-center justify-center text-center gap-2 cursor-pointer active:scale-95 transition-all group hover:bg-amber-50 hover:border-amber-400 min-h-[160px]"
									>
										<div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-amber-500"><Plus className="w-6 h-6" /></div>
										<p className="text-[10px] font-black text-amber-700 leading-tight uppercase tracking-tight">Ketik Manual ✏️</p>
									</div>

									{menus
										.filter(m => {
											const matchSearch = m.food_name.toLowerCase().includes(searchQuery.toLowerCase())
											const matchCat = selectedCategory === 'Semua' || (selectedCategory === '🌟 Favoritku' && favorites.includes(m.id)) || m.category === selectedCategory
											return matchSearch && matchCat
										})
										.map(m => {
											const isInCart = cart.some(c => c.id === m.id)
											return (
												<div
													key={m.id}
													onClick={() => toggleCart(m)}
													className={`rounded-[32px] p-4 border shadow-sm active:scale-95 transition-all cursor-pointer flex flex-col justify-between relative min-h-[160px] group ${isInCart ? 'border-amber-500 bg-amber-50 ring-4 ring-amber-500/10' : 'bg-white border-slate-100 hover:border-amber-200'}`}
												>
													{isInCart && <div className="absolute top-0 right-0 p-3 bg-amber-500 text-white rounded-bl-[20px]"><CheckCircle className="h-4 w-4" /></div>}
													<button onClick={(e) => handleToggleFavorite(e, m.id)} className={`absolute top-3 left-3 p-1.5 rounded-full backdrop-blur-sm ${favorites.includes(m.id) ? 'bg-pink-50 text-pink-500' : 'bg-white/50 text-slate-300'}`}>
														<Heart className={`w-4 h-4 ${favorites.includes(m.id) ? 'fill-pink-500' : ''}`} />
													</button>
													<div>
														<div className="w-10 h-10 rounded-xl bg-slate-50 mb-3 flex items-center justify-center text-xl">🍱</div>
														<h4 className="font-black text-xs text-slate-800 leading-tight line-clamp-2">{m.food_name}</h4>
													</div>
													<p className="text-slate-900 font-black text-sm">{formatRupiah(m.price)}</p>
												</div>
											)
										})}
								</div>
							</>
						)}

						{activeView === 'teman_makan' && (
							!activeTmGroup ? (
								<TemanMakanList
									rooms={tmGroups}
									onSelectRoom={setActiveTmGroup}
									onCreateRoom={() => setIsTmCreateOpen(true)}
								/>
							) : (
								<TemanMakanDrawer
									group={tmGroups.find(g => g.id === activeTmGroup.id) || activeTmGroup}
									currentUserId={userId}
									formatRupiah={formatRupiah}
									onBack={() => setActiveTmGroup(null)}
								/>
							)
						)}

						{activeView === 'split_bill' && (
							<SplitBillList
								bills={splitBills}
								currentUserId={userId}
								onSelectBill={(bill) => {
									setSelectedSplitBill(bill)
									setIsRecapDrawerOpen(true)
								}}
								onScanClick={() => fileInputRef.current?.click()}
								onFinishBill={finishBill}
							/>
						)}
					</>
				) : (
					<div className="space-y-6 pb-20">
						<h1 className="text-2xl font-black text-slate-800 tracking-tight">Riwayat Makan 🕰️</h1>
						{historyOrders.length === 0 ? (
							<div className="text-center py-16 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
								<p className="font-black text-slate-400">Belum ada riwayat pesanan.</p>
							</div>
						) : (
							<div className="space-y-4">
								{historyOrders.map(order => (
									<OrderCard key={order.id} order={order} role="user" formatRupiah={formatRupiah} />
								))}

								<div className="pt-4 flex items-center justify-between px-2">
									<Button
										disabled={historyPage === 1}
										onClick={() => setHistoryPage(p => p - 1)}
										className="h-10 px-4 bg-white text-slate-900 border border-slate-200 font-bold text-[10px]"
									>
										SEBELUMNYA
									</Button>
									<span className="text-[10px] font-black text-slate-400">HALAMAN {historyPage} / {Math.ceil(totalHistory / itemsPerPage) || 1}</span>
									<Button
										disabled={historyPage >= Math.ceil(totalHistory / itemsPerPage)}
										onClick={() => setHistoryPage(p => p + 1)}
										className="h-10 px-4 bg-white text-slate-900 border border-slate-200 font-bold text-[10px]"
									>
										BERIKUTNYA
									</Button>
								</div>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Floating Navigation & Cart */}
			{cart.length > 0 && activeTab === 'home' && (
				<div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 z-40">
					<div
						onClick={() => setIsDrawerOpen(true)}
						className="bg-black text-white p-4 rounded-[28px] shadow-2xl flex items-center justify-between"
					>
						<div className="flex items-center gap-4">
							<div className="bg-amber-500 p-2 rounded-2xl relative">
								<ShoppingBag className="h-6 w-6" />
								<span className="absolute -top-2 -right-2 bg-white text-black text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-black">{cart.reduce((a,b)=>a+b.quantity,0)}</span>
							</div>
							<div>
								<p className="text-base font-black">{formatRupiah(totalPrice)}</p>
							</div>
						</div>
						<div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-amber-400 pr-2">
							Lanjut <ChevronRight className="h-5 w-5" />
						</div>
					</div>
				</div>
			)}

			<div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/80 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center pt-3 pb-8 px-8 z-30 shadow-lg">
				<button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-amber-600 scale-110' : 'text-slate-400'}`}>
					<Star className={`w-6 h-6 ${activeTab === 'home' ? 'fill-amber-600' : ''}`} />
					<span className="text-[10px] font-black uppercase tracking-widest">Jajan</span>
				</button>
				<button onClick={() => setActiveTab('riwayat')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'riwayat' ? 'text-amber-600 scale-110' : 'text-slate-400'}`}>
					<ShoppingBag className={`w-6 h-6 ${activeTab === 'riwayat' ? 'fill-amber-600' : ''}`} />
					<span className="text-[10px] font-black uppercase tracking-widest">Riwayat</span>
				</button>
			</div>

			{/* Drawers */}
			<CartDrawer
				open={isDrawerOpen}
				onOpenChange={setIsDrawerOpen}
				cart={cart}
				onUpdateQuantity={updateQuantity}
				onClearCart={() => setCart([])}
				onSubmit={async (data) => {
					let proofUrl = null
					if (data.proofFile) {
						const fileExt = data.proofFile.name.split('.').pop()
						const fileName = `${Math.random()}.${fileExt}`
						const { data: uploadData, error: uploadError } = await supabase.storage
							.from('payment-proofs')
							.upload(fileName, data.proofFile)
						
						if (uploadError) {
							console.error("[Storage] Upload failed:", uploadError)
							toast.error("Gagal upload bukti: " + uploadError.message)
							return // Stop execution if upload fails
						}

						const { data: { publicUrl } } = supabase.storage.from('payment-proofs').getPublicUrl(uploadData.path)
						proofUrl = publicUrl
					}

					if (!userId) {
						toast.error("User session mismatch. Please re-login.")
						return
					}

					for (const item of cart) {
						for (let i = 0; i < item.quantity; i++) {
							try {
								await createOrder({
									user_id: userId,
									food_name: item.food_name,
									price: item.price,
									payment_method: data.paymentMethod,
									catatan: data.catatan,
									transfer_to: data.transferTo,
									proof_url: proofUrl
								})
							} catch (err) {
								console.error("[Order] Failed to create item:", item.food_name, err)
							}
						}
					}
					setCart([])
					setIsDrawerOpen(false)
					toast.success("Pesanan berhasil dibuat!")
				}}
				isSubmitting={isPlacingOrder}
				formatRupiah={formatRupiah}
			/>

			<InspirationDrawer
				open={isCommunityDrawerOpen}
				onOpenChange={setIsCommunityDrawerOpen}
				communityOrders={communityOrders}
				menus={menus}
				onQuickOrder={menu => { toggleCart(menu); setIsCommunityDrawerOpen(false); }}
				getRelativeTime={getRelativeTime}
			/>

			<CreateTmRoomDrawer open={isTmCreateOpen} onOpenChange={setIsTmCreateOpen} creatorId={userId} />

			<SplitBillRecapDrawer open={isRecapDrawerOpen} onOpenChange={setIsRecapDrawerOpen} bill={selectedSplitBill} formatRupiah={formatRupiah} />

			<OcrDrawer open={isOcrDrawerOpen} onOpenChange={setIsOcrDrawerOpen} file={ocrFile} currentUserId={userId} allProfiles={allProfiles} formatRupiah={formatRupiah} />

			<TardutDrawer 
				open={isTardutDrawerOpen} 
				onOpenChange={setIsTardutDrawerOpen} 
				onSubmit={(amount, file) => submitTardut(
					{ amount, proofFile: file },
					{ onSuccess: () => setIsTardutDrawerOpen(false) }
				)} 
				isSubmitting={isSubmittingTardut} 
				formatRupiah={formatRupiah} 
				requests={tardutRequests || []}
			/>

			{/* Manual Entry Drawer */}
			<Drawer open={isManualDrawerOpen} onOpenChange={setIsManualDrawerOpen}>
				<DrawerContent className="max-w-[430px] mx-auto rounded-t-[40px] px-6 pb-10">
					<DrawerHeader>
						<DrawerTitle className="text-2xl font-black">Menu Manual 🥘</DrawerTitle>
						<DrawerDescription>Input makanan baru yang belum ada di daftar.</DrawerDescription>
					</DrawerHeader>
					<div className="space-y-6 py-6">
						<div className="space-y-2">
							<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nama Makanan</Label>
							<Input placeholder="Nasi Goreng" value={manualFoodName} onChange={e => setManualFoodName(e.target.value)} className="rounded-2xl h-14 bg-slate-50 border-slate-100 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-amber-500 focus-visible:bg-white transition-all shadow-xs" />
						</div>
						<div className="space-y-2">
							<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Harga (Rp)</Label>
							<Input type="number" placeholder="15000" value={manualFoodPrice} onChange={e => setManualFoodPrice(e.target.value)} className="rounded-2xl h-14 bg-slate-50 border-slate-100 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-amber-500 focus-visible:bg-white transition-all shadow-xs" />
						</div>
					</div>
					<DrawerFooter className="px-0">
						<Button onClick={handleAddToCartManual} className="w-full h-16 rounded-3xl bg-slate-900 text-white font-black text-lg">TAMBAHKAN</Button>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>

			{/* Tracking Map Drawer */}
			<Drawer open={!!trackingOb} onOpenChange={open => !open && setTrackingOb(null)}>
				<DrawerContent className="max-w-[430px] mx-auto rounded-t-[40px] px-6 pb-12">
					<DrawerHeader>
						<DrawerTitle className="text-2xl font-black">Pantau OB 🛵</DrawerTitle>
						<DrawerDescription>Posisi real-time {trackingOb} saat ini.</DrawerDescription>
					</DrawerHeader>
					<div className="py-4">
						{trackingOb && <TrackingMap obName={trackingOb} />}
					</div>
					<DrawerFooter className="px-0">
						<Button onClick={() => setTrackingOb(null)} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black">TUTUP ✅</Button>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>

			<input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => {
				const file = e.target.files?.[0]
				if (file) { 
					setOcrFile(file); 
					setIsOcrDrawerOpen(true); 
					e.target.value = ''; // Reset to allow re-selection
				}
			}} />
		</div>
	)
}
