const { strict: assert } = require('node:assert');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');
let channels = [], removed = [];
const supabase = {
  channel(name) {
    const channel = { name, on(_, filter, callback) { this.filter = filter; this.change = callback; return this; },
      subscribe(callback) { this.status = callback; return this; } };
    channels.push(channel); return channel;
  }, removeChannel(channel) { removed.push(channel); }
};
const exported = {};
vm.runInNewContext(ts.transpile(readFileSync('src/lib/table-sync.ts', 'utf8'), {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020
}), { exports: exported, require: () => ({ supabase }), crypto: webcrypto });
const calls = [];
const client = { invalidateQueries: ({ queryKey }) => calls.push(queryKey.join('/')) };
const subscribe = exported.subscribeQueryTable;
const a = subscribe(client, 'orders', 'orders');
const b = subscribe(client, 'orders', 'orders');
assert.equal(channels.length, 1, 'Duplicate hooks share a channel');
channels[0].change(); assert.deepEqual(calls, ['orders']);
a(); channels[0].status('SUBSCRIBED'); assert.equal(calls.length, 2);
assert.equal(removed.length, 0, 'Remaining hook keeps subscription');
b(); b(); assert.equal(removed.length, 1, 'Last unsubscribe closes channel once');
const c = subscribe(client, 'orders', 'orders'); assert.equal(channels.length, 2);
const d = subscribe(client, 'tardut_requests', 'tardut-requests');
assert.equal(channels.length, 3); c(); d();
console.log('PASS: shared channels, deduplicated invalidation, reconnect, cleanup, remount');
