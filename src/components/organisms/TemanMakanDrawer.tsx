import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ChevronLeft, 
  ShoppingBag, 
  CreditCard, 
  Clock, 
  Trash2 
} from 'lucide-react';
import { TemanMakanGroup } from '@/types';
import { useTemanMakan } from '@/hooks/useTemanMakan';

interface TemanMakanDrawerProps {
  group: TemanMakanGroup;
  currentUserId: string;
  formatRupiah: (amount: number) => string;
  onBack: () => void;
}

export const TemanMakanDrawer: React.FC<TemanMakanDrawerProps> = ({
  group,
  currentUserId,
  formatRupiah,
  onBack,
}) => {
  const { roomOrders, joinRoom, deleteOrder, finishRoom } = useTemanMakan(group.id);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');

  const totalAmount = roomOrders.reduce((acc, o) => acc + o.price, 0);
  const isCreator = group.creator_id === currentUserId;

  const handleJoinOrder = () => {
    if (!itemName || !itemPrice) return;
    joinRoom({
      groupId: group.id,
      userId: currentUserId,
      menuName: itemName.trim(),
      price: parseInt(itemPrice),
    });
    setItemName('');
    setItemPrice('');
  };

  return (
    <div className="space-y-6 pb-32">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-amber-600 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Kembali ke List
      </button>

      <div className="bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <ShoppingBag className="w-20 h-20" />
        </div>
        <div className="relative z-10">
          <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-tight mb-2">{group.title}</h3>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2 mb-3">
            Hosted by {group.profiles?.name || 'Owner'} 👑
          </p>

          {/* Payment Info */}
          {group.bank_info && (
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mb-4">
              <div className="flex items-start gap-2">
                <div className="bg-amber-100 p-1.5 rounded-lg">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider mb-1">Info Pembayaran</p>
                  <p className="text-xs font-bold text-slate-700 leading-tight">{group.bank_info}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <div className="bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 flex items-center gap-2">
              <span className="text-xs font-black text-amber-700">{roomOrders.length} Orang Gabung</span>
            </div>
            {group.deadline && (
              <div className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2">
                <Clock className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] font-black text-slate-600">
                  {new Date(group.deadline).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
            {isCreator && (
              group.status === 'finished' ? (
                <div className="bg-slate-200 text-slate-500 px-3 py-1.5 rounded-xl text-xs font-black cursor-not-allowed">
                  ROOM DITUTUP 🔒
                </div>
              ) : (
                <button
                  onClick={() => finishRoom(group.id)}
                  className="bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-black active:scale-95 transition-all shadow-lg"
                >
                  TUTUP ROOM ✅
                </button>
              )
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Pesanan Terkumpul</h4>
        {roomOrders.length === 0 ? (
          <div className="bg-slate-50/50 p-6 rounded-[32px] border-2 border-dashed border-slate-200 text-center">
            <p className="text-slate-400 font-bold text-xs italic">Belum ada yang pesan nih...</p>
          </div>
        ) : (
          <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden">
            {roomOrders.map((o, idx) => (
              <div key={o.id} className={`p-4 flex items-center justify-between ${idx !== roomOrders.length - 1 ? 'border-b border-slate-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-sm">🍱</div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{o.profiles?.name || 'User'}</p>
                    <p className="font-bold text-slate-800 text-sm leading-tight">{o.menu_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-black text-slate-900 text-sm">{formatRupiah(o.price)}</p>
                  {(group.status === 'open' && (o.user_id === currentUserId || isCreator)) && (
                    <button
                      onClick={() => deleteOrder(o.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-full transition-colors active:scale-95"
                      title="Hapus Pesanan"
                    >
                      <Trash2 size={14} strokeWidth={3} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="bg-slate-50 p-4 flex justify-between items-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Patungan</p>
              <p className="font-black text-slate-900 text-base">{formatRupiah(totalAmount)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Join Actions */}
      {group.status === 'open' ? (
        <div className="pt-4 space-y-3 border-t border-slate-100">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Pesanan Custom Kamu:</h4>
          <div className="space-y-3">
            <Input
              placeholder="Makan apa? (misal: Sate Telor)"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Harganya berapa?"
              value={itemPrice}
              onChange={(e) => setItemPrice(e.target.value)}
            />
            <Button
              className="w-full bg-slate-900 text-white rounded-xl h-12"
              disabled={!itemName.trim() || !itemPrice.trim()}
              onClick={handleJoinOrder}
            >
              GABUNG PESANAN
            </Button>
          </div>
        </div>
      ) : (
        <div className="pt-4 space-y-3 border-t border-slate-100 text-center">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p className="text-sm font-black text-slate-400">Room Sudah Ditutup 🙏</p>
            <p className="text-[10px] font-bold text-slate-400 mt-1">Kamu sudah tidak bisa pesan atau edit ya.</p>
          </div>
        </div>
      )}
    </div>
  );
};
