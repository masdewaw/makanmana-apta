import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import {
	CheckCircle,
	LogOut,
	Trash2,
	UtensilsCrossed,
	Edit2,
	Folder,
	Plus,
	Pencil,
	Settings
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '../components/ui/drawer'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

import { Menu } from '../types'
import { SettingsDrawer } from '../components/organisms/SettingsDrawer'
import { useTardut } from '../hooks/useTardut'
import { useOrders } from '../hooks/useOrders'
import { OBTardutList } from '../components/organisms/OBTardutList'
import { OrderCard } from '../components/molecules/OrderCard'
import { CategoryManagerDrawer } from '../components/organisms/CategoryManagerDrawer'

export default function OBDashboard({ session }: { session: Session }) {
	const {
		activeOrders,
		takeOrder,
		releaseOrder,
		verifyPayment,
		completeOrder
	} = useOrders({ role: 'ob' })

	// Tab states
	const [view, setView] = useState<'orders' | 'tardut' | 'history' | 'menu'>('orders')
	const [historyType, setHistoryType] = useState<'food' | 'tardut'>('food')
	const [foodHistoryPage, setFoodHistoryPage] = useState(1)
	const [tardutHistoryPage, setTardutHistoryPage] = useState(1)
	const itemsPerPage = 10

	// Paginated Food History
	const { historyOrders, totalCount: totalFoodHistory } = useOrders({
		role: 'ob',
		status: 'done',
		limit: itemsPerPage,
		offset: (foodHistoryPage - 1) * itemsPerPage
	})

	// Paginated Tardut History
	const { requests: historyTardut, totalCount: totalTardutHistory } = useTardut({
		status: 'done',
		limit: itemsPerPage,
		offset: (tardutHistoryPage - 1) * itemsPerPage
	})

	// Active Tardut (for the TARDUT tab)
	const { requests: tardutRequests, updateTardutStatus } = useTardut({ status: 'waiting' })
	const [menus, setMenus] = useState<Menu[]>([])
	const [transferFilter, setTransferFilter] = useState<'all' | 'Bahul' | 'Masber'>('all')

	// Summary stats
	const ob1Total = activeOrders?.filter(o => o.assigned_to_ob === 'OB 1').reduce((acc, o) => acc + o.price, 0) || 0
	const ob2Total = activeOrders?.filter(o => o.assigned_to_ob === 'OB 2').reduce((acc, o) => acc + o.price, 0) || 0
	const unassignedTotal = activeOrders?.filter(o => !o.assigned_to_ob).reduce((acc, o) => acc + o.price, 0) || 0

	const filteredActiveOrders = activeOrders?.filter(o => {
		if (transferFilter === 'all') return true
		return o.transfer_to === transferFilter
	}) || []

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
	const [selectedObForDetail, setSelectedObForDetail] = useState<string | null>(null)
	const [myObId, setMyObId] = useState<string | null>(null)

	const userId = session.user.id
	const lastUpdateRef = useRef<number>(0)

	useEffect(() => {
		fetchMyProfile()
		fetchMenus()
		fetchCategories()
	}, [])

	useEffect(() => {
		if (view !== 'orders' || !session.user.id) return

		const watchId = navigator.geolocation.watchPosition(
			async (position) => {
				const now = Date.now()
				if (now - lastUpdateRef.current < 10000) return
				lastUpdateRef.current = now
				await supabase.from('profiles').update({
					last_lat: position.coords.latitude,
					last_lng: position.coords.longitude,
					last_updated_at: new Date().toISOString()
				}).eq('id', session.user.id)
			},
			(err) => console.warn('Geolocation error:', err),
			{ enableHighAccuracy: true, timeout: 10000 }
		)
		return () => navigator.geolocation.clearWatch(watchId)
	}, [view, session.user.id])

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
		const { data } = await supabase.from('categories').select('name').order('name')
		if (data) setDbCategories(data.map(c => c.name))
	}

	const handleAddCategory = async (name: string) => {
		setIsBusy(true)
		const { error } = await supabase.from('categories').insert({ name })
		if (error) {
			toast.error("Gagal tambah kategori: " + error.message)
		} else {
			toast.success("Kategori ditambah")
			fetchCategories()
		}
		setIsBusy(false)
	}

	const handleDeleteCategory = async (name: string) => {
		if (!window.confirm(`Hapus kategori "${name}"? Menu dengan kategori ini tidak akan terhapus.`)) return
		setIsBusy(true)
		const { error } = await supabase.from('categories').delete().eq('name', name)
		if (error) {
			toast.error("Gagal hapus kategori: " + error.message)
		} else {
			toast.success("Kategori dihapus")
			fetchCategories()
		}
		setIsBusy(false)
	}


	const handleLogout = async () => {
		if (window.confirm("Keluar dari aplikasi?")) await supabase.auth.signOut()
	}

	const handleAddMenu = async () => {
		if (!newFoodName || !newFoodPrice) return toast.error("Isi semua data")
		setIsBusy(true)
		const { error } = await supabase.from('menus').insert([{ food_name: newFoodName, price: Number(newFoodPrice), category: menuFormCategory }])
		if (!error) {
			toast.success("Menu ditambah")
			setNewFoodName(''); setNewFoodPrice('')
			setIsMenuDrawerOpen(false); fetchMenus()
		}
		setIsBusy(false)
	}

	const handleUpdateMenu = async () => {
		if (!editingMenu) return
		setIsBusy(true)
		const { error } = await supabase.from('menus').update({ food_name: newFoodName, price: Number(newFoodPrice), category: menuFormCategory }).eq('id', editingMenu.id)
		if (!error) {
			toast.success("Menu diupdate")
			setIsEditDrawerOpen(false); fetchMenus()
		}
		setIsBusy(false)
	}

	return (
		<div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
			{/* Header */}
			<div className="bg-white px-6 pt-6 pb-2 shadow-sm z-20 sticky top-0 border-b border-slate-100">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white"><UtensilsCrossed className="w-6 h-6" /></div>
						<div>
							<h2 className="text-xl font-black text-slate-800 tracking-tight">MakanMana Admin</h2>
						</div>
					</div>
					<button onClick={() => setIsSettingsOpen(true)} className="text-slate-400 hover:text-slate-600 transition"><Settings className="w-6 h-6" /></button>
				</div>

				<div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 mb-2">
					{(['orders', 'tardut', 'history', 'menu'] as const).map(t => (
						<button
							key={t}
							onClick={() => setView(t)}
							className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === t ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}
						>
							{t}
						</button>
					))}
				</div>
			</div>

			<div className="p-5 space-y-6 flex-1">
				{view === 'orders' && (
					<>
						{filteredActiveTardut.length > 0 && (
							<div
								onClick={() => setView('tardut')}
								className="bg-amber-500 rounded-[24px] p-5 flex items-center justify-between cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95 transition-all animate-pulse border-b-4 border-amber-600 mb-2"
							>
								<div className="flex items-center gap-4">
									<div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
										💸
									</div>
									<div>
										<h4 className="font-black text-white text-sm tracking-tight">PERMINTAAN TARDUT PENDING</h4>
										<p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Ada {filteredActiveTardut.length} permintaan masuk untuk tardut</p>
									</div>
								</div>
								<div className="bg-white/20 px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest">
									LIHAT
								</div>
							</div>
						)}

						<div className="grid grid-cols-2 gap-3">
							<div onClick={() => setSelectedObForDetail('OB 1')} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm active:scale-95 cursor-pointer">
								<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">OB 1 (Bahul)</p>
								<p className="text-lg font-black text-slate-800">{formatRupiah(ob1Total)}</p>
								<p className="text-[10px] font-bold text-amber-600 mt-1 underline">{(activeOrders || []).filter(o => o.assigned_to_ob === 'OB 1').length} Pesanan</p>
							</div>
							<div onClick={() => setSelectedObForDetail('OB 2')} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm active:scale-95 cursor-pointer">
								<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">OB 2 (Masber)</p>
								<p className="text-lg font-black text-slate-800">{formatRupiah(ob2Total)}</p>
								<p className="text-[10px] font-bold text-orange-600 mt-1 underline">{(activeOrders || []).filter(o => o.assigned_to_ob === 'OB 2').length} Pesanan</p>
							</div>
						</div>

						{unassignedTotal > 0 && (
							<div className="bg-red-50 rounded-xl p-3 border border-red-200 text-red-600 font-bold text-sm flex justify-between">
								<span>🚨 Belum Ditugaskan</span>
								<span className="font-black">{formatRupiah(unassignedTotal)}</span>
							</div>
						)}

						<div>
							<div className="flex items-center justify-between mb-3">
								<h3 className="font-bold text-slate-800 text-lg">Pesanan Aktif ({filteredActiveOrders.length})</h3>
								<div className="flex bg-white rounded-xl p-1 border border-slate-100 shadow-sm">
									{(['all', 'Bahul', 'Masber'] as const).map(f => (
										<button
											key={f}
											onClick={() => setTransferFilter(f)}
											className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${transferFilter === f ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
										>
											{f === 'all' ? 'Semua' : f}
										</button>
									))}
								</div>
							</div>
							<div className="space-y-4">
								{filteredActiveOrders.map(order => (
									<OrderCard
										key={order.id}
										order={order}
										role="ob"
										currentObId={myObId || ''}
										formatRupiah={formatRupiah}
										onTake={(id) => takeOrder(id, myObId || 'OB 1')}
										onRelease={releaseOrder}
										onVerifyPayment={(o) => verifyPayment(o.id)}
										onMarkDone={(o) => completeOrder(o.id)}
									/>
								))}
							</div>
						</div>
					</>
				)}

				{view === 'history' && (
					<div className="space-y-6">
						<div className="flex items-center justify-between">
							<h3 className="font-black text-slate-800 text-xl">Riwayat Selesai 💪</h3>
							<div className="flex bg-white rounded-xl p-1 border border-slate-100 shadow-sm">
								<button onClick={() => setHistoryType('food')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${historyType === 'food' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400'}`}>Makanan</button>
								<button onClick={() => setHistoryType('tardut')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${historyType === 'tardut' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400'}`}>Tardut</button>
							</div>
						</div>

						{historyType === 'food' ? (
							<div className="space-y-4">
								{(historyOrders || []).map(order => (
									<Card key={order.id} className="border-0 shadow-sm rounded-2xl bg-white">
										<CardContent className="p-4 flex items-center justify-between">
											<div>
												<p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{order.profiles?.name} • {new Date(order.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
												<h4 className="font-bold text-slate-800">{order.food_name}</h4>
												<p className="text-amber-600 font-black text-sm">{formatRupiah(order.price)}</p>
											</div>
											<div className="flex items-center gap-1.5 bg-green-50 text-green-600 px-2.5 py-1 rounded-full border border-green-100">
												<CheckCircle className="w-3 h-3" />
												<span className="text-[9px] font-black uppercase tracking-widest">Selesai</span>
											</div>
										</CardContent>
									</Card>
								))}

								<div className="pt-4 flex items-center justify-between px-2">
									<Button
										disabled={foodHistoryPage === 1}
										onClick={() => setFoodHistoryPage(p => p - 1)}
										className="h-10 px-4 bg-white text-slate-900 border border-slate-200 font-bold text-[10px]"
									>
										SEBELUMNYA
									</Button>
									<span className="text-[10px] font-black text-slate-400">HALAMAN {foodHistoryPage} / {Math.ceil(totalFoodHistory / itemsPerPage) || 1}</span>
									<Button
										disabled={foodHistoryPage >= Math.ceil(totalFoodHistory / itemsPerPage)}
										onClick={() => setFoodHistoryPage(p => p + 1)}
										className="h-10 px-4 bg-white text-slate-900 border border-slate-200 font-bold text-[10px]"
									>
										BERIKUTNYA
									</Button>
								</div>
							</div>
						) : (
							<div className="space-y-4">
								{(historyTardut || []).map(req => (
									<Card key={req.id} className="border-0 shadow-sm rounded-2xl bg-white">
										<CardContent className="p-4 flex items-center justify-between">
											<div>
												<p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{req.profiles?.name} • {new Date(req.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • {new Date(req.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
												<h4 className="font-extrabold text-slate-800">Tardut {formatRupiah(req.amount)}</h4>
												<div className="flex items-center gap-1.5 mt-1">
													<span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">💰 TARDUT</span>
												</div>
											</div>
											<div className="flex items-center gap-1.5 bg-slate-50 text-slate-600 px-2.5 py-1 rounded-full border border-slate-100">
												<CheckCircle className="w-3 h-3" />
												<span className="text-[9px] font-black uppercase tracking-widest">Selesai</span>
											</div>
										</CardContent>
									</Card>
								))}

								<div className="pt-4 flex items-center justify-between px-2">
									<Button
										disabled={tardutHistoryPage === 1}
										onClick={() => setTardutHistoryPage(p => p - 1)}
										className="h-10 px-4 bg-white text-slate-900 border border-slate-200 font-bold text-[10px]"
									>
										SEBELUMNYA
									</Button>
									<span className="text-[10px] font-black text-slate-400">HALAMAN {tardutHistoryPage} / {Math.ceil(totalTardutHistory / itemsPerPage) || 1}</span>
									<Button
										disabled={tardutHistoryPage >= Math.ceil(totalTardutHistory / itemsPerPage)}
										onClick={() => setTardutHistoryPage(p => p + 1)}
										className="h-10 px-4 bg-white text-slate-900 border border-slate-200 font-bold text-[10px]"
									>
										BERIKUTNYA
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
								<h3 className="font-black text-slate-800 text-xl tracking-tight">Katalog Menu</h3>
								<Button onClick={() => {
									setNewFoodName('');
									setNewFoodPrice('');
									setMenuFormCategory('Lainnya');
									setIsMenuDrawerOpen(true);
								}} className="bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl">
									<Plus className="w-4 h-4 mr-1" /> TAMBAH
								</Button>
							</div>
							<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-4">{menus.length} ITEM TERSEDIA</p>
						</div>

						<div className="flex">
							<Button
								variant="outline"
								onClick={() => setIsCategoryDrawerOpen(true)}
								className="h-11 rounded-2xl border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-widest shrink-0 mr-2"
							>
								<Folder className="w-4 h-4 mr-1.5 text-amber-500" /> Kelola Kategori
							</Button>
						</div>

						<div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5">
							{['Semua', ...dbCategories].map(cat => (
								<button
									key={cat}
									onClick={() => setActiveFilterCategory(cat)}
									className={`shrink-0 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${activeFilterCategory === cat ? 'bg-amber-500 border-amber-600 text-white shadow-lg shadow-amber-500/20' : 'bg-white border-slate-100 text-slate-400'}`}
								>
									{cat}
								</button>
							))}
						</div>

						<div className="grid grid-cols-1 gap-3">
							{menus
								.filter(m => activeFilterCategory === 'Semua' || m.category === activeFilterCategory)
								.map(m => (
									<Card key={m.id} className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:border-amber-200 transition-colors">
										<CardContent className="p-4 flex items-center justify-between">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-xl">🥡</div>
												<div>
													<p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m.category || 'Lainnya'}</p>
													<h4 className="font-bold text-slate-800">{m.food_name}</h4>
													<p className="text-amber-600 font-black text-sm">{formatRupiah(m.price)}</p>
												</div>
											</div>
											<div className="flex gap-1">
												<button onClick={() => {
													setEditingMenu(m);
													setNewFoodName(m.food_name);
													setNewFoodPrice(m.price.toString());
													setMenuFormCategory(m.category || 'Lainnya');
													setIsEditDrawerOpen(true);
												}} className="p-2 text-slate-400 hover:text-amber-600"><Edit2 className="w-4 h-4" /></button>
												<button onClick={async () => { if (window.confirm("Hapus?")) { await supabase.from('menus').delete().eq('id', m.id); fetchMenus(); } }} className="p-2 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
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

			<Drawer open={!!selectedObForDetail} onOpenChange={() => setSelectedObForDetail(null)}>
				<DrawerContent className="max-w-[430px] mx-auto rounded-t-[32px] px-6 pb-8">
					<DrawerHeader>
						<DrawerTitle className="text-2xl font-black">Detail Pesanan {selectedObForDetail}</DrawerTitle>
						<DrawerDescription>Daftar makanan yang diproses oleh {selectedObForDetail}.</DrawerDescription>
					</DrawerHeader>
					<div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
						{(activeOrders || []).filter(o => o.assigned_to_ob === selectedObForDetail).map(order => (
							<div key={order.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group">
								<div>
									<p className="text-[10px] font-black text-amber-600 uppercase tracking-tighter mb-1">{order.profiles?.name}</p>
									<h4 className="font-bold text-slate-800 text-sm leading-tight">{order.food_name}</h4>
									<p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{formatRupiah(order.price)} • {order.payment_status === 'paid' ? 'LUNAS' : 'BELUM BAYAR'}</p>
								</div>
								<div className="text-right">
									<span className={`text-[8px] font-black px-2 py-1 rounded-lg border ${order.order_status === 'done' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
										{order.order_status === 'done' ? 'SELESAI' : 'PROSES'}
									</span>
								</div>
							</div>
						))}
					</div>
				</DrawerContent>
			</Drawer>

			<Drawer open={isMenuDrawerOpen} onOpenChange={setIsMenuDrawerOpen}>
				<DrawerContent className="max-w-[430px] mx-auto rounded-t-[32px] px-6">
					<DrawerHeader>
						<DrawerTitle className="text-2xl font-black">Menu Baru 🥘</DrawerTitle>
					</DrawerHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nama Makanan</Label>
							<Input placeholder="Nama Makanan" value={newFoodName} onChange={e => setNewFoodName(e.target.value)} className="h-14 rounded-xl" />
						</div>
						<div className="space-y-2">
							<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Harga</Label>
							<Input type="number" placeholder="Harga" value={newFoodPrice} onChange={e => setNewFoodPrice(e.target.value)} className="h-14 rounded-xl" />
						</div>
						<div className="space-y-2">
							<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kategori</Label>
							<select
								value={menuFormCategory}
								onChange={e => setMenuFormCategory(e.target.value)}
								className="flex h-14 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-bold"
							>
								<option value="Lainnya">Lainnya</option>
								{dbCategories.map(cat => (
									<option key={cat} value={cat}>{cat}</option>
								))}
							</select>
						</div>
						<Button onClick={handleAddMenu} disabled={isBusy} className="w-full h-14 bg-slate-900 text-white font-black rounded-xl mt-6">SIMPAN ✅</Button>
					</div>
				</DrawerContent>
			</Drawer>

			<Drawer open={isEditDrawerOpen} onOpenChange={setIsEditDrawerOpen}>
				<DrawerContent className="max-w-[430px] mx-auto rounded-t-[32px] px-6 pb-10">
					<DrawerHeader>
						<DrawerTitle className="text-2xl font-black">Edit Menu 📝</DrawerTitle>
					</DrawerHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nama Makanan</Label>
							<Input value={newFoodName} onChange={e => setNewFoodName(e.target.value)} className="h-14 rounded-xl" />
						</div>
						<div className="space-y-2">
							<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Harga</Label>
							<Input type="number" value={newFoodPrice} onChange={e => setNewFoodPrice(e.target.value)} className="h-14 rounded-xl" />
						</div>
						<div className="space-y-2">
							<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kategori</Label>
							<select
								value={menuFormCategory}
								onChange={e => setMenuFormCategory(e.target.value)}
								className="flex h-14 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-bold"
							>
								<option value="Lainnya">Lainnya</option>
								{dbCategories.map(cat => (
									<option key={cat} value={cat}>{cat}</option>
								))}
							</select>
						</div>
						<Button onClick={handleUpdateMenu} disabled={isBusy} className="w-full h-14 bg-amber-500 text-white font-black rounded-xl mt-6">UPDATE ✅</Button>
					</div>
				</DrawerContent>
			</Drawer>

			<CategoryManagerDrawer
				open={isCategoryDrawerOpen}
				onOpenChange={setIsCategoryDrawerOpen}
				categories={dbCategories}
				onAdd={handleAddCategory}
				onDelete={handleDeleteCategory}
				isBusy={isBusy}
			/>
		</div>
	)
}
