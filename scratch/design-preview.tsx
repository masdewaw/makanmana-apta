import { OnboardingProvider, useTourNavigation } from '../src/components/organisms/OnboardingProvider'
import { SettingsDrawer } from '../src/components/organisms/SettingsDrawer'
import { OBWorkQueue } from '../src/components/organisms/OBWorkQueue'
import { BrandLogo } from '../src/components/molecules/BrandLogo'
// Local design QA using simulated menus. Not imported by the production app.
import React, { useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Home, Heart, ReceiptText, UserRound, MapPin, ArrowUpRight } from 'lucide-react'
import { PersonalMenu } from '../src/components/organisms/PersonalMenu'
import { CartDrawer } from '../src/components/organisms/CartDrawer'
import AuthPage from '../src/pages/AuthPage'
import { Toaster, toast } from 'sonner'
import type { Menu } from '../src/types'
import type { CartItem } from '../src/lib/cart-storage'
import '../src/index.css'
const menus: Menu[] = [
 { id:'1',food_name:'Nasi Ayam Sambal Matah',price:22000,category:'Makanan' },
 { id:'2',food_name:'Mie Ayam Bakso',price:18000,category:'Makanan' },
 { id:'3',food_name:'Es Teh Manis',price:5000,category:'Minuman' },
 { id:'4',food_name:'Pisang Goreng',price:8000,category:'Camilan' },
 { id:'5',food_name:'Kopi Susu',price:12000,category:'Minuman' },
 { id:'6',food_name:'Pilihan spesial lainnya',price:10000,category:'Lainnya' },
]
function Preview() {
 const [cart,setCart]=useState<CartItem[]>([])
 const [settings,setSettings]=useState(false)
 useTourNavigation(useCallback(()=>{setCategory('Semua');setSearch('')},[]))
 const [category,setCategory]=useState('Semua'),[search,setSearch]=useState(''),[favorites,setFavorites]=useState<string[]>([]),[open,setOpen]=useState(false)
 const format=(n:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n)
 const change=(id:string,delta:number)=>setCart(items=>items.map(item=>item.id===id?{...item,quantity:item.quantity+delta}:item).filter(item=>item.quantity>0))
 if(new URLSearchParams(location.search).get('screen')==='ob') {
 const orders = [
 { id:'preview-1',user_id:'demo',profiles:{name:'Dewa'},food_name:'Nasi Ayam Sambal Matah',price:22000,payment_method:'transfer' as const,payment_status:'pending' as const,order_status:'waiting' as const,proof_url:null,catatan:'Sambal dipisah ya, nasi setengah saja.',created_at:new Date().toISOString(),transfer_to:'Bahul' },
 { id:'preview-2',user_id:'demo',profiles:{name:'Nadia'},food_name:'Mie Ayam Bakso',price:18000,payment_method:'cash' as const,payment_status:'pending' as const,order_status:'waiting' as const,proof_url:null,catatan:null,created_at:new Date().toISOString() },
 { id:'preview-3',user_id:'demo',profiles:{name:'Rizky'},food_name:'Es Teh Manis',price:5000,payment_method:'cash' as const,payment_status:'pending' as const,order_status:'waiting' as const,assigned_to_ob:'OB 1',proof_url:null,catatan:'Es sedikit',created_at:new Date().toISOString() }
 ]
 return <div className="mobile-shell max-w-[430px] mx-auto min-h-screen ob-dashboard"><header className="office-header"><BrandLogo/><span className="office-location">Dapur kantor</span></header><div className="p-5"><OBWorkQueue orders={orders} payments={orders.slice(2)} obId="OB 1" obName={code=>code==='OB 1'?'Bahul':'Masber'} loading={false} paymentPage={1} paymentCount={1} onPaymentPage={()=>{}}/></div><SettingsDrawer open={settings} onOpenChange={setSettings} userId="tour-preview-ob" currentName="Bahul" onLogout={()=>{}} onProfileUpdated={()=>{}}/><nav className="ob-bottom-nav"><button aria-current="page">Pesanan</button><button data-tour="ob-tardut-nav">Tarik duit</button><button data-tour="ob-more-nav" onClick={()=>setSettings(true)}>Lainnya</button></nav></div>
 }
 if(new URLSearchParams(location.search).get('screen')==='auth')return <div className="mobile-shell max-w-[430px] mx-auto min-h-screen"><AuthPage/><Toaster/></div>
 return <div className="mobile-shell max-w-[430px] mx-auto min-h-screen"><div className="mobile-page flex flex-col min-h-screen">
 <header className="office-header"><BrandLogo /><div className="header-actions"><span className="office-location"><MapPin size={13}/>Kantor</span><button data-tour="user-settings" className="profile-avatar" aria-label="Preview akun" onClick={()=>setSettings(true)}>D</button></div></header>
 <div className="p-5"><PersonalMenu name="Dewa" menus={menus} categories={['Semua','Makanan','Minuman','Camilan','Lainnya','🌟 Favoritku']} selectedCategory={category} onCategory={setCategory} search={search} onSearch={setSearch} favorites={favorites} cart={cart} onFavorite={(_,id)=>setFavorites(ids=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id])} onAdd={menu=>setCart(items=>[...items,{...menu,quantity:1}])} onQuantity={change} onManual={()=>toast('Preview: pesanan manual')} onInspiration={()=>toast('Preview: inspirasi pesanan')} onTardut={()=>toast('Preview: tarik duit')} onRanking={()=>toast('Preview: menu populer')} recommendation={menus[0]} activeOrders={[]} onTrack={()=>{}} formatRupiah={format}/></div>
 {cart.length>0&&<div data-tour="user-cart" className="mobile-cart-bar cart-dock"><button className="cart-dock-button" onClick={()=>setOpen(true)}><span className="cart-count">{cart.reduce((s,i)=>s+i.quantity,0)}</span><span className="cart-dock-label"><small>Keranjangmu</small><strong>{format(cart.reduce((s,i)=>s+i.price*i.quantity,0))}</strong></span><span className="cart-dock-next">Lihat pesanan<ArrowUpRight size={18}/></span></button></div>}
 <nav className="mobile-bottom-nav bottom-navigation"><button className={category!=='🌟 Favoritku'?'is-active':''} onClick={()=>{setCategory('Semua');setSearch('')}}><Home size={21}/><span>Beranda</span></button><button className={category==='🌟 Favoritku'?'is-active':''} onClick={()=>{setCategory('🌟 Favoritku');setSearch('')}}><Heart size={21}/><span>Favorit</span></button><button data-tour="user-orders-nav" onClick={()=>toast('Preview: riwayat pesanan')}><ReceiptText size={21}/><span>Pesanan</span></button><button onClick={()=>toast('Preview: pengaturan akun')}><UserRound size={21}/><span>Akun</span></button></nav>
 <SettingsDrawer open={settings} onOpenChange={setSettings} userId="tour-preview-user" currentName="Dewa" onLogout={()=>{}} onProfileUpdated={()=>{}}/><CartDrawer open={open} onOpenChange={setOpen} cart={cart} onUpdateQuantity={change} onUpdateNote={(id,note)=>setCart(items=>items.map(item=>item.id===id?{...item,note}:item))} onClearCart={()=>setCart([])} onSubmit={()=>toast('Ini preview desain. Tidak ada pesanan dikirim.')} isSubmitting={false} formatRupiah={format}/><Toaster/>
 </div></div>
}
const previewRoot = createRoot(document.getElementById('preview')!)
previewRoot.render(<QueryClientProvider client={new QueryClient()}><OnboardingProvider userId={new URLSearchParams(location.search).get('tour')==='1' ? (new URLSearchParams(location.search).get('screen')==='ob'?'tour-preview-ob':'tour-preview-user') : null} role={new URLSearchParams(location.search).get('screen')==='ob'?'ob':'user'}><Preview/></OnboardingProvider></QueryClientProvider>)

if (import.meta.hot) import.meta.hot.dispose(() => previewRoot.unmount())
