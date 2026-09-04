import assert from 'node:assert/strict';
import test from 'node:test';

import {
  STUDIO_PRICING_CATALOG,
  StudioPricingError,
  createStudioPriceSummary,
  formatRubleAmount,
} from './pricing.mjs';

test('base website price is 9,900 RUB with no options selected', () => {
  const summary = createStudioPriceSummary([], 'en-US');

  assert.equal(summary.catalogVersion, 'ru-rub-2026-09-v1');
  assert.equal(summary.currency, 'RUB');
  assert.equal(summary.baseAmountMinor, 990_000);
  assert.deepEqual(summary.selectedOptions, []);
  assert.deepEqual(summary.lines, [
    { code: 'landing-base', amountMinor: 990_000 },
  ]);
  assert.equal(summary.totalAmountMinor, 990_000);
  assert.equal(summary.checkout, 'not-connected');
  assert.equal(summary.bindingOrder, false);
});

test('Russian projects can add either or both independent options', () => {
  const privacy = createStudioPriceSummary(['privacy-readiness'], 'ru-RU');
  const both = createStudioPriceSummary(
    ['prodamus-setup', 'privacy-readiness', 'prodamus-setup'],
    'ru-RU',
  );

  assert.equal(privacy.totalAmountMinor, 1_189_000);
  assert.deepEqual(both.selectedOptions, ['privacy-readiness', 'prodamus-setup']);
  assert.equal(both.totalAmountMinor, 1_388_000);
  assert.equal(STUDIO_PRICING_CATALOG.options['privacy-readiness'].amountMinor, 199_000);
  assert.equal(STUDIO_PRICING_CATALOG.options['prodamus-setup'].amountMinor, 199_000);
});

test('paid Russia launch options are rejected for non-Russian output', () => {
  assert.throws(
    () => createStudioPriceSummary(['privacy-readiness'], 'en-US'),
    (error) => error instanceof StudioPricingError
      && error.code === 'business_options_require_ru_output',
  );
});

test('unknown option codes are rejected instead of affecting the total', () => {
  assert.throws(
    () => createStudioPriceSummary(['invented-option'], 'ru-RU'),
    (error) => error instanceof StudioPricingError && error.code === 'unknown_option',
  );
});

test('Ruble formatter uses the requested display locale', () => {
  assert.equal(formatRubleAmount(990_000, 'en'), '9,900 ₽');
  assert.match(formatRubleAmount(1_388_000, 'ru'), /^13\D880 ₽$/u);
});
