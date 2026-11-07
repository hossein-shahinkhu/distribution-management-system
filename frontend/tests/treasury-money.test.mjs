import test from 'node:test';
import assert from 'node:assert/strict';
import { formatExactMoney, isNegativeExactMoney, formatMoney } from '../src/utils/financial.js';

const cases = [
  ['0.00', '۰٫۰۰ تومان'], ['-0.00', '۰٫۰۰ تومان'], ['0.01', '۰٫۰۱ تومان'],
  ['-0.01', '−۰٫۰۱ تومان'], ['348.30', '۳۴۸٫۳۰ تومان'],
  ['90999999999999.09', '۹۰٬۹۹۹٬۹۹۹٬۹۹۹٬۹۹۹٫۰۹ تومان'],
  ['-91999999999999.08', '−۹۱٬۹۹۹٬۹۹۹٬۹۹۹٬۹۹۹٫۰۸ تومان'],
  ['123456789012345678901234567890.99', '۱۲۳٬۴۵۶٬۷۸۹٬۰۱۲٬۳۴۵٬۶۷۸٬۹۰۱٬۲۳۴٬۵۶۷٬۸۹۰٫۹۹ تومان'],
];
for (const [value, expected] of cases) test(`exact Persian display ${value}`, () => {
  assert.equal(formatExactMoney(value), expected);
});
test('sign detection is exact for huge negative values and negative zero', () => {
  assert.equal(isNegativeExactMoney('-91999999999999.08'), true);
  assert.equal(isNegativeExactMoney('-0.00'), false);
  assert.equal(isNegativeExactMoney('90999999999999.09'), false);
});
for (const invalid of [undefined, null, 348, '1e20', '1.234', 'NaN', '']) test(`invalid value ${invalid} is not silently rounded`, () => {
  assert.equal(formatExactMoney(invalid), '—');
});
test('other financial displays retain their existing formatter', () => {
  assert.equal(formatMoney(348), new Intl.NumberFormat('fa-IR').format(348) + ' تومان');
});
