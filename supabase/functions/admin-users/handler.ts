export const TEMPORARY_PASSWORD = 'makanmana2026'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function createHandler(service: any) {
 const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Cache-Control': 'no-store', 'Content-Type': 'application/json' }
 const json = (body: unknown, status=200) => new Response(JSON.stringify(body),{status,headers:cors})
 return async (req: Request): Promise<Response> => {
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors})
  if(req.method!=='POST') return json({error:'Metode tidak diizinkan.'},405)
  try {
   const token=req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1]
   if(!token) return json({error:'Silakan masuk kembali.'},401)
   const {data:{user},error:authError}=await service.auth.getUser(token)
   if(authError||!user) return json({error:'Sesi berakhir. Silakan masuk kembali.'},401)
   let sessionId: string
   try { sessionId=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).session_id } catch { return json({error:'Sesi tidak valid.'},401) }
   if(!uuid.test(sessionId)) return json({error:'Sesi tidak valid.'},401)
   const {data:sessionActive,error:sessionError}=await service.rpc('admin_session_active',{actor:user.id,actor_session:sessionId})
   if(sessionError||!sessionActive) return json({error:'Sesi berakhir. Silakan masuk kembali.'},401)
   if(Number(req.headers.get('Content-Length')||0)>4096) return json({error:'Permintaan terlalu besar.'},413)
   const text=await req.text()
   if(text.length>4096) return json({error:'Permintaan terlalu besar.'},413)
   let body: any
   try { body=JSON.parse(text) } catch { return json({error:'Permintaan tidak valid.'},400) }
   if(!body || typeof body!=='object') return json({error:'Permintaan tidak valid.'},400)
   const meta=user.app_metadata||{}
   const isAdmin=meta.makanmana_admin===true && meta.must_change_password!==true
   if(body.action==='list') {
    if(!isAdmin) return json({error:'Menu ini khusus admin.'},403)
    const search=typeof body.search==='string'?body.search.trim().slice(0,100):''
    const page=Number.isInteger(body.page)&&body.page>0?Math.min(body.page,10000):1
    const {data,error}=await service.rpc('admin_list_accounts',{search_text:search,page_number:page})
    if(error) throw error
    return json(data)
   }
   if(body.action!=='reset'&&body.action!=='change') return json({error:'Aksi tidak dikenal.'},400)
   if(body.action==='reset'&&!isAdmin) return json({error:'Akses reset ditolak.'},403)
   if(body.action==='change'&&meta.must_change_password!==true) return json({error:'Akun tidak memerlukan penggantian password sementara.'},400)
   const target=body.action==='change'?user.id:body.userId
   if(!uuid.test(target||'')||!uuid.test(body.requestId||'')) return json({error:'Identitas permintaan tidak valid.'},400)
   if(body.action==='reset'&&target===user.id) return json({error:'Gunakan Ganti Password untuk akun sendiri.'},400)
   if(body.action==='change'&&(typeof body.password!=='string'||body.password.length<8||body.password.length>128||body.password===TEMPORARY_PASSWORD)) return json({error:'Gunakan password baru 8–128 karakter yang berbeda dari password sementara.'},400)
   const {data:{user:targetUser},error:targetError}=await service.auth.admin.getUserById(target)
   if(targetError||!targetUser) return json({error:'Akun tidak ditemukan.'},404)
   const phone=targetUser.email?.match(/^(08\d{8,12})@makanmana\.com$/)?.[1]
   if(!phone||(body.action==='reset'&&body.phone!==phone)) return json({error:'Nomor HP akun tidak cocok. Muat ulang daftar.'},400)
   if(body.action==='reset'&&targetUser.app_metadata?.makanmana_admin===true) return json({error:'Akun admin tidak dapat direset di sini.'},403)
   const {data:job,error:reserveError}=await service.rpc('begin_password_action',{actor:user.id,target,request_id:body.requestId,operation:body.action,actor_session:sessionId,expected_phone:phone})
   if(reserveError) return json({error:reserveError.message},['42501'].includes(reserveError.code)?403:429)
   if(job==='done') return json({ok:true})
   if(job!=='created') {
    // Recover only the exact operation that committed before its response was lost.
    if(targetUser.app_metadata?.password_action_id!==body.requestId) return json({error:'Permintaan sebelumnya belum dapat dipastikan. Muat ulang daftar sebelum mencoba lagi.'},409)
   } else {
    const {error}=await service.auth.admin.updateUserById(target,{
     password:body.action==='reset'?TEMPORARY_PASSWORD:body.password,
     app_metadata:{...targetUser.app_metadata,must_change_password:body.action==='reset',password_action_id:body.requestId},
    })
    if(error) { await service.rpc('finish_password_action',{request_id:body.requestId,succeeded:false}); return json({error:'Password belum dapat diperbarui. Periksa hasilnya sebelum mencoba ulang.'},502) }
   }
   const {error:finishError}=await service.rpc('finish_password_action',{request_id:body.requestId,succeeded:true})
   if(finishError) return json({error:'Perubahan diterima tetapi penyelesaian sesi belum terkonfirmasi. Jangan mengirim reset baru; coba lagi dengan permintaan yang sama.'},503)
   return json({ok:true})
  } catch { return json({error:'Layanan pengelolaan akun belum tersedia. Coba lagi.'},500) }
 }
}
