import { useObNames } from '@/hooks/useObNames';
import { FoodArt } from '../illustrations/FoodArt';
import { useProofUrl } from '@/hooks/useProofUrl';
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
  const obName = useObNames();
  const proof = useProofUrl(role === 'ob' ? order.proof_url : null);
  const isMyOrder = order.assigned_to_ob === currentObId;
  const isSomeoneElseOrder = order.assigned_to_ob && order.assigned_to_ob !== currentObId;

  // USER VIEW
  if (role === 'user') {
    return (
      <Card className="border-0 shadow-sm ring-1 ring-slate-100 rounded-[24px] overflow-hidden bg-white">
        <CardContent className="p-5">
          <div className="flex justify-between items-start gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded uppercase tracking-normal ${order.order_status === 'done' ? 'bg-green-50 text-green-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {order.order_status === 'done' ? 'Selesai' : 'Diproses'}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-normal">
                  {new Date(order.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'numeric', year: '2-digit' }).replace(/\//g, '-') + ' - ' + new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2"><div className="w-11 h-11 bg-[#f6f0e3] rounded-xl shrink-0"><FoodArt name={order.food_name} /></div><h4 className="font-semibold text-slate-800 text-sm leading-snug">{order.food_name}</h4></div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-900">{formatRupiah(order.price)}</p>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-normal mt-0.5">{order.payment_method}</p>
            </div>
          </div>

          {order.catatan && (
            <div className="bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100">
              <p className="text-[12px] text-slate-500 italic font-medium">"{order.catatan}"</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-50">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${order.order_status === 'done' ? 'bg-green-500 animate-pulse' : 'bg-emerald-500 animate-bounce'}`} />
              <span className="text-[12px] font-bold text-slate-500">
                {order.order_status === 'done' ? 'Pesanan selesai' : (order.assigned_to_ob ? `Dibawa oleh ${obName(order.assigned_to_ob)}` : 'Menunggu diambil OB')}
              </span>
            </div>
            {order.assigned_to_ob && order.order_status !== 'done' && onTrack && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onTrack(order.assigned_to_ob!)}
                className="h-8 rounded-full border-emerald-200 text-emerald-600 text-[11px] font-semibold hover:bg-emerald-50 hover:text-emerald-700 transition-all uppercase tracking-normal"
              >
                <MapPin className="w-3 h-3 mr-1" /> Lacak OB
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
      <div className={`h-1.5 w-full ${order.assigned_to_ob === 'OB 1' ? 'bg-emerald-500' : order.assigned_to_ob === 'OB 2' ? 'bg-orange-500' : 'bg-slate-300'}`} />
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 pr-2">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[12px] font-semibold rounded uppercase tracking-normal shadow-xs">
                {order.profiles?.name || 'User'}
              </span>
              <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 uppercase tracking-normal">
                <CalendarClock className="w-3.5 h-3.5" /> {new Date(order.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'numeric', year: '2-digit' }).replace(/\//g, '-') + ' - ' + new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')}
              </span>
            </div>
            <h4 className="font-semibold text-lg text-slate-900 leading-tight">{order.food_name}</h4>
            <p className="text-emerald-600 font-semibold text-sm mt-0.5">{formatRupiah(order.price)}</p>
          </div>

          <div className="shrink-0 flex flex-col items-end">
            <span className="text-[12px] bg-slate-50 border border-slate-100 text-slate-500 px-2 py-1 rounded-lg uppercase font-semibold tracking-normal mb-2">
              {order.payment_method}
            </span>
            {order.payment_status === 'paid' ? (
              <span className="text-[12px] inline-flex items-center px-2 py-1.5 bg-green-50 text-green-700 font-semibold rounded-lg border border-green-100/50">
                <CheckCircle className="w-3 h-3 mr-1" /> LUNAS
              </span>
            ) : (
              <div className="flex flex-col items-end gap-1">
                <span className="text-[12px] inline-flex items-center px-2 py-1.5 bg-red-50 text-red-600 font-semibold rounded-lg border border-red-100/50">
                  BELUM BAYAR
                </span>
                {order.transfer_to && (
                  <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full border ${order.transfer_to === 'Bahul' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                    TF KE: {order.transfer_to}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {order.catatan && (
          <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50 flex items-start gap-2 italic">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-500 mt-1 shrink-0" />
            <p className="text-xs text-emerald-800 font-medium leading-relaxed">{order.catatan}</p>
          </div>
        )}

        {(order.proof_url) ? (
          <div className="bg-slate-50/50 p-2.5 rounded-2xl border border-slate-200/50 flex justify-between items-center group">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors shadow-xs">
                <ImageIcon className="w-4 h-4" />
              </div>
              <span className="text-[12px] text-slate-500 font-semibold uppercase tracking-wider">BUKTI TF</span>
            </div>
            <a href={proof.data} aria-disabled={!proof.data} onClick={(event) => { if (!proof.data) { event.preventDefault(); void proof.refetch(); } }} target="_blank" rel="noopener noreferrer" className="text-white bg-slate-800 px-4 py-2 rounded-xl border border-slate-900 text-[12px] font-semibold uppercase tracking-normal hover:bg-black transition-all active:scale-95 shadow-lg">
              {proof.isError ? 'Coba muat bukti' : proof.isLoading ? 'Memuat...' : 'Lihat Gambar'}
            </a>
          </div>
        ) : (order.payment_method?.toLowerCase().trim() === 'transfer' || order.payment_method?.toUpperCase().trim() === 'TRANSFER') && (
          <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-red-400" />
              <span className="text-[12px] text-red-600 font-semibold uppercase">BUKTI TIDAK ADA</span>
            </div>
            <span className="text-[12px] text-red-400 font-bold italic">Gagal Upload?</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100">
          {!order.assigned_to_ob ? (
            <Button
              onClick={() => onTake?.(order.id)}
              className="col-span-2 rounded-2xl font-semibold h-12 text-[12px] uppercase tracking-normal bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
            >
              Ambil pesanan
            </Button>
          ) : isMyOrder ? (
            <>
              <Button
                variant="outline"
                onClick={() => onRelease?.(order.id)}
                className="col-span-2 rounded-2xl font-semibold h-10 text-[12px] uppercase tracking-normal text-slate-400 border-slate-200 hover:bg-red-50 hover:text-red-500"
              >
                Kembalikan ke antrean
              </Button>
              <Button
                disabled={order.payment_status === 'paid'}
                onClick={() => onVerifyPayment?.(order)}
                className={`rounded-2xl font-semibold h-12 text-[11px] uppercase tracking-normal ${order.payment_status === 'paid' ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'}`}
              >
                Konfirmasi bayar
              </Button>
              <Button
                onClick={() => onMarkDone?.(order)}
                className="rounded-2xl font-semibold h-12 text-[12px] uppercase tracking-normal bg-green-600 text-white shadow-lg shadow-green-600/20"
              >
                <ShoppingBag className="w-4 h-4 mr-2" /> Selesai
              </Button>
            </>
          ) : (
            <div className="col-span-2 bg-slate-50 rounded-2xl py-3 px-4 flex items-center justify-between border border-slate-100">
              <span className="text-[12px] font-semibold text-slate-400 uppercase">DIAMBIL OLEH</span>
              <span className="text-[12px] font-semibold text-slate-800 bg-white px-2 py-1 rounded-lg border border-slate-200">{obName(order.assigned_to_ob)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


