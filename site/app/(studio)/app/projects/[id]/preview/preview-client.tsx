'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useStudioLocale } from '../../../../_components/studio-shell';
import {
  currentDemoBuild,
  readStudioProject,
  type DemoBuild,
  type StudioProject,
} from '../../../../_lib/studio-storage';

const copy = {
  en: {
    label: 'Interactive concept preview',
    note: 'Browser-local · No generated media · No deployment',
    back: 'Back to project',
    missing: 'This preview is unavailable. Approve the current concept and run the local demo build first.',
    open: 'Open project',
    opening: 'Proposed opening',
    pattern: { transformation: 'Transformation story', craft: 'Craft story' },
    beats: {
      'visible-problem': 'Make the problem visible',
      'product-action': 'Let the product do the work',
      'obvious-result': 'Land on the result',
      'audience-context': 'Begin in a recognisable world',
      'making-process': 'Reveal the process',
      'finished-outcome': 'Show the finished value',
    },
    evidence: 'Copy shown here comes only from the submitted brief. The production version still needs source evidence, owned visual anchors, and content review.',
    footer: 'CineLanding local demo preview',
    version: 'Concept version',
  },
  ru: {
    label: 'Интерактивное превью концепта',
    note: 'Только в браузере · Без генерации медиа · Без публикации',
    back: 'Вернуться к проекту',
    missing: 'Превью пока недоступно. Сначала утвердите текущий концепт и запустите локальную демо-сборку.',
    open: 'Открыть проект',
    opening: 'Предлагаемый первый экран',
    pattern: { transformation: 'История изменения', craft: 'История мастерства' },
    beats: {
      'visible-problem': 'Делаем проблему видимой',
      'product-action': 'Показываем продукт в работе',
      'obvious-result': 'Приходим к результату',
      'audience-context': 'Начинаем со знакомой ситуации',
      'making-process': 'Раскрываем процесс',
      'finished-outcome': 'Показываем итоговую ценность',
    },
    evidence: 'Весь текст здесь взят только из заполненного брифа. Для рабочей версии ещё нужны проверенные материалы источника, визуалы с подтверждёнными правами и редакторская проверка.',
    footer: 'Локальное демо-превью CineLanding',
    version: 'Версия концепта',
  },
} as const;

export default function PreviewClient({ projectId }: { projectId: string }) {
  const { locale } = useStudioLocale();
  const [project, setProject] = useState<StudioProject | null>(null);
  const [build, setBuild] = useState<DemoBuild | null>(null);
  const [loaded, setLoaded] = useState(false);
  const ui = copy[locale];

  useEffect(() => {
    const refresh = () => {
      const found = readStudioProject(projectId);
      setProject(found);
      setBuild(found ? currentDemoBuild(found) : null);
      setLoaded(true);
    };
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener('cinelanding:projects-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('cinelanding:projects-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [projectId]);

  if (!loaded) return null;
  if (!project || !build) {
    return (
      <section className="studio-page studio-page-narrow">
        <div className="studio-not-found">
          <p className="studio-kicker">{ui.label}</p>
          <h1>PREVIEW<br />LOCKED</h1>
          <p>{ui.missing}</p>
          <Link className="studio-button studio-button-primary" href={project ? `/app/projects/${project.id}` : '/app'}>{ui.open}<span aria-hidden="true">←</span></Link>
        </div>
      </section>
    );
  }

  const narrativePattern = project.concept.narrativePattern === 'transformation'
    ? 'transformation'
    : 'craft';
  const preview = copy[project.input.defaultLocale === 'ru-RU' ? 'ru' : 'en'];

  return (
    <article className="studio-preview-page">
      <header className="studio-preview-top">
        <div>
            <p className="studio-preview-label">{ui.label}</p>
            <p>{ui.note}</p>
          </div>
        <Link className="studio-button" href={`/app/projects/${project.id}`}>{ui.back}<span aria-hidden="true">×</span></Link>
      </header>

      <section className="studio-preview-scene">
        <div className="studio-preview-copy">
          <p className="studio-preview-label">{preview.opening} / {preview.pattern[narrativePattern]}</p>
          <h1>{project.input.offer}</h1>
          <p>{project.input.goal}</p>
        </div>
      </section>

      <ol className="studio-preview-beats">
        {project.concept.sequence.map((beat, index) => (
          <li className="studio-preview-beat" key={beat.id}>
            <span>0{index + 1}</span>
            <h2>{preview.beats[beat.id as keyof typeof preview.beats]}</h2>
            <p>{beat.copyAnchor}</p>
          </li>
        ))}
      </ol>

      <section className="studio-preview-scene">
        <div className="studio-preview-copy">
          <p className="studio-preview-label">CTA / {project.input.defaultLocale}</p>
          <h1>{project.input.primaryCta}</h1>
          <p>{preview.evidence}</p>
        </div>
      </section>

      <footer className="studio-preview-footer">
        <span>{preview.footer}</span>
        <span>{preview.version} {String(project.revision.sequence).padStart(2, '0')} · {build.id}</span>
      </footer>
    </article>
  );
}
