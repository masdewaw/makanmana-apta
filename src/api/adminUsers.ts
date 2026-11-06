import { supabase } from '../lib/supabase'
import { assertOnline } from '../lib/connectivity'
export interface ManagedUser { id: string; name: string; phone: string; role: string; is_admin: boolean; must_change_password: boolean }
async function invoke<T>(body: Record<string, unknown>): Promise<T> {
 assertOnline()
 const { data, error } = await supabase.functions.invoke('admin-users', { body })
 if (error) {
  let message = 'Pengelolaan akun belum berhasil. Coba lagi.'
  try { const response = await error.context?.json(); if (typeof response?.error === 'string') message=response.error } catch {}
  throw new Error(message)
 }
 if(data?.error) throw new Error(data.error)
 return data as T
}
export const adminUsersService = {
 list: (search: string,page: number) => invoke<{users:ManagedUser[];total:number}>({action:'list',search,page}),
 reset: (user: ManagedUser,requestId: string) => invoke<{ok:boolean}>({action:'reset',userId:user.id,phone:user.phone,requestId}),
 changeTemporaryPassword: (password: string,requestId: string) => invoke<{ok:boolean}>({action:'change',password,requestId}),
}
