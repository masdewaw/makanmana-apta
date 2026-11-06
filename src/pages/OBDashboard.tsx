import { useTourNavigation } from '../components/organisms/OnboardingProvider'
import { BrandLogo } from '../components/molecules/BrandLogo'
import { OBWorkQueue } from '../components/organisms/OBWorkQueue'
import { useObNames } from '../hooks/useObNames'
import { DataError } from '../components/molecules/DataError'
import { requireData, errorMessage } from '../lib/errors'
import { catalogService } from '../api/catalog'
import { profileService } from '../api/profiles'
import { useEffect, useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import {
	CheckCircle,
	Trash2,
	Edit2,
	Folder,
	Plus,
	Settings
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '../components/ui/drawer'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

import { validateFood } from '../lib/form-validation'
import { Menu } from '../types'
import { SettingsDrawer } from '../components/organisms/SettingsDrawer'
import { useTardut } from '../hooks/useTardut'
import { useOrders } from '../hooks/useOrders'
import { OBTardutList } from '../components/organisms/OBTardutList'
import { CategoryManagerDrawer } from '../components/organisms/CategoryManagerDrawer'

export default function OBDashboard({ session }: { session: Session }) {
	const obName = useObNames()
	const {
		activeOrders, isLoading: ordersLoading, error: ordersError, refetch: retryOrders
	} = useOrders({ role: 'ob' })

	// Tab states
	const [view, setView] = useState<'orders' | 'tardut' | 'history' | 'menu' | 'more'>('orders')
	useTourNavigation(useCallback(() => { setView('orders') }, []))
	const [historyType, setHistoryType] = useState<'food' | 'tardut'>('food')
	const [foodHistoryPage, setFoodHistoryPage] = useState(1)
	const [tardutHistoryPage, setTardutHistoryPage] = useState(1)
	const itemsPerPage = 10

	// Paginated Food History
	const { historyOrders, error: historyError, refetch: retryHistory, totalCount: totalFoodHistory } = useOrders({
		role: 'ob',
		status: 'done',
		limit: itemsPerPage,
		offset: (foodHistoryPage - 1) * itemsPerPage
	})

	// Paginated Tardut History
	const { requests: historyTardut, error: tardutHistoryError, refetch: retryTardutHistory, totalCount: totalTardutHistory } = useTardut({
		status: 'done',
		limit: itemsPerPage,
		offset: (tardutHistoryPage - 1) * itemsPerPage
	})

	// Active Tardut (for the TARDUT tab)
	const { requests: tardutRequests, error: tardutError, refetch: retryTardut, updateTardutStatus } = useTardut({ status: 'waiting' })
	const [menus, setMenus] = useState<Menu[]>([])
	const formatRupiah = (number: number) => {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number)
	}

	// Active Tardut filtering (last 24h)
	const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
	const filteredActiveTardut = (tardutRequests || []).filter(r => r.created_at > twentyFourHoursAgo)

	// Menu state
	const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false)
	const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)
	const [editingMenu, setEditingMenu] = useState<Menu | null>(null)
	const [newFoodName, setNewFoodName] = useState('')
	const [newFoodPrice, setNewFoodPrice] = useState('')

	// Categories state
	const [activeFilterCategory, setActiveFilterCategory] = useState('Semua')
	const [dbCategories, setDbCategories] = useState<string[]>([])
	const [menuFormCategory, setMenuFormCategory] = useState('Lainnya')
	const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false)
	const [isSettingsOpen, setIsSettingsOpen] = useState(false)
	const [isBusy, setIsBusy] = useState(false)
	const [myObId, setMyObId] = useState<string | null>(null)
	const [paymentPage, setPaymentPage] = useState(1)
	const { orders: paymentOrders, totalCount: paymentCount, isLoading: paymentsLoading, error: paymentError, refetch: retryPayments } = useOrders({ role: 'ob', paymentOb: myObId || undefined, enabled: !!myObId, limit: 20, offset: (paymentPage - 1) * 20 })
	useEffect(() => { if (paymentPage > Math.max(1, Math.ceil(paymentCount / 20))) setPaymentPage(Math.max(1, Math.ceil(paymentCount / 20))) }, [paymentCount, paymentPage])
	const [myName, setMyName] = useState('')
	const [initialLoadError, setInitialLoadError] = useState(false)

	const userId = session.user.id
	const lastUpdateRef = useRef<number>(0)

	const loadDashboard = async () => {
		const results = await Promise.allSettled([fetchMyProfile(), fetchMenus(), fetchCategories()])
		setInitialLoadError(results.some(result => result.status === 'rejected'))
	}
	useEffect(() => { void loadDashboard() }, [userId])

	useEffect(() => {
		if (view !== 'orders' || !session.user.id || !navigator.geolocation) return

		const watchId = navigator.geolocation.watchPosition(
			async (position) => {
				const now = Date.now()
				if (now - lastUpdateRef.current < 10000) return
				lastUpdateRef.current = now
				const { error } = await profileService.updateLocation(session.user.id, position.coords.latitude, position.coords.longitude)
				if (error) console.warn("Lokasi belum diperbarui:", error.message)
			},
			(err) => console.warn('Geolocation error:', err),
			{ enableHighAccuracy: true, timeout: 10000 }
		)
		return () => navigator.geolocation.clearWatch(watchId)
	}, [view, session.user.id])

	const fetchMyProfile = async () => {
		const data = requireData(await profileService.getProfile(session.user.id))
		if (data) {
			setMyObId(data.ob_code ?? null)
			setMyName(data.name)
		}
	}

	const fetchMenus = async () => {
		const data = requireData(await catalogService.getMenus())
		if (data) setMenus(data)
	}

	const fetchCategories = async () => {
		const data = requireData(await catalogService.getCategories())
		if (data) setDbCategories(data.map(c => c.name))
	}

	const busyLock = useRef(false)
	const runBusy = async (action: () => Promise<void>) => {
		if (busyLock.current) return
		busyLock.current = true
		setIsBusy(true)
		try { await action() } catch (error) { toast.error(errorMessage(error)); throw error }
		finally { busyLock.current = false; setIsBusy(false) }
	}
	const handleAddCategory = (name: string) => runBusy(async () => {
		requireData(await catalogService.addCategory(name))
		toast.success('Kategori ditambah')
		await fetchCategories()
	})
	const handleDeleteCategory = async (name: string) => {
		if (!window.confirm(`Hapus kategori "${name}"? Menu tidak ikut dihapus.`)) return
		await runBusy(async () => { requireData(await catalogService.deleteCategory(name)); await fetchCategories(); toast.success('Kategori dihapus') }).catch(() => {})
	}
	const handleLogout = async () => {
		if (!window.confirm('Keluar dari aplikasi?')) return
		const { error } = await supabase.auth.signOut()
		if (error) toast.error(errorMessage(error))
	}
	const handleAddMenu = async () => {
		const error = validateFood(newFoodName, newFoodPrice)
		if (error) return toast.error(error)
		await runBusy(async () => {
			requireData(await catalogService.addMenu({ food_name: newFoodName.trim(), price: Number(newFoodPrice), category: menuFormCategory }))
			setIsMenuDrawerOpen(false); setNewFoodName(''); setNewFoodPrice('')
			toast.success('Menu ditambah'); await fetchMenus()
		}).catch(() => {})
	}
	const handleUpdateMenu = async () => {
		if (!editingMenu) return
		const error = validateFood(newFoodName, newFoodPrice)
		if (error) return toast.error(error)
		await runBusy(async () => {
			requireData(await catalogService.updateMenu(editingMenu.id, { food_name: newFoodName.trim(), price: Number(newFoodPrice), category: menuFormCategory }))
			setIsEditDrawerOpen(false); toast.success('Menu diperbarui'); await fetchMenus()
		}).catch(() => {})
	}
	const handleDeleteMenu = async (id: string) => {
		if (!window.confirm('Hapus menu?')) return
		await runBusy(async () => { requireData(await catalogService.deleteMenu(id)); await fetchMenus(); toast.success('Menu dihapus') }).catch(() => {})
	}

	return (
		<div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto ob-dashboard">
			{!myObId && <div role="alert" className="p-4 bg-emerald-50 text-sm">Identitas OB belum tersedia. <button className="underline" onClick={() => { void fetchMyProfile().catch(error => toast.error(errorMessage(error))) }}>Coba muat profil</button></div>}
			<DataError error={initialLoadError} label="Menu dan profil" onRetry={loadDashboard} />
			<DataError error={ordersError} label="Pesanan" onRetry={retryOrders} />
			{view === 'tardut' && <DataError error={tardutError} label="Tardut" onRetry={retryTardut} />}
			{view === 'history' && <DataError error={historyType === 'food' ? historyError : tardutHistoryError} label="Riwayat" onRetry={historyType === 'food' ? retryHistory : retryTardutHistory} />}
			{/* Header */}
			<div className="bg-white px-6 pt-6 pb-2 shadow-sm z-20 sticky top-0 border-b border-slate-100">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-3">
						<BrandLogo iconOnly />
						<div>
							<h2 className="text-xl font-semibold text-slate-800 tracking-tight">Dapur kantor</h2>
						</div>
					</div>
					<button aria-label="Pengaturan akun OB" onClick={() => setIsSettingsOpen(true)} className="text-slate-400 hover:text-slate-600 transition"><Settings className="w-6 h-6" /></button>
				</div>


			</div>

			<div className="p-5 space-y-6 flex-1">
                {view === 'orders' && <><DataError error={paymentError} label="Pembayaran" onRetry={retryPayments} /><OBWorkQueue orders={activeOrders} payments={paymentOrders} obId={myObId} obName={obName} loading={ordersLoading || (!!myObId && paymentsLoading)} paymentPage={paymentPage} paymentCount={paymentCount} onPaymentPage={setPaymentPage} /></>}
                {view === 'more' && <section className="ob-more"><h1>Lainnya</h1><p>Kelola menu dan lihat aktivitas sebelumnya.</p><Button variant="outline" onClick={() => setView('history')}>Riwayat pesanan</Button><Button variant="outline" onClick={() => setView('menu')}>Kelola menu makanan</Button><Button variant="outline" onClick={() => setIsSettingsOpen(true)}>Pengaturan akun</Button></section>}

				{view === 'history' && (
					<div className="space-y-6">
						<div className="flex items-center justify-between">
							<h3 className="font-semibold text-slate-800 text-xl">Riwayat Selesai 💪</h3>
							<div className="flex bg-white rounded-xl p-1 border border-slate-100 shadow-sm">
								<button onClick={() => setHistoryType('food')} className={`px-4 py-1.5 rounded-lg text-[11px] font-semibold tracking-normal transition-all ${historyType === 'food' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400'}`}>Makanan</button>
								<button onClick={() => setHistoryType('tardut')} className={`px-4 py-1.5 rounded-lg text-[11px] font-semibold tracking-normal transition-all ${historyType === 'tardut' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400'}`}>Tardut</button>
							</div>
						</div>

						{historyType === 'food' ? (
							<div className="space-y-4">
								{(historyOrders || []).map(order => (
									<Card key={order.id} className="border-0 shadow-sm rounded-2xl bg-white">
										<CardContent className="p-4 flex items-center justify-between">
											<div>
												<p className="text-[11px] font-semibold text-slate-400 tracking-normal mb-1">{order.profiles?.name} • {new Date(order.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
												<h4 className="font-bold text-slate-800">{order.food_name}</h4>
												<p className="text-emerald-600 font-semibold text-sm">{formatRupiah(order.price)}</p>
											</div>
											<div className="flex items-center gap-1.5 bg-green-50 text-green-600 px-2.5 py-1 rounded-full border border-green-100">
												<CheckCircle className="w-3 h-3" />
												<span className="text-[11px] font-semibold tracking-normal">Selesai</span>
											</div>
										</CardContent>
									</Card>
								))}

								<div className="pt-4 flex items-center justify-between px-2">
									<Button
										disabled={foodHistoryPage === 1}
										onClick={() => setFoodHistoryPage(p => p - 1)}
										className="h-10 px-4 bg-white text-slate-900 border border-slate-200 font-bold text-[12px]"
									>
										Sebelumnya
									</Button>
									<span className="text-[12px] font-semibold text-slate-400">HALAMAN {foodHistoryPage} / {Math.ceil(totalFoodHistory / itemsPerPage) || 1}</span>
									<Button
										disabled={foodHistoryPage >= Math.ceil(totalFoodHistory / itemsPerPage)}
										onClick={() => setFoodHistoryPage(p => p + 1)}
										className="h-10 px-4 bg-white text-slate-900 border border-slate-200 font-bold text-[12px]"
									>
										Berikutnya
									</Button>
								</div>
							</div>
						) : (
							<div className="space-y-4">
								{(historyTardut || []).map(req => (
									<Card key={req.id} className="border-0 shadow-sm rounded-2xl bg-white">
										<CardContent className="p-4 flex items-center justify-between">
											<div>
												<p className="text-[11px] font-semibold text-slate-400 tracking-normal mb-1">{req.profiles?.name} • {new Date(req.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • {new Date(req.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
												<h4 className="font-extrabold text-slate-800">Tardut {formatRupiah(req.amount)}</h4>
												<div className="flex items-center gap-1.5 mt-1">
													<span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">💰 TARDUT</span>
												</div>
											</div>
											<div className="flex items-center gap-1.5 bg-slate-50 text-slate-600 px-2.5 py-1 rounded-full border border-slate-100">
												<CheckCircle className="w-3 h-3" />
												<span className="text-[11px] font-semibold tracking-normal">Selesai</span>
											</div>
										</CardContent>
									</Card>
								))}

								<div className="pt-4 flex items-center justify-between px-2">
									<Button
										disabled={tardutHistoryPage === 1}
										onClick={() => setTardutHistoryPage(p => p - 1)}
										className="h-10 px-4 bg-white text-slate-900 border border-slate-200 font-bold text-[12px]"
									>
										Sebelumnya
									</Button>
									<span className="text-[12px] font-semibold text-slate-400">HALAMAN {tardutHistoryPage} / {Math.ceil(totalTardutHistory / itemsPerPage) || 1}</span>
									<Button
										disabled={tardutHistoryPage >= Math.ceil(totalTardutHistory / itemsPerPage)}
										onClick={() => setTardutHistoryPage(p => p + 1)}
										className="h-10 px-4 bg-white text-slate-900 border border-slate-200 font-bold text-[12px]"
									>
										Berikutnya
									</Button>
								</div>
							</div>
						)}
					</div>
				)}

				{view === 'menu' && (
					<div className="space-y-6">
						<div>
							<div className="flex justify-between items-center mb-1">
								<h3 className="font-semibold text-slate-800 text-xl tracking-tight">Katalog Menu</h3>
								<Button onClick={() => {
									setNewFoodName('');
									setNewFoodPrice('');
									setMenuFormCategory('Lainnya');
									setIsMenuDrawerOpen(true);
								}} className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl">
									<Plus className="w-4 h-4 mr-1" /> TAMBAH
								</Button>
							</div>
							<p className="text-[12px] font-semibold text-slate-400 tracking-normal leading-none mb-4">{menus.length} ITEM TERSEDIA</p>
						</div>

						<div className="flex">
							<Button
								variant="outline"
								onClick={() => setIsCategoryDrawerOpen(true)}
								className="h-11 rounded-2xl border-slate-200 text-slate-500 font-bold text-[12px] tracking-normal shrink-0 mr-2"
							>
								<Folder className="w-4 h-4 mr-1.5 text-emerald-500" /> Kelola Kategori
							</Button>
						</div>

						<div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5">
							{['Semua', ...dbCategories].map(cat => (
								<button
									key={cat}
									onClick={() => setActiveFilterCategory(cat)}
									className={`shrink-0 px-6 py-2.5 rounded-2xl text-[12px] font-semibold tracking-normal transition-all border ${activeFilterCategory === cat ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-white border-slate-100 text-slate-400'}`}
								>
									{cat}
								</button>
							))}
						</div>

						<div className="grid grid-cols-1 gap-3">
							{menus
								.filter(m => activeFilterCategory === 'Semua' || m.category === activeFilterCategory)
								.map(m => (
									<Card key={m.id} className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:border-emerald-200 transition-colors">
										<CardContent className="p-4 flex items-center justify-between">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-xl">🥡</div>
												<div>
													<p className="text-[11px] font-semibold text-slate-400 tracking-normal">{m.category || 'Lainnya'}</p>
													<h4 className="font-bold text-slate-800">{m.food_name}</h4>
													<p className="text-emerald-600 font-semibold text-sm">{formatRupiah(m.price)}</p>
												</div>
											</div>
											<div className="flex gap-1">
												<button onClick={() => {
													setEditingMenu(m);
													setNewFoodName(m.food_name);
													setNewFoodPrice(m.price.toString());
													setMenuFormCategory(m.category || 'Lainnya');
													setIsEditDrawerOpen(true);
												}} className="p-2 text-slate-400 hover:text-emerald-600"><Edit2 className="w-4 h-4" /></button>
												<button onClick={() => { void handleDeleteMenu(m.id) }} disabled={isBusy} className="p-2 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
											</div>
										</CardContent>
									</Card>
								))}
						</div>
					</div>
				)}

				{view === 'tardut' && (
					<OBTardutList
						requests={filteredActiveTardut}
						onUpdateStatus={(id, status) => updateTardutStatus({ requestId: id, status, obId: myObId || undefined })}
						formatRupiah={formatRupiah}
					/>
				)}
			</div>

			<Drawer open={isMenuDrawerOpen} onOpenChange={setIsMenuDrawerOpen}>
				<DrawerContent className="max-w-[430px] mx-auto rounded-t-[28px] px-6">
					<DrawerHeader>
						<DrawerTitle className="text-2xl font-semibold">Menu Baru 🥘</DrawerTitle>
						<DrawerDescription>Isi nama, harga, dan kategori makanan.</DrawerDescription>
					</DrawerHeader>
					<div className="min-h-0 flex-1 overflow-y-auto space-y-4 py-4">
						<div className="space-y-2">
							<Label className="text-[12px] font-semibold tracking-normal text-slate-400">Nama Makanan</Label>
							<Input placeholder="Nama Makanan" value={newFoodName} onChange={e => setNewFoodName(e.target.value)} className="h-14 rounded-xl" />
						</div>
						<div className="space-y-2">
							<Label className="text-[12px] font-semibold tracking-normal text-slate-400">Harga</Label>
							<Input type="number" placeholder="Harga" value={newFoodPrice} onChange={e => setNewFoodPrice(e.target.value)} className="h-14 rounded-xl" />
						</div>
						<div className="space-y-2">
							<Label className="text-[12px] font-semibold tracking-normal text-slate-400">Kategori</Label>
							<select
								value={menuFormCategory}
								onChange={e => setMenuFormCategory(e.target.value)}
								className="flex h-14 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
							>
								<option value="Lainnya">Lainnya</option>
								{dbCategories.map(cat => (
									<option key={cat} value={cat}>{cat}</option>
								))}
							</select>
						</div>
						<Button onClick={handleAddMenu} disabled={isBusy} className="w-full h-14 bg-slate-900 text-white font-semibold rounded-xl mt-6">SIMPAN ✅</Button>
					</div>
				</DrawerContent>
			</Drawer>

			<Drawer open={isEditDrawerOpen} onOpenChange={setIsEditDrawerOpen}>
				<DrawerContent className="max-w-[430px] mx-auto rounded-t-[28px] px-6 pb-10">
					<DrawerHeader>
						<DrawerTitle className="text-2xl font-semibold">Edit Menu 📝</DrawerTitle>
						<DrawerDescription>Perbarui nama, harga, dan kategori makanan.</DrawerDescription>
					</DrawerHeader>
					<div className="min-h-0 flex-1 overflow-y-auto space-y-4 py-4">
						<div className="space-y-2">
							<Label className="text-[12px] font-semibold tracking-normal text-slate-400">Nama Makanan</Label>
							<Input value={newFoodName} onChange={e => setNewFoodName(e.target.value)} className="h-14 rounded-xl" />
						</div>
						<div className="space-y-2">
							<Label className="text-[12px] font-semibold tracking-normal text-slate-400">Harga</Label>
							<Input type="number" value={newFoodPrice} onChange={e => setNewFoodPrice(e.target.value)} className="h-14 rounded-xl" />
						</div>
						<div className="space-y-2">
							<Label className="text-[12px] font-semibold tracking-normal text-slate-400">Kategori</Label>
							<select
								value={menuFormCategory}
								onChange={e => setMenuFormCategory(e.target.value)}
								className="flex h-14 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
							>
								<option value="Lainnya">Lainnya</option>
								{dbCategories.map(cat => (
									<option key={cat} value={cat}>{cat}</option>
								))}
							</select>
						</div>
						<Button onClick={handleUpdateMenu} disabled={isBusy} className="w-full h-14 bg-emerald-500 text-white font-semibold rounded-xl mt-6">UPDATE ✅</Button>
					</div>
				</DrawerContent>
			</Drawer>

            <nav className="ob-bottom-nav" aria-label="Navigasi OB">{(['orders', 'tardut', 'more'] as const).map(item => <button data-tour={item === 'tardut' ? 'ob-tardut-nav' : item === 'more' ? 'ob-more-nav' : undefined} key={item} aria-current={(view === item || (item === 'more' && (view === 'history' || view === 'menu'))) ? 'page' : undefined} onClick={() => setView(item)}><span>{{ orders: 'Pesanan', tardut: 'Tarik duit', more: 'Lainnya' }[item]}</span>{item === 'tardut' && filteredActiveTardut.length > 0 && <small>{filteredActiveTardut.length}</small>}</button>)}</nav>

			<CategoryManagerDrawer
				open={isCategoryDrawerOpen}
				onOpenChange={setIsCategoryDrawerOpen}
				categories={dbCategories}
				onAdd={handleAddCategory}
				onDelete={handleDeleteCategory}
				isBusy={isBusy}
			/>

			<SettingsDrawer 
				open={isSettingsOpen} 
				onOpenChange={setIsSettingsOpen}
				userId={userId}
				currentName={myName}
				onLogout={handleLogout}
				onProfileUpdated={() => { void fetchMyProfile().catch(error => toast.error(errorMessage(error))) }}
			/>
		</div>
	)
}
