import { FoodArt } from '../illustrations/FoodArt';
import { validateImage } from '@/lib/form-validation';
import { useState, useRef, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '../ui/drawer';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ShoppingBag, CreditCard, Wallet, Camera, Plus, Minus, MessageSquare, Zap } from 'lucide-react';
import { toast } from 'sonner';
import type { CartItem } from '@/lib/cart-storage';
import { MAX_ORDER_NOTE_LENGTH } from '@/lib/order-notes';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onUpdateNote: (id: string, note: string) => void;
  onClearCart: () => void;
  onSubmit: (data: { 
    paymentMethod: 'cash' | 'transfer', 
    proofFile: File | null, 
    transferTo?: 'Bahul' | 'Masber'
  }) => void;
  isSubmitting: boolean;
  formatRupiah: (n: number) => string;
}

export function CartDrawer({
  open,
  onOpenChange,
  cart,
  onUpdateQuantity,
  onUpdateNote,
  onSubmit,
  isSubmitting,
  formatRupiah
}: CartDrawerProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [transferTo, setTransferTo] = useState<'Bahul' | 'Masber'>('Bahul');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset local state when cart is cleared or drawer is closed
  useEffect(() => {
    if (cart.length === 0 || !open) {
      setProofFile(null);
      setPaymentMethod('cash');
      setTransferTo('Bahul');
    }
  }, [cart.length, open]);

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleSubmit = () => {
    if (isSubmitting || cart.length === 0) return;
    if (paymentMethod === 'transfer') {
      const error = validateImage(proofFile);
      if (error) return toast.error(error);
    }
    
    onSubmit({
      paymentMethod,
      proofFile,
      transferTo: paymentMethod === 'transfer' ? transferTo : undefined
    });
  };

  return (
    <Drawer open={open} dismissible={!isSubmitting} onOpenChange={(next) => { if (!isSubmitting) onOpenChange(next); }}>
      <DrawerContent data-pwa-busy={isSubmitting} className="max-w-[430px] mx-auto rounded-t-[28px] px-6 pb-12 border-0 shadow-2xl">

        
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide">
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
              Pesanan kamu
            </DrawerTitle>
            <DrawerDescription className="text-slate-500 font-medium">
              Cek pilihanmu, lalu tentukan cara bayar.
            </DrawerDescription>
          </DrawerHeader>

          <fieldset disabled={isSubmitting} className="space-y-6 pt-4 min-w-0">
            {/* Cart Items */}
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="cart-item-with-note">
                <div className="cart-item-row">
                  <div className="cart-item-art"><FoodArt name={item.food_name} category={item.category} /></div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm leading-tight">{item.food_name}</h4>
                    <p className="text-emerald-600 font-semibold text-xs">{formatRupiah(item.price)}</p>
                  </div>
                  <div className="cart-quantity">
                    <button aria-label={`Kurangi ${item.food_name}`} onClick={() => onUpdateQuantity(item.id, -1)} className="w-11 h-11 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-semibold text-slate-800 text-sm w-4 text-center">{item.quantity}</span>
                    <button aria-label={`Tambah ${item.food_name}`} onClick={() => onUpdateQuantity(item.id, 1)} className="w-11 h-11 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-emerald-500 transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="cart-menu-note">
                  <Label htmlFor={`menu-note-${item.id}`}><MessageSquare size={14} aria-hidden="true" />Catatan untuk menu ini <span>(opsional)</span></Label>
                  <Input id={`menu-note-${item.id}`} aria-label={`Catatan ${item.food_name}`} aria-describedby={`menu-note-hint-${item.id}`}
                    placeholder="Misalnya: tanpa sambal, tidak pakai es" maxLength={MAX_ORDER_NOTE_LENGTH}
                    value={item.note ?? ''} onChange={event => onUpdateNote(item.id, event.target.value)} />
                  <p id={`menu-note-hint-${item.id}`}>{item.quantity > 1 ? `Berlaku untuk ${item.quantity} porsi menu ini.` : 'Hanya untuk menu ini.'}<span>{(item.note ?? '').length}/{MAX_ORDER_NOTE_LENGTH}</span></p>
                </div>
                </div>
              ))}
            </div>

            {/* Payment Method */}
            <div className="space-y-3">
              <Label className="text-[12px] font-semibold tracking-normal text-slate-400 ml-1">Metode Pembayaran</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md ring-2 ring-emerald-500/10' : 'border-slate-100 bg-white text-slate-400'}`}
                >
                  <Wallet className="w-5 h-5" />
                  <span className="text-[12px] font-semibold">Tunai</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('transfer')}
                  className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === 'transfer' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md ring-2 ring-emerald-500/10' : 'border-slate-100 bg-white text-slate-400'}`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-[12px] font-semibold">Transfer</span>
                </button>
              </div>
            </div>

            {/* Transfer Details */}
            {paymentMethod === 'transfer' && (
              <div className="bg-emerald-50 rounded-[24px] p-6 border border-emerald-100 space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <p className="text-[12px] font-semibold text-emerald-600 tracking-normal text-center mb-3">Transfer Ke OB Siapa?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTransferTo('Bahul')}
                      className={`h-12 rounded-xl font-semibold text-xs transition-all ${transferTo === 'Bahul' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white text-emerald-600 border border-emerald-200'}`}
                    >
                      BAHUL
                    </button>
                    <button
                      onClick={() => setTransferTo('Masber')}
                      className={`h-12 rounded-xl font-semibold text-xs transition-all ${transferTo === 'Masber' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white text-orange-600 border border-orange-200'}`}
                    >
                      MASBER
                    </button>
                  </div>
                </div>

                {/* Bank Account Info */}
                <div className="bg-white/80 backdrop-blur-sm p-5 rounded-[24px] border border-emerald-200 shadow-sm space-y-2 relative group">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[12px] font-semibold text-emerald-600 tracking-normal leading-none">
                        {transferTo === 'Bahul' ? 'BCA - MISBAKHUL UMAM' : 'BCA - BERNADUS KOPONG'}
                      </p>
                      <p className="text-xl font-semibold text-slate-800 tracking-tight">
                        {transferTo === 'Bahul' ? '2381149902' : '0280248151'}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        const num = transferTo === 'Bahul' ? '2381149902' : '0280248151';
                        navigator.clipboard.writeText(num);
                        toast.success("Nomor rekening disalin!");
                      }}
                      className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-sm border border-emerald-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className={`w-full h-14 border-dashed border-2 rounded-2xl font-semibold transition-all ${proofFile ? 'border-green-500 bg-green-50 text-green-700' : 'border-emerald-300 bg-white text-emerald-700'}`}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {proofFile ? `✅ ${proofFile.name}` : 'Pilih bukti transfer'}
                  </Button>
                </div>
              </div>
            )}
          </fieldset>
        </div>

        <DrawerFooter className="px-0 pt-3 pb-0">
          <div className="flex items-center justify-between mb-1 px-2">
            <span className="text-slate-400 font-semibold text-sm tracking-normal">Total pesanan</span>
            <span className="text-2xl font-semibold text-slate-800">{formatRupiah(total)}</span>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || cart.length === 0}
            className="w-full h-12 rounded-3xl bg-slate-900 text-white font-semibold text-lg shadow-2xl shadow-slate-900/40 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 animate-spin" /> Mengirim...
              </div>
            ) : (
              <><ShoppingBag className="w-5 h-5 mr-2" /> Kirim pesanan</>
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
