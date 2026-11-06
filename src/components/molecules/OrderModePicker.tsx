import { UtensilsCrossed, UsersRound, ReceiptText } from 'lucide-react'

export type OrderMode = 'personal' | 'teman_makan' | 'split_bill'
const modes = [
  { id: 'personal', label: 'Pesan makan', icon: UtensilsCrossed },
  { id: 'teman_makan', label: 'Teman makan', icon: UsersRound },
  { id: 'split_bill', label: 'Patungan', icon: ReceiptText },
] as const

export function OrderModePicker({ value, onChange }: { value: OrderMode; onChange: (mode: OrderMode) => void }) {
  return <div className="order-mode-picker" role="group" aria-label="Jenis pemesanan">
    {modes.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={value === id}
      className={`order-mode-option ${value === id ? 'is-active' : ''}`} onClick={() => onChange(id)}>
      <span className="order-mode-icon"><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></span>
      <span>{label}</span>
      <span className="order-mode-indicator" aria-hidden="true" />
    </button>)}
  </div>
}
