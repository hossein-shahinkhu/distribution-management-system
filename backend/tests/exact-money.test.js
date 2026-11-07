const { cents, amount, decimalAmount } = require('../src/utils/money');

test.each(['0.00', '0.01', '-0.01', '348.30', '-7.25', '90999999999999.09',
  '-91999999999999.08', '123456789012345678901234567890.99'])('exact decimal round trip: %s', value => {
  expect(decimalAmount(cents(value))).toBe(value);
  expect(JSON.parse(JSON.stringify({ value: decimalAmount(cents(value)) })).value).toBe(value);
});
test('91 maximum valid transactions never pass through Number', () => {
  expect(decimalAmount(cents('999999999999.99') * 91n)).toBe('90999999999999.09');
});
test('zero is canonical; two digits are always retained', () => {
  expect(decimalAmount(cents('-0.00'))).toBe('0.00');
  expect(decimalAmount(cents('1'))).toBe('1.00');
  expect(decimalAmount(cents('-1.2'))).toBe('-1.20');
});
test('legacy numeric serializer retains its existing type and behavior', () => {
  expect(amount(123n)).toBe(1.23);
  expect(typeof amount(123n)).toBe('number');
});
test.each([0, '123', null, undefined])('exact serializer rejects non-BigInt input %s', value => {
  expect(() => decimalAmount(value)).toThrow('Integer hundredths required');
});
