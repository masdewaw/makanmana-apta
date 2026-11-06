import { assertOnline } from '../../lib/connectivity'
import { useTourNavigation } from './OnboardingProvider'
import { useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Order } from '../../types'
import { orderService } from '../../api/orders'
import { errorMessage } from '../../lib/errors'
import { useProofUrl } from '../../hooks/useProofUrl'
import { Button } from '../ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '../ui/drawer'

export function OBWorkQueue({ orders, payments, obId, obName, loading, paymentPage, paymentCount, onPaymentPage }: {
  orders: Order[]; payments: Order[]; obId: string | null; obName: (code: string) => string; loading: boolean;
  paymentPage: number; paymentCount: number; onPaymentPage: (page: number) => void
}) {
  const [tab, setTab] = useState<'new' | 'mine' | 'payment'>('new')
  useTourNavigation(useCallback(target => { if (target === 'ob-mine') setTab('mine'); else if (target === 'ob-payment') setTab('payment'); else if (target === 'ob-new' || target === 'ob-queues') setTab('new') }, []))
  const [pending, setPending] = useState<string | null>(null)
  const lock = useRef(false)
  const [proof, setProof] = useState<Order | null>(null)
  const signed = useProofUrl(proof?.proof_url)
  const client = useQueryClient()
  const fresh = orders.filter(o => !o.assigned_to_ob)
  const mine = orders.filter(o => !!obId && o.assigned_to_ob === obId)
  const others = orders.filter(o => o.assigned_to_ob && o.assigned_to_ob !== obId)
  const list = [...(tab === 'new' ? fresh : tab === 'mine' ? mine : payments)].sort((a, b) => a.created_at.localeCompare(b.created_at))
  const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
  async function act(order: Order, action: 'take' | 'release' | 'done' | 'pay' | 'undo') {
    if (!obId || lock.current) return
    lock.current = true; setPending(order.id)
    try {
      assertOnline()
      if (action === 'pay') await orderService.updatePaymentStatus(order.id, 'paid')
      else await orderService.transitionObOrder(order.id, obId, action)
      toast.success({ take: 'Pesanan masuk ke tugas saya', release: 'Pesanan dikembalikan ke antrean', done: 'Pesanan sudah diterima', pay: 'Pembayaran dikonfirmasi', undo: 'Pesanan kembali ke tugas saya' }[action], action === 'done' ? { duration: 6000, action: { label: 'Urungkan', onClick: () => { void act(order, 'undo') } } } : undefined)
      if (action === 'pay') setProof(null)
      await client.invalidateQueries({ queryKey: ['orders'] })
    } catch (error) { toast.error(errorMessage(error)); void client.invalidateQueries({ queryKey: ['orders'] }) }
    finally { lock.current = false; setPending(null) }
  }
  return <section data-pwa-busy={!!pending} className="ob-workspace">
    <div className="ob-intro"><span className="ob-eyebrow">RUANG KERJA</span><h1>Halo, {obId ? obName(obId) : 'teman'} 👋</h1><p>{mine.length ? `${mine.length} pesanan sedang kamu tangani.` : 'Yuk, bantu teman kantor makan hari ini.'}</p></div>
    <div data-tour="ob-queues" className="ob-queue-tabs" aria-label="Antrean pekerjaan">{(['new', 'mine', 'payment'] as const).map(key => <button data-tour={`ob-${key}`} key={key} aria-pressed={tab === key} onClick={() => setTab(key)}><strong>{key === 'new' ? fresh.length : key === 'mine' ? mine.length : paymentCount}</strong><span>{{ new: 'Pesanan baru', mine: 'Tugas saya', payment: 'Pembayaran' }[key]}</span></button>)}</div>
    <div className="ob-list-heading"><h2>{{ new: 'Siap diambil', mine: 'Sedang kamu tangani', payment: 'Perlu konfirmasi' }[tab]}</h2><span>{tab === 'payment' ? paymentCount : list.length} pesanan</span></div>
    {loading ? <p role="status" className="ob-empty">Memuat pesanan…</p> : list.length === 0 ? <div className="ob-empty"><strong>{{ new: 'Antrean sudah beres', mine: 'Belum ada tugas', payment: 'Pembayaran sudah beres' }[tab]}</strong><p>{tab === 'mine' ? 'Ambil pesanan dari tab Pesanan baru.' : 'Pesanan yang perlu ditangani akan muncul di sini.'}</p></div> : list.map(order => <article className="ob-task-card" key={order.id}>
      <div className="ob-task-person"><span>{order.profiles?.name || 'Teman kantor'}</span><time dateTime={order.created_at}>{new Date(order.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></div>
      <h3>{order.food_name}</h3><div className="ob-task-price"><span>1 porsi</span><strong>{money(order.price)}</strong></div>
      {order.catatan && <div className="ob-task-note"><strong>Catatan menu</strong><p>{order.catatan}</p></div>}
      <p className="ob-task-payment">{order.payment_method === 'cash' ? 'Tunai' : `Transfer ke ${order.transfer_to || 'OB'}`} · {order.payment_status === 'paid' ? 'Sudah dibayar' : 'Belum dikonfirmasi'}</p>
      {tab === 'payment' ? <>{order.proof_url && <Button variant="outline" className="w-full mb-2" onClick={() => setProof(order)}>Lihat bukti transfer</Button>}<Button className="w-full" disabled={!obId || !!pending || (order.payment_method === 'transfer' && !!order.proof_url)} onClick={() => void act(order, 'pay')}>{pending === order.id ? 'Menyimpan…' : order.payment_method === 'cash' ? 'Uang sudah diterima' : 'Konfirmasi pembayaran'}</Button></> : tab === 'new' ? <Button className="w-full" disabled={!obId || !!pending} onClick={() => void act(order, 'take')}>{pending === order.id ? 'Menyimpan…' : 'Saya tangani pesanan ini'}</Button> : <><Button className="w-full" disabled={!!pending} onClick={() => void act(order, 'done')}>{pending === order.id ? 'Menyimpan…' : 'Pesanan sudah diterima'}</Button><button className="ob-release" disabled={!!pending} onClick={() => void act(order, 'release')}>Kembalikan ke antrean</button></>}
    </article>)}
    {tab === 'payment' && paymentCount > 20 && <div className="flex items-center justify-between gap-3"><Button variant="outline" disabled={paymentPage === 1} onClick={() => onPaymentPage(paymentPage - 1)}>Sebelumnya</Button><span>{paymentPage} / {Math.ceil(paymentCount / 20)}</span><Button variant="outline" disabled={paymentPage * 20 >= paymentCount} onClick={() => onPaymentPage(paymentPage + 1)}>Berikutnya</Button></div>}
    {tab === 'new' && others.length > 0 && <details className="ob-other"><summary>Ditangani rekan OB ({others.length})</summary>{others.map(order => <p key={order.id}>{order.food_name}<small>{order.profiles?.name} · {obName(order.assigned_to_ob!)}</small></p>)}</details>}
    <Drawer open={!!proof} onOpenChange={open => { if (!open) setProof(null) }}><DrawerContent><DrawerHeader><DrawerTitle>Bukti pembayaran</DrawerTitle><DrawerDescription>{proof?.profiles?.name} · {proof ? money(proof.price) : ''}</DrawerDescription></DrawerHeader><div className="p-5 overflow-y-auto">{signed.isLoading ? <p>Memuat bukti…</p> : signed.error ? <Button onClick={() => void signed.refetch()}>Coba muat bukti lagi</Button> : signed.data && <img src={signed.data} alt="Bukti transfer pemesan" className="w-full rounded-xl mb-4" />}<Button className="w-full" disabled={!signed.data || !!pending} onClick={() => proof && void act(proof, 'pay')}>Transfer sudah sesuai</Button></div></DrawerContent></Drawer>
  </section>
}
