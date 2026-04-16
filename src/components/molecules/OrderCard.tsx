import { Card, CardContent } from '../ui/card';
import { CheckCircle, CalendarClock, MessageSquare, Image as ImageIcon, MapPin, ShoppingBag } from 'lucide-react';
import { Button } from '../ui/button';
import { Order } from '../../types';

interface OrderCardProps {
  order: Order;
  role: 'user' | 'ob';
  formatRupiah: (n: number) => string;
  onTrack?: (ob: string) => void;
  onTake?: (id: string) => void;
  onRelease?: (id: string) => void;
  onVerifyPayment?: (order: any) => void;
  onMarkDone?: (order: any) => void;
  currentObId?: string;
}

export function OrderCard({ 
  order, 
  role, 
  formatRupiah, 
  onTrack, 
  onTake, 
  onRelease, 
  onVerifyPayment, 
  onMarkDone,
  currentObId 
}: OrderCardProps) {
  const isMyOrder = order.assigned_to_ob === currentObId;
  const isSomeoneElseOrder = order.assigned_to_ob && order.assigned_to_ob !== currentObId;

  // USER VIEW
  if (role === 'user') {
    return (
      <Card className="border-0 shadow-sm ring-1 ring-slate-100 rounded-[24px] overflow-hidden bg-white">
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${order.order_status === 'done' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                  {order.order_status === 'done' ? 'Selesai' : 'Diproses'}
                </span>
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                  {new Date(order.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'numeric', year: '2-digit' }).replace(/\//g, '-') + ' - ' + new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')}
                </span>
              </div>
              <h4 className="font-black text-slate-800 text-base leading-tight">{order.food_name}</h4>
            </div>
            <div className="text-right">
              <p className="font-black text-slate-900">{formatRupiah(order.price)}</p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{order.payment_method}</p>
            </div>
          </div>

          {order.catatan && (
            <div className="bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100">
              <p className="text-[10px] text-slate-500 italic font-medium">"{order.catatan}"</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-50">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${order.order_status === 'done' ? 'bg-green-500 animate-pulse' : 'bg-amber-500 animate-bounce'}`} />
              <span className="text-[10px] font-bold text-slate-500">
                {order.order_status === 'done' ? 'Sudah sampai meja' : (order.assigned_to_ob ? `Dibawa oleh ${order.assigned_to_ob}` : 'Menunggu OB')}
              </span>
            </div>
            {order.assigned_to_ob && order.order_status !== 'done' && onTrack && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onTrack(order.assigned_to_ob!)}
                className="h-8 rounded-full border-amber-200 text-amber-600 text-[9px] font-black hover:bg-amber-50 hover:text-amber-700 transition-all uppercase tracking-widest"
              >
                <MapPin className="w-3 h-3 mr-1" /> Pantau Lokasi
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // OB VIEW
  return (
    <Card className={`border-0 shadow-sm ring-1 rounded-2xl overflow-hidden transition-opacity ${isSomeoneElseOrder ? 'opacity-60 ring-slate-100' : 'opacity-100 ring-slate-100'}`}>
      <div className={`h-1.5 w-full ${order.assigned_to_ob === 'OB 1' ? 'bg-amber-500' : order.assigned_to_ob === 'OB 2' ? 'bg-orange-500' : 'bg-slate-300'}`} />
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 pr-2">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded uppercase tracking-tighter shadow-xs">
                {order.profiles?.name || 'User'}
              </span>
              <span className="text-[9px] text-slate-400 font-black flex items-center gap-1 uppercase tracking-widest">
                <CalendarClock className="w-3.5 h-3.5" /> {new Date(order.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'numeric', year: '2-digit' }).replace(/\//g, '-') + ' - ' + new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')}
              </span>
            </div>
            <h4 className="font-black text-lg text-slate-900 leading-tight">{order.food_name}</h4>
            <p className="text-amber-600 font-black text-sm mt-0.5">{formatRupiah(order.price)}</p>
          </div>

          <div className="shrink-0 flex flex-col items-end">
            <span className="text-[10px] bg-slate-50 border border-slate-100 text-slate-500 px-2 py-1 rounded-lg uppercase font-black tracking-widest mb-2">
              {order.payment_method}
            </span>
            {order.payment_status === 'paid' ? (
              <span className="text-[10px] inline-flex items-center px-2 py-1.5 bg-green-50 text-green-700 font-black rounded-lg border border-green-100/50">
                <CheckCircle className="w-3 h-3 mr-1" /> LUNAS
              </span>
            ) : (
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] inline-flex items-center px-2 py-1.5 bg-red-50 text-red-600 font-black rounded-lg border border-red-100/50">
                  BELUM BAYAR
                </span>
                {order.transfer_to && (
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${order.transfer_to === 'Bahul' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                    TF KE: {order.transfer_to}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {order.catatan && (
          <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/50 flex items-start gap-2 italic">
            <MessageSquare className="w-3.5 h-3.5 text-amber-500 mt-1 shrink-0" />
            <p className="text-xs text-amber-800 font-medium leading-relaxed">{order.catatan}</p>
          </div>
        )}

        {(order.proof_url) ? (
          <div className="bg-slate-50/50 p-2.5 rounded-2xl border border-slate-200/50 flex justify-between items-center group">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-amber-500 transition-colors shadow-xs">
                <ImageIcon className="w-4 h-4" />
              </div>
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">BUKTI TF</span>
            </div>
            <a href={order.proof_url} target="_blank" rel="noopener noreferrer" className="text-white bg-slate-800 px-4 py-2 rounded-xl border border-slate-900 text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg">
              Lihat Gambar
            </a>
          </div>
        ) : (order.payment_method?.toLowerCase().trim() === 'transfer' || order.payment_method?.toUpperCase().trim() === 'TRANSFER') && (
          <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-red-400" />
              <span className="text-[10px] text-red-600 font-black uppercase">BUKTI TIDAK ADA</span>
            </div>
            <span className="text-[10px] text-red-400 font-bold italic">Gagal Upload?</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100">
          {!order.assigned_to_ob ? (
            <Button
              onClick={() => onTake?.(order.id)}
              className="col-span-2 rounded-2xl font-black h-12 text-[10px] uppercase tracking-widest bg-amber-500 text-white shadow-lg shadow-amber-500/20"
            >
              🚩 AMBIL PESANAN
            </Button>
          ) : isMyOrder ? (
            <>
              <Button
                variant="outline"
                onClick={() => onRelease?.(order.id)}
                className="col-span-2 rounded-2xl font-black h-10 text-[10px] uppercase tracking-widest text-slate-400 border-slate-200 hover:bg-red-50 hover:text-red-500"
              >
                🔓 LEPAS PESANAN KE UMUM
              </Button>
              <Button
                disabled={order.payment_status === 'paid'}
                onClick={() => onVerifyPayment?.(order)}
                className={`rounded-2xl font-black h-12 text-[8px] uppercase tracking-widest ${order.payment_status === 'paid' ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'}`}
              >
                VERIFIKASI PEMBAYARAN
              </Button>
              <Button
                onClick={() => onMarkDone?.(order)}
                className="rounded-2xl font-black h-12 text-[10px] uppercase tracking-widest bg-green-600 text-white shadow-lg shadow-green-600/20"
              >
                <ShoppingBag className="w-4 h-4 mr-2" /> SELESAI
              </Button>
            </>
          ) : (
            <div className="col-span-2 bg-slate-50 rounded-2xl py-3 px-4 flex items-center justify-between border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase">DIAMBIL OLEH</span>
              <span className="text-[10px] font-black text-slate-800 bg-white px-2 py-1 rounded-lg border border-slate-200">{order.assigned_to_ob}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


