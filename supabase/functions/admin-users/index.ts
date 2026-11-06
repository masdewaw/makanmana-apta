import { createClient } from 'npm:@supabase/supabase-js@2.101.1'
import { createHandler } from './handler.ts'
const service=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{
 auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
 global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(20000)})},
})
Deno.serve(createHandler(service))
