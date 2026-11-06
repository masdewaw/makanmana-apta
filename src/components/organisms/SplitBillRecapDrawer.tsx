import { DataError } from '../molecules/DataError';
import React from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { SplitBill } from '@/types';
import { useSplitBill } from '@/hooks/useSplitBill';

interface SplitBillRecapDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: SplitBill | null;
  formatRupiah: (amount: number) => string;
}

export const SplitBillRecapDrawer: React.FC<SplitBillRecapDrawerProps> = ({
  open,
  onOpenChange,
  bill,
  formatRupiah,
}) => {
  const { items: recapItems, error, refetch } = useSplitBill(bill?.id);

  if (!bill) return null;

  const foodItems = recapItems.filter(i => i.item_type === 'food');
  const sharedItems = recapItems.filter(i => i.item_type === 'shared');
  const sharedTotal = sharedItems.reduce((acc, i) => acc + (i.price || 0), 0);

  // Group food items by user
  const userTotals: Record<string, { name: string, foodTotal: number, items: any[] }> = {};
  foodItems.forEach(item => {
    const uid = item.user_id || 'unassigned';
    const name = item.profiles?.name || 'Belum Diklaim';
    if (!userTotals[uid]) {
      userTotals[uid] = { name, foodTotal: 0, items: [] };
    }
    userTotals[uid].foodTotal += item.price || 0;
    userTotals[uid].items.push(item);
  });

  const participantCount = Object.keys(userTotals).filter(uid => uid !== 'unassigned').length;
  const splitShared = participantCount > 0 ? Math.floor(sharedTotal / participantCount) : 0;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-[430px] mx-auto rounded-t-[28px] px-6 pb-12 border-0 shadow-2xl">
        <DataError error={error} label="Rincian patungan" onRetry={refetch} />
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
            Rekap Patungan 📝
          </DrawerTitle>
          <DrawerDescription className="text-slate-500 font-medium font-outfit">
            Rincian pembagian tagihan {bill.title || 'ini'}.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pt-4 scrollbar-hide">
          {/* Payment Info */}
          {bill.bank_info && (
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
              <div className="flex items-start gap-2">
                <div className="bg-emerald-100 p-1.5 rounded-lg">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-semibold text-emerald-600 tracking-wider mb-1">Transfer Ke</p>
                  <p className="text-xs font-bold text-slate-700 leading-tight">{bill.bank_info}</p>
                </div>
              </div>
            </div>
          )}

          {/* Shared Costs Summary */}
          {sharedItems.length > 0 && (
            <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-100/50">
              <h6 className="text-[12px] font-semibold text-emerald-600 tracking-normal mb-3">Biaya Bersama (Dibagi Rata)</h6>
              <div className="space-y-2">
                {sharedItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600">{item.item_name}</span>
                    <span className={`text-xs font-semibold ${item.price < 0 ? 'text-emerald-500' : 'text-slate-800'}`}>
                      {formatRupiah(item.price)}
                    </span>
                  </div>
                ))}
                <div className="pt-2 mt-2 border-t border-emerald-200/50 flex justify-between items-center">
                  <span className="text-xs font-semibold text-emerald-700">Total Dibagi ke {participantCount} orang</span>
                  <span className="text-sm font-semibold text-emerald-700">{formatRupiah(sharedItems.reduce((acc, i) => acc + i.price, 0))}</span>
                </div>
              </div>
            </div>
          )}

          {/* Participant Totals */}
          <div className="space-y-4">
            <h6 className="text-[12px] font-semibold text-slate-400 tracking-normal ml-1">Pembagian Per Orang:</h6>
            {Object.entries(userTotals).map(([uid, data]) => {
              const personalShared = uid === 'unassigned' ? 0 : splitShared;
              const total = data.foodTotal + personalShared;
              return (
                <div key={uid} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${uid === 'unassigned' ? 'bg-slate-100 text-slate-400' : 'bg-pink-100 text-pink-600'} rounded-2xl flex items-center justify-center font-semibold`}>
                        {data.name[0]}
                      </div>
                      <div>
                        <h6 className="font-semibold text-slate-800 text-sm leading-tight">{data.name}</h6>
                        <p className="text-[12px] font-bold text-pink-500 mt-0.5">Total: {formatRupiah(total)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold text-slate-400 mb-1">Porsi Patungan</p>
                      <p className="font-semibold text-slate-800 text-sm">{formatRupiah(total)}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pl-2 border-l-2 border-slate-50 py-1">
                    {data.items.map(i => (
                      <div key={i.id} className="flex justify-between items-center text-[12px] font-medium text-slate-500">
                        <span>{i.item_name}</span>
                        <span>{formatRupiah(i.price)}</span>
                      </div>
                    ))}
                    {uid !== 'unassigned' && (
                      <div className="flex justify-between items-center text-[12px] font-medium text-emerald-600 italic">
                        <span>Beban Bersama (1/{participantCount})</span>
                        <span>{formatRupiah(splitShared)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grand Total Summary */}
          <div className="bg-slate-900 rounded-[24px] p-6 text-white shadow-xl shadow-slate-200">
            <h6 className="text-[12px] font-semibold text-slate-400 tracking-normal mb-4 text-center">Ringkasan Keseluruhan</h6>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-bold">Total Makanan</span>
                <span className="font-semibold">{formatRupiah(foodItems.reduce((acc, i) => acc + i.price, 0))}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-bold">Total Bersama (Shared)</span>
                <span className={`font-semibold ${sharedTotal < 0 ? 'text-emerald-400' : 'text-white'}`}>{formatRupiah(sharedTotal)}</span>
              </div>
              <div className="pt-3 mt-3 border-t border-slate-800 flex justify-between items-center">
                <span className="text-sm font-semibold tracking-wider text-emerald-500">Total Akhir Struk</span>
                <span className="text-xl font-semibold text-white">{formatRupiah(foodItems.reduce((acc, i) => acc + i.price, 0) + sharedTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        <DrawerFooter className="px-0 mt-6">
          <Button onClick={() => onOpenChange(false)} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-semibold text-base shadow-xl active:scale-95 transition-all tracking-normal">
            Tutup Rekap
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
