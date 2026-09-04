import assert from 'node:assert/strict';
import test from 'node:test';

import {
  approveRevision,
  createDemoBuild,
  createStudioProject,
  editStudioProject,
  updateStudioOptions,
} from './studio-domain.mjs';
import {
  currentDemoBuild,
  readStudioProjects,
  saveDemoBuild,
  saveStudioProject,
  StudioStorageError,
} from './studio-storage.ts';

const input = {
  name: 'Local test project',
  mode: 'redesign',
  sourceUrl: 'https://example.com',
  audience: 'People evaluating a clear offer',
  goal: 'Replace an unclear first impression',
  offer: 'A focused landing page with a scroll-directed story',
  primaryCta: 'Start the project',
  locales: ['en-US'],
  defaultLocale: 'en-US',
};

function installLocalStorage() {
  const values = new Map();
  globalThis.window = {
    localStorage: {
      getItem(key) { return values.get(key) ?? null; },
      setItem(key, value) { values.set(key, String(value)); },
    },
    dispatchEvent() { return true; },
  };
  globalThis.CustomEvent = class CustomEvent {
    constructor(type) { this.type = type; }
  };
  return values;
}

function isStorageError(code) {
  return (error) => error instanceof StudioStorageError && error.code === code;
}

test('does not silently overwrite an identical local project', () => {
  installLocalStorage();
  const project = createStudioProject(input, { now: '2026-09-04T08:00:00Z' });

  saveStudioProject(project);

  assert.equal(readStudioProjects().length, 1);
  assert.throws(() => saveStudioProject(project), isStorageError('duplicate_project'));
});

test('rejects a stale tab update after another tab changes the project', () => {
  installLocalStorage();
  const original = createStudioProject(input, { now: '2026-09-04T08:00:00Z' });
  saveStudioProject(original);

  const edited = editStudioProject(original, { offer: 'A newer saved offer' }, { now: '2026-09-04T08:01:00Z' });
  saveStudioProject(edited, original);

  const staleApproval = approveRevision(original, {
    revisionId: original.revision.id,
    now: '2026-09-04T08:02:00Z',
  });
  assert.throws(
    () => saveStudioProject(staleApproval, original),
    isStorageError('project_conflict'),
  );
  assert.equal(readStudioProjects()[0].revision.id, edited.revision.id);
});

test('accepts only a build for the current approved revision', () => {
  const values = installLocalStorage();
  const project = createStudioProject(input, { now: '2026-09-04T08:00:00Z' });
  saveStudioProject(project);
  const approved = approveRevision(project, {
    revisionId: project.revision.id,
    now: '2026-09-04T08:01:00Z',
  });
  saveStudioProject(approved, project);
  const build = createDemoBuild(approved, { now: '2026-09-04T08:02:00Z' });
  saveDemoBuild(build, approved);

  assert.equal(currentDemoBuild(approved)?.id, build.id);

  const edited = editStudioProject(approved, { goal: 'A revised goal' }, { now: '2026-09-04T08:03:00Z' });
  saveStudioProject(edited, approved);
  assert.equal(currentDemoBuild(edited), null);

  const buildKey = [...values.keys()].find((key) => key.includes('builds'));
  const tampered = JSON.parse(values.get(buildKey));
  tampered[0].payment = 'connected';
  values.set(buildKey, JSON.stringify(tampered));
  assert.equal(currentDemoBuild(approved), null);
});

test('fails closed when browser storage is unavailable', () => {
  globalThis.window = {
    get localStorage() { throw new Error('blocked'); },
    dispatchEvent() { return true; },
  };
  const project = createStudioProject(input, { now: '2026-09-04T08:00:00Z' });

  assert.deepEqual(readStudioProjects(), []);
  assert.throws(() => saveStudioProject(project), isStorageError('storage_unavailable'));
});

test('a changed commercial scope keeps approval but invalidates an older build', () => {
  installLocalStorage();
  const russianInput = {
    ...input,
    locales: ['ru-RU'],
    defaultLocale: 'ru-RU',
  };
  const project = createStudioProject(russianInput, { now: '2026-09-04T08:00:00Z' });
  saveStudioProject(project);
  const approved = approveRevision(project, {
    revisionId: project.revision.id,
    now: '2026-09-04T08:01:00Z',
  });
  saveStudioProject(approved, project);
  const build = createDemoBuild(approved, { now: '2026-09-04T08:02:00Z' });
  saveDemoBuild(build, approved);

  const repriced = updateStudioOptions(
    approved,
    ['privacy-readiness'],
    { now: '2026-09-04T08:03:00Z' },
  );
  saveStudioProject(repriced, approved);

  assert.equal(repriced.approval.status, 'approved');
  assert.equal(currentDemoBuild(repriced), null);
});
