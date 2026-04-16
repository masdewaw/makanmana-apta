import { useState } from 'react';
import { Button } from '../ui/button';
import { CalendarClock, Image as ImageIcon } from 'lucide-react';
import { TardutRequest } from '../../types';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '../ui/drawer';

interface OBTardutListProps {
  requests: TardutRequest[];
  onUpdateStatus: (requestId: string, status: string) => void;
  formatRupiah: (n: number) => string;
}

export function OBTardutList({ requests, onUpdateStatus, formatRupiah }: OBTardutListProps) {
  const [selectedTardut, setSelectedTardut] = useState<TardutRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black text-slate-800 tracking-tight">Titipan Tardut ({requests.length})</h2>
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-xl">💵</div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-slate-50 rounded-[32px] p-10 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-white rounded-[24px] flex items-center justify-center text-4xl mb-4 shadow-sm">✨</div>
          <h3 className="font-black text-slate-800 mb-1">Tidak ada titipan</h3>
          <p className="text-xs text-slate-400 font-medium">Belum ada teman-teman yang minta tarik tunai.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="px-2 py-0.5 bg-slate-100 rounded-md text-[9px] font-black text-slate-500 uppercase tracking-wider">
                      {req.profiles?.name || 'User'}
                    </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <CalendarClock className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">
                          {new Date(req.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • {new Date(req.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-1">
                    {formatRupiah(req.amount)}
                  </h3>
                </div>
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-amber-100">
                  🏦
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTardut(req);
                    setIsModalOpen(true);
                  }}
                  className="h-12 border-slate-200 rounded-xl font-bold text-xs"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  BUKTI TF
                </Button>
                <Button
                  onClick={() => onUpdateStatus(req.id, 'done')}
                  className="h-12 bg-slate-900 text-white rounded-xl font-black text-xs shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
                >
                  SELESAIKAN ✅
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Proof Modal */}
      <Drawer open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DrawerContent className="max-w-[430px] mx-auto rounded-t-[40px] px-6 max-h-[90vh]">
          <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mt-4 mb-4" />
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-xl font-black text-slate-800">Bukti Transfer Tardut</DrawerTitle>
            <DrawerDescription className="text-slate-500 font-medium">Pastikan dana sudah masuk ke rekening penampung sebelum memproses.</DrawerDescription>
          </DrawerHeader>

          {selectedTardut && (
            <div className="flex-1 overflow-y-auto pb-8">
              <div className="bg-slate-100 rounded-3xl overflow-hidden aspect-3/4 mb-6 border-2 border-amber-100 shadow-inner group relative">
                <img
                  src={selectedTardut.proof_url}
                  alt="Payment Proof"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Nominal Titipan</p>
                <p className="text-2xl font-black text-amber-900">{formatRupiah(selectedTardut.amount)}</p>
              </div>
            </div>
          )}

          <DrawerFooter className="px-0 pt-0 pb-10">
            <Button onClick={() => setIsModalOpen(false)} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black">Tutup</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
