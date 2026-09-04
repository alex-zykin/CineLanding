import { SourceUrlError, normalizeSourceUrl } from '../../source-url.mjs';
import {
  StudioPricingError,
  createStudioPriceSummary,
} from '../../pricing.mjs';

/**
 * @typedef {'redesign' | 'from-scratch'} StudioProjectMode
 * @typedef {'en-US' | 'ru-RU'} StudioLocale
 *
 * @typedef {object} StudioProjectInput
 * @property {string} name
 * @property {StudioProjectMode} mode
 * @property {string | null} [sourceUrl]
 * @property {string} audience
 * @property {string} goal
 * @property {string} offer
 * @property {string} primaryCta
 * @property {StudioLocale[]} [locales]
 * @property {StudioLocale} [defaultLocale]
 *
 * @typedef {object} StudioRevision
 * @property {string} id
 * @property {number} sequence
 * @property {string} inputFingerprint
 * @property {'non-cryptographic-local-fingerprint'} integrity
 * @property {string} createdAt
 *
 * @typedef {object} StudioApproval
 * @property {'pending' | 'approved' | 'stale'} status
 * @property {string | null} revisionId
 * @property {string | null} approvedBy
 * @property {string | null} approvedAt
 * @property {'local-demo-revision-only'} scope
 *
 * @typedef {object} StudioProject
 * @property {1} schemaVersion
 * @property {'studio-project'} kind
 * @property {string} id
 * @property {Required<StudioProjectInput>} input
 * @property {StudioRevision} revision
 * @property {ReturnType<typeof conceptFromNormalizedInput>} concept
 * @property {StudioApproval} approval
 * @property {ReturnType<typeof createStudioPriceSummary>} pricing
 * @property {typeof LOCAL_DEMO_RUNTIME} runtime
 * @property {string} createdAt
 * @property {string} updatedAt
 */

export const LOCAL_DEMO_RUNTIME = Object.freeze({
  kind: 'local-demo',
  persistence: 'browser-local-json',
  network: 'disabled',
  authentication: 'not-connected',
  billing: 'not-connected',
  mediaProvider: 'none',
  deployment: 'not-connected',
  productionReady: false,
});

const SCHEMA_VERSION = 1;
const MAX_DOCUMENT_LENGTH = 256 * 1024;
const MODES = new Set(['redesign', 'from-scratch']);
const SUPPORTED_LOCALES = new Set(['en-US', 'ru-RU']);
const PROJECT_FIELDS = [
  'name',
  'mode',
  'sourceUrl',
  'audience',
  'goal',
  'offer',
  'primaryCta',
  'locales',
  'defaultLocale',
];
const TEXT_LIMITS = {
  name: 120,
  audience: 500,
  goal: 600,
  offer: 600,
  primaryCta: 160,
  approvedBy: 120,
};

/** A stable, machine-readable domain error intended for forms and tests. */
export class StudioDomainError extends Error {
  /** @param {string} code @param {string} [field] */
  constructor(code, field) {
    super(field ? `${code}: ${field}` : code);
    this.name = 'StudioDomainError';
    this.code = code;
    this.field = field ?? null;
  }
}

/** @param {unknown} value */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** @param {unknown} value @param {string} field @param {number} limit */
function normalizeText(value, field, limit) {
  if (typeof value !== 'string') {
    throw new StudioDomainError('invalid_field', field);
  }

  const normalized = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!normalized) throw new StudioDomainError('required_field', field);
  if (normalized.length > limit) throw new StudioDomainError('field_too_long', field);
  return normalized;
}

/** @param {unknown} value @param {string} field */
function normalizeTimestamp(value, field) {
  if (!(value instanceof Date) && typeof value !== 'string') {
    throw new StudioDomainError('invalid_timestamp', field);
  }
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new StudioDomainError('invalid_timestamp', field);
  }
  return date.toISOString();
}

/** @param {unknown} value */
function timestampFromOption(value) {
  return normalizeTimestamp(value ?? new Date(), 'now');
}

/** @param {unknown} value */
function normalizeLocales(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 4) {
    throw new StudioDomainError('invalid_locales', 'locales');
  }

  const locales = [];
  for (const locale of value) {
    if (typeof locale !== 'string' || !SUPPORTED_LOCALES.has(locale)) {
      throw new StudioDomainError('unsupported_locale', 'locales');
    }
    if (!locales.includes(locale)) locales.push(locale);
  }
  return locales;
}

/** @param {unknown} value */
function normalizeMode(value) {
  if (typeof value !== 'string' || !MODES.has(value)) {
    throw new StudioDomainError('invalid_mode', 'mode');
  }
  return value;
}

/** @param {unknown} value */
function normalizedSource(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new StudioDomainError('source_url_required', 'sourceUrl');
  }
  try {
    return normalizeSourceUrl(value).url;
  } catch (error) {
    if (error instanceof SourceUrlError) {
      throw new StudioDomainError(`source_url_${error.code}`, 'sourceUrl');
    }
    throw error;
  }
}

/**
 * Normalize the only user-editable project fields. Values remain plain text;
 * callers must render them as text, never as HTML.
 *
 * @param {unknown} value
 */
function normalizeProjectInput(value) {
  if (!isRecord(value)) throw new StudioDomainError('invalid_project_input');

  const mode = normalizeMode(value.mode);
  const locales = normalizeLocales(value.locales ?? ['en-US']);
  const defaultLocale = value.defaultLocale ?? locales[0];
  if (typeof defaultLocale !== 'string' || !locales.includes(defaultLocale)) {
    throw new StudioDomainError('invalid_default_locale', 'defaultLocale');
  }

  let sourceUrl = null;
  if (mode === 'redesign') {
    sourceUrl = normalizedSource(value.sourceUrl);
  } else if (
    value.sourceUrl !== undefined
    && value.sourceUrl !== null
    && (typeof value.sourceUrl !== 'string' || value.sourceUrl.trim())
  ) {
    throw new StudioDomainError('source_url_not_allowed', 'sourceUrl');
  }

  return {
    name: normalizeText(value.name, 'name', TEXT_LIMITS.name),
    mode,
    sourceUrl,
    audience: normalizeText(value.audience, 'audience', TEXT_LIMITS.audience),
    goal: normalizeText(value.goal, 'goal', TEXT_LIMITS.goal),
    offer: normalizeText(value.offer, 'offer', TEXT_LIMITS.offer),
    primaryCta: normalizeText(value.primaryCta, 'primaryCta', TEXT_LIMITS.primaryCta),
    locales,
    defaultLocale,
  };
}

/** @param {unknown} value */
function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/** Non-cryptographic deterministic identity for local-demo state only. @param {string} value */
function localFingerprint(value) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0');
}

/** @param {ReturnType<typeof normalizeProjectInput>} input */
function inputFingerprint(input) {
  return localFingerprint(stableStringify(input));
}

/** @param {ReturnType<typeof normalizeProjectInput>} input */
function conceptFromNormalizedInput(input) {
  const isRedesign = input.mode === 'redesign';
  const conceptBasis = {
    mode: input.mode,
    sourceUrl: input.sourceUrl,
    audience: input.audience,
    goal: input.goal,
    offer: input.offer,
    primaryCta: input.primaryCta,
    locales: input.locales,
    defaultLocale: input.defaultLocale,
  };

  return {
    id: `concept-${localFingerprint(stableStringify(conceptBasis))}`,
    kind: 'deterministic-local-concept',
    provider: 'none',
    narrativePattern: isRedesign ? 'transformation' : 'craft',
    sourceHandling: isRedesign ? 'reference-only-not-fetched' : 'not-applicable',
    sequence: isRedesign
      ? [
        {
          id: 'visible-problem',
          purpose: 'Establish the current state and the visitor need.',
          copyAnchor: input.goal,
        },
        {
          id: 'product-action',
          purpose: 'Show how the offer changes that state.',
          copyAnchor: input.offer,
        },
        {
          id: 'obvious-result',
          purpose: 'Settle on a legible outcome and one next action.',
          copyAnchor: input.primaryCta,
        },
      ]
      : [
        {
          id: 'audience-context',
          purpose: 'Open with the situation the intended audience recognises.',
          copyAnchor: input.audience,
        },
        {
          id: 'making-process',
          purpose: 'Reveal the offer through a clear making or delivery process.',
          copyAnchor: input.offer,
        },
        {
          id: 'finished-outcome',
          purpose: 'End with the useful result and one next action.',
          copyAnchor: input.primaryCta,
        },
      ],
    limitations: [
      'No source site was fetched.',
      'No media was generated.',
      'No production design or legal claim is implied.',
    ],
  };
}

/**
 * Produce the same local concept for the same normalized input.
 * This is a planning preview, not AI generation.
 *
 * @param {StudioProjectInput} input
 * @returns {ReturnType<typeof conceptFromNormalizedInput>}
 */
export function createConcept(input) {
  return conceptFromNormalizedInput(normalizeProjectInput(input));
}

/** @param {number} sequence @param {string} fingerprint @param {string} createdAt */
function makeRevision(sequence, fingerprint, createdAt) {
  return {
    id: `rev-${sequence}-${fingerprint}`,
    sequence,
    inputFingerprint: fingerprint,
    integrity: 'non-cryptographic-local-fingerprint',
    createdAt,
  };
}

function pendingApproval() {
  return {
    status: 'pending',
    revisionId: null,
    approvedBy: null,
    approvedAt: null,
    scope: 'local-demo-revision-only',
  };
}

function runtimeSnapshot() {
  return { ...LOCAL_DEMO_RUNTIME };
}

/** @param {unknown} selectedOptions @param {StudioLocale} defaultLocale */
function pricingSnapshot(selectedOptions, defaultLocale) {
  try {
    return createStudioPriceSummary(selectedOptions, defaultLocale);
  } catch (error) {
    if (error instanceof StudioPricingError) {
      throw new StudioDomainError(error.code, 'selectedOptions');
    }
    throw error;
  }
}

/**
 * @typedef {object} StudioOptions
 * @property {string | Date} [now]
 * @property {unknown} [selectedOptions]
 */

/**
 * Create a browser-local project in either redesign or from-scratch mode.
 *
 * @param {StudioProjectInput} input
 * @param {StudioOptions} [options]
 * @returns {StudioProject}
 */
export function createStudioProject(input, options = {}) {
  const normalizedInput = normalizeProjectInput(input);
  const fingerprint = inputFingerprint(normalizedInput);
  const now = timestampFromOption(options.now);

  return {
    schemaVersion: SCHEMA_VERSION,
    kind: 'studio-project',
    id: `local-project-${fingerprint}`,
    input: normalizedInput,
    revision: makeRevision(1, fingerprint, now),
    concept: conceptFromNormalizedInput(normalizedInput),
    approval: pendingApproval(),
    pricing: pricingSnapshot(options.selectedOptions, normalizedInput.defaultLocale),
    runtime: runtimeSnapshot(),
    createdAt: now,
    updatedAt: now,
  };
}

/** @param {unknown} value @param {string} field */
function normalizePositiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 100_000) {
    throw new StudioDomainError('invalid_integer', field);
  }
  return value;
}

/** @param {unknown} approval @param {string} currentRevisionId @param {boolean} revisionWasIntact */
function normalizeApproval(approval, currentRevisionId, revisionWasIntact) {
  if (!isRecord(approval)) return pendingApproval();

  const status = approval.status;
  const revisionId = typeof approval.revisionId === 'string' ? approval.revisionId : null;
  let approvedBy = null;
  let approvedAt = null;
  try {
    approvedBy = typeof approval.approvedBy === 'string'
      ? normalizeText(approval.approvedBy, 'approvedBy', TEXT_LIMITS.approvedBy)
      : null;
    approvedAt = approval.approvedAt
      ? normalizeTimestamp(approval.approvedAt, 'approvedAt')
      : null;
  } catch {
    return pendingApproval();
  }

  if (
    status === 'approved'
    && revisionWasIntact
    && revisionId === currentRevisionId
    && approvedBy
    && approvedAt
  ) {
    return {
      status: 'approved',
      revisionId,
      approvedBy,
      approvedAt,
      scope: 'local-demo-revision-only',
    };
  }

  if (
    status === 'stale'
    && revisionId
    && revisionId !== currentRevisionId
    && /^rev-[1-9]\d{0,5}-[a-f\d]{16}$/.test(revisionId)
    && approvedBy
    && approvedAt
  ) {
    return {
      status: 'stale',
      revisionId,
      approvedBy,
      approvedAt,
      scope: 'local-demo-revision-only',
    };
  }

  return pendingApproval();
}

/** Safely reconstruct a project instead of trusting derived persisted fields. @param {unknown} value */
function normalizeStoredProject(value) {
  if (!isRecord(value)) throw new StudioDomainError('invalid_document');
  if (value.schemaVersion !== SCHEMA_VERSION) {
    throw new StudioDomainError('unsupported_schema');
  }
  if (value.kind !== 'studio-project') throw new StudioDomainError('invalid_document_kind');

  const input = normalizeProjectInput(value.input);
  if (!isRecord(value.revision)) throw new StudioDomainError('invalid_revision');
  const sequence = normalizePositiveInteger(value.revision.sequence, 'revision.sequence');
  const fingerprint = inputFingerprint(input);
  const expectedRevisionId = `rev-${sequence}-${fingerprint}`;
  const revisionWasIntact = value.revision.id === expectedRevisionId
    && value.revision.inputFingerprint === fingerprint;
  const revisionCreatedAt = normalizeTimestamp(value.revision.createdAt, 'revision.createdAt');

  const id = typeof value.id === 'string' && /^local-project-[a-f\d]{16}$/.test(value.id)
    ? value.id
    : `local-project-${fingerprint}`;

  const selectedOptions = isRecord(value.pricing)
    ? value.pricing.selectedOptions
    : [];

  return {
    schemaVersion: SCHEMA_VERSION,
    kind: 'studio-project',
    id,
    input,
    revision: makeRevision(sequence, fingerprint, revisionCreatedAt),
    concept: conceptFromNormalizedInput(input),
    approval: normalizeApproval(value.approval, expectedRevisionId, revisionWasIntact),
    pricing: pricingSnapshot(selectedOptions, input.defaultLocale),
    runtime: runtimeSnapshot(),
    createdAt: normalizeTimestamp(value.createdAt, 'createdAt'),
    updatedAt: normalizeTimestamp(value.updatedAt, 'updatedAt'),
  };
}

/**
 * Apply a safe partial input update. A semantic change creates a new revision;
 * whitespace-only and duplicate-locale changes are no-ops.
 *
 * @param {unknown} project
 * @param {unknown} patch
 * @param {StudioOptions} [options]
 * @returns {StudioProject}
 */
export function editStudioProject(project, patch, options = {}) {
  const current = normalizeStoredProject(project);
  if (!isRecord(patch)) throw new StudioDomainError('invalid_patch');

  const merged = { ...current.input };
  for (const field of PROJECT_FIELDS) {
    if (Object.hasOwn(patch, field)) merged[field] = patch[field];
  }
  if (patch.mode === 'from-scratch') merged.sourceUrl = null;

  const input = normalizeProjectInput(merged);
  const fingerprint = inputFingerprint(input);
  if (fingerprint === current.revision.inputFingerprint) return current;

  const now = timestampFromOption(options.now);
  const approval = current.approval.status === 'approved'
    ? { ...current.approval, status: 'stale' }
    : current.approval;

  return {
    ...current,
    input,
    revision: makeRevision(current.revision.sequence + 1, fingerprint, now),
    concept: conceptFromNormalizedInput(input),
    approval,
    pricing: pricingSnapshot(
      input.defaultLocale === 'ru-RU' ? current.pricing.selectedOptions : [],
      input.defaultLocale,
    ),
    updatedAt: now,
  };
}

/**
 * Update the optional commercial scope without changing the approved design
 * revision. This is only an informational local quote; it creates no order.
 *
 * @param {unknown} project
 * @param {unknown} selectedOptions
 * @param {StudioOptions} [options]
 * @returns {StudioProject}
 */
export function updateStudioOptions(project, selectedOptions, options = {}) {
  const current = normalizeStoredProject(project);
  const pricing = pricingSnapshot(selectedOptions, current.input.defaultLocale);
  if (
    JSON.stringify(pricing.selectedOptions)
    === JSON.stringify(current.pricing.selectedOptions)
  ) {
    return current;
  }

  return {
    ...current,
    pricing,
    updatedAt: timestampFromOption(options.now),
  };
}

/**
 * Record a local-demo approval for exactly the current revision.
 * Production approval must be authenticated and server-side.
 *
 * @param {unknown} project
 * @param {{revisionId: string, approvedBy?: string, now?: string | Date}} approval
 * @returns {StudioProject}
 */
export function approveRevision(project, approval) {
  const current = normalizeStoredProject(project);
  if (!isRecord(approval) || approval.revisionId !== current.revision.id) {
    throw new StudioDomainError('revision_not_current', 'revisionId');
  }

  const approvedBy = normalizeText(
    approval.approvedBy ?? 'local-demo-user-confirmed',
    'approvedBy',
    TEXT_LIMITS.approvedBy,
  );
  const approvedAt = timestampFromOption(approval.now);

  return {
    ...current,
    approval: {
      status: 'approved',
      revisionId: current.revision.id,
      approvedBy,
      approvedAt,
      scope: 'local-demo-revision-only',
    },
    updatedAt: approvedAt,
  };
}

/**
 * Create deterministic metadata for a local preview. No media, payment, or
 * deployment is performed.
 *
 * @param {unknown} project
 * @param {StudioOptions} [options]
 */
export function createDemoBuild(project, options = {}) {
  const current = normalizeStoredProject(project);
  if (
    current.approval.status !== 'approved'
    || current.approval.revisionId !== current.revision.id
  ) {
    throw new StudioDomainError('approval_required');
  }

  const identity = localFingerprint(stableStringify({
    projectId: current.id,
    revisionId: current.revision.id,
    conceptId: current.concept.id,
    pricingCatalogVersion: current.pricing.catalogVersion,
    selectedOptions: current.pricing.selectedOptions,
  }));
  return {
    schemaVersion: SCHEMA_VERSION,
    id: `local-demo-build-${identity}`,
    kind: 'local-demo-build',
    status: 'ready-for-local-preview',
    projectId: current.id,
    revisionId: current.revision.id,
    conceptId: current.concept.id,
    generatedAt: timestampFromOption(options.now),
    provider: 'deterministic-local-mock',
    payment: 'not-connected',
    deployment: 'not-created',
    productionReady: false,
    pricingCatalogVersion: current.pricing.catalogVersion,
    selectedOptions: [...current.pricing.selectedOptions],
    totalAmountMinor: current.pricing.totalAmountMinor,
    limitations: [
      'This build is browser-local demo metadata.',
      'No KIE request, payment, upload, or deployment occurred.',
      'Production use requires the hosted authorization and durable job boundary.',
    ],
    preview: {
      headline: current.input.offer,
      primaryCta: current.input.primaryCta,
      sequence: current.concept.sequence,
    },
  };
}

/** @param {unknown} project */
export function encodeStudioProject(project) {
  return `${JSON.stringify(normalizeStoredProject(project), null, 2)}\n`;
}

/** @param {unknown} document */
export function decodeStudioProject(document) {
  if (typeof document !== 'string') throw new StudioDomainError('invalid_json');
  if (document.length > MAX_DOCUMENT_LENGTH) {
    throw new StudioDomainError('document_too_large');
  }

  let value;
  try {
    value = JSON.parse(document);
  } catch {
    throw new StudioDomainError('invalid_json');
  }
  return normalizeStoredProject(value);
}
