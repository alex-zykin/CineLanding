import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LOCAL_DEMO_RUNTIME,
  StudioDomainError,
  approveRevision,
  createConcept,
  createDemoBuild,
  createStudioProject,
  decodeStudioProject,
  editStudioProject,
  encodeStudioProject,
  updateStudioOptions,
} from './studio-domain.mjs';

const redesignInput = {
  name: 'TOSS Service',
  mode: 'redesign',
  sourceUrl: ' HTTPS://WWW.Example.com/old-site ',
  audience: 'Owners of sports grounds',
  goal: 'Explain the result before listing equipment',
  offer: 'A project-specific landing page',
  primaryCta: 'Request a proposal',
  locales: ['ru-RU', 'en-US'],
  defaultLocale: 'ru-RU',
};

const scratchInput = {
  name: 'North Workshop',
  mode: 'from-scratch',
  audience: 'Apartment owners and interior designers',
  goal: 'Turn a custom furniture inquiry into a clear brief',
  offer: 'Custom wooden furniture from sketch to installation',
  primaryCta: 'Discuss a project',
  locales: ['en-US'],
  defaultLocale: 'en-US',
};

test('creates honest local-demo projects for redesign and from-scratch modes', () => {
  const redesign = createStudioProject(redesignInput, {
    now: '2026-09-04T08:00:00.000Z',
  });
  const fromScratch = createStudioProject(scratchInput, {
    now: '2026-09-04T08:00:00.000Z',
  });

  assert.equal(redesign.runtime.kind, 'local-demo');
  assert.equal(redesign.runtime.persistence, 'browser-local-json');
  assert.deepEqual(redesign.runtime, LOCAL_DEMO_RUNTIME);
  assert.equal(redesign.input.sourceUrl, 'https://www.example.com/old-site');
  assert.equal(redesign.concept.sourceHandling, 'reference-only-not-fetched');
  assert.equal(redesign.approval.status, 'pending');
  assert.equal(redesign.pricing.totalAmountMinor, 990_000);
  assert.deepEqual(redesign.pricing.selectedOptions, []);

  assert.equal(fromScratch.input.sourceUrl, null);
  assert.equal(fromScratch.concept.sourceHandling, 'not-applicable');
  assert.equal(fromScratch.revision.sequence, 1);
});

test('stores optional Russia launch work outside the concept revision', () => {
  const created = createStudioProject(redesignInput, {
    now: '2026-09-04T08:00:00.000Z',
    selectedOptions: ['prodamus-setup', 'privacy-readiness'],
  });
  const approved = approveRevision(created, {
    revisionId: created.revision.id,
    now: '2026-09-04T08:10:00.000Z',
  });
  const changed = updateStudioOptions(
    approved,
    ['privacy-readiness'],
    { now: '2026-09-04T08:20:00.000Z' },
  );

  assert.deepEqual(created.pricing.selectedOptions, ['privacy-readiness', 'prodamus-setup']);
  assert.equal(created.pricing.totalAmountMinor, 1_388_000);
  assert.deepEqual(changed.pricing.selectedOptions, ['privacy-readiness']);
  assert.equal(changed.pricing.totalAmountMinor, 1_189_000);
  assert.equal(changed.revision.id, approved.revision.id);
  assert.equal(changed.approval.status, 'approved');
  assert.equal(changed.updatedAt, '2026-09-04T08:20:00.000Z');
});

test('Russian launch options cannot remain when website output changes to English', () => {
  const created = createStudioProject(redesignInput, {
    selectedOptions: ['privacy-readiness'],
  });
  const edited = editStudioProject(created, {
    locales: ['en-US'],
    defaultLocale: 'en-US',
  });

  assert.equal(edited.input.defaultLocale, 'en-US');
  assert.deepEqual(edited.pricing.selectedOptions, []);
  assert.equal(edited.pricing.totalAmountMinor, 990_000);
});

test('requires a public source URL only in redesign mode', () => {
  assert.throws(
    () => createStudioProject({ ...redesignInput, sourceUrl: '' }),
    (error) => error instanceof StudioDomainError && error.code === 'source_url_required',
  );
  assert.throws(
    () => createStudioProject({ ...redesignInput, sourceUrl: 'http://127.0.0.1' }),
    (error) => error instanceof StudioDomainError && error.code === 'source_url_private_host',
  );
  assert.throws(
    () => createStudioProject({ ...scratchInput, sourceUrl: 'https://example.com' }),
    (error) => error instanceof StudioDomainError && error.code === 'source_url_not_allowed',
  );
});

test('creates a deterministic concept from normalized project input', () => {
  const first = createConcept(redesignInput);
  const second = createConcept({
    ...redesignInput,
    name: '  TOSS   Service  ',
    audience: ' Owners of sports grounds ',
    locales: ['ru-RU', 'en-US', 'ru-RU'],
  });
  const changed = createConcept({ ...redesignInput, offer: 'A different offer' });

  assert.deepEqual(first, second);
  assert.notEqual(first.id, changed.id);
  assert.equal(first.kind, 'deterministic-local-concept');
  assert.equal(first.provider, 'none');
});

test('approves only the current revision and creates a demo build only after approval', () => {
  const project = createStudioProject(scratchInput, {
    now: '2026-09-04T08:00:00.000Z',
  });

  assert.throws(
    () => approveRevision(project, { revisionId: 'rev-999-invalid' }),
    (error) => error instanceof StudioDomainError && error.code === 'revision_not_current',
  );
  assert.throws(
    () => createDemoBuild(project),
    (error) => error instanceof StudioDomainError && error.code === 'approval_required',
  );

  const approved = approveRevision(project, {
    revisionId: project.revision.id,
    approvedBy: 'project-owner',
    now: '2026-09-04T08:10:00.000Z',
  });
  const build = createDemoBuild(approved, {
    now: '2026-09-04T08:11:00.000Z',
  });

  assert.equal(approved.approval.status, 'approved');
  assert.equal(approved.approval.revisionId, approved.revision.id);
  assert.equal(build.kind, 'local-demo-build');
  assert.equal(build.status, 'ready-for-local-preview');
  assert.equal(build.revisionId, approved.revision.id);
  assert.equal(build.provider, 'deterministic-local-mock');
  assert.equal(build.payment, 'not-connected');
  assert.equal(build.deployment, 'not-created');
  assert.equal(build.productionReady, false);
  assert.equal(build.pricingCatalogVersion, approved.pricing.catalogVersion);
  assert.deepEqual(build.selectedOptions, approved.pricing.selectedOptions);
  assert.equal(build.totalAmountMinor, approved.pricing.totalAmountMinor);
});

test('a semantic edit creates a new revision and invalidates approval', () => {
  const created = createStudioProject(redesignInput, {
    now: '2026-09-04T08:00:00.000Z',
  });
  const approved = approveRevision(created, {
    revisionId: created.revision.id,
    now: '2026-09-04T08:10:00.000Z',
  });
  const edited = editStudioProject(
    approved,
    { goal: 'Show the visible transformation during scroll' },
    { now: '2026-09-04T08:20:00.000Z' },
  );

  assert.equal(edited.revision.sequence, 2);
  assert.notEqual(edited.revision.id, approved.revision.id);
  assert.equal(edited.approval.status, 'stale');
  assert.equal(edited.approval.revisionId, approved.revision.id);
  assert.throws(
    () => createDemoBuild(edited),
    (error) => error instanceof StudioDomainError && error.code === 'approval_required',
  );
});

test('a normalized no-op edit preserves the revision and approval', () => {
  const created = createStudioProject(scratchInput);
  const approved = approveRevision(created, {
    revisionId: created.revision.id,
    now: '2026-09-04T08:10:00.000Z',
  });
  const unchanged = editStudioProject(approved, {
    name: '  North   Workshop ',
    locales: ['en-US', 'en-US'],
  });

  assert.equal(unchanged.revision.id, approved.revision.id);
  assert.equal(unchanged.approval.status, 'approved');
});

test('JSON round-trip rebuilds deterministic fields and drops unknown input', () => {
  const created = createStudioProject(redesignInput, {
    now: '2026-09-04T08:00:00.000Z',
  });
  const approved = approveRevision(created, {
    revisionId: created.revision.id,
    approvedBy: 'owner',
    now: '2026-09-04T08:10:00.000Z',
  });
  const payload = JSON.parse(encodeStudioProject(approved));

  payload.concept = { id: 'forged', html: '<script>alert(1)</script>' };
  payload.runtime = { kind: 'production', billing: 'connected' };
  payload.pricing = {
    selectedOptions: ['privacy-readiness'],
    totalAmountMinor: 1,
    checkout: 'connected',
  };
  payload.unknown = { enabled: true };
  payload.__protoPollutionAttempt = { __proto__: { polluted: true } };

  const restored = decodeStudioProject(JSON.stringify(payload));

  assert.equal(restored.concept.id, approved.concept.id);
  assert.deepEqual(restored.runtime, LOCAL_DEMO_RUNTIME);
  assert.equal(restored.pricing.totalAmountMinor, 1_189_000);
  assert.equal(restored.pricing.checkout, 'not-connected');
  assert.equal(restored.approval.status, 'approved');
  assert.equal(Object.hasOwn(restored, 'unknown'), false);
  assert.equal({}.polluted, undefined);
  assert.deepEqual(decodeStudioProject(encodeStudioProject(restored)), restored);
});

test('decode invalidates approval that does not match the reconstructed revision', () => {
  const project = createStudioProject(scratchInput);
  const payload = JSON.parse(encodeStudioProject(project));

  payload.approval = {
    status: 'approved',
    revisionId: 'rev-999-forged',
    approvedBy: 'attacker',
    approvedAt: '2026-09-04T08:10:00.000Z',
  };

  const restored = decodeStudioProject(JSON.stringify(payload));

  assert.equal(restored.approval.status, 'pending');
  assert.equal(restored.approval.revisionId, null);
});

test('decode rejects malformed, oversized, and unsupported documents', () => {
  assert.throws(
    () => decodeStudioProject('{'),
    (error) => error instanceof StudioDomainError && error.code === 'invalid_json',
  );
  assert.throws(
    () => decodeStudioProject(JSON.stringify({ schemaVersion: 999 })),
    (error) => error instanceof StudioDomainError && error.code === 'unsupported_schema',
  );
  assert.throws(
    () => decodeStudioProject(' '.repeat(262_145)),
    (error) => error instanceof StudioDomainError && error.code === 'document_too_large',
  );
});
