import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '../ui/drawer';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { User, KeyRound, LogOut, ChevronLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentName: string;
  onLogout: () => void;
  onProfileUpdated: () => void;
}

export function SettingsDrawer({
  open,
  onOpenChange,
  userId,
  currentName,
  onLogout,
  onProfileUpdated
}: SettingsDrawerProps) {
  const [activeMenu, setActiveMenu] = useState<'main' | 'profile' | 'password'>('main');
  const [name, setName] = useState(currentName);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset to main menu when opened
  useEffect(() => {
    if (open) {
      setActiveMenu('main');
      setName(currentName);
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [open, currentName]);

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      toast.error("Nama tidak boleh kosong");
      return;
    }
    
    setIsLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim() })
      .eq('id', userId);
      
    setIsLoading(false);
    
    if (error) {
      toast.error("Gagal mengupdate profil: " + error.message);
    } else {
      toast.success("Profil berhasil diupdate!");
      onProfileUpdated();
      setActiveMenu('main');
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    setIsLoading(false);

    if (error) {
      toast.error("Gagal mengganti password: " + error.message);
    } else {
      toast.success("Password berhasil diganti!");
      setActiveMenu('main');
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-[430px] mx-auto rounded-t-[40px] px-6 pb-12 border-0 shadow-2xl max-h-[96dvh]">
        <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mt-4 mb-4" />
        
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide">
          <DrawerHeader className="px-0 flex items-center gap-3">
            {activeMenu !== 'main' && (
              <button 
                onClick={() => setActiveMenu('main')}
                className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition text-slate-500"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <DrawerTitle className="text-2xl font-black text-slate-800">
                {activeMenu === 'main' ? 'Pengaturan ⚙️' : 
                 activeMenu === 'profile' ? 'Edit Profil 👤' : 'Ganti Password 🔑'}
              </DrawerTitle>
              <DrawerDescription className="text-slate-500 font-medium">
                {activeMenu === 'main' ? 'Kelola akun dan pengaturanmu.' : 
                 activeMenu === 'profile' ? 'Ubah nama tampilanmu di aplikasi.' : 'Perbarui kata sandi untuk keamanan.'}
              </DrawerDescription>
            </div>
          </DrawerHeader>

          <div className="space-y-6 pt-6">
            {activeMenu === 'main' && (
              <div className="space-y-3">
                <button
                  onClick={() => setActiveMenu('profile')}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-amber-200 hover:bg-amber-50/50 transition-all active:scale-95 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">Edit Profil</h4>
                    <p className="text-xs text-slate-500 font-medium">Ubah nama pengguna</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveMenu('password')}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-amber-200 hover:bg-amber-50/50 transition-all active:scale-95 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">Ganti Password</h4>
                    <p className="text-xs text-slate-500 font-medium">Perbarui kata sandi akunmu</p>
                  </div>
                </button>

                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-red-200 hover:bg-red-50/50 transition-all active:scale-95 text-left mt-8"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-red-600 text-sm">Keluar Akun</h4>
                    <p className="text-xs text-red-400 font-medium">Akhiri sesi saat ini</p>
                  </div>
                </button>
              </div>
            )}

            {activeMenu === 'profile' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nama Lengkap</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masukkan nama"
                    className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-medium focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-amber-500 focus-visible:bg-white transition-all shadow-xs"
                  />
                </div>
                
                <DrawerFooter className="px-0 pt-4">
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={isLoading || !name.trim()}
                    className="w-full h-14 rounded-2xl bg-amber-500 text-white font-black hover:bg-amber-600 transition-colors"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isLoading ? 'MENYIMPAN...' : 'SIMPAN PERUBAHAN'}
                  </Button>
                </DrawerFooter>
              </div>
            )}

            {activeMenu === 'password' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password Baru</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-medium focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-amber-500 focus-visible:bg-white transition-all shadow-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Konfirmasi Password Baru</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang password baru"
                    className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-medium focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-amber-500 focus-visible:bg-white transition-all shadow-xs"
                  />
                </div>
                
                <DrawerFooter className="px-0 pt-4">
                  <Button
                    onClick={handleUpdatePassword}
                    disabled={isLoading || newPassword.length < 6 || confirmPassword.length < 6}
                    className="w-full h-14 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-colors"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isLoading ? 'MENGGANTI...' : 'GANTI PASSWORD'}
                  </Button>
                </DrawerFooter>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
