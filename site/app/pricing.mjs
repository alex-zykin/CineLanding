export class StudioPricingError extends Error {
  /** @param {'invalid_options' | 'unknown_option' | 'business_options_require_ru_output' | 'invalid_amount'} code */
  constructor(code) {
    super(code);
    this.name = 'StudioPricingError';
    this.code = code;
  }
}

export const STUDIO_OPTION_ORDER = Object.freeze([
  'privacy-readiness',
  'prodamus-setup',
]);

export const STUDIO_PRICING_CATALOG = Object.freeze({
  version: 'ru-rub-2026-09-v1',
  currency: 'RUB',
  base: Object.freeze({
    code: 'landing-base',
    amountMinor: 990_000,
  }),
  options: Object.freeze({
    'privacy-readiness': Object.freeze({
      code: 'privacy-readiness',
      amountMinor: 199_000,
      availableForDefaultLocales: Object.freeze(['ru-RU']),
    }),
    'prodamus-setup': Object.freeze({
      code: 'prodamus-setup',
      amountMinor: 199_000,
      availableForDefaultLocales: Object.freeze(['ru-RU']),
    }),
  }),
});

/** @param {unknown} value */
function normalizeOptionCodes(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new StudioPricingError('invalid_options');

  const selected = new Set();
  for (const code of value) {
    if (typeof code !== 'string' || !STUDIO_OPTION_ORDER.includes(code)) {
      throw new StudioPricingError('unknown_option');
    }
    selected.add(code);
  }

  return STUDIO_OPTION_ORDER.filter((code) => selected.has(code));
}

/**
 * Return an informational, browser-local quote. A production order must rebuild
 * the same lines on the server from option codes and the active catalogue.
 *
 * @param {unknown} selectedOptions
 * @param {unknown} defaultLocale
 */
export function createStudioPriceSummary(selectedOptions, defaultLocale) {
  const normalizedOptions = normalizeOptionCodes(selectedOptions);
  if (defaultLocale !== 'ru-RU' && normalizedOptions.length > 0) {
    throw new StudioPricingError('business_options_require_ru_output');
  }

  const lines = [
    {
      code: STUDIO_PRICING_CATALOG.base.code,
      amountMinor: STUDIO_PRICING_CATALOG.base.amountMinor,
    },
    ...normalizedOptions.map((code) => ({
      code,
      amountMinor: STUDIO_PRICING_CATALOG.options[code].amountMinor,
    })),
  ];

  return {
    kind: 'local-demo-price-summary',
    catalogVersion: STUDIO_PRICING_CATALOG.version,
    currency: STUDIO_PRICING_CATALOG.currency,
    selectedOptions: normalizedOptions,
    baseAmountMinor: STUDIO_PRICING_CATALOG.base.amountMinor,
    lines,
    totalAmountMinor: lines.reduce((total, line) => total + line.amountMinor, 0),
    checkout: 'not-connected',
    bindingOrder: false,
  };
}

/** @param {unknown} amountMinor @param {'en' | 'ru'} locale */
export function formatRubleAmount(amountMinor, locale) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0 || amountMinor % 100 !== 0) {
    throw new StudioPricingError('invalid_amount');
  }
  const formatter = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    maximumFractionDigits: 0,
  });
  return `${formatter.format(amountMinor / 100)} ₽`;
}
