const { strict: assert } = require('node:assert');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpile(readFileSync(path, 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }), { exports, setTimeout, clearTimeout, require: path => { if (path.endsWith('order-notes')) return load('src/lib/order-notes.ts'); throw Error(`Unexpected import ${path}`); }, ...globals });
  return exports;
}
const saved = new Map();
const storage = { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) };
const cart = load('src/lib/cart-storage.ts', { localStorage: storage });
const id = '01234567-89ab-4cde-8012-3456789abcde';
const items = [{ id: 'menu', food_name: 'Nasi', price: 15000, category: 'Makanan', quantity: 2, note: 'Sambal dipisah' }];
assert.equal(cart.writeCart('alice', items, { menu: [id] }), true);
assert.equal(cart.readCart('alice').items[0].quantity, 2);
assert.equal(cart.readCart('alice').items[0].note, 'Sambal dipisah', 'Menu note survives refresh');
assert.equal(cart.readCart('alice').orderIds.menu[0], id, 'Retry ID survives refresh');
assert.equal(cart.readCart('bob').items.length, 0, 'Carts are isolated between accounts');
saved.set(cart.cartKey('bob'), '{broken'); assert.equal(cart.readCart('bob').items.length, 0);
saved.set(cart.cartKey('bob'), JSON.stringify({ items: [{ ...items[0], quantity: -1 }] })); assert.equal(cart.readCart('bob').items.length, 0);
cart.writeCart('alice', [], {}); assert.equal(cart.readCart('alice').items.length, 0);
const denied = load('src/lib/cart-storage.ts', { localStorage: { getItem() { throw Error('denied'); }, setItem() { throw Error('full'); } } });
assert.equal(denied.readCart('alice').items.length, 0); assert.equal(denied.writeCart('alice', items, {}), false);
const { withTimeout, requireData } = load('src/lib/errors.ts');
assert.throws(() => requireData({ data: null, error: Error('denied') }), /denied/);
const proof = load('src/api/paymentProofs.ts', { require: () => ({ supabase: {} }) });
assert.equal(proof.proofPath('https://example.supabase.co/storage/v1/object/public/payment-proofs/alice/photo.jpg'), 'alice/photo.jpg');
assert.equal(proof.proofPath('alice/photo.jpg'), 'alice/photo.jpg');
assert.throws(() => proof.proofPath('alice/../photo.jpg'));
(async () => {
  assert.equal(await withTimeout(Promise.resolve('profile'), 10), 'profile');
  await assert.rejects(withTimeout(new Promise(() => {}), 10), /terlalu lama/);
  await assert.rejects(withTimeout(Promise.reject(Error('profile denied')), 10), /profile denied/);
  console.log('PASS: per-account carts, persisted retry IDs, corrupt/quota recovery, profile timeout, legacy proof references');
})().catch(error => { console.error(error); process.exitCode = 1; });
