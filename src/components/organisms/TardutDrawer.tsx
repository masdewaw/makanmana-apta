import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '../ui/drawer';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Check, Camera, Zap, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { TardutRequest } from '../../types';

interface TardutDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (amount: number, proofFile: File) => void;
  isSubmitting: boolean;
  formatRupiah: (n: number) => string;
  requests: TardutRequest[];
}

export function TardutDrawer({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  formatRupiah,
  requests
}: TardutDrawerProps) {
  const [tardutAmount, setTardutAmount] = useState<number | null>(null);
  const [customTardutAmount, setCustomTardutAmount] = useState('');
  const [tardutProofFile, setTardutProofFile] = useState<File | null>(null);
  const tardutFileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when drawer is closed
  useEffect(() => {
    if (!open) {
      setTardutAmount(null);
      setCustomTardutAmount('');
      setTardutProofFile(null);
    }
  }, [open]);

  const handleSubmit = () => {
    const finalAmount = tardutAmount || Number(customTardutAmount);
    if (!finalAmount || finalAmount <= 0 || !tardutProofFile) return;
    onSubmit(finalAmount, tardutProofFile);
  };

  const resetAndClose = (newOpen: boolean) => {
    if (!newOpen) {
      setTardutAmount(null);
      setCustomTardutAmount('');
      setTardutProofFile(null);
    }
    onOpenChange(newOpen);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'waiting':
        return { label: 'Menunggu OB', color: 'text-amber-600 bg-amber-50 border-amber-100', icon: <Clock className="w-3 h-3" /> };
      case 'processing':
        return { label: 'Sedang Diproses', color: 'text-blue-600 bg-blue-50 border-blue-100', icon: <Loader2 className="w-3 h-3 animate-spin" /> };
      case 'done':
        return { label: 'Berhasil Ditarik', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: <CheckCircle2 className="w-3 h-3" /> };
      case 'rejected':
        return { label: 'Ditolak', color: 'text-rose-600 bg-rose-50 border-rose-100', icon: <XCircle className="w-3 h-3" /> };
      default:
        return { label: status, color: 'text-slate-600 bg-slate-50 border-slate-100', icon: <Clock className="w-3 h-3" /> };
    }
  };

  return (
    <Drawer open={open} onOpenChange={resetAndClose}>
      <DrawerContent className="max-w-[430px] mx-auto rounded-t-[40px] px-6 pb-8 border-0 shadow-2xl h-[90dvh]">
        <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mt-4 mb-4" />
        
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide space-y-8">
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
              Tardut (Tarik Duit) 💳
            </DrawerTitle>
            <DrawerDescription className="text-slate-500 font-medium">
              Pilih nominal yang ingin ditarik tunai.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-6">
            {/* Nominal Options */}
            <div className="grid grid-cols-2 gap-3">
              {[50000, 100000, 150000, 200000, 250000, 300000].map(amount => (
                <button
                  key={amount}
                  onClick={() => {
                    setTardutAmount(amount);
                    setCustomTardutAmount('');
                  }}
                  className={`h-14 rounded-2xl border-2 font-black transition-all flex items-center justify-center gap-2 ${tardutAmount === amount ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md ring-2 ring-amber-500/10' : 'border-slate-100 bg-white text-slate-500'}`}
                >
                  {formatRupiah(amount).replace('Rp', '')}
                  {tardutAmount === amount && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>

            {/* Custom Nominal */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Atau Masukan Nominal Lain</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">Rp</span>
                <Input
                  type="number"
                  placeholder="Nominal yang ingin ditarik"
                  value={customTardutAmount}
                  onChange={(e) => {
                    setCustomTardutAmount(e.target.value);
                    setTardutAmount(null);
                  }}
                  className="h-14 pl-12 rounded-2xl bg-slate-50 border-slate-100 font-bold focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-amber-500 focus-visible:bg-white transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Upload Proof */}
            <div className="space-y-3 bg-amber-50 p-6 rounded-[32px] border border-amber-100">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 bg-amber-500 text-white rounded-xl flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-black text-slate-800 text-xs">Upload Bukti Transfer</p>
                  <p className="text-[9px] text-amber-700 font-bold uppercase tracking-tighter">Wajib sebelum diproses OB</p>
                </div>
              </div>

              <input
                type="file"
                className="hidden"
                ref={tardutFileInputRef}
                accept="image/*"
                onChange={(e) => setTardutProofFile(e.target.files?.[0] || null)}
              />

              <Button
                onClick={() => tardutFileInputRef.current?.click()}
                variant="outline"
                className={`w-full h-14 border-dashed border-2 rounded-2xl font-black transition-all ${tardutProofFile ? 'border-green-500 bg-green-50 text-green-700' : 'border-amber-300 bg-white text-amber-700 hover:bg-amber-50'}`}
              >
                {tardutProofFile ? `✅ ${(tardutProofFile as any).name}` : 'AMBIL FOTO BUKTI'}
              </Button>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (!tardutAmount && !customTardutAmount) || !tardutProofFile}
              className="w-full h-16 rounded-3xl bg-slate-900 text-white font-black text-lg shadow-2xl shadow-slate-900/40 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 animate-spin" /> MENGIRIM...
                </div>
              ) : (
                'KIRIM PERMINTAAN'
              )}
            </Button>
          </div>

          {/* History Section */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Riwayat Permintaan</h4>
              <div className="h-[2px] flex-1 bg-slate-100 ml-4 rounded-full" />
            </div>

            {requests.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold text-xs">Belum ada riwayat penarikan.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => {
                  const status = getStatusInfo(req.status);
                  return (
                    <div key={req.id} className="bg-white p-4 rounded-[28px] border border-slate-100 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-lg">
                          💳
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-sm">{formatRupiah(req.amount)}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                            {new Date(req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
