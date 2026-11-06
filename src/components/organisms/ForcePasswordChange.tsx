import { useRef, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { adminUsersService } from '../../api/adminUsers'
import { supabase } from '../../lib/supabase'
import { errorMessage } from '../../lib/errors'
import { useOnline } from '../../hooks/useOnline'
import { BrandLogo } from '../molecules/BrandLogo'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Label } from '../ui/label'

export function ForcePasswordChange() {
 const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false)
 const lock=useRef(false),requestId=useRef(crypto.randomUUID())
 const online=useOnline()
 async function logout(){const {error}=await supabase.auth.signOut({scope:'local'});if(error)toast.error(errorMessage(error))}
 async function submit(event:React.FormEvent){
  event.preventDefault()
  if(lock.current)return
  if(password.length<8||password.length>128||password==='makanmana2026')return toast.error('Gunakan password baru 8–128 karakter yang berbeda dari password sementara.')
  if(password!==confirm)return toast.error('Konfirmasi password tidak cocok.')
  lock.current=true;setBusy(true)
  try {await adminUsersService.changeTemporaryPassword(password,requestId.current);setSaved(true);setPassword('');setConfirm('');await logout()}
  catch(error){toast.error(errorMessage(error))}
  finally{lock.current=false;setBusy(false)}
 }
 return <main className="mobile-shell force-password" data-pwa-busy={busy}><Toaster position="top-center"/><BrandLogo/><span className="admin-access-label">KEAMANAN AKUN</span><h1>{saved?'Password berhasil diganti':'Buat password pribadimu'}</h1><p>{saved?'Masuk kembali menggunakan nomor HP dan password barumu.':'Admin telah mereset password akunmu. Ganti password sementara sebelum melanjutkan ke MakanMana.'}</p>
 {saved?<Button onClick={()=>void logout()}>Kembali ke halaman masuk</Button>:<form onSubmit={event=>void submit(event)}><Label htmlFor="required-password">Password baru</Label><Input id="required-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={busy} value={password} onChange={event=>setPassword(event.target.value)} placeholder="Minimal 8 karakter"/><Label htmlFor="required-password-confirm">Ulangi password baru</Label><Input id="required-password-confirm" type="password" autoComplete="new-password" required disabled={busy} value={confirm} onChange={event=>setConfirm(event.target.value)} placeholder="Ketik kembali password baru"/><Button type="submit" disabled={busy||!online}>{busy?'Menyimpan…':'Simpan password baru'}</Button><button type="button" disabled={busy} className="admin-signout" onClick={()=>void logout()}>Keluar akun</button></form>}
 </main>
}
