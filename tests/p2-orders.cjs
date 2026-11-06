const { strict: assert } = require('node:assert');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const now = Date.parse('2026-11-06T10:00:00Z');
class Clock extends Date { static now() { return now; } }
let updates = 0, selects = [];
const supabase = { async rpc(name) { assert.equal(name, 'complete_expired_orders'); updates++; return { error: null }; }, from(table) {
  assert.equal(table, 'orders');
  return {
    select() {
      const query = { filters: [], eq(key, value) { this.filters.push([key, value]); return this; },
        gt() { return this; }, order() { return this; }, range(start, end) { this.rangeValue = [start, end]; return this; },
        then(resolve, reject) { return Promise.resolve({ data: [], count: 0, error: null }).then(resolve, reject); }
      };
      selects.push(query); return query;
    }
  };
} };
const exported = {};
vm.runInNewContext(ts.transpile(readFileSync('src/api/orders.ts', 'utf8'), {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020
}), { exports: exported, require: () => ({ supabase }), Date: Clock, console });
(async () => {
  await Promise.all([
    exported.orderService.getOrders({ role: 'user', userId: 'user', status: 'done', limit: 10, offset: 10 }),
    exported.orderService.getOrders({ role: 'ob' })
  ]);
  assert.equal(updates, 1, 'Concurrent reads share cleanup');
  assert.match(readFileSync('supabase/migrations/20261106061723_harden_access_and_reliability.sql', 'utf8'), /created_at<now\(\)-interval '8 hours'/, 'Eight-hour rule resides in restricted backend operation');
  assert.deepEqual(selects[0].filters, [['order_status', 'done'], ['user_id', 'user']]);
  assert.deepEqual(selects[0].rangeValue, [10, 19]);
  assert.deepEqual(selects[1].filters, [['order_status', 'waiting']]);
  await exported.orderService.cleanupOldOrders();
  assert.equal(updates, 2, 'Later loads still run cleanup');
  console.log('PASS: eight-hour rule, concurrent cleanup, history filter before pagination');
})().catch(error => { console.error(error); process.exitCode = 1; });
