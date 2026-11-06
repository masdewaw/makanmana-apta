import * as Dialog from '@radix-ui/react-dialog'
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { toast } from 'sonner'
import { isTourHidden, saveTourPreference, tourPreferenceKey, tourSteps, positionTourCard, type TourRect, type TourRole } from '../../lib/onboarding'
import { Button } from '../ui/button'

interface TourContext { replay: () => void; activeTarget: string | null }
const OnboardingContext = createContext<TourContext | null>(null)
export const useOnboarding = () => useContext(OnboardingContext)
export function useTourNavigation(prepare: (target: string) => void) {
  const target = useOnboarding()?.activeTarget
  useEffect(() => { if (target) prepare(target) }, [target, prepare])
}
// Token refreshes can remount dashboards. A page reload starts a new visit.
const introducedThisVisit = new Set<string>()
const getRect = (element: Element): TourRect => {
  const { left, top, width, height } = element.getBoundingClientRect()
  return { left, top, width, height }
}

export function OnboardingProvider({ userId, role, children }: { userId: string | null; role: TourRole; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [hide, setHide] = useState(false)
  const initialized = useRef(false)
  const [card, setCard] = useState<HTMLDivElement | null>(null)
  const [geometry, setGeometry] = useState<{ target: TourRect | null; shell: TourRect; viewport: TourRect; cardHeight: number } | null>(null)
  const steps = tourSteps[role]
  const current = steps[step]

  useEffect(() => {
    if (!userId || initialized.current) return
    initialized.current = true
    const key = tourPreferenceKey(userId, role)
    const hidden = isTourHidden(userId, role)
    setHide(hidden)
    if (!hidden && !introducedThisVisit.has(key)) setOpen(true)
    introducedThisVisit.add(key)
  }, [userId, role])

  useLayoutEffect(() => {
    if (!open) return
    let frame = 0
    let scrolled: Element | null = null
    let observed: Element | null = null
    const viewport = window.visualViewport
    const shell = document.querySelector('.mobile-shell')
    const measure = () => {
      const element = document.querySelector(`[data-tour="${current.target}"]`) || (current.fallback ? document.querySelector(`[data-tour="${current.fallback}"]`) : null)
      if (element && element !== observed) { resize.observe(element); observed = element }
      if (element && element !== scrolled) { scrolled = element; element.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' }) }
      const visible = { left: viewport?.offsetLeft ?? 0, top: viewport?.offsetTop ?? 0, width: viewport?.width ?? document.documentElement.clientWidth, height: viewport?.height ?? window.innerHeight }
      const bounds = element ? getRect(element) : null
      const target = bounds && bounds.width > 0 && bounds.height > 0 ? {
        left: Math.max(visible.left + 6, bounds.left - 6), top: Math.max(visible.top + 6, bounds.top - 6),
        width: Math.min(bounds.width + 12, visible.width - 12),
        height: Math.min(bounds.height + 12, visible.top + visible.height - 6 - Math.max(visible.top + 6, bounds.top - 6)),
      } : null
      const naturalHeight = card ? (card.querySelector('.tour-scroll')?.scrollHeight ?? 0) + (card.querySelector('.tour-controls')?.getBoundingClientRect().height ?? 0) + 2 : 330
      const next = { target: target && target.height > 0 ? target : null, shell: shell ? getRect(shell) : visible, viewport: visible, cardHeight: naturalHeight }
      setGeometry(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next)
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure) }
    const resize = new ResizeObserver(schedule)
    if (shell) resize.observe(shell)
    if (card) resize.observe(card)
    const mutation = new MutationObserver(schedule)
    // Targets can mount after switching a tab or loading the menu.
    if (shell) mutation.observe(shell, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] })
    measure()
    document.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)
    viewport?.addEventListener('resize', schedule)
    viewport?.addEventListener('scroll', schedule)
    return () => { cancelAnimationFrame(frame); resize.disconnect(); mutation.disconnect(); document.removeEventListener('scroll', schedule, true); window.removeEventListener('resize', schedule); viewport?.removeEventListener('resize', schedule); viewport?.removeEventListener('scroll', schedule) }
  }, [open, current, card])

  function replay() {
    if (!userId) return
    setStep(0); setHide(isTourHidden(userId, role)); setOpen(true)
  }
  function updatePreference(hidden: boolean) {
    if (!userId) return
    if (saveTourPreference(userId, role, hidden)) setHide(hidden)
    else toast.error('Pilihan belum tersimpan di browser. Coba lagi atau gunakan Lewati untuk menutup panduan sementara.')
  }
  function close() { setOpen(false) }
  const context = useMemo(() => userId ? { replay, activeTarget: open ? current.target : null } : null, [userId, role, open, current.target])
  const position = geometry ? positionTourCard(geometry.shell, geometry.target, geometry.cardHeight, geometry.viewport) : null
  const arrowLeft = geometry?.target && position ? Math.max(24, Math.min(position.width - 24, geometry.target.left + geometry.target.width / 2 - position.left)) : 24
  return <OnboardingContext.Provider value={context}>
    {children}
    <Dialog.Root open={open} onOpenChange={value => { if (!value) close() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="tour-overlay" />
        {geometry?.target ? <div className="tour-spotlight" aria-hidden="true" style={geometry.target} /> : <div className="tour-dim" aria-hidden="true" />}
        <Dialog.Content ref={setCard} className="tour-popover" style={position ? { left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight } : undefined} onPointerDownOutside={event => event.preventDefault()} tabIndex={-1}>
          {position && position.side !== 'center' && <span className={`tour-arrow tour-arrow-${position.side}`} style={{ left: arrowLeft }} aria-hidden="true" />}
          <div className="tour-scroll">
            <div className="tour-heading"><span>PANDUAN {role === 'ob' ? 'TEMAN OB' : 'MAKANMANA'}</span><button aria-label="Tutup panduan" onClick={close}><X size={19} /></button></div>
            <Dialog.Title className="tour-title">{current.title}</Dialog.Title>
            <Dialog.Description className="tour-description">{current.description}</Dialog.Description>
            <label className="tour-opt-out"><input type="checkbox" checked={hide} onChange={event => updatePreference(event.target.checked)} /><span>Jangan tampilkan lagi</span></label>
          </div>
          <div className="tour-controls"><span className="tour-count" aria-live="polite">{step + 1} dari {steps.length}</span><button className="tour-skip" onClick={close}>Lewati</button><div className="tour-actions"><Button variant="outline" disabled={step === 0} onClick={() => setStep(value => value - 1)} aria-label="Langkah sebelumnya"><ArrowLeft size={16} /><span>Kembali</span></Button><Button onClick={() => step === steps.length - 1 ? close() : setStep(value => value + 1)}>{step === steps.length - 1 ? 'Selesai' : 'Lanjut'}<ArrowRight size={16} /></Button></div></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </OnboardingContext.Provider>
}
