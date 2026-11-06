const { strict: assert } = require('node:assert')
const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const exported = {}
vm.runInNewContext(ts.transpile(readFileSync('src/lib/drawer-viewport.ts','utf8'), {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}),{exports:exported})
const layout=exported.drawerViewport
const expect=(actual,expected)=>assert.deepEqual(JSON.parse(JSON.stringify(actual)),expected)
expect(layout(800,{height:800,offsetTop:0}),{height:800,bottom:0})
expect(layout(800,{height:450,offsetTop:0}),{height:450,bottom:350})
expect(layout(800,{height:430,offsetTop:20}),{height:430,bottom:350})
expect(layout(800,{height:800,offsetTop:0}),{height:800,bottom:0})
// Chrome can resize the layout viewport too. No double keyboard offset.
expect(layout(450,{height:450,offsetTop:0}),{height:450,bottom:0})
expect(layout(800,{height:800,offsetTop:0}),{height:800,bottom:0})
expect(layout(800),{height:800,bottom:0})
expect(layout(800,{height:810,offsetTop:0}),{height:810,bottom:0})
console.log('PASS: keyboard open/close, viewport pan, both resize modes, browser without visual viewport')
