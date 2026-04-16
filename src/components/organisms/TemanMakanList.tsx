import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { TemanMakanGroup } from '@/types';

interface TemanMakanListProps {
  rooms: TemanMakanGroup[];
  onSelectRoom: (room: TemanMakanGroup) => void;
  onCreateRoom: () => void;
}

export const TemanMakanList: React.FC<TemanMakanListProps> = ({
  rooms,
  onSelectRoom,
  onCreateRoom,
}) => {
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
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

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-amber-500 to-orange-500 rounded-[32px] p-6 text-white shadow-xl shadow-amber-500/20">
        <h3 className="text-xl font-black mb-1">Makan Rame-Rame! 🤝</h3>
        <p className="text-white/80 text-xs font-medium mb-4 italic">Malas pesan sendiri? Gabung temen yang lagi pesan ojol aja!</p>
        <Button
          onClick={onCreateRoom}
          className="w-full h-12 rounded-2xl bg-white text-amber-600 font-black text-sm shadow-lg hover:bg-amber-50 transition-all border-0"
        >
          + BUAT ROOM BARU
        </Button>
      </div>

      <div className="space-y-4 pb-20">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Room Tersedia</h4>
        {rooms.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold italic text-sm">Belum ada room terbuka...</p>
          </div>
        ) : (
          rooms.map((group) => (
            <div
              key={group.id}
              onClick={() => onSelectRoom(group)}
              className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer hover:border-amber-300"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-amber-100 text-amber-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                    OWNER: {group.profiles?.name?.split(' ')[0] || 'User'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {getRelativeTime(group.created_at)}
                  </span>
                </div>
                <h4 className="font-black text-slate-800 text-base truncate">{group.title}</h4>
                {group.bank_info && (
                  <p className="text-[10px] text-slate-400 font-medium mt-1 truncate">{group.bank_info}</p>
                )}
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl flex flex-col items-center">
                <span className="text-[10px] font-black text-slate-400 leading-none">JOIN</span>
                <ChevronRight className="w-5 h-5 text-amber-500 mt-1" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
