'use client';

import {
  createDemoBuild,
  createStudioProject,
  decodeStudioProject,
  encodeStudioProject,
} from './studio-domain.mjs';

export type StudioProject = ReturnType<typeof createStudioProject>;
export type DemoBuild = ReturnType<typeof createDemoBuild>;

const PROJECTS_KEY = 'cinelanding-studio-projects-v1';
const BUILDS_KEY = 'cinelanding-studio-builds-v1';
const MAX_LOCAL_DOCUMENT_LENGTH = 2 * 1024 * 1024;
const MAX_LOCAL_PROJECTS = 25;

export class StudioStorageError extends Error {
  code: 'duplicate_project' | 'project_conflict' | 'invalid_demo_build' | 'storage_unavailable';

  constructor(code: StudioStorageError['code']) {
    super(code);
    this.name = 'StudioStorageError';
    this.code = code;
  }
}

function localStorageOrNull(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readJsonArray(key: string): unknown[] {
  try {
    const stored = localStorageOrNull()?.getItem(key);
    if (!stored || stored.length > MAX_LOCAL_DOCUMENT_LENGTH) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray(key: string, value: unknown[]) {
  const storage = localStorageOrNull();
  if (!storage) throw new StudioStorageError('storage_unavailable');
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    throw new StudioStorageError('storage_unavailable');
  }
}

function dispatchChanged() {
  try {
    window.dispatchEvent(new CustomEvent('cinelanding:projects-changed'));
  } catch {
    // Persistence succeeded. A restricted event environment can refresh on navigation.
  }
}

export function readStudioProjects(): StudioProject[] {
  return readJsonArray(PROJECTS_KEY)
    .flatMap((item) => {
      if (typeof item !== 'string') return [];
      try {
        return [decodeStudioProject(item) as StudioProject];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function saveStudioProject(
  project: StudioProject,
  expectedProject: StudioProject | null = null,
): StudioProject {
  const normalized = decodeStudioProject(encodeStudioProject(project)) as StudioProject;
  const existing = readStudioProject(normalized.id);

  if (!expectedProject && existing) {
    throw new StudioStorageError('duplicate_project');
  }
  if (expectedProject) {
    const expected = decodeStudioProject(encodeStudioProject(expectedProject)) as StudioProject;
    if (
      !existing
      || existing.id !== expected.id
      || encodeStudioProject(existing) !== encodeStudioProject(expected)
    ) {
      throw new StudioStorageError('project_conflict');
    }
  }

  const projects = readStudioProjects()
    .filter((item) => item.id !== normalized.id)
    .slice(0, MAX_LOCAL_PROJECTS - 1);
  writeJsonArray(
    PROJECTS_KEY,
    [encodeStudioProject(normalized), ...projects.map(encodeStudioProject)],
  );
  dispatchChanged();
  return normalized;
}

export function readStudioProject(projectId: string): StudioProject | null {
  return readStudioProjects().find((project) => project.id === projectId) ?? null;
}

function isDemoBuild(value: unknown): value is DemoBuild {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DemoBuild>;
  return candidate.schemaVersion === 1
    && candidate.kind === 'local-demo-build'
    && candidate.status === 'ready-for-local-preview'
    && candidate.productionReady === false
    && typeof candidate.id === 'string'
    && typeof candidate.projectId === 'string'
    && typeof candidate.revisionId === 'string'
    && typeof candidate.conceptId === 'string'
    && typeof candidate.generatedAt === 'string'
    && !Number.isNaN(Date.parse(candidate.generatedAt))
    && candidate.provider === 'deterministic-local-mock'
    && candidate.payment === 'not-connected'
    && candidate.deployment === 'not-created'
    && typeof candidate.pricingCatalogVersion === 'string'
    && Array.isArray(candidate.selectedOptions)
    && candidate.selectedOptions.every((option) => typeof option === 'string')
    && Number.isSafeInteger(candidate.totalAmountMinor);
}

export function readDemoBuild(projectId: string): DemoBuild | null {
  const match = readJsonArray(BUILDS_KEY).find((item) => {
    return isDemoBuild(item) && item.projectId === projectId;
  });
  return isDemoBuild(match) ? match : null;
}

export function saveDemoBuild(build: DemoBuild, expectedProject: StudioProject): DemoBuild {
  if (!isDemoBuild(build) || !buildMatchesProject(build, expectedProject)) {
    throw new StudioStorageError('invalid_demo_build');
  }
  const storedProject = readStudioProject(expectedProject.id);
  if (
    !storedProject
    || encodeStudioProject(storedProject) !== encodeStudioProject(expectedProject)
  ) {
    throw new StudioStorageError('project_conflict');
  }
  const builds = readJsonArray(BUILDS_KEY)
    .filter((item) => isDemoBuild(item) && item.projectId !== build.projectId)
    .slice(0, MAX_LOCAL_PROJECTS - 1);
  writeJsonArray(BUILDS_KEY, [build, ...builds]);
  dispatchChanged();
  return build;
}

export function currentDemoBuild(project: StudioProject): DemoBuild | null {
  const build = readDemoBuild(project.id);
  return build && buildMatchesProject(build, project) ? build : null;
}

function buildMatchesProject(build: DemoBuild, project: StudioProject) {
  return project.approval.status === 'approved'
    && project.approval.revisionId === project.revision.id
    && build.projectId === project.id
    && build.revisionId === project.revision.id
    && build.conceptId === project.concept.id
    && build.pricingCatalogVersion === project.pricing.catalogVersion
    && build.totalAmountMinor === project.pricing.totalAmountMinor
    && JSON.stringify(build.selectedOptions) === JSON.stringify(project.pricing.selectedOptions);
}
