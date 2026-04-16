import React from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Clock } from 'lucide-react';
import { SplitBill } from '@/types';

interface SplitBillListProps {
  bills: SplitBill[];
  currentUserId: string;
  onSelectBill: (bill: SplitBill) => void;
  onScanClick: () => void;
  onFinishBill: (billId: string) => void;
}

export const SplitBillList: React.FC<SplitBillListProps> = ({
  bills,
  currentUserId,
  onSelectBill,
  onScanClick,
  onFinishBill,
}) => {
  const getRelativeTime = (dateString: string) => {
    if (!dateString) return 'baru saja';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'baru saja';
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'baru saja';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} jam lalu`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} hari lalu`;
    
    return date.toLocaleDateString('id-ID');
  };

  const activeBills = bills.filter(b => b.status === 'open');
  const finishedBills = bills.filter(b => b.status === 'finished');

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-pink-500 to-rose-500 rounded-[32px] p-6 text-white shadow-xl shadow-pink-500/20">
        <h3 className="text-xl font-black mb-1">Split Bill 🤖</h3>
        <p className="text-white/80 text-xs font-medium mb-4 italic">Foto struk makan, biar AI yang hitung patungannya!</p>

        <div className="flex gap-2">
          <Button
            onClick={onScanClick}
            className="flex-1 h-12 rounded-2xl bg-white text-pink-600 font-black text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all border-0"
          >
            <Camera className="w-4 h-4" /> SCAN STRUK
          </Button>
        </div>
      </div>

      <div className="space-y-4 pb-20">
        {/* Active Split Bills */}
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Patungan Yang Aktif:</h4>
        {activeBills.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold italic text-sm">Belum ada patungan aktif.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {activeBills.map(bill => (
              <div
                key={bill.id}
                className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-xs text-left group hover:border-pink-200 transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Dibuat oleh {bill.profiles?.name?.split(' ')[0] || 'User'}</p>
                    <h5 className="font-black text-slate-800 text-base leading-tight">{bill.title}</h5>
                  </div>
                  <div className="bg-pink-50 text-pink-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                    ACTIVE ⚡️
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {getRelativeTime(bill.created_at)}</span>
                    <span>•</span>
                    <button
                      onClick={() => onSelectBill(bill)}
                      className="text-pink-500 font-black active:scale-95 cursor-pointer"
                    >
                      LIHAT REKAP →
                    </button>
                  </div>
                  {bill.creator_id === currentUserId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFinishBill(bill.id);
                      }}
                      className="bg-slate-800 text-white px-3 py-1 rounded-xl text-[10px] font-black active:scale-95 transition-all"
                    >
                      TUTUP ✅
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Finished Split Bills */}
        {finishedBills.length > 0 && (
          <>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mt-6">Riwayat Patungan:</h4>
            <div className="grid grid-cols-1 gap-4">
              {finishedBills.map(bill => (
                <button
                  key={bill.id}
                  onClick={() => onSelectBill(bill)}
                  className="bg-white/60 p-5 rounded-[32px] border border-slate-100 shadow-xs text-left group active:scale-[0.98] transition-all opacity-70 hover:opacity-100"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Dibuat oleh {bill.profiles?.name?.split(' ')[0] || 'User'}</p>
                      <h5 className="font-black text-slate-800 text-base leading-tight">{bill.title}</h5>
                    </div>
                    <div className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                      SELESAI 🔒
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {getRelativeTime(bill.created_at)}</span>
                    <span>•</span>
                    <span className="text-slate-500">LIHAT REKAP →</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
