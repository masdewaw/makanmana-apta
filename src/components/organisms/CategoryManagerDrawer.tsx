import React, { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '../ui/drawer';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface CategoryManagerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: string[];
  onAdd: (name: string) => Promise<void>;
  onDelete: (name: string) => Promise<void>;
  isBusy?: boolean;
}

export const CategoryManagerDrawer: React.FC<CategoryManagerDrawerProps> = ({
  open,
  onOpenChange,
  categories,
  onAdd,
  onDelete,
  isBusy = false,
}) => {
  const [newName, setNewName] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await onAdd(newName.trim());
    setNewName('');
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-[430px] mx-auto rounded-t-[40px] px-6 pb-12">
        <DrawerHeader className="items-center text-center">
          <DrawerTitle className="text-2xl font-black flex flex-col items-center gap-2">
            Kelola Kategori 📂
          </DrawerTitle>
          <DrawerDescription className="font-bold text-slate-500">
            Tambah atau hapus kategori menu jajan.
          </DrawerDescription>
        </DrawerHeader>

        <div className="py-6 space-y-8">
          {/* Current Categories */}
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
              KATEGORI SAAT INI
            </Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <div 
                  key={cat}
                  className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl flex items-center gap-2 group hover:border-red-200 hover:bg-red-50 transition-all"
                >
                  <span className="text-xs font-bold text-slate-700 group-hover:text-red-600">{cat}</span>
                  <button 
                    onClick={() => onDelete(cat)}
                    disabled={isBusy}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-[10px] font-bold text-slate-400 italic">Belum ada kategori kustom.</p>
              )}
            </div>
          </div>

          {/* Add New */}
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
              TAMBAH KATEGORI BARU
            </Label>
            <div className="flex gap-2">
              <Input 
                placeholder="Contoh: Takoyaki" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={isBusy}
                className="rounded-2xl h-14 bg-slate-50 border-slate-100 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-amber-500 focus-visible:bg-white transition-all"
              />
              <Button 
                onClick={handleAdd}
                disabled={isBusy || !newName.trim()}
                className="h-14 aspect-square bg-slate-900 text-white rounded-2xl shrink-0"
              >
                <Plus className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>

        <DrawerFooter className="px-0">
          <Button 
            onClick={() => onOpenChange(false)} 
            className="w-full h-16 rounded-3xl bg-slate-50 text-slate-500 font-bold border border-slate-100 hover:bg-slate-100 transition-all uppercase tracking-widest text-xs"
          >
            Tutup
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
