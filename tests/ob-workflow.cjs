const { strict: assert } = require('node:assert')
const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
let queries = [], result = { data: { id: 'order' }, error: null }
const supabase = { rpc: async () => ({ error: null }), from() {
 const q = { calls: [], select(...args) { this.calls.push(['select', ...args]); return this }, update(data) { this.calls.push(['update', data]); return this },
 eq(...args) { this.calls.push(['eq', ...args]); return this }, is(...args) { this.calls.push(['is', ...args]); return this },
 gt(...args) { this.calls.push(['gt', ...args]); return this }, or(...args) { this.calls.push(['or', ...args]); return this },
 order(...args) { this.calls.push(['order', ...args]); return this }, range(...args) { this.calls.push(['range', ...args]); return this },
 maybeSingle() { return Promise.resolve(result) }, then(resolve, reject) { return Promise.resolve({ data: [], count: 0, error: null }).then(resolve, reject) } }
 queries.push(q); return q
} }
const exported = {}
vm.runInNewContext(ts.transpile(readFileSync('src/api/orders.ts', 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }), { exports: exported, require: () => ({ supabase }), Date, console })
;(async () => {
 const api = exported.orderService
 await api.transitionObOrder('order', 'OB 1', 'take')
 assert(queries[0].calls.some(c => c[0] === 'is' && c[1] === 'assigned_to_ob' && c[2] === null), 'Claim only unassigned order')
 await api.transitionObOrder('order', 'OB 1', 'done')
 assert(queries[1].calls.some(c => c[0] === 'eq' && c[1] === 'assigned_to_ob' && c[2] === 'OB 1'), 'Finish only own order')
 await api.transitionObOrder('order', 'OB 1', 'undo')
 assert(queries[2].calls.some(c => c[0] === 'eq' && c[1] === 'order_status' && c[2] === 'done'))
 assert(queries[2].calls.some(c => c[0] === 'gt' && c[1] === 'created_at'), 'Undo cannot reopen eight-hour expired orders')
 result = { data: null, error: null }
 await assert.rejects(api.transitionObOrder('order', 'OB 2', 'take'), /Pesanan sudah berubah/)
 await api.getOrders({ role: 'ob', paymentOb: 'OB 1', limit: 20, offset: 20 })
 const review = queries.at(-1).calls
 assert(review.some(c => c[0] === 'eq' && c[1] === 'payment_status' && c[2] === 'pending'))
 assert(!review.some(c => c[0] === 'eq' && c[1] === 'order_status'), 'Completed unpaid orders remain in payment review')
 assert(!review.some(c => c[0] === 'gt'), 'Old unpaid orders remain reviewable')
 assert(review.findIndex(c => c[0] === 'or') < review.findIndex(c => c[0] === 'range'), 'Ownership filter before pagination')
 console.log('PASS: conditional claim, own completion, guarded undo, stale conflict, completed unpaid review, server pagination')
})().catch(error => { console.error(error); process.exitCode = 1 })
