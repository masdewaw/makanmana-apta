import { useTourNavigation } from '../components/organisms/OnboardingProvider'
import { BrandLogo } from '../components/molecules/BrandLogo'
import { useObNames } from '../hooks/useObNames'
import { PersonalMenu } from '../components/organisms/PersonalMenu'
import { Home, ReceiptText, UserRound, ArrowUpRight } from 'lucide-react'
import { DataError } from '../components/molecules/DataError'
import { MAX_ORDER_NOTE_LENGTH } from '../lib/order-notes'
import { type CartItem, readCart, writeCart } from '../lib/cart-storage'
import { requireData, errorMessage } from '../lib/errors'
import { orderService } from '../api/orders'
import { paymentProofService } from '../api/paymentProofs'
import { catalogService } from '../api/catalog'
import { profileService } from '../api/profiles'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { MapPin, Heart } from 'lucide-react'
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
import { SettingsDrawer } from '../components/organisms/SettingsDrawer'
import { RankingDrawer } from '../components/organisms/RankingDrawer'

import { validateFood } from '../lib/form-validation'
import { Menu, TemanMakanGroup, SplitBill } from '../types'

export default function UserDashboard({ session }: { session: Session }) {
	const obName = useObNames()
	// Standard State
	const [initialLoadError, setInitialLoadError] = useState(false)
	const [isLoadingMenus, setIsLoadingMenus] = useState(true)
	const favoriteBusy = useRef(false)
	const [profileName, setProfileName] = useState('')
	const [menus, setMenus] = useState<Menu[]>([])
	const [searchQuery, setSearchQuery] = useState('')
	const [activeTab, setActiveTab] = useState<'home' | 'riwayat'>('home')
	const [activeView, setActiveView] = useState<'personal' | 'teman_makan' | 'split_bill'>('personal')
	useTourNavigation(useCallback(() => { setActiveTab('home'); setActiveView('personal'); setSelectedCategory('Semua'); setSearchQuery('') }, []))
	const [recommendation, setRecommendation] = useState<Menu | null>(null)
	const [communityOrders, setCommunityOrders] = useState<any[]>([])
	const [isCommunityDrawerOpen, setIsCommunityDrawerOpen] = useState(false)
	const [selectedCategory, setSelectedCategory] = useState('Semua')
	const [dbCategories, setDbCategories] = useState<string[]>([])
	const [favorites, setFavorites] = useState<string[]>([])
	const [cart, setCart] = useState<CartItem[]>(() => readCart(session.user.id).items)
	const [isPlacingOrder, setIsPlacingOrder] = useState(false)
	const checkoutLock = useRef(false)
	const pendingOrderIds = useRef<Record<string, string[]>>(readCart(session.user.id).orderIds)
	const uploadedProof = useRef<{ file: File; url: string } | null>(null)
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
	const [isSettingsOpen, setIsSettingsOpen] = useState(false)
	const [isRankingOpen, setIsRankingOpen] = useState(false)
	
	const storageWarned = useRef(false)
	const persistCart = (items: CartItem[]) => {
		if (!writeCart(session.user.id, items, pendingOrderIds.current) && !storageWarned.current) {
			storageWarned.current = true
			toast.error('Browser tidak dapat menyimpan keranjang. Jangan refresh sebelum pesanan selesai.')
		}
	}
	useEffect(() => { persistCart(cart) }, [cart, session.user.id])

	const fileInputRef = useRef<HTMLInputElement>(null)
	const categories = ['Semua', '🌟 Favoritku', ...dbCategories]

	// Hook usage
	const userId = session.user.id
	
	// Active Orders (polled)
	const { activeOrders, createOrder, error: ordersError, refetch: retryOrders } = useOrders({
		role: 'user', 
		userId 
	})

	// Paginated History Orders
	const { historyOrders, totalCount: totalHistory, error: historyError, refetch: retryHistory } = useOrders({
		role: 'user',
		userId,
		status: 'done',
		limit: itemsPerPage,
		offset: (historyPage - 1) * itemsPerPage
	})
	const { requests: tardutRequests, submitTardut, isSubmitting: isSubmittingTardut, error: tardutError, refetch: retryTardut } = useTardut({ userId })
	const { rooms: tmGroups, error: roomsError, refetch: retryRooms } = useTemanMakan()
	const { bills: splitBills, finishBill, error: billsError, refetch: retryBills } = useSplitBill()

	const loadDashboard = async () => {
		setIsLoadingMenus(true)
		const results = await Promise.allSettled([fetchProfile(), fetchMenus(), fetchCommunityOrders(), fetchCategories(), fetchFavorites(), fetchAllProfiles()])
		setInitialLoadError(results.some(result => result.status === 'rejected'))
		setIsLoadingMenus(false)
	}
	useEffect(() => { void loadDashboard() }, [userId])

	const fetchProfile = async () => {
		const data = requireData(await profileService.getProfile(userId))
		if (data) {
			setProfileName(data.name)
		}
	}

	const fetchMenus = async () => {
		const menuData = requireData(await catalogService.getMenus())
		if (menuData) {
			setMenus(menuData)
			
			// Personalized Recommendation Logic
			const orderHistory = requireData(await orderService.getRecentFoodNames(userId))

			let recommendedMenu: Menu | undefined;

			if (orderHistory && orderHistory.length > 0) {
				const counts: Record<string, number> = {}
				orderHistory.forEach(o => {
					counts[o.food_name] = (counts[o.food_name] || 0) + 1
				})
				const sortedHistory = Object.entries(counts).sort((a, b) => b[1] - a[1])
				const topFoodName = sortedHistory[0][0]
				recommendedMenu = menuData.find(m => m.food_name === topFoodName)
			}

			if (!recommendedMenu && menuData.length > 0) {
				recommendedMenu = menuData[Math.floor(Math.random() * menuData.length)]
			}

			if (recommendedMenu) {
				setRecommendation(recommendedMenu)
			}
		}
	}

	const fetchCategories = async () => {
		const data = requireData(await catalogService.getCategories())
		if (data) setDbCategories(data.map(c => c.name))
	}

	const fetchFavorites = async () => {
		const data = requireData(await catalogService.getFavorites(userId))
		if (data) setFavorites(data.map(f => f.menu_id))
	}

	const fetchAllProfiles = async () => {
		const data = requireData(await profileService.getNames())
		if (data) setAllProfiles(data)
	}

	const fetchCommunityOrders = async () => {
		const data = requireData(await orderService.getCommunityOrders())
		if (data) setCommunityOrders(data)
	}

	const formatRupiah = (number: number) => {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number)
	}

	const toggleCart = (menu: Menu) => {
		if (checkoutLock.current) return
		setCart(prev => {
			const exists = prev.find(item => item.id === menu.id)
			if (exists) return prev.filter(item => item.id !== menu.id)
			return [...prev, { ...menu, quantity: 1 }]
		})
	}

	const updateQuantity = (id: string, delta: number) => {
		if (checkoutLock.current) return
		setCart(prev => prev.map(item => {
			if (item.id === id) {
				return { ...item, quantity: item.quantity + delta }
			}
			return item
		}).filter(item => item.quantity > 0))
	}

	const updateNote = (id: string, note: string) => {
		if (checkoutLock.current) return
		setCart(items => items.map(item => item.id === id ? { ...item, note: note.slice(0, MAX_ORDER_NOTE_LENGTH) } : item))
	}

	const handleToggleFavorite = async (e: React.MouseEvent, menuId: string) => {
		e.stopPropagation()
		if (favoriteBusy.current) return
		favoriteBusy.current = true
		const before = favorites
		const isFavorite = favorites.includes(menuId)
		setFavorites(prev => isFavorite ? prev.filter(id => id !== menuId) : [...prev, menuId])
		try {
			requireData(await (isFavorite ? catalogService.deleteFavorite(userId, menuId) : catalogService.addFavorite(userId, menuId)))
		} catch (error) { setFavorites(before); toast.error(errorMessage(error)) }
		finally { favoriteBusy.current = false }
	}

	const handleAddToCartManual = () => {
		const error = validateFood(manualFoodName, manualFoodPrice)
		if (error) {
			toast.error(error)
			return
		}
		const newItem: CartItem = {
			id: `manual-${Date.now()}`,
			food_name: manualFoodName.trim(),
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
			const { error } = await supabase.auth.signOut()
			if (error) toast.error(errorMessage(error))
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
		<div className="mobile-page flex-1 flex flex-col bg-slate-50 overflow-y-auto w-full relative pb-32">
			<DataError error={initialLoadError} label="Menu dan profil" onRetry={loadDashboard} />
			<DataError error={ordersError} label="Pesanan" onRetry={retryOrders} />
			{activeTab === 'riwayat' && <DataError error={historyError} label="Riwayat" onRetry={retryHistory} />}
			{activeView === 'teman_makan' && <DataError error={roomsError} label="Room" onRetry={retryRooms} />}
			{activeView === 'split_bill' && <DataError error={billsError} label="Patungan" onRetry={retryBills} />}
			<header className="office-header">
				<BrandLogo />
				<div className="header-actions"><span className="office-location"><MapPin size={13} /> Kantor</span><button data-tour="user-settings" className="profile-avatar" aria-label="Buka pengaturan akun" onClick={() => setIsSettingsOpen(true)}>{(profileName || 'K').slice(0,1).toUpperCase()}</button></div>
			</header>

			<div className="p-5 space-y-6 flex-1">
				{activeTab === 'home' ? (
					<>
						{activeView === 'personal' && <PersonalMenu loading={isLoadingMenus} name={profileName} menus={menus} categories={categories}
							selectedCategory={selectedCategory} onCategory={setSelectedCategory} search={searchQuery} onSearch={setSearchQuery}
							favorites={favorites} cart={cart} onFavorite={handleToggleFavorite} onAdd={toggleCart} onQuantity={updateQuantity}
							onManual={() => setIsManualDrawerOpen(true)} onInspiration={() => setIsCommunityDrawerOpen(true)}
							onTardut={() => setIsTardutDrawerOpen(true)} onRanking={() => setIsRankingOpen(true)}
							recommendation={recommendation} activeOrders={activeOrders} onTrack={setTrackingOb} formatRupiah={formatRupiah} />}

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
						<h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Riwayat Makan 🕰️</h1>
						{historyOrders.length === 0 ? (
							<div className="text-center py-16 bg-white rounded-[28px] border-2 border-dashed border-slate-200">
								<p className="font-semibold text-slate-400">Belum ada riwayat pesanan.</p>
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
										className="h-10 px-4 bg-white text-slate-900 border border-slate-200 font-bold text-[12px]"
									>
										Sebelumnya
									</Button>
									<span className="text-[12px] font-semibold text-slate-400">HALAMAN {historyPage} / {Math.ceil(totalHistory / itemsPerPage) || 1}</span>
									<Button
										disabled={historyPage >= Math.ceil(totalHistory / itemsPerPage)}
										onClick={() => setHistoryPage(p => p + 1)}
										className="h-10 px-4 bg-white text-slate-900 border border-slate-200 font-bold text-[12px]"
									>
										Berikutnya
									</Button>
								</div>
							</div>
						)}
					</div>
				)}
			</div>

			{cart.length > 0 && activeTab === 'home' && <div data-tour="user-cart" className="mobile-cart-bar cart-dock">
				<button className="cart-dock-button" onClick={() => setIsDrawerOpen(true)}><span className="cart-count">{cart.reduce((sum,item) => sum + item.quantity,0)}</span><span className="cart-dock-label"><small>Keranjangmu</small><strong>{formatRupiah(totalPrice)}</strong></span><span className="cart-dock-next">Lihat pesanan <ArrowUpRight size={18} /></span></button>
			</div>}
			<nav className="mobile-bottom-nav bottom-navigation" aria-label="Navigasi utama">
				<button className={activeTab === 'home' && (activeView !== 'personal' || selectedCategory !== '🌟 Favoritku') ? 'is-active' : ''} onClick={() => { setActiveTab('home'); setActiveView('personal'); setSelectedCategory('Semua'); setSearchQuery('') }}><Home size={21} /><span>Beranda</span></button>
				<button className={activeTab === 'home' && activeView === 'personal' && selectedCategory === '🌟 Favoritku' ? 'is-active' : ''} onClick={() => { setActiveTab('home'); setActiveView('personal'); setSelectedCategory('🌟 Favoritku'); setSearchQuery('') }}><Heart size={21} /><span>Favorit</span></button>
				<button data-tour="user-orders-nav" className={activeTab === 'riwayat' ? 'is-active' : ''} onClick={() => setActiveTab('riwayat')}><ReceiptText size={21} /><span>Pesanan</span></button>
				<button aria-expanded={isSettingsOpen} onClick={() => setIsSettingsOpen(true)}><UserRound size={21} /><span>Akun</span></button>
			</nav>

			{/* Drawers */}
			<CartDrawer
				open={isDrawerOpen}
				onOpenChange={setIsDrawerOpen}
				cart={cart}
				onUpdateQuantity={updateQuantity}
				onUpdateNote={updateNote}
				onClearCart={() => { if (!checkoutLock.current) setCart([]) }}
				onSubmit={async (data) => {
					if (checkoutLock.current || cart.length === 0) return
					if (typeof navigator !== 'undefined' && navigator.onLine === false) return toast.error('Kamu sedang offline. Sambungkan internet untuk mengirim pesanan. Keranjangmu tetap tersimpan.')
					checkoutLock.current = true
					setIsPlacingOrder(true)
					try {
						if (!userId) throw new Error("Sesi berakhir. Silakan masuk kembali.")
						let proofUrl: string | null = null
						if (data.paymentMethod === 'transfer') {
							if (!data.proofFile) throw new Error("Mohon upload bukti transfer")
							if (uploadedProof.current?.file === data.proofFile) {
								proofUrl = uploadedProof.current.url
							} else {
								const fileName = `${userId}/${crypto.randomUUID()}.${data.proofFile.name.split('.').pop()}`
								const { error } = await paymentProofService.upload(fileName, data.proofFile)
								if (error) throw error
								proofUrl = fileName
								uploadedProof.current = { file: data.proofFile, url: proofUrl }
							}
						}

						let remaining = cart.map(item => ({ ...item }))
						let saved = 0
						for (const item of cart) {
							const ids = pendingOrderIds.current[item.id] || []
							while (ids.length < item.quantity) ids.push(crypto.randomUUID())
							pendingOrderIds.current[item.id] = ids.slice(0, item.quantity)
							persistCart(remaining)
							for (const id of ids.slice(0, item.quantity)) {
								try {
									await createOrder({ id, user_id: userId, food_name: item.food_name,
										price: item.price, payment_method: data.paymentMethod,
										catatan: item.note?.trim() || null, transfer_to: data.transferTo, proof_url: proofUrl })
									saved++
									pendingOrderIds.current[item.id] = pendingOrderIds.current[item.id].filter(unitId => unitId !== id)
									remaining = remaining.map(row => row.id === item.id ? { ...row, quantity: row.quantity - 1 } : row).filter(row => row.quantity > 0)
									persistCart(remaining)
								} catch {
									// Keep the same ID in the persisted cart for a safe retry.
								}
							}

						}
						setCart(remaining)
						if (remaining.length) {
							toast.error(`${saved} pesanan tersimpan. Sisanya belum dapat dikonfirmasi dan tetap di keranjang. Silakan coba lagi.`)
						} else {
							pendingOrderIds.current = {}
							uploadedProof.current = null
							setIsDrawerOpen(false)
							toast.success("Semua pesanan berhasil dibuat!")
						}
					} catch (error) {
						toast.error(error instanceof Error ? error.message : "Gagal mengirim pesanan. Keranjang tetap tersimpan.")
					} finally {
						checkoutLock.current = false
						setIsPlacingOrder(false)
					}
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

			<TardutDrawer error={tardutError} onRetry={retryTardut}
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
				<DrawerContent className="max-w-[430px] mx-auto rounded-t-[28px] px-6 pb-10">
					<DrawerHeader>
						<DrawerTitle className="text-2xl font-semibold">Menu Manual 🥘</DrawerTitle>
						<DrawerDescription>Input makanan baru yang belum ada di daftar.</DrawerDescription>
					</DrawerHeader>
					<div className="space-y-6 py-6">
						<div className="space-y-2">
							<Label className="text-[12px] font-semibold tracking-normal text-slate-400 ml-1">Nama Makanan</Label>
							<Input placeholder="Nasi Goreng" value={manualFoodName} onChange={e => setManualFoodName(e.target.value)} className="rounded-2xl h-14 bg-slate-50 border-slate-100 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-emerald-500 focus-visible:bg-white transition-all shadow-xs" />
						</div>
						<div className="space-y-2">
							<Label className="text-[12px] font-semibold tracking-normal text-slate-400 ml-1">Harga (Rp)</Label>
							<Input type="number" placeholder="15000" value={manualFoodPrice} onChange={e => setManualFoodPrice(e.target.value)} className="rounded-2xl h-14 bg-slate-50 border-slate-100 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-emerald-500 focus-visible:bg-white transition-all shadow-xs" />
						</div>
					</div>
					<DrawerFooter className="px-0">
						<Button onClick={handleAddToCartManual} className="w-full h-16 rounded-3xl bg-slate-900 text-white font-semibold text-lg">Tambah ke keranjang</Button>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>

			{/* Tracking Map Drawer */}
			<Drawer open={!!trackingOb} onOpenChange={open => !open && setTrackingOb(null)}>
				<DrawerContent className="max-w-[430px] mx-auto rounded-t-[28px] px-6 pb-12">
					<DrawerHeader>
						<DrawerTitle className="text-2xl font-semibold">Pantau OB 🛵</DrawerTitle>
						<DrawerDescription>Posisi real-time {obName(trackingOb)} saat ini.</DrawerDescription>
					</DrawerHeader>
					<div className="py-4">
						{trackingOb && <TrackingMap obName={trackingOb} />}
					</div>
					<DrawerFooter className="px-0">
						<Button onClick={() => setTrackingOb(null)} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-semibold">Tutup</Button>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>

			<SettingsDrawer 
				open={isSettingsOpen} 
				onOpenChange={setIsSettingsOpen}
				userId={userId}
				currentName={profileName}
				onLogout={handleLogout}
				onProfileUpdated={() => { void fetchProfile().catch(error => toast.error(errorMessage(error))) }}
			/>

			<RankingDrawer 
				open={isRankingOpen}
				onOpenChange={setIsRankingOpen}
			/>

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
