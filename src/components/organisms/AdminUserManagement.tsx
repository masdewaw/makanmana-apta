import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, KeyRound, ShieldCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import { adminUsersService, type ManagedUser } from '../../api/adminUsers'
import { errorMessage } from '../../lib/errors'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

export function AdminUserManagement({ currentUserId, service = adminUsersService, onBusyChange }: { currentUserId: string; service?: Pick<typeof adminUsersService, 'list' | 'reset'>; onBusyChange?: (busy: boolean) => void }) {
 const [search,setSearch]=useState(''),[filter,setFilter]=useState(''),[page,setPage]=useState(1)
 const [selected,setSelected]=useState<ManagedUser|null>(null),[busy,setBusy]=useState(false)
 const requestId=useRef(''),lock=useRef(false),confirmation=useRef<HTMLElement|null>(null)
 const queryClient=useQueryClient()
 useEffect(()=>{if(selected){confirmation.current?.focus({preventScroll:true});confirmation.current?.scrollIntoView({block:'nearest',behavior:'instant'})}},[selected])
 useEffect(()=>{const timer=setTimeout(()=>{setFilter(search.trim());setPage(1)},300);return()=>clearTimeout(timer)},[search])
 const query=useQuery({queryKey:['admin-users',filter,page],queryFn:()=>service.list(filter,page),retry:false})
 useEffect(()=>{if(query.data && page>Math.max(1,Math.ceil(query.data.total/20)))setPage(Math.max(1,Math.ceil(query.data.total/20)))},[query.data,page])
 function choose(user:ManagedUser){requestId.current=crypto.randomUUID();setSelected(user)}
 async function reset(){
  if(!selected||lock.current)return
  lock.current=true;setBusy(true);onBusyChange?.(true)
  try {await service.reset(selected,requestId.current);toast.success(`Password ${selected.name} berhasil direset.`);setSelected(null);await queryClient.invalidateQueries({queryKey:['admin-users']})}
  catch(error){toast.error(errorMessage(error))}
  finally{lock.current=false;setBusy(false);onBusyChange?.(false)}
 }
 return <section className="admin-users" data-pwa-busy={busy}>
  <p className="admin-intro">Bantu teman kantor yang lupa password. Pilih satu akun, lalu periksa nama dan nomor HP sebelum reset.</p>
  <label className="admin-search"><Search size={18} aria-hidden="true"/><Input aria-label="Cari pengguna berdasarkan nama atau nomor HP" placeholder="Cari nama atau nomor HP" value={search} onChange={event=>setSearch(event.target.value)} disabled={busy}/></label>
  {selected && <section ref={confirmation} tabIndex={-1} className="admin-reset-confirm" aria-label="Konfirmasi reset password">
   <div className="flex justify-between gap-3"><h3>Reset password akun ini?</h3><button aria-label="Batalkan reset" disabled={busy} onClick={()=>setSelected(null)}><X size={19}/></button></div>
   <strong>{selected.name}</strong><p>{selected.phone}</p>
   <p>Password sementara menjadi <code>makanmana2026</code>. Sesi lama akan diakhiri dan pengguna wajib membuat password baru saat masuk.</p>
   <div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={()=>setSelected(null)}>Batal</Button><Button disabled={busy} onClick={()=>void reset()}>{busy?'Memproses…':'Ya, reset password'}</Button></div>
  </section>}
  <div className="admin-table-heading"><span>{query.data?.total ?? 0} pengguna</span>{query.isFetching&&!query.isLoading&&<span role="status">Memperbarui…</span>}</div>
  {query.isLoading?<p role="status" className="admin-state">Memuat pengguna…</p>:query.error?<div role="alert" className="admin-state"><p>{errorMessage(query.error)}</p><Button variant="outline" onClick={()=>void query.refetch()}>Coba lagi</Button></div>:<div className="admin-table-scroll"><table><caption className="sr-only">Daftar akun MakanMana</caption><thead><tr><th>Pengguna</th><th>Nomor HP</th><th><span className="sr-only">Tindakan</span></th></tr></thead><tbody>{query.data?.users.map(user=><tr key={user.id}><td><strong>{user.name}</strong><small>{user.is_admin?'Admin':user.role==='OB'?'Teman OB':'Karyawan'}{user.must_change_password?' · Perlu ganti password':''}</small></td><td className="admin-phone">{user.phone}</td><td>{user.id===currentUserId||user.is_admin?<span className="admin-protected" aria-label="Akun admin dilindungi"><ShieldCheck size={17}/></span>:<button className="admin-reset-button" aria-label={`Reset password ${user.name}, ${user.phone}`} disabled={busy} onClick={()=>choose(user)}><KeyRound size={15}/><span>Reset</span></button>}</td></tr>)}</tbody></table>{query.data?.users.length===0&&<p className="admin-state">Pengguna tidak ditemukan.</p>}</div>}
  {(query.data?.total??0)>20&&<div className="admin-pagination"><Button variant="outline" disabled={page===1||busy} onClick={()=>setPage(value=>value-1)}>Sebelumnya</Button><span>{page}/{Math.ceil((query.data?.total??0)/20)}</span><Button variant="outline" disabled={page*20>=(query.data?.total??0)||busy} onClick={()=>setPage(value=>value+1)}>Berikutnya</Button></div>}
 </section>
}
