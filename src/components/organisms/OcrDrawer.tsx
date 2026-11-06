import { errorMessage } from '@/lib/errors';
import { isValidRupiah, validateImage } from '@/lib/form-validation';
import React, { useState, useEffect, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Zap, 
  Trash2, 
  CheckCircle 
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { toast } from 'sonner';
import { useSplitBill } from '@/hooks/useSplitBill';

interface OcrDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  currentUserId: string;
  allProfiles: { id: string, name: string }[];
  formatRupiah: (amount: number) => string;
}

export const OcrDrawer: React.FC<OcrDrawerProps> = ({
  open,
  onOpenChange,
  file,
  allProfiles,
  formatRupiah
}) => {
  const { createBillWithItems, isSavingBill } = useSplitBill();
  
  const [loading, setLoading] = useState(false);
  const saving = useRef(false);
  const [step, setStep] = useState<'edit' | 'assign' | 'payment' | 'summary'>('edit');
  const [items, setItems] = useState<{ name: string, price: number, itemType: 'food' | 'shared' }[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [paymentInfo, setPaymentInfo] = useState('');
  const [billTitle, setBillTitle] = useState('');

  // OCR Processing
  useEffect(() => {
    if (open && file) {
      processFile(file);
    } else if (!open) {
      // Reset state on close
      setStep('edit');
      setItems([]);
      setImageUrl(null);
      setAssignments({});
      setPaymentInfo('');
      setBillTitle('');
    }
  }, [open, file]);

  const processFile = async (selectedFile: File) => {
    const error = validateImage(selectedFile);
    if (error) return toast.error(error);
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const url = e.target?.result as string;
      setImageUrl(url);

      try {
        const { data: { text } } = await Tesseract.recognize(url, 'ind');
        const lines = text.split('\n');
        const detectedItems: typeof items = [];

        lines.forEach(line => {
          const lowerLine = line.toLowerCase();
          const blacklist = ['total', 'otal', 'subtotal', 'bayar', 'jumlah', 'kembali', 'cash', 'tunai', 'change', 'recap', 'rincian'];

          if (blacklist.some(kw => lowerLine.includes(kw))) return;

          // Detect Price
          const priceMatch = line.match(/\(?(-?\d+[,.]?\d*)\)?/g);
          if (priceMatch && priceMatch.length > 0) {
            const rawMatch = priceMatch[priceMatch.length - 1];
            const isNegative = rawMatch.startsWith('-') || (rawMatch.startsWith('(') && rawMatch.endsWith(')')) || lowerLine.includes('diskon') || lowerLine.includes('promo') || lowerLine.includes('voucher') || lowerLine.includes('voucher diskon');
            
            const cleanedPrice = rawMatch.replace(/[^0-9]/g, '');
            const totalPrice = parseInt(cleanedPrice) * (isNegative ? -1 : 1);

            // Clean name
            let name = line.replace(/\(?(-?\d+[,.]?\d*)\)?/g, '')
              .replace(/rp/gi, '')
              .replace(/[.:\-/_()]/g, ' ')
              .trim();

            // Detect Quantity (e.g., 2 x, 3x, etc.)
            const qtyMatch = line.match(/(\d+)\s*[xX]\s*/);
            const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;
            const singlePrice = Math.floor(totalPrice / (quantity || 1));
            
            // Clean quantity from name if present
            name = name.replace(/\d+\s*[xX]\s*/g, '').trim();

            if (Math.abs(totalPrice) >= 100 && name.length > 1 && isNaN(Number(name))) {
              const sharedKeywords = ['tax', 'pajak', 'service', 'ongkir', 'layanan', 'delivery', 'diskon', 'promo', 'voucher', 'potongan', 'kurangi', 'pengiriman', 'biaya'];
              const itemType = (sharedKeywords.some(kw => lowerLine.includes(kw)) || isNegative) 
                ? 'shared' : 'food';

              if (itemType === 'shared' || quantity <= 1) {
                detectedItems.push({ name, price: totalPrice, itemType });
              } else {
                // Split multiple quantities into individual items
                for (let i = 0; i < quantity; i++) {
                  detectedItems.push({ name: `${name} ${i + 1}/${quantity}`, price: singlePrice, itemType: 'food' });
                }
              }
            }
          }
        });

        setItems(detectedItems);
      } catch (err: any) {
        toast.error("Gagal membaca struk: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  const validateItems = () => {
    if (!items.length || items.some(item => !item.name.trim() || !isValidRupiah(item.price, item.itemType === 'shared'))) {
      toast.error('Isi nama dan harga rupiah bulat untuk setiap item. Harga makanan harus lebih dari 0.');
      setStep('edit');
      return false;
    }
    return true;
  };

  const handleSaveBill = async () => {
    if (saving.current) return;
    if (!billTitle.trim()) return toast.error('Judul patungan harus diisi!');
    if (!validateItems()) return;
    saving.current = true;
    try {
      await createBillWithItems({ title: billTitle.trim(), bankInfo: paymentInfo.trim(), items: items.map((item, index) => ({
        itemName: item.name.trim(), price: item.price, itemType: item.itemType,
        userId: item.itemType === 'food' ? assignments[index] : null,
      })) });
      onOpenChange(false);
      toast.success('Patungan berhasil disimpan!');
    } catch (error) { toast.error(errorMessage(error)); }
    finally { saving.current = false; }
  };

  return (
    <Drawer open={open} dismissible={!isSavingBill} onOpenChange={next => { if (!saving.current) onOpenChange(next); }}>
      <DrawerContent className="max-w-[430px] mx-auto rounded-t-[28px] px-6 pb-12 border-0 shadow-2xl">
        <DrawerHeader className="px-0">
          <DrawerTitle className="text-2xl font-semibold text-slate-800">
            {step === 'edit' && "Edit Struk 🧾"}
            {step === 'assign' && "Siapa Makan Apa? 👥"}
            {step === 'payment' && "Info Pembayaran 💳"}
            {step === 'summary' && "Hasil Patungan 💰"}
          </DrawerTitle>
          <DrawerDescription className="text-xs text-slate-400 font-medium">
            {step === 'edit' && "Cek lagi nama dan harga item yang terbaca AI."}
            {step === 'assign' && "Pilih siapa yang pesan masing-masing menu."}
            {step === 'payment' && "Masukkan info transfer agar teman kamu tahu bayar ke mana."}
            {step === 'summary' && "Review hasil pembagian patungan sebelum simpan."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pt-4 scrollbar-hide">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-pink-100 border-t-pink-500 rounded-full animate-spin" />
                <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-pink-500 animate-pulse" />
              </div>
              <p className="font-semibold text-slate-800 text-lg">AI lagi baca strukmu...</p>
            </div>
          ) : (
            <>
              {step === 'edit' && (
                <div className="space-y-6">
                  {imageUrl && (
                    <div className="relative rounded-3xl overflow-hidden border-2 border-slate-100 h-48 bg-slate-50">
                      <img src={imageUrl} alt="Receipt" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <div key={idx} className={`bg-white p-4 rounded-2xl border flex justify-between items-center group ${item.itemType === 'shared' ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-100'}`}>
                        <div className="flex-1 mr-4">
                          <input
                            value={item.name}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].name = e.target.value;
                              setItems(newItems);
                            }}
                            className="font-bold text-slate-800 text-sm w-full bg-transparent focus:outline-none"
                          />
                          {item.itemType === 'shared' && <span className="text-[11px] font-semibold text-emerald-600 tracking-normal bg-emerald-100 px-2 py-0.5 rounded-full">Shared</span>}
                        </div>
                        <div className="flex items-center gap-2">
                           <input
                            type="number"
                            value={item.price}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].price = parseInt(e.target.value) || 0;
                              setItems(newItems);
                            }}
                            className={`font-semibold text-sm w-20 text-right focus:outline-none bg-transparent ${item.price < 0 ? 'text-emerald-600' : 'text-slate-800'}`}
                          />
                          <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 border-dashed text-[12px] h-10" onClick={() => setItems([...items, { name: 'Menu Baru', price: 0, itemType: 'food' }])}>
                        + Makanan
                      </Button>
                      <Button variant="outline" className="flex-1 border-dashed text-[12px] h-10 border-emerald-200 text-emerald-700" onClick={() => setItems([...items, { name: 'Biaya Baru', price: 0, itemType: 'shared' }])}>
                        + Biaya Bersama
                      </Button>
                    </div>
                    <div className="pt-4 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[12px] font-semibold tracking-normal text-slate-400">Judul Patungan*</Label>
                        <Input 
                          placeholder="Makan siang di..." 
                          value={billTitle} 
                          onChange={e => setBillTitle(e.target.value)} 
                          className="rounded-2xl h-12 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-emerald-500 focus-visible:bg-white border-slate-200 transition-all shadow-xs"
                        />
                      </div>
                      <Button className="w-full h-14 bg-slate-900 text-white rounded-2xl font-semibold" onClick={() => { if (validateItems()) setStep('assign'); }} disabled={!billTitle || items.length === 0}>
                        LANJUT PILIH ORANG →
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {step === 'assign' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mb-6">
                    <h6 className="text-[12px] font-semibold text-emerald-700 tracking-normal mb-2">💰 Biaya Bersama (Shared)</h6>
                    <div className="space-y-1">
                      {items.filter(i => i.itemType === 'shared').map((si, sidx) => (
                        <div key={sidx} className="flex justify-between text-[12px] font-bold text-emerald-800/60">
                          <span>{si.name}</span>
                          <span>{formatRupiah(si.price)}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-emerald-200 flex justify-between text-[12px] font-semibold text-emerald-700">
                        <span>TOTAL BERSAMA</span>
                        <span>{formatRupiah(items.filter(i => i.itemType === 'shared').reduce((acc, i) => acc + i.price, 0))}</span>
                      </div>
                    </div>
                  </div>

                  <h6 className="text-[12px] font-semibold text-slate-400 tracking-normal ml-1">Pilih porsi makan:</h6>
                  {items.map((item, idx) => (
                    item.itemType === 'food' && (
                      <div key={idx} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                           <h6 className="font-semibold text-slate-800 text-xs">{item.name}</h6>
                           <span className="text-xs font-semibold text-slate-900">{formatRupiah(item.price)}</span>
                        </div>
                        <select
                          value={assignments[idx] || ""}
                          onChange={(e) => setAssignments({ ...assignments, [idx]: e.target.value })}
                          className="w-full h-11 rounded-xl bg-slate-50 px-4 font-bold text-[11px] appearance-none border-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="" disabled>Pilih orang...</option>
                          {allProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    )
                  ))}
                  <div className="flex gap-3 pt-6 pb-4">
                    <Button variant="ghost" className="flex-1 font-bold" onClick={() => setStep('edit')}>Kembali</Button>
                    <Button className="flex-2 bg-slate-900 text-white h-14 rounded-2xl font-semibold" onClick={() => setStep('payment')}>Lanjut →</Button>
                  </div>
                </div>
              )}

              {step === 'payment' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[12px] font-semibold tracking-normal text-slate-400">Info Transfer</Label>
                    <Input 
                      placeholder="BCA 1234567890 a.n. Agus" 
                      value={paymentInfo} 
                      onChange={e => setPaymentInfo(e.target.value)} 
                      className="rounded-2xl h-12 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-emerald-500 focus-visible:bg-white border-slate-200 transition-all shadow-xs"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="ghost" className="flex-1" onClick={() => { if (validateItems()) setStep('assign'); }}>Kembali</Button>
                    <Button className="flex-2 bg-slate-900 text-white h-14 rounded-2xl" onClick={() => setStep('summary')}>RECAP →</Button>
                  </div>
                </div>
              )}

              {step === 'summary' && (
                <div className="space-y-6">
                   <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <CheckCircle className="text-emerald-500 w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-emerald-700">Estimasi Patungan:</p>
                    </div>
                    
                    <div className="space-y-3">
                      {allProfiles
                        .filter(p => Object.values(assignments).includes(p.id))
                        .map(p => {
                          const userFoodTotal = items.filter((item, idx) => item.itemType === 'food' && assignments[idx] === p.id)
                            .reduce((acc, i) => acc + i.price, 0);
                          const participantsCount = new Set(Object.values(assignments)).size;
                          const sharedTotal = items.filter(i => i.itemType === 'shared').reduce((acc, i) => acc + i.price, 0);
                          const perPersonShared = participantsCount > 0 ? Math.floor(sharedTotal / participantsCount) : 0;
                          
                          return (
                            <div key={p.id} className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-600">{p.name}</span>
                              <div className="text-right">
                                <span className="font-semibold text-emerald-600">{formatRupiah(userFoodTotal + perPersonShared)}</span>
                                <p className="text-[11px] font-bold text-slate-400">({formatRupiah(userFoodTotal)} + {formatRupiah(perPersonShared)})</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-6 pb-4">
                    <Button variant="ghost" className="flex-1 font-bold" onClick={() => setStep('payment')}>Kembali</Button>
                    <Button 
                      className="flex-2 bg-pink-500 text-white h-14 rounded-2xl font-semibold shadow-lg shadow-pink-200"
                      onClick={handleSaveBill}
                      disabled={isSavingBill}
                    >
                      {isSavingBill ? "Menyimpan..." : "Simpan patungan"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
