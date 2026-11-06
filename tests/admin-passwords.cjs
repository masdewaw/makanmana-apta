const { strict: assert }=require('node:assert')
const {readFileSync}=require('node:fs')
const vm=require('node:vm'),ts=require('typescript')
const actor='11111111-1111-4111-8111-111111111111',target='22222222-2222-4222-8222-222222222222',session='33333333-3333-4333-8333-333333333333',requestId='44444444-4444-4444-8444-444444444444'
const exported={}
vm.runInNewContext(ts.transpile(readFileSync('supabase/functions/admin-users/handler.ts','utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}),{exports:exported,Request,Response,atob})
function setup({admin=true,required=false,active=true,job='created',reserveError=null,finishError=null,updateError=null,targetAdmin=false}={}){
 const calls={updates:[],rpc:[]}
 const service={auth:{async getUser(){return {data:{user:{id:actor,email:'081234567890@makanmana.com',app_metadata:{makanmana_admin:admin,must_change_password:required}}},error:null}},admin:{async getUserById(id){return {data:{user:{id,email:'081234567890@makanmana.com',app_metadata:{makanmana_admin:targetAdmin,other:'keep'}}},error:null}},async updateUserById(id,data){calls.updates.push({id,...data});return {error:updateError}}}},async rpc(name,args){calls.rpc.push({name,args});return {data:name==='admin_session_active'?active:name==='begin_password_action'?job:name==='admin_list_accounts'?{users:[],total:0}:null,error:name==='begin_password_action'?reserveError:name==='finish_password_action'?finishError:null}}}
 const handler=exported.createHandler(service)
 const token='e30.'+Buffer.from(JSON.stringify({session_id:session})).toString('base64url')+'.signature'
 const run=(body,auth=true)=>handler(new Request('https://test/admin-users',{method:'POST',headers:auth?{Authorization:'Bearer '+token}:{},body:JSON.stringify(body)}))
 return {calls,run}
}
;(async()=>{
 let s=setup();assert.equal((await s.run({action:'reset'},false)).status,401)
 for(const opts of [{admin:false},{admin:false,required:false},{required:true}]){s=setup(opts);assert.equal((await s.run({action:'list'})).status,403);assert.equal((await s.run({action:'reset',userId:target,requestId,phone:'081234567890'})).status,403);assert.equal(s.calls.updates.length,0)}
 s=setup({active:false});assert.equal((await s.run({action:'list'})).status,401)
 s=setup();assert.equal((await s.run({action:'list',search:'Dewa',page:2})).status,200);assert(s.calls.rpc.some(c=>c.name==='admin_list_accounts'&&c.args.page_number===2))
 s=setup();assert.equal((await s.run({action:'reset',userId:actor,requestId,phone:'081234567890'})).status,400)
 s=setup({targetAdmin:true});assert.equal((await s.run({action:'reset',userId:target,requestId,phone:'081234567890'})).status,403)
 s=setup();assert.equal((await s.run({action:'reset',userId:target,requestId,phone:'wrong'})).status,400)
 s=setup();assert.equal((await s.run({action:'reset',userId:target,requestId,phone:'081234567890'})).status,200);assert.equal(s.calls.updates[0].password,'makanmana2026');assert.equal(s.calls.updates[0].app_metadata.must_change_password,true);assert.equal(s.calls.updates[0].app_metadata.other,'keep');assert(s.calls.rpc.some(c=>c.name==='finish_password_action'&&c.args.succeeded===true))
 s=setup({job:'done'});assert.equal((await s.run({action:'reset',userId:target,requestId,phone:'081234567890'})).status,200);assert.equal(s.calls.updates.length,0,'Completed request is never reset twice')
 s=setup({job:'pending'});assert.equal((await s.run({action:'reset',userId:target,requestId,phone:'081234567890'})).status,409);assert.equal(s.calls.updates.length,0)
 s=setup({reserveError:{code:'54000',message:'Rate limit'}});assert.equal((await s.run({action:'reset',userId:target,requestId,phone:'081234567890'})).status,429)
 s=setup({finishError:{message:'offline'}});assert.equal((await s.run({action:'reset',userId:target,requestId,phone:'081234567890'})).status,503)
 s=setup({required:true,admin:false});assert.equal((await s.run({action:'change',requestId,password:'makanmana2026'})).status,400);assert.equal((await s.run({action:'change',requestId,password:'password-baru-pengguna',userId:target})).status,200);assert.equal(s.calls.updates[0].id,actor,'Mandatory change cannot modify another account');assert.equal(s.calls.updates[0].app_metadata.must_change_password,false)
 console.log('PASS: auth/session checks, user/OB denial, admin list/reset, account confirmation, metadata retention, idempotency, cooldown, partial failure, mandatory own password change')
})().catch(e=>{console.error(e);process.exitCode=1})
