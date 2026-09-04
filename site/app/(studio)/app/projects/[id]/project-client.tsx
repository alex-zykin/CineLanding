'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useStudioLocale } from '../../../_components/studio-shell';
import {
  approveRevision,
  createDemoBuild,
  editStudioProject,
  StudioDomainError,
  updateStudioOptions,
} from '../../../_lib/studio-domain.mjs';
import {
  currentDemoBuild,
  readStudioProject,
  saveDemoBuild,
  saveStudioProject,
  StudioStorageError,
  type DemoBuild,
  type StudioProject,
} from '../../../_lib/studio-storage';
import {
  STUDIO_OPTION_ORDER,
  STUDIO_PRICING_CATALOG,
  formatRubleAmount,
} from '../../../../pricing.mjs';

type StudioOptionCode = 'privacy-readiness' | 'prodamus-setup';

const copy = {
  en: {
    missingKicker: 'Project not found',
    missingTitle: <>This cut is not<br />in this browser.</>,
    missingBody: 'Local demo projects do not follow you between browsers or devices. Create a new project here, or return to the browser where it was saved.',
    missingAction: 'Back to projects',
    mode: { redesign: 'Redesign', 'from-scratch': 'From scratch' },
    stages: ['Inputs', 'Concept', 'Build', 'Ready'],
    projectKicker: 'Browser-local project',
    version: 'Concept version',
    inputs: {
      kicker: '01 / Source material',
      title: 'Inputs',
      body: 'This is the brief the current concept is tied to. Editing it creates a new revision and makes any earlier approval stale.',
      edit: 'Edit brief',
      cancel: 'Cancel',
      save: 'Save as new revision',
      labels: { mode: 'Mode', source: 'Source URL', audience: 'Audience', goal: 'Goal', offer: 'Offer', cta: 'Primary action', language: 'Website language' },
      noSource: 'Created from a brief',
      notFetched: 'The address has not been fetched or analysed.',
    },
    concept: {
      kicker: '02 / Planning direction',
      title: 'Concept',
      body: 'A deterministic direction made from this brief. It is useful for review, but it is not generated media or a finished website.',
      stamp: 'Concept only / Not a build',
      patterns: { transformation: 'Visible change', craft: 'Craft and process' },
      patternLabel: 'Narrative pattern',
      beatLabels: {
        'visible-problem': ['Visible problem', 'Open on the state the visitor wants to change.'],
        'product-action': ['Product in action', 'Show the offer doing useful work, not floating as decoration.'],
        'obvious-result': ['Obvious result', 'End on a legible outcome and one next action.'],
        'audience-context': ['Recognisable context', 'Start with the situation the intended audience already knows.'],
        'making-process': ['Making process', 'Reveal value through how the product or service is made and delivered.'],
        'finished-outcome': ['Useful outcome', 'Settle on the finished result and one clear action.'],
      },
      basis: 'Based on your brief',
      gaps: 'Still missing',
      basisBody: 'Offer, audience, goal, language, and CTA. User text is rendered as text only.',
      gapsItems: ['A verified source snapshot', 'Owned visual anchors', 'Production copy and claims review'],
      gapsItemsScratch: ['Owned visual anchors', 'Production copy and claims review', 'Specific proof for important claims'],
      approve: 'Approve this exact version',
      approved: 'Current version approved locally',
      stale: 'The old approval is kept in history, but it no longer opens the build.',
      pending: 'Approval applies only to the version shown above.',
    },
    build: {
      kicker: '03 / Production gate',
      title: 'Build',
      body: 'In the hosted product this step will create an order, then dispatch durable KIE and frontend jobs. This MVP only makes local preview metadata.',
      lockedTitle: 'Approve the concept first.',
      lockedBody: 'Paid generation must never start from an unapproved or changed direction.',
      readyTitle: 'Current concept is approved.',
      readyBody: 'You can run the deterministic demo build. It sends nothing, charges nothing, and creates no deployment.',
      priceNote: 'Estimated total · checkout is not connected',
      optionLegend: 'Optional launch work for a Russian-language site',
      optionHint: 'Choose this commercial scope after approving the concept. Changing it keeps the design approval but requires a new build.',
      optionLocked: 'Approve the concept to change the order scope.',
      base: 'Base site',
      options: {
        'privacy-readiness': ['Technical 152-FZ readiness', 'Technical data-flow review and implementation checklist'],
        'prodamus-setup': ['Prodamus integration', 'Integration code and a safe payment-processing contract'],
      },
      run: 'Run local demo build',
      doneTitle: 'Local preview is ready.',
      doneBody: 'No KIE request, payment, upload, or Vercel deployment happened.',
      open: 'Open preview',
    },
    ready: {
      kicker: '04 / Result',
      title: 'Ready',
      body: 'A real project will finish here with a verified preview, source package, publication record, and launch checks.',
      waiting: 'Complete the approval and demo-build steps to open the local concept preview.',
      available: 'The browser-local preview matches the current approved revision.',
      open: 'View result',
    },
    edit: {
      name: 'Project name', audience: 'Audience', goal: 'Goal', offer: 'Offer', cta: 'Primary action', language: 'Website language', source: 'Public source URL',
      saveError: 'Check every field. A redesign also requires a public HTTP or HTTPS URL.',
    },
    languages: { 'en-US': 'English', 'ru-RU': 'Russian' },
    storageError: 'This local copy changed in another tab or browser storage is unavailable. Reload before trying again.',
  },
  ru: {
    missingKicker: 'Проект не найден',
    missingTitle: <>Этой версии нет<br />в этом браузере.</>,
    missingBody: 'Локальные демо-проекты не переносятся между браузерами и устройствами. Создайте новый проект здесь или откройте браузер, где он был сохранён.',
    missingAction: 'К проектам',
    mode: { redesign: 'Переделка', 'from-scratch': 'С нуля' },
    stages: ['Исходные данные', 'Концепт', 'Сборка', 'Готово'],
    projectKicker: 'Проект в браузере',
    version: 'Версия концепта',
    inputs: {
      kicker: '01 / Исходный материал',
      title: 'Исходные данные',
      body: 'К этому брифу привязан текущий концепт. Любая правка создаёт новую версию и делает прежнее согласование устаревшим.',
      edit: 'Изменить бриф',
      cancel: 'Отмена',
      save: 'Сохранить новой версией',
      labels: { mode: 'Режим', source: 'Адрес источника', audience: 'Аудитория', goal: 'Задача', offer: 'Предложение', cta: 'Главное действие', language: 'Язык сайта' },
      noSource: 'Создано по брифу',
      notFetched: 'Адрес ещё не открывался и не анализировался.',
    },
    concept: {
      kicker: '02 / Направление',
      title: 'Концепт',
      body: 'Детерминированное направление, собранное из брифа. Его можно оценить, но это ещё не сгенерированные медиа и не готовый сайт.',
      stamp: 'Только концепт / Не сборка',
      patterns: { transformation: 'Очевидное изменение', craft: 'Процесс и мастерство' },
      patternLabel: 'Сюжет страницы',
      beatLabels: {
        'visible-problem': ['Видимая проблема', 'Начинаем с состояния, которое посетитель хочет изменить.'],
        'product-action': ['Продукт в действии', 'Показываем полезную работу продукта, а не декоративный объект.'],
        'obvious-result': ['Очевидный результат', 'Завершаем понятным итогом и одним следующим действием.'],
        'audience-context': ['Знакомая ситуация', 'Начинаем с контекста, который аудитория узнаёт без объяснений.'],
        'making-process': ['Процесс создания', 'Раскрываем ценность через изготовление или оказание услуги.'],
        'finished-outcome': ['Полезный результат', 'Показываем итог и одно ясное действие.'],
      },
      basis: 'Основано на вашем брифе',
      gaps: 'Чего пока нет',
      basisBody: 'Предложение, аудитория, задача, язык и CTA. Пользовательский текст выводится только как текст.',
      gapsItems: ['Проверенного снимка исходного сайта', 'Визуалов с подтверждёнными правами', 'Финальной проверки текстов и обещаний'],
      gapsItemsScratch: ['Визуалов с подтверждёнными правами', 'Финальной проверки текстов и обещаний', 'Подтверждений для важных утверждений'],
      approve: 'Утвердить эту версию',
      approved: 'Текущая версия утверждена локально',
      stale: 'Старое согласование сохранено в истории, но больше не открывает сборку.',
      pending: 'Согласование относится только к показанной выше версии.',
    },
    build: {
      kicker: '03 / Допуск к производству',
      title: 'Сборка',
      body: 'В рабочем сервисе здесь появится заказ, а затем отдельные задания KIE и frontend. Этот MVP создаёт только локальные данные превью.',
      lockedTitle: 'Сначала утвердите концепт.',
      lockedBody: 'Платная генерация не должна запускаться по несогласованному или изменённому направлению.',
      readyTitle: 'Текущий концепт утверждён.',
      readyBody: 'Можно запустить детерминированную демо-сборку. Она ничего не отправляет, не списывает деньги и не создаёт деплой.',
      priceNote: 'Предварительный итог · оплата не подключена',
      optionLegend: 'Дополнения для запуска в России',
      optionHint: 'Выберите коммерческий состав после утверждения концепта. Изменение дополнений сохранит утверждение дизайна, но потребует новой сборки.',
      optionLocked: 'Утвердите концепт, чтобы изменить состав заказа.',
      base: 'Базовый сайт',
      options: {
        'privacy-readiness': ['Техническая подготовка по 152‑ФЗ', 'Разбор потоков данных и технический чек-лист'],
        'prodamus-setup': ['Подключение Prodamus', 'Код интеграции и безопасный контракт обработки платежа'],
      },
      run: 'Запустить локальную демо-сборку',
      doneTitle: 'Локальное превью готово.',
      doneBody: 'Запросов в KIE, оплаты, загрузки файлов или публикации на Vercel не было.',
      open: 'Открыть превью',
    },
    ready: {
      kicker: '04 / Результат',
      title: 'Готово',
      body: 'В рабочем проекте здесь появятся проверенное превью, исходники, запись о публикации и проверки запуска.',
      waiting: 'Утвердите концепт и запустите демо-сборку, чтобы открыть локальное превью.',
      available: 'Превью в браузере соответствует текущей утверждённой версии.',
      open: 'Посмотреть результат',
    },
    edit: {
      name: 'Название проекта', audience: 'Аудитория', goal: 'Задача', offer: 'Предложение', cta: 'Главное действие', language: 'Язык сайта', source: 'Публичный адрес источника',
      saveError: 'Проверьте все поля. Для переделки также нужен публичный HTTP- или HTTPS-адрес.',
    },
    languages: { 'en-US': 'Английский', 'ru-RU': 'Русский' },
    storageError: 'Локальная копия изменилась в другой вкладке или хранилище браузера недоступно. Обновите страницу и попробуйте снова.',
  },
} as const;

function currentStage(project: StudioProject, build: DemoBuild | null) {
  if (build) return 4;
  if (project.approval.status === 'approved') return 3;
  return 2;
}

export default function ProjectClient({ projectId }: { projectId: string }) {
  const { locale } = useStudioLocale();
  const [project, setProject] = useState<StudioProject | null>(null);
  const [build, setBuild] = useState<DemoBuild | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState('');
  const [actionError, setActionError] = useState('');
  const approvalStatusRef = useRef<HTMLDivElement>(null);
  const buildStatusRef = useRef<HTMLDivElement>(null);
  const t = copy[locale];

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

  const update = (next: StudioProject) => {
    if (!project) return;
    const saved = saveStudioProject(next, project);
    setProject(saved);
    setBuild(currentDemoBuild(saved));
    setActionError('');
  };

  const handleApproval = () => {
    if (!project) return;
    try {
      update(approveRevision(project, { revisionId: project.revision.id }));
      window.requestAnimationFrame(() => approvalStatusRef.current?.focus());
    } catch {
      setActionError(t.storageError);
      window.requestAnimationFrame(() => approvalStatusRef.current?.focus());
    }
  };

  const handleBuild = () => {
    if (!project) return;
    try {
      const nextBuild = createDemoBuild(project);
      saveDemoBuild(nextBuild, project);
      setBuild(nextBuild);
      setActionError('');
      window.requestAnimationFrame(() => buildStatusRef.current?.focus());
    } catch {
      setActionError(t.storageError);
      window.requestAnimationFrame(() => buildStatusRef.current?.focus());
    }
  };

  const handleOptionChange = (code: StudioOptionCode, checked: boolean) => {
    if (!project || project.approval.status !== 'approved') return;
    const selectedOptions = STUDIO_OPTION_ORDER.filter((option) => (
      option === code ? checked : project.pricing.selectedOptions.includes(option)
    ));
    try {
      update(updateStudioOptions(project, selectedOptions));
      window.requestAnimationFrame(() => buildStatusRef.current?.focus());
    } catch {
      setActionError(t.storageError);
      window.requestAnimationFrame(() => buildStatusRef.current?.focus());
    }
  };

  const handleEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!project) return;
    setError('');
    setErrorField('');
    const data = new FormData(event.currentTarget);
    try {
      const next = editStudioProject(project, {
        name: String(data.get('name') ?? ''),
        sourceUrl: project.input.mode === 'redesign' ? String(data.get('sourceUrl') ?? '') : null,
        audience: String(data.get('audience') ?? ''),
        goal: String(data.get('goal') ?? ''),
        offer: String(data.get('offer') ?? ''),
        primaryCta: String(data.get('primaryCta') ?? ''),
        locales: [String(data.get('defaultLocale') ?? '')],
        defaultLocale: String(data.get('defaultLocale') ?? ''),
      });
      update(next);
      setEditing(false);
    } catch (caught) {
      const field = caught instanceof StudioDomainError ? caught.field ?? '' : '';
      setErrorField(field);
      setError(caught instanceof StudioStorageError ? t.storageError : t.edit.saveError);
      window.requestAnimationFrame(() => document.getElementById(field)?.focus());
    }
  };

  if (!loaded) return null;
  if (!project) {
    return (
      <section className="studio-page studio-page-narrow">
        <div className="studio-not-found">
          <p className="studio-kicker">{t.missingKicker}</p>
          <h1>{t.missingTitle}</h1>
          <p>{t.missingBody}</p>
          <Link className="studio-button studio-button-primary" href="/app">{t.missingAction}<span aria-hidden="true">←</span></Link>
        </div>
      </section>
    );
  }

  const stage = currentStage(project, build);
  const concept = project.concept;
  const narrativePattern = concept.narrativePattern === 'transformation'
    ? 'transformation'
    : 'craft';

  return (
    <section className="studio-page">
      <div className="studio-workspace">
        <ol className="studio-steps" aria-label={locale === 'ru' ? 'Этапы проекта' : 'Project stages'}>
          {t.stages.map((label, index) => {
            const number = index + 1;
            const state = number === stage ? ' is-current' : number < stage ? ' is-complete' : '';
            return <li className={`studio-step${state}`} key={label} aria-current={number === stage ? 'step' : undefined}><span className="studio-step-index">0{number}</span><strong>{label}</strong></li>;
          })}
        </ol>

        <div className="studio-workspace-main">
          <header className="studio-project-heading">
            <div className="studio-project-heading-top">
              <p className="studio-kicker">{t.projectKicker} / {t.mode[project.input.mode]}</p>
              <span className="studio-version">{t.version} {String(project.revision.sequence).padStart(2, '0')}</span>
            </div>
            <h1>{project.input.name}</h1>
          </header>

          <section className="studio-stage" id="inputs">
            <div className="studio-stage-heading">
              <p className="studio-eyebrow">{t.inputs.kicker}</p>
              <h2>{t.inputs.title}</h2>
              <p>{t.inputs.body}</p>
            </div>
            {editing ? (
              <EditProjectForm project={project} locale={locale} onSubmit={handleEdit} onCancel={() => { setEditing(false); setError(''); setErrorField(''); }} error={error} errorField={errorField} />
            ) : (
              <div className="studio-stage-card">
                <dl className="studio-table">
                  <Fact label={t.inputs.labels.mode} value={t.mode[project.input.mode]} />
                  <Fact label={t.inputs.labels.language} value={t.languages[project.input.defaultLocale]} />
                  <Fact label={t.inputs.labels.source} value={project.input.sourceUrl ?? t.inputs.noSource} note={project.input.sourceUrl ? t.inputs.notFetched : undefined} />
                  <Fact label={t.inputs.labels.audience} value={project.input.audience} />
                  <Fact label={t.inputs.labels.goal} value={project.input.goal} />
                  <Fact label={t.inputs.labels.offer} value={project.input.offer} />
                  <Fact label={t.inputs.labels.cta} value={project.input.primaryCta} />
                </dl>
                <div className="studio-stage-actions studio-stage-actions-spaced">
                  <button className="studio-button" type="button" onClick={() => setEditing(true)}>{t.inputs.edit}<span aria-hidden="true">↗</span></button>
                </div>
              </div>
            )}
          </section>

          <section className="studio-stage" id="concept">
            <div className="studio-stage-heading">
              <p className="studio-eyebrow">{t.concept.kicker}</p>
              <h2>{t.concept.title}</h2>
              <p>{t.concept.body}</p>
            </div>
            <article className="studio-stage-card is-dark">
              <div className="studio-concept-head">
                <div className="studio-concept-title">
                  <p className="studio-eyebrow">{t.concept.patternLabel}</p>
                  <h3>{t.concept.patterns[narrativePattern]}</h3>
                  <p>{project.input.offer}</p>
                </div>
                <span className="studio-concept-stamp">{t.concept.stamp}</span>
              </div>
              <ol className="studio-beats">
                {concept.sequence.map((beat, index) => {
                  const labels = t.concept.beatLabels[beat.id as keyof typeof t.concept.beatLabels];
                  return (
                    <li key={beat.id}>
                      <span>0{index + 1}</span>
                      <strong>{labels[0]}</strong>
                      <p>{labels[1]} <em>{beat.copyAnchor}</em></p>
                    </li>
                  );
                })}
              </ol>
              <div className="studio-concept-footer">
                <div><h4>{t.concept.basis}</h4><p>{t.concept.basisBody}</p></div>
                <div><h4>{t.concept.gaps}</h4><ul>{(project.input.mode === 'redesign' ? t.concept.gapsItems : t.concept.gapsItemsScratch).map((item) => <li key={item}>{item}</li>)}</ul></div>
              </div>
            </article>
            <div className={`studio-stage-card${project.approval.status === 'approved' ? ' is-acid' : ''}`} aria-live="polite" ref={approvalStatusRef} tabIndex={-1}>
              <div className="studio-build-gate">
                <div>
                  <h3>{project.approval.status === 'approved' ? t.concept.approved : t.concept.approve}</h3>
                  <p>{project.approval.status === 'stale' ? t.concept.stale : t.concept.pending}</p>
                </div>
                {project.approval.status !== 'approved' ? (
                  <button className="studio-button studio-button-signal" type="button" onClick={handleApproval}>{t.concept.approve}<span aria-hidden="true">✓</span></button>
                ) : <span className="studio-status">REV {String(project.revision.sequence).padStart(2, '0')} / OK</span>}
              </div>
            </div>
            {actionError ? <p className="studio-error" role="alert">{actionError}</p> : null}
          </section>

          <section className="studio-stage" id="build">
            <div className="studio-stage-heading">
              <p className="studio-eyebrow">{t.build.kicker}</p>
              <h2>{t.build.title}</h2>
              <p>{t.build.body}</p>
            </div>
            <div className={`studio-stage-card${build ? ' is-acid' : ''}`} aria-live="polite" ref={buildStatusRef} tabIndex={-1}>
              <div className="studio-build-gate">
                <div>
                  <h3>{build ? t.build.doneTitle : project.approval.status === 'approved' ? t.build.readyTitle : t.build.lockedTitle}</h3>
                  <p>{build ? t.build.doneBody : project.approval.status === 'approved' ? t.build.readyBody : t.build.lockedBody}</p>
                </div>
                {build ? (
                  <Link className="studio-button studio-button-primary" href={`/app/projects/${project.id}/preview`}>{t.build.open}<span aria-hidden="true">→</span></Link>
                ) : (
                  <button className="studio-button studio-button-primary" type="button" disabled={project.approval.status !== 'approved'} onClick={handleBuild}>{t.build.run}<span aria-hidden="true">→</span></button>
                )}
              </div>
              <div className="studio-hypothesis">
                <output aria-live="polite">{formatRubleAmount(project.pricing.totalAmountMinor, locale)}</output>
                <small>{t.build.priceNote}</small>
              </div>
              {project.input.defaultLocale === 'ru-RU' ? (
                <fieldset className="studio-options-fieldset studio-build-options" disabled={project.approval.status !== 'approved'}>
                  <legend>{t.build.optionLegend}</legend>
                  <p className="studio-option-hint">
                    {project.approval.status === 'approved' ? t.build.optionHint : t.build.optionLocked}
                  </p>
                  <div className="studio-quote-base">
                    <span>{t.build.base}</span>
                    <strong>{formatRubleAmount(STUDIO_PRICING_CATALOG.base.amountMinor, locale)}</strong>
                  </div>
                  <div className="studio-option-list">
                    {STUDIO_OPTION_ORDER.map((code) => {
                      const optionCode = code as StudioOptionCode;
                      const [label, detail] = t.build.options[optionCode];
                      return (
                        <label className="studio-option" key={optionCode}>
                          <input
                            type="checkbox"
                            checked={project.pricing.selectedOptions.includes(optionCode)}
                            onChange={(event) => handleOptionChange(optionCode, event.target.checked)}
                          />
                          <span><strong>{label}</strong><small>{detail}</small></span>
                          <b>+{formatRubleAmount(STUDIO_PRICING_CATALOG.options[optionCode].amountMinor, locale)}</b>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ) : null}
            </div>
          </section>

          <section className="studio-stage" id="ready">
            <div className="studio-stage-heading">
              <p className="studio-eyebrow">{t.ready.kicker}</p>
              <h2>{t.ready.title}</h2>
              <p>{t.ready.body}</p>
            </div>
            <div className="studio-stage-card">
              <div className="studio-build-gate">
                <p>{build ? t.ready.available : t.ready.waiting}</p>
                {build ? <Link className="studio-button studio-button-primary" href={`/app/projects/${project.id}/preview`}>{t.ready.open}<span aria-hidden="true">↗</span></Link> : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div><dt>{label}</dt><dd>{value}{note ? <small>— {note}</small> : null}</dd></div>;
}

function EditProjectForm({
  project,
  locale,
  onSubmit,
  onCancel,
  error,
  errorField,
}: {
  project: StudioProject;
  locale: 'en' | 'ru';
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  error: string;
  errorField: string;
}) {
  const t = copy[locale];
  return (
    <form className="studio-form" onSubmit={onSubmit} noValidate>
      <section className="studio-form-section">
        <EditField name="name" label={t.edit.name} value={project.input.name} invalid={errorField === 'name'} />
        {project.input.mode === 'redesign' ? <EditField name="sourceUrl" label={t.edit.source} value={project.input.sourceUrl ?? ''} invalid={errorField === 'sourceUrl'} /> : null}
        <EditField name="audience" label={t.edit.audience} value={project.input.audience} invalid={errorField === 'audience'} multiline />
        <EditField name="goal" label={t.edit.goal} value={project.input.goal} invalid={errorField === 'goal'} multiline />
        <EditField name="offer" label={t.edit.offer} value={project.input.offer} invalid={errorField === 'offer'} multiline />
        <div className="studio-form-row">
          <EditField name="primaryCta" label={t.edit.cta} value={project.input.primaryCta} invalid={errorField === 'primaryCta'} />
          <div className="studio-field">
            <label htmlFor="defaultLocale">{t.edit.language}</label>
            <select id="defaultLocale" name="defaultLocale" defaultValue={project.input.defaultLocale}>
              <option value="en-US">{t.languages['en-US']}</option>
              <option value="ru-RU">{t.languages['ru-RU']}</option>
            </select>
          </div>
        </div>
      </section>
      {error ? <p className="studio-error" id="project-edit-error" role="alert">{error}</p> : null}
      <div className="studio-stage-actions">
        <button className="studio-button studio-button-primary" type="submit">{t.inputs.save}<span aria-hidden="true">→</span></button>
        <button className="studio-button" type="button" onClick={onCancel}>{t.inputs.cancel}</button>
      </div>
    </form>
  );
}

function EditField({ name, label, value, invalid = false, multiline = false }: { name: string; label: string; value: string; invalid?: boolean; multiline?: boolean }) {
  return (
    <div className="studio-field">
      <label htmlFor={name}>{label}</label>
      {multiline
        ? <textarea id={name} name={name} defaultValue={value} required aria-errormessage={invalid ? 'project-edit-error' : undefined} aria-invalid={invalid} />
        : <input id={name} name={name} defaultValue={value} required aria-errormessage={invalid ? 'project-edit-error' : undefined} aria-invalid={invalid} type={name === 'sourceUrl' ? 'url' : 'text'} />}
    </div>
  );
}
