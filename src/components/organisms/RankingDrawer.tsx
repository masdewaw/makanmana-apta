import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '../ui/drawer'
import { Button } from '../ui/button'
import { Trophy, TrendingUp } from 'lucide-react'

interface RankingItem {
  food_name: string;
  count: number;
}

interface RankingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RankingDrawer: React.FC<RankingDrawerProps> = ({ open, onOpenChange }) => {
  const [rankings, setRankings] = useState<RankingItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchRankings()
    }
  }, [open])

  const fetchRankings = async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('food_name')
    
    if (data) {
      const counts: Record<string, number> = {}
      data.forEach(item => {
        counts[item.food_name] = (counts[item.food_name] || 0) + 1
      })

      const sorted = Object.entries(counts)
        .map(([food_name, count]) => ({ food_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      setRankings(sorted)
    }
    setIsLoading(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-[430px] mx-auto rounded-t-[40px] px-6 pb-12 bg-slate-50">
        <DrawerHeader className="px-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <DrawerTitle className="text-2xl font-black text-slate-800 tracking-tight">Terlaris Bulan Ini! 🏆</DrawerTitle>
              <DrawerDescription className="text-slate-500 font-medium">Menu yang paling sering dipesan oleh teman-teman kantor.</DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1 scrollbar-hide">
          {isLoading ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Menghitung data...</p>
            </div>
          ) : rankings.length > 0 ? (
            rankings.map((item, index) => (
              <div 
                key={index}
                className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-amber-200 transition-all"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm ${
                  index === 0 ? 'bg-amber-100 text-amber-600 border-2 border-amber-200' : 
                  index === 1 ? 'bg-slate-100 text-slate-500 border-2 border-slate-200' :
                  index === 2 ? 'bg-orange-100 text-orange-600 border-2 border-orange-200' :
                  'bg-slate-50 text-slate-400 border border-slate-100'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-slate-800 text-sm leading-tight mb-1">{item.food_name}</h4>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{item.count} Kali Dipesan</p>
                  </div>
                </div>
                {index < 3 && (
                  <div className="text-2xl animate-bounce duration-1000 delay-300">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-slate-400 font-medium">Belum ada data pesanan.</div>
          )}
        </div>

        <DrawerFooter className="px-0 pt-6">
          <Button onClick={() => onOpenChange(false)} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 active:scale-[0.98] transition-all">TUTUP 🆗</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
