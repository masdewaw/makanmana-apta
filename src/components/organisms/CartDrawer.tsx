import { useState, useRef, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '../ui/drawer';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ShoppingBag, CreditCard, Wallet, Camera, Plus, Minus, MessageSquare, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Menu } from '../../types';

interface CartItem extends Menu {
  quantity: number;
}

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onClearCart: () => void;
  onSubmit: (data: { 
    paymentMethod: 'cash' | 'transfer', 
    proofFile: File | null, 
    catatan: string,
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
  onSubmit,
  isSubmitting,
  formatRupiah
}: CartDrawerProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [transferTo, setTransferTo] = useState<'Bahul' | 'Masber'>('Bahul');
  const [catatan, setCatatan] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset local state when cart is cleared or drawer is closed
  useEffect(() => {
    if (cart.length === 0 || !open) {
      setCatatan('');
      setProofFile(null);
      setPaymentMethod('cash');
      setTransferTo('Bahul');
    }
  }, [cart.length, open]);

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleSubmit = () => {
    if (paymentMethod === 'transfer' && !proofFile) {
      toast.error("Mohon upload bukti transfer");
      return;
    }
    
    onSubmit({
      paymentMethod,
      proofFile,
      catatan,
      transferTo: paymentMethod === 'transfer' ? transferTo : undefined
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-[430px] mx-auto rounded-t-[40px] px-6 pb-12 border-0 shadow-2xl max-h-[96dvh]">
        <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mt-4 mb-4" />
        
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide">
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
              Keranjang Saya 🛒
            </DrawerTitle>
            <DrawerDescription className="text-slate-500 font-medium">
              Selesaikan pesanan kamu sekarang.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-6 pt-4">
            {/* Cart Items */}
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex-1">
                    <h4 className="font-black text-slate-800 text-sm leading-tight">{item.food_name}</h4>
                    <p className="text-amber-600 font-black text-xs">{formatRupiah(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-black text-slate-800 text-sm w-4 text-center">{item.quantity}</span>
                    <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-amber-500 transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Catatan Tambahan</Label>
              <div className="relative">
                <MessageSquare className="absolute left-4 top-4 w-4 h-4 text-slate-300" />
                <Input
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Contoh: Gak pake kol, sambel dipisah..."
                  className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 font-medium focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-amber-500 focus-visible:bg-white transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Metode Pembayaran</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === 'cash' ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md ring-2 ring-amber-500/10' : 'border-slate-100 bg-white text-slate-400'}`}
                >
                  <Wallet className="w-5 h-5" />
                  <span className="text-[10px] font-black">TUNAI/CASH</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('transfer')}
                  className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === 'transfer' ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md ring-2 ring-amber-500/10' : 'border-slate-100 bg-white text-slate-400'}`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-[10px] font-black">TRANSFER</span>
                </button>
              </div>
            </div>

            {/* Transfer Details */}
            {paymentMethod === 'transfer' && (
              <div className="bg-amber-50 rounded-[32px] p-6 border border-amber-100 space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest text-center mb-3">Transfer Ke OB Siapa?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTransferTo('Bahul')}
                      className={`h-12 rounded-xl font-black text-xs transition-all ${transferTo === 'Bahul' ? 'bg-amber-500 text-white shadow-lg' : 'bg-white text-amber-600 border border-amber-200'}`}
                    >
                      BAHUL
                    </button>
                    <button
                      onClick={() => setTransferTo('Masber')}
                      className={`h-12 rounded-xl font-black text-xs transition-all ${transferTo === 'Masber' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white text-orange-600 border border-orange-200'}`}
                    >
                      MASBER
                    </button>
                  </div>
                </div>

                {/* Bank Account Info */}
                <div className="bg-white/80 backdrop-blur-sm p-5 rounded-[24px] border border-amber-200 shadow-sm space-y-2 relative group">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none">
                        {transferTo === 'Bahul' ? 'BCA - MISBAKHUL UMAM' : 'BCA - BERNADUS KOPONG'}
                      </p>
                      <p className="text-xl font-black text-slate-800 tracking-tight">
                        {transferTo === 'Bahul' ? '2381149902' : '0280248151'}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        const num = transferTo === 'Bahul' ? '2381149902' : '0280248151';
                        navigator.clipboard.writeText(num);
                        toast.success("Nomor rekening disalin!");
                      }}
                      className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 hover:bg-amber-500 hover:text-white transition-all shadow-sm border border-amber-100"
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
                    className={`w-full h-14 border-dashed border-2 rounded-2xl font-black transition-all ${proofFile ? 'border-green-500 bg-green-50 text-green-700' : 'border-amber-300 bg-white text-amber-700'}`}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {proofFile ? `✅ ${proofFile.name}` : 'UPLOAD BUKTI TF'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DrawerFooter className="px-0 pt-6">
          <div className="flex items-center justify-between mb-4 px-2">
            <span className="text-slate-400 font-black text-sm uppercase tracking-widest">Total Bayar</span>
            <span className="text-2xl font-black text-slate-800">{formatRupiah(total)}</span>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || cart.length === 0}
            className="w-full h-16 rounded-3xl bg-slate-900 text-white font-black text-lg shadow-2xl shadow-slate-900/40 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 animate-spin" /> MENGIRIM...
              </div>
            ) : (
              <><ShoppingBag className="w-5 h-5 mr-2" /> PESAN SEKARANG</>
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
