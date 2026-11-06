const { strict: assert } = require('node:assert')
const { readFileSync, existsSync } = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

const policy = {}
vm.runInNewContext(ts.transpile(readFileSync('src/lib/pwa-update.ts','utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}),{exports:policy})
const doc = { activeElement:{matches:()=>false}, querySelector:()=>null, querySelectorAll:()=>[] }
assert.equal(policy.isPwaUpdateBlocked(doc,0),false)
assert.equal(policy.isPwaUpdateBlocked(doc,1),true,'No reload during a transaction')
assert.equal(policy.isPwaUpdateBlocked({...doc,querySelector:()=>({})},0),true,'No reload with an open sheet')
assert.equal(policy.isPwaUpdateBlocked({...doc,activeElement:{matches:()=>true}},0),true,'No reload while typing')
assert.equal(policy.isPwaUpdateBlocked({...doc,querySelectorAll:()=>[{value:'081234567890'}]},0),true,'No reload with a filled login form')

const manifest = JSON.parse(readFileSync('public/manifest.webmanifest','utf8'))
assert.equal(manifest.display,'standalone'); assert.equal(manifest.scope,'/'); assert.equal(manifest.start_url,'/')
for(const icon of manifest.icons) {
 const png=readFileSync('public'+icon.src)
 assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a')
 assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`,icon.sizes)
}
assert(manifest.icons.some(icon=>icon.purpose==='maskable'))
const handlers={}, store=new Map(), requests=[]
const cache = name => { if(!store.has(name)) store.set(name,new Map()); return {
 async addAll(urls){for(const url of urls)store.get(name).set(url,{asset:url})},
 async match(url){return store.get(name).get(url)},
} }
const caches={async open(name){return cache(name)},async keys(){return [...store.keys()]},async delete(name){return store.delete(name)}}
let skipped=0,claimed=0
const self={location:{origin:'https://makan.test'},clients:{async claim(){claimed++}},skipWaiting(){skipped++},addEventListener(type,cb){handlers[type]=cb}}
const source=readFileSync('scripts/sw-template.js','utf8').replace('__BUILD_VERSION__','test').replace('__PRECACHE_URLS__',JSON.stringify(['/index.html','/assets/app-123.js']))
vm.runInNewContext(source,{self,caches,URL,fetch:async req=>{requests.push(req);throw Error('offline')}})
async function event(type,other={}) { let waited;handlers[type]({...other,waitUntil(p){waited=p}}); await waited }
async function fetchEvent(url,method='GET',mode='cors') {let response;handlers.fetch({request:{url,method,mode},respondWith(p){response=p}});return response}
;(async()=>{
 await event('install');assert.equal(skipped,0,'Updates never auto-activate')
 const html=await fetchEvent('https://makan.test/admin','GET','navigate');assert.equal(html.asset,'/index.html','Offline deep link uses cached shell')
 const asset=await fetchEvent('https://makan.test/assets/app-123.js');assert.equal(asset.asset,'/assets/app-123.js')
 for(const [url,method,mode] of [
  ['https://private.supabase.co/rest/v1/orders','GET','cors'],['https://makan.test/api/orders','GET','cors'],
  ['https://makan.test/orders','POST','cors'],['https://makan.test/assets/app-123.js?token=secret','GET','cors'],
  ['https://makan.test/storage/v1/proof','GET','navigate']
 ]) assert.equal(await fetchEvent(url,method,mode),undefined,'Private or mutation requests bypass worker')
 store.set('makanmana-shell-old',new Map([['/assets/old-456.js',{asset:'old'}]]))
 assert.equal((await fetchEvent('https://makan.test/assets/old-456.js')).asset,'old','Previous tab immutable assets remain available')
 store.set('unrelated-cache',new Map());store.set('makanmana-shell-older',new Map())
 await event('activate');assert.equal(claimed,1);assert(store.has('unrelated-cache'));assert.equal((await caches.keys()).filter(k=>k.startsWith('makanmana-shell')).length,2)
 handlers.message({data:{type:'ACTIVATE_UPDATE'}});assert.equal(skipped,1)
 assert.equal(requests.length,0,'Offline shell never sends or queues backend writes')
 let offline=true,sent=0
 const exports={}
 vm.runInNewContext(ts.transpile(readFileSync('src/lib/query-client.ts','utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}),{exports,require(name){return name.includes('connectivity')?{assertOnline(){if(offline)throw Error('offline')}}:require(name)}})
 const client=exports.queryClient
 const mutation=client.getMutationCache().build(client,{mutationFn:async()=>{sent++}})
 await assert.rejects(mutation.execute(),/offline/);assert.equal(sent,0);assert.equal(mutation.state.isPaused,false,'Offline write is rejected instead of queued')
 offline=false;await client.getMutationCache().build(client,{mutationFn:async()=>{sent++}}).execute();assert.equal(sent,1)
 client.clear()
 if(process.env.MAKANMANA_PWA_BUILD_DIR){
  const root=process.env.MAKANMANA_PWA_BUILD_DIR, built=readFileSync(root+'/sw.js','utf8')
  assert(!built.includes('__BUILD_VERSION__'));assert(!built.includes('__PRECACHE_URLS__'))
  const list=JSON.parse(built.match(/const PRECACHE = (\[[^;]+\]);/)[1]);assert(list.includes('/index.html'));assert(list.some(file=>file.endsWith('.js')))
  for(const file of list)assert(existsSync(root+file),'Precached asset exists: '+file)
 }
 console.log('PASS: install icons, offline navigation/assets, private cache exclusion, deliberate updates, old-tab assets, no queued writes, emitted precache')
})().catch(error=>{console.error(error);process.exitCode=1})
