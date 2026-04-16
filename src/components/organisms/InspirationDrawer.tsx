import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Menu } from '@/types';

interface InspirationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityOrders: any[];
  menus: Menu[];
  onQuickOrder: (menu: Menu) => void;
  getRelativeTime: (date: string) => string;
}

export const InspirationDrawer: React.FC<InspirationDrawerProps> = ({
  open,
  onOpenChange,
  communityOrders,
  menus,
  onQuickOrder,
  getRelativeTime,
}) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-[430px] mx-auto rounded-t-[32px] px-6 pb-8 max-h-[96dvh]">
        <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mt-4 mb-4" />
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide">
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
              Intip Pesanan yang Lain 👀
            </DrawerTitle>
            <DrawerDescription className="text-slate-500 font-medium italic">
              "Hmm, temen-temen hari ini makan apa ya?"
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 py-4">
            {communityOrders.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <p className="text-slate-400 font-bold">Belum ada pesanan masuk pagi ini...</p>
              </div>
            ) : (
              communityOrders.map((commOrder) => (
                <div
                  key={commOrder.id}
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-4 h-4 bg-amber-100 rounded-full flex items-center justify-center text-[8px] font-black text-amber-700 uppercase">
                        {commOrder.profiles?.name?.[0] || '?'}
                      </div>
                      <span className="text-[10px] font-black text-slate-400 tracking-tighter uppercase truncate">
                        {commOrder.profiles?.name?.split(' ')[0] || 'User'} • {getRelativeTime(commOrder.created_at)}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">{commOrder.food_name}</h4>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                        const menuMatch = menus.find(m => m.food_name === commOrder.food_name);
                        const finalMenu = menuMatch || {
                            id: `duplicate-${Date.now()}`,
                            food_name: commOrder.food_name,
                            price: commOrder.price,
                            category: 'Lainnya'
                        };
                        onQuickOrder(finalMenu);
                    }}
                    className="h-8 rounded-xl bg-amber-500 text-white font-black text-[10px] shadow-sm hover:bg-amber-600 transition-all hover:scale-105 active:scale-95"
                  >
                    PESEN JUGA
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <DrawerFooter className="px-0 pt-2">
          <Button onClick={() => onOpenChange(false)} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black text-base shadow-xl active:scale-95 transition-all">
            TUTUP ✅
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
