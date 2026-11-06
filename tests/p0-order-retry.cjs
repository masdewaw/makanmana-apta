const { readFileSync } = require('node:fs');
const { strict: assert } = require('node:assert');
const vm = require('node:vm');
const ts = require('typescript');
const noteExports = {};
vm.runInNewContext(ts.transpile(readFileSync('src/lib/order-notes.ts', 'utf8'), { module: ts.ModuleKind.CommonJS }), { exports: noteExports });
const js = ts.transpile(readFileSync('src/api/orders.ts', 'utf8'), { module: ts.ModuleKind.CommonJS });
async function run(existing) {
  const failure = new Error('response lost');
  const supabase = { from() { return {
    insert() { return { select() { return { async single() { return { data: null, error: failure }; } }; } }; },
    select() { return { eq(_, id) { assert.equal(id, 'stable-id'); return {
      async single() { return existing ? { data: { id }, error: null } : { data: null, error: failure }; }
    }; } }; }
  }; } };
  const exports = {};
  vm.runInNewContext(js, { exports, require: path => path.endsWith('order-notes') ? noteExports : ({ supabase }) });
  return exports.orderService.createOrder({ id: 'stable-id' });
}
(async () => {
  assert.equal((await run(true)).id, 'stable-id');
  await assert.rejects(run(false), /response lost/);
  console.log('PASS: committed order recovered, unconfirmed insert remains a failure');
})().catch(error => { console.error(error); process.exitCode = 1; });
