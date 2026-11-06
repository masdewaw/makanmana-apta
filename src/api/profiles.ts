import { supabase } from '../lib/supabase'

export const profileService = {
  getObNames: () => supabase.from('profiles').select('name, ob_code').eq('role', 'OB'),
  getProfile: (id: string) => supabase.from('profiles').select('*').eq('id', id).single(),
  getRole: (id: string) => supabase.from('profiles').select('role').eq('id', id).single(),
  getNames: () => supabase.from('profiles').select('id, name').order('name'),
  createProfile: (id: string, name: string) => supabase.from('profiles').insert([{ id, name }]),
  updateName: (id: string, name: string) => supabase.from('profiles').update({ name }).eq('id', id).select('id').single(),
  updateLocation: (id: string, latitude: number, longitude: number) => supabase.from('profiles').update({
    last_lat: latitude, last_lng: longitude, last_updated_at: new Date().toISOString(),
  }).eq('id', id),
  getLocationByCode: (code: string) => supabase.from('profiles')
    .select('last_lat, last_lng, last_updated_at').eq('ob_code', code).eq('role', 'OB').maybeSingle(),
}
