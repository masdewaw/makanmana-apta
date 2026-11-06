const { strict: assert } = require('node:assert');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpile(readFileSync('src/lib/form-validation.ts', 'utf8'), {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020
}), { exports: exportsObject });
const { isValidRupiah, validateFood, validateImage } = exportsObject;
for (const price of ['', ' ', 'abc', 'Infinity', 'NaN', '-1', '0', '10.5', Number.MAX_SAFE_INTEGER + 1]) {
  assert.equal(isValidRupiah(price), false, `Reject invalid price: ${price}`);
}
assert.equal(validateFood('  ', 15000), 'Nama makanan wajib diisi.');
assert.equal(validateFood('Nasi', '15000'), null);
assert.equal(isValidRupiah(-5000, true), true, 'Shared discount stays valid');
assert.equal(isValidRupiah(0, true), true);
assert.ok(validateImage(null));
assert.ok(validateImage({ type: 'text/html', size: 100 }));
assert.ok(validateImage({ type: 'image/jpeg', size: 0 }));
assert.ok(validateImage({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 }));
assert.equal(validateImage({ type: 'image/jpeg', size: 1024 }), null);
console.log('PASS: required text, whole rupiah, signed shared costs, image type and size');
