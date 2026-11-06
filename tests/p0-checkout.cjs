// Exercise the real checkout callback with storage and order failures, without live writes.
const { readFileSync } = require('node:fs');
const { strict: assert } = require('node:assert');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');
const source = readFileSync('src/pages/UserDashboard.tsx', 'utf8');
const start = source.indexOf('onSubmit={async (data) => {');
const end = source.indexOf('\n\t\t\t\tisSubmitting=', start);
const callback = source.slice(start + 'onSubmit={'.length, end).trim().slice(0, -1);
const js = ts.transpile(`const handler = ${callback}`, { target: ts.ScriptTarget.ES2020 });
function setup({ failUpload = false, failOrder = false, delayUpload = false } = {}) {
  const env = {
    cart: [{ id: 'menu', food_name: 'Nasi', price: 10000, category: 'Makanan', quantity: 2, note: '  Sambal dipisah  ' }],
    checkoutLock: { current: false }, pendingOrderIds: { current: {} }, uploadedProof: { current: null },
    persistCart(items) { env.persisted = JSON.parse(JSON.stringify({ items, ids: env.pendingOrderIds.current })); },
    userId: 'user', crypto: webcrypto, saved: [], payloads: [], messages: [], uploads: 0, closed: false,
    setIsPlacingOrder(value) { env.busy = value; },
    setCart(value) { env.cart = value; },
    setIsDrawerOpen(value) { env.closed = !value; },
    toast: { error(value) { env.messages.push(value); }, success(value) { env.messages.push(value); } },
    async createOrder(order) {
      env.saved.push(order.id);
      env.payloads.push(order);
      if (failOrder && env.saved.length === 2) throw Error('offline');
    },
    supabase: { storage: { from() { return {
      async upload() {
        env.uploads++;
        if (delayUpload) await new Promise(resolve => { env.resume = resolve; });
        return { error: failUpload ? new Error('upload failed') : null };
      },
      getPublicUrl() { return { data: { publicUrl: 'proof' } }; }
    }; } } }
  };
  env.paymentProofService = { upload: (...args) => env.supabase.storage.from().upload(...args), getPublicUrl: () => env.supabase.storage.from().getPublicUrl() };
  env.handler = () => new Function('env', `const {${Object.keys(env).filter(key => key !== 'handler').join(',')}} = env; ${js}; return handler;`)(env);
  return env;
}
(async () => {
  const cash = { paymentMethod: 'cash', proofFile: null };
  const offline = setup(); offline.navigator = { onLine: false }; await offline.handler()(cash);
  assert.equal(offline.saved.length, 0); assert.equal(offline.uploads, 0); assert.equal(offline.cart[0].quantity, 2); assert.equal(offline.checkoutLock.current, false);
  const transfer = { ...cash, paymentMethod: 'transfer', proofFile: { name: 'proof.jpg' } };
  let e = setup(); await e.handler()(cash);
  assert.equal(e.saved.length, 2); assert.equal(e.cart.length, 0); assert.equal(e.closed, true);
  assert.ok(e.payloads.every(order => order.catatan === 'Sambal dipisah'), 'Each portion receives its menu note');
  e = setup(); e.cart.push({ id: 'drink', food_name: 'Teh', price: 5000, category: 'Minuman', quantity: 1, note: 'Tanpa es' });
  await e.handler()(cash);
  assert.equal(e.payloads[0].catatan, 'Sambal dipisah'); assert.equal(e.payloads[2].catatan, 'Tanpa es', 'Different menus keep separate notes');
  e = setup(); e.cart[0].note = ' '; await e.handler()(cash); assert.equal(e.payloads[0].catatan, null);
  e = setup({ failOrder: true }); await e.handler()(cash);
  assert.equal(e.cart[0].quantity, 1); assert.equal(e.closed, false);
  assert.equal(e.cart[0].note.trim(), 'Sambal dipisah', 'Failed menu keeps its note');
  const failedId = e.saved[1]; await e.handler()(cash);
  assert.equal(e.saved[2], failedId); assert.equal(e.cart.length, 0);
  e = setup({ failUpload: true }); await e.handler()(transfer);
  assert.equal(e.saved.length, 0); assert.equal(e.cart[0].quantity, 2); assert.equal(e.busy, false);
  e = setup({ delayUpload: true }); const handler = e.handler(); const first = handler(transfer);
  await handler(transfer); assert.equal(e.uploads, 1); assert.equal(e.busy, true);
  e.resume(); await first; assert.equal(e.saved.length, 2); assert.equal(e.busy, false);
  console.log('PASS: full success, partial failure, stable retry IDs, upload failure, concurrent submit lock');
})().catch(error => { console.error(error); process.exitCode = 1; });
