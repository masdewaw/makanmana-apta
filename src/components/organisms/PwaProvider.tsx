import { isPwaUpdateBlocked } from '../../lib/pwa-update'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Download, Share, RefreshCw, WifiOff, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { queryClient } from '../../lib/query-client'
import { useOnline } from '../../hooks/useOnline'
import { Button } from '../ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '../ui/drawer'

interface InstallEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
interface PwaContextValue { installed: boolean; canPrompt: boolean; installing: boolean; install: () => Promise<void>; showHelp: () => void }
const PwaContext = createContext<PwaContextValue | null>(null)
export const usePwa = () => useContext(PwaContext)
const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || !!(navigator as Navigator & { standalone?: boolean }).standalone

export function PwaProvider({ children }: { children: ReactNode }) {
  const online = useOnline()
  const [installed, setInstalled] = useState(isInstalled)
  const [prompt, setPrompt] = useState<InstallEvent | null>(null)
  const [installing, setInstalling] = useState(false)
  const [help, setHelp] = useState(false)
  const [updateReady, setUpdateReady] = useState(false)
  const [applying, setApplying] = useState(false)
  const registration = useRef<ServiceWorkerRegistration | null>(null)
  const reloadRequested = useRef(false)
  const updateTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)')
    const changed = () => setInstalled(isInstalled())
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent) }
    const completed = () => { setInstalled(true); setPrompt(null); setHelp(false) }
    window.addEventListener('beforeinstallprompt', capture)
    window.addEventListener('appinstalled', completed)
    media.addEventListener('change', changed)
    return () => { window.removeEventListener('beforeinstallprompt', capture); window.removeEventListener('appinstalled', completed); media.removeEventListener('change', changed) }
  }, [])

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !window.isSecureContext) return
    let active = true
    let hadController = !!navigator.serviceWorker.controller
    let timer: ReturnType<typeof setInterval> | undefined
    let watched: ServiceWorker | null = null
    let reg: ServiceWorkerRegistration | null = null
    const checkWaiting = () => { if (active && reg?.waiting && navigator.serviceWorker.controller) setUpdateReady(true) }
    const changed = () => {
      if (reloadRequested.current) window.location.reload()
      else if (active) setUpdateReady(hadController)
      hadController = true
    }
    const stateChanged = () => { if (watched?.state === 'installed') checkWaiting() }
    const found = () => {
      watched?.removeEventListener('statechange', stateChanged)
      watched = reg?.installing || null
      watched?.addEventListener('statechange', stateChanged)
    }
    let registering = false
    const check = () => { if (navigator.onLine && document.visibilityState === 'visible') { if (reg) void reg.update().catch(() => {}); else connect() } }
    navigator.serviceWorker.addEventListener('controllerchange', changed)
    function connect() {
      if (registering || !active) return
      registering = true
      void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(value => {
        if (!active) return
        reg = value; registration.current = value
        checkWaiting(); found()
        reg.addEventListener('updatefound', found)
        timer = setInterval(check, 60 * 60 * 1000)
      }).catch(error => { console.warn('PWA offline shell unavailable:', error) }).finally(() => { registering = false })
    }
    connect()
    window.addEventListener('online', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      active = false; clearInterval(timer); clearTimeout(updateTimeout.current)
      reg?.removeEventListener('updatefound', found)
      watched?.removeEventListener('statechange', stateChanged)
      navigator.serviceWorker.removeEventListener('controllerchange', changed)
      window.removeEventListener('online', check); document.removeEventListener('visibilitychange', check)
    }
  }, [])

  async function install() {
    if (!prompt) { setHelp(true); return }
    if (installing) return
    setInstalling(true)
    try {
      await prompt.prompt()
      const choice = await prompt.userChoice
      if (choice.outcome === 'accepted') setHelp(false)
    } catch { toast.error('Pemasangan belum berhasil. Coba lagi lewat menu browser.') }
    finally { setPrompt(null); setInstalling(false) }
  }
  function applyUpdate() {
    // Never reload a form, an open sheet, or an in-flight transaction.
    if (isPwaUpdateBlocked(document, queryClient.isMutating())) {
      toast.info('Selesaikan isian dan tutup panel sebelum memperbarui aplikasi.'); return
    }
    if (applying) return
    reloadRequested.current = true; setApplying(true)
    if (registration.current?.waiting) {
      registration.current.waiting.postMessage({ type: 'ACTIVATE_UPDATE' })
      updateTimeout.current = setTimeout(() => { reloadRequested.current = false; setApplying(false); toast.error('Pembaruan belum selesai. Silakan coba lagi.') }, 15000)
    } else window.location.reload()
  }
  return <PwaContext.Provider value={{ installed, canPrompt: !!prompt, installing, install, showHelp: () => setHelp(true) }}>
    <div className="pwa-root">
      {(!online || updateReady) && <aside className="pwa-status-stack" aria-label="Status aplikasi">
        {!online && <div className="pwa-offline" role="status"><WifiOff size={17} aria-hidden="true" /><span>Kamu sedang offline.<small>Keranjangmu tetap tersimpan. Transaksi perlu internet.</small></span></div>}
        {updateReady && <div className="pwa-update" role="status"><RefreshCw size={17} aria-hidden="true" /><span>Versi baru tersedia</span><button onClick={applyUpdate} disabled={applying}>{applying ? 'Memperbarui…' : 'Perbarui sekarang'}</button></div>}
      </aside>}
      {children}
    </div>
    <Drawer open={help} onOpenChange={setHelp}><DrawerContent><DrawerHeader><DrawerTitle>Pasang MakanMana</DrawerTitle><DrawerDescription>Akses lebih cepat dari layar utama HP.</DrawerDescription></DrawerHeader><div className="p-6 pt-0 overflow-y-auto"><PwaInstallPanel /></div></DrawerContent></Drawer>
  </PwaContext.Provider>
}

export function PwaInstallButton() {
  const pwa = usePwa()
  if (!pwa || pwa.installed) return null
  return <button type="button" className="pwa-install-shortcut" onClick={pwa.showHelp}><Download size={17} />Pasang MakanMana di HP</button>
}
export function PwaInstallPanel() {
  const pwa = usePwa()
  if (!pwa) return null
  if (pwa.installed) return <div className="pwa-install-panel"><CheckCircle2 /><h3>MakanMana sudah dibuka sebagai aplikasi</h3><p>Kamu bisa mengaksesnya langsung dari layar utama.</p></div>
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return <div className="pwa-install-panel"><img src="/icons/icon-192.png" width="64" height="64" alt="Logo aplikasi MakanMana" /><h3>MakanMana, satu ketukan dari layar utama</h3><p>Pasang untuk membuka aplikasi dengan lebih praktis. Memesan dan mengonfirmasi pembayaran tetap memerlukan internet.</p>
    {pwa.canPrompt ? <Button className="w-full" disabled={pwa.installing} onClick={() => void pwa.install()}><Download size={17} />{pwa.installing ? 'Membuka pemasangan…' : 'Pasang aplikasi'}</Button> : ios ? <ol><li>Buka MakanMana di Safari.</li><li>Ketuk menu Bagikan <Share size={15} aria-label="Bagikan" />.</li><li>Pilih Tambahkan ke Layar Utama, lalu Tambah. Aktifkan Buka sebagai app jika pilihan ini tersedia.</li></ol> : <ol><li>Buka menu browser (⋮ atau menu utama).</li><li>Pilih Pasang aplikasi atau Tambahkan ke layar utama jika tersedia.</li><li>Jika pilihan belum ada, buka tautan ini langsung di Chrome atau Edge, lalu coba lagi.</li></ol>}
    <p className="pwa-install-note">Pilihan pemasangan mengikuti browser dan perangkatmu.</p>
  </div>
}
