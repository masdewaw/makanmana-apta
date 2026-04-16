import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { useTemanMakan } from '@/hooks/useTemanMakan';

interface CreateTmRoomDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: string;
}

export const CreateTmRoomDrawer: React.FC<CreateTmRoomDrawerProps> = ({
  open,
  onOpenChange,
  creatorId,
}) => {
  const { createRoom, isCreatingRoom } = useTemanMakan();
  const [title, setTitle] = useState('');
  const [bankInfo, setBankInfo] = useState('');
  const [deadline, setDeadline] = useState('');

  const handleCreate = () => {
    if (!title.trim()) return;

    let deadlineTimestamp = undefined;
    if (deadline) {
      const today = new Date();
      const [hours, minutes] = deadline.split(':');
      today.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      deadlineTimestamp = today.toISOString();
    }

    createRoom({
      creatorId,
      title: title.trim(),
      bankInfo: bankInfo.trim(),
      deadline: deadlineTimestamp,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setTitle('');
        setBankInfo('');
        setDeadline('');
      }
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-[430px] mx-auto rounded-t-[40px] px-6 pb-10 border-0 shadow-2xl max-h-[96dvh]">
        <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mt-4 mb-4" />
        <div className="flex-1 overflow-y-auto px-1 scrollbar-hide">
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-2xl font-black text-slate-800">Buat Room Baru 🤝</DrawerTitle>
            <DrawerDescription className="text-slate-500 font-medium">Ajak temen-temen makan rame-rame!</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Judul Room*</Label>
              <Input
                placeholder="Mau makan apa bareng temen?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-2xl h-14 bg-slate-50 border-slate-100 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-amber-500 focus-visible:bg-white transition-all text-base font-bold shadow-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Info Pembayaran (Opsional)</Label>
              <textarea
                placeholder="Nomor rekening & nama bank buat transfer (opsional)"
                value={bankInfo}
                onChange={(e) => setBankInfo(e.target.value)}
                className="w-full min-h-[80px] p-4 bg-slate-50 border border-slate-100 rounded-[28px] text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all font-medium placeholder:text-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Deadline Order (Opsional)</Label>
              <Input
                type="time"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="rounded-2xl h-14 bg-slate-50 border-slate-100 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-amber-500 focus-visible:bg-white transition-all text-base font-bold shadow-xs"
              />
            </div>

            <Button
              className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-base shadow-lg shadow-amber-500/20 mt-4"
              disabled={!title.trim() || isCreatingRoom}
              onClick={handleCreate}
            >
              {isCreatingRoom ? 'MEMPROSES...' : 'BUAT ROOM SEKARANG'}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
