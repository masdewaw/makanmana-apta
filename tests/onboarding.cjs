const { strict: assert } = require('node:assert')
const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
let records = new Map(), unavailable = false
const localStorage = {
 getItem(key) { if (unavailable) throw Error('blocked'); return records.get(key) ?? null },
 setItem(key, value) { if (unavailable) throw Error('quota'); records.set(key, value) },
 removeItem(key) { if (unavailable) throw Error('blocked'); records.delete(key) },
}
const exported = {}
vm.runInNewContext(ts.transpile(readFileSync('src/lib/onboarding.ts','utf8'), {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}), {exports:exported,localStorage})
const api = exported
assert.equal(api.isTourHidden('alice','user'),false,'Tour appears by default')
assert.equal(api.saveTourPreference('alice','user',true),true)
assert.equal(api.isTourHidden('alice','user'),true,'Opt-out persists across reads')
assert.equal(api.isTourHidden('bob','user'),false,'Account preferences are separate')
assert.equal(api.isTourHidden('alice','ob'),false,'OB and user tours are separate')
assert.equal(api.saveTourPreference('alice','user',false),true)
assert.equal(api.isTourHidden('alice','user'),false,'Unchecking re-enables automatic tour')
unavailable = true
assert.equal(api.isTourHidden('alice','user'),false,'Blocked storage keeps app usable')
assert.equal(api.saveTourPreference('alice','user',true),false,'Storage failure is reported')
for (const width of [320,390,1200]) for (const height of [420,640,844]) {
 const shell = {left:Math.max(0,(width-430)/2),top:0,width:Math.min(width,430),height}
 const viewport = {left:0,top:0,width,height}
 for (const target of [null,{left:shell.left+20,top:90,width:200,height:130},{left:shell.left+20,top:height-70,width:100,height:40}]) {
  const result = api.positionTourCard(shell,target,390,viewport)
  assert(result.left>=shell.left && result.left+result.width<=shell.left+shell.width,'Tooltip stays within mobile shell')
  assert(result.top>=12 && result.top+Math.min(390,result.maxHeight)<=height-12,'Tooltip stays within viewport')
 }
}
const short = api.positionTourCard({left:0,top:0,width:320,height:640},{left:20,top:90,width:280,height:150},390,{left:0,top:0,width:320,height:640})
assert.equal(short.side,'below','Short viewport scrolls copy instead of covering spotlight')
assert(short.maxHeight<390)
for (const [role,steps] of Object.entries(api.tourSteps)) {
 assert(steps.length>0,role+' has its own steps')
 for (const step of steps) assert(step.target && step.title && step.description)
}
console.log('PASS: per-account opt-out, role isolation, re-enable, blocked storage, tooltip bounds, short-screen positioning')
