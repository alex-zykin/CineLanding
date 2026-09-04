'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useStudioLocale } from '../_components/studio-shell';
import {
  currentDemoBuild,
  readStudioProjects,
  type StudioProject,
} from '../_lib/studio-storage';

const copy = {
  en: {
    kicker: 'Workspace / Browser-local',
    title: <>Your project<br />cutting room.</>,
    body: 'Start with a public website or a clean brief. Each project moves through one reviewable concept before any paid production.',
    create: 'New project',
    emptyKicker: 'No projects yet',
    emptyTitle: 'Choose how to begin.',
    modes: {
      redesign: {
        label: '01 / Existing website',
        title: 'Redesign a site',
        body: 'Bring a public URL, keep the useful evidence, and replace the old presentation with a clearer story.',
      },
      scratch: {
        label: '02 / New offer',
        title: 'Create from scratch',
        body: 'Begin with the offer, audience, desired action, and language. No old layout required.',
      },
    },
    statuses: {
      ready: 'Demo preview ready',
      approved: 'Concept approved',
      stale: 'Review again',
      concept: 'Concept ready',
    },
    modeLabels: { redesign: 'Redesign', 'from-scratch': 'From scratch' },
    updated: 'Updated',
    revision: 'Cut',
    actions: { ready: 'Open result', approved: 'Run demo build', stale: 'Review changes', concept: 'Review concept' },
  },
  ru: {
    kicker: 'Кабинет / Данные в браузере',
    title: <>Монтажная<br />ваших проектов.</>,
    body: 'Начните с действующего сайта или чистого брифа. Каждый проект проходит через один понятный концепт до любых платных работ.',
    create: 'Новый проект',
    emptyKicker: 'Проектов пока нет',
    emptyTitle: 'Выберите, с чего начать.',
    modes: {
      redesign: {
        label: '01 / Действующий сайт',
        title: 'Переделать сайт',
        body: 'Добавьте публичный URL, сохраните полезные факты и замените старую подачу понятной историей.',
      },
      scratch: {
        label: '02 / Новое предложение',
        title: 'Создать с нуля',
        body: 'Начните с предложения, аудитории, целевого действия и языка. Старый макет не нужен.',
      },
    },
    statuses: {
      ready: 'Демо-превью готово',
      approved: 'Концепт утверждён',
      stale: 'Нужно проверить снова',
      concept: 'Концепт готов',
    },
    modeLabels: { redesign: 'Переделка', 'from-scratch': 'С нуля' },
    updated: 'Изменён',
    revision: 'Версия',
    actions: { ready: 'Открыть результат', approved: 'Запустить демо-сборку', stale: 'Проверить изменения', concept: 'Посмотреть концепт' },
  },
} as const;

function projectState(project: StudioProject) {
  if (currentDemoBuild(project)) return 'ready' as const;
  if (project.approval.status === 'approved') return 'approved' as const;
  if (project.approval.status === 'stale') return 'stale' as const;
  return 'concept' as const;
}

function formatDate(value: string, locale: 'en' | 'ru') {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function ProjectsPage() {
  const { locale } = useStudioLocale();
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [loaded, setLoaded] = useState(false);
  const t = copy[locale];

  useEffect(() => {
    const refresh = () => {
      setProjects(readStudioProjects());
      setLoaded(true);
    };
    refresh();
    window.addEventListener('cinelanding:projects-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('cinelanding:projects-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return (
    <section className="studio-page">
      <div className="studio-page-heading-row">
        <div className="studio-page-heading">
          <p className="studio-kicker">{t.kicker}</p>
          <h1>{t.title}</h1>
          <p>{t.body}</p>
        </div>
        <Link className="studio-button studio-button-primary" href="/app/new">{t.create}<span aria-hidden="true">＋</span></Link>
      </div>

      {loaded && projects.length ? (
        <div className="studio-projects">
          {projects.map((project) => {
            const state = projectState(project);
            const href = state === 'ready'
              ? `/app/projects/${project.id}/preview`
              : `/app/projects/${project.id}`;
            return (
              <Link className="studio-project-card" href={href} key={project.id}>
                <div className="studio-card-meta">
                  <span className="studio-status">{t.statuses[state]}</span>
                  <span className="studio-meta">{t.revision} {String(project.revision.sequence).padStart(2, '0')}</span>
                </div>
                <h2>{project.input.name}</h2>
                <p>{project.input.offer}</p>
                <div className="studio-project-action">
                  <span>{t.modeLabels[project.input.mode]} · {t.updated} {formatDate(project.updatedAt, locale)}</span>
                  <span>{t.actions[state]} →</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : loaded ? (
        <div>
          <div className="studio-empty-grid">
            <Link className="studio-choice" href="/app/new?mode=redesign">
              <small>{t.modes.redesign.label}</small>
              <b aria-hidden="true">↘</b>
              <h2>{t.modes.redesign.title}</h2>
              <p>{t.modes.redesign.body}</p>
            </Link>
            <Link className="studio-choice" href="/app/new?mode=from-scratch">
              <small>{t.modes.scratch.label}</small>
              <b aria-hidden="true">↘</b>
              <h2>{t.modes.scratch.title}</h2>
              <p>{t.modes.scratch.body}</p>
            </Link>
          </div>
          <p className="studio-meta studio-dashboard-note">{t.emptyKicker} · {t.emptyTitle}</p>
        </div>
      ) : null}
    </section>
  );
}
