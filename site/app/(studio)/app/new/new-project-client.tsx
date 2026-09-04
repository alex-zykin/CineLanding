'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useStudioLocale } from '../../_components/studio-shell';
import { createStudioProject, StudioDomainError } from '../../_lib/studio-domain.mjs';
import { saveStudioProject } from '../../_lib/studio-storage';
import {
  STUDIO_OPTION_ORDER,
  STUDIO_PRICING_CATALOG,
  createStudioPriceSummary,
  formatRubleAmount,
} from '../../../pricing.mjs';

type ProjectMode = 'redesign' | 'from-scratch';
type OutputLocale = 'en-US' | 'ru-RU';
type StudioOptionCode = 'privacy-readiness' | 'prodamus-setup';

const copy = {
  en: {
    kicker: 'New project / Input',
    title: <>Give the story<br />a usable brief.</>,
    body: 'This first pass creates a deterministic planning concept. It does not fetch a website, generate media, charge a card, or publish anything.',
    modeLabel: 'Starting point',
    modes: {
      redesign: ['01 / Existing website', 'Redesign a site', 'Use a public URL as the source for a future, evidence-led redesign.'],
      'from-scratch': ['02 / No existing website', 'Create from scratch', 'Describe the offer and build the first direction without inheriting an old layout.'],
    },
    brief: 'Project brief',
    fields: {
      name: ['Project name', 'A working name shown only in this browser.', 'TOSS lawn equipment'],
      sourceUrl: ['Public website URL', 'The demo validates this address but never opens or sends it.', 'https://example.com'],
      audience: ['Who is this for?', 'Name the buyer or visitor, not a demographic cloud.', 'Grounds teams responsible for sports and public lawns'],
      goal: ['What should change?', 'Describe the visitor problem or business goal.', 'Make the value of professional lawn care equipment clear in one visit'],
      offer: ['What are you offering?', 'Use a factual sentence. Do not invent proof or promises.', 'Professional equipment for maintaining natural and artificial turf'],
      cta: ['Primary action', 'One useful next step for the visitor.', 'Choose equipment for my site'],
      output: ['Website language', 'This is separate from the language of the CineLanding interface.'],
    },
    languages: { 'en-US': 'English', 'ru-RU': 'Russian' },
    quote: {
      legend: 'Optional launch work for a Russian-language site',
      hint: 'Review the optional scope before creating the project. It remains separate from the approved visual concept.',
      base: 'Base site',
      options: {
        'privacy-readiness': ['Technical 152-FZ readiness', 'Technical data-flow review and implementation checklist'],
        'prodamus-setup': ['Prodamus integration', 'Integration code and a safe payment-processing contract'],
      },
      total: 'Estimated total',
      note: 'Informational estimate only. Checkout is not connected in this demo.',
    },
    submit: 'Create local project',
    submitNote: 'The project and its current approval state stay in localStorage on this device.',
    errors: {
      required: 'Complete this field to create the project.',
      invalidUrl: 'Enter a public HTTP or HTTPS website address.',
      generic: 'The project could not be created. Check the fields and try again.',
    },
  },
  ru: {
    kicker: 'Новый проект / Исходные данные',
    title: <>Дайте истории<br />рабочий бриф.</>,
    body: 'На этом этапе создаётся детерминированный план концепта. Сайт не открывается, медиа не генерируются, деньги не списываются и ничего не публикуется.',
    modeLabel: 'С чего начинаем',
    modes: {
      redesign: ['01 / Действующий сайт', 'Переделать сайт', 'Публичный URL станет источником для будущей переработки с опорой на факты.'],
      'from-scratch': ['02 / Сайта ещё нет', 'Создать с нуля', 'Опишите предложение и получите первое направление без старого макета.'],
    },
    brief: 'Бриф проекта',
    fields: {
      name: ['Название проекта', 'Рабочее название видно только в этом браузере.', 'Техника TOSS для газона'],
      sourceUrl: ['Публичный адрес сайта', 'Демо проверяет адрес, но не открывает и никуда его не отправляет.', 'https://example.ru'],
      audience: ['Для кого этот сайт?', 'Назовите реального покупателя или посетителя.', 'Специалисты, отвечающие за спортивные и городские газоны'],
      goal: ['Что должно измениться?', 'Опишите проблему посетителя или бизнес-задачу.', 'За одно посещение объяснить ценность профессиональной техники для газона'],
      offer: ['Что вы предлагаете?', 'Один фактический тезис — без выдуманных обещаний.', 'Профессиональная техника для ухода за натуральным и искусственным газоном'],
      cta: ['Главное действие', 'Один полезный следующий шаг посетителя.', 'Подобрать технику для объекта'],
      output: ['Язык будущего сайта', 'Он не зависит от языка интерфейса CineLanding.'],
    },
    languages: { 'en-US': 'Английский', 'ru-RU': 'Русский' },
    quote: {
      legend: 'Дополнения для запуска в России',
      hint: 'Проверьте выбранные дополнения перед созданием проекта. Они не входят в утверждение визуального концепта.',
      base: 'Базовый сайт',
      options: {
        'privacy-readiness': ['Техническая подготовка по 152‑ФЗ', 'Разбор потоков данных и технический чек-лист'],
        'prodamus-setup': ['Подключение Prodamus', 'Код интеграции и безопасный контракт обработки платежа'],
      },
      total: 'Предварительный итог',
      note: 'Это предварительный расчёт. Оплата в демо не подключена.',
    },
    submit: 'Создать локальный проект',
    submitNote: 'Проект и текущее состояние согласования останутся в localStorage на этом устройстве.',
    errors: {
      required: 'Заполните это поле, чтобы создать проект.',
      invalidUrl: 'Укажите публичный адрес сайта с HTTP или HTTPS.',
      generic: 'Не удалось создать проект. Проверьте поля и попробуйте ещё раз.',
    },
  },
} as const;

export default function NewProjectClient({
  initialMode,
  initialOutputLocale,
  initialSelectedOptions,
  initialSourceUrl,
}: {
  initialMode: ProjectMode;
  initialOutputLocale: OutputLocale;
  initialSelectedOptions: string[];
  initialSourceUrl: string;
}) {
  const router = useRouter();
  const { locale } = useStudioLocale();
  const [mode, setMode] = useState<ProjectMode>(initialMode);
  const [sourceUrl, setSourceUrl] = useState(initialSourceUrl);
  const [outputLocale, setOutputLocale] = useState<OutputLocale>(initialOutputLocale);
  const [selectedOptions, setSelectedOptions] = useState<StudioOptionCode[]>(
    STUDIO_OPTION_ORDER.filter((option) => initialSelectedOptions.includes(option)) as StudioOptionCode[],
  );
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState('');
  const t = copy[locale];
  const pricingSummary = createStudioPriceSummary(
    outputLocale === 'ru-RU' ? selectedOptions : [],
    outputLocale,
  );

  const setOptionSelected = (code: StudioOptionCode, checked: boolean) => {
    setSelectedOptions((current) => STUDIO_OPTION_ORDER.filter((option) => (
      option === code ? checked : current.includes(option as StudioOptionCode)
    )) as StudioOptionCode[]);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setErrorField('');
    const data = new FormData(event.currentTarget);

    try {
      const project = createStudioProject(
        {
          name: String(data.get('name') ?? ''),
          mode,
          sourceUrl: mode === 'redesign' ? sourceUrl : null,
          audience: String(data.get('audience') ?? ''),
          goal: String(data.get('goal') ?? ''),
          offer: String(data.get('offer') ?? ''),
          primaryCta: String(data.get('primaryCta') ?? ''),
          locales: [outputLocale],
          defaultLocale: outputLocale,
        },
        { selectedOptions: outputLocale === 'ru-RU' ? selectedOptions : [] },
      );
      saveStudioProject(project);
      router.push(`/app/projects/${project.id}`);
    } catch (caught) {
      if (caught instanceof StudioDomainError) {
        const field = caught.field ?? '';
        setErrorField(field);
        setError(caught.field === 'sourceUrl' ? t.errors.invalidUrl : t.errors.required);
        window.requestAnimationFrame(() => document.getElementById(field)?.focus());
      } else {
        setError(t.errors.generic);
      }
    }
  };

  return (
    <section className="studio-page">
      <div className="studio-page-heading">
        <p className="studio-kicker">{t.kicker}</p>
        <h1>{t.title}</h1>
        <p>{t.body}</p>
      </div>

      <div className="studio-mode-grid" role="group" aria-label={t.modeLabel}>
        {(Object.keys(t.modes) as ProjectMode[]).map((value) => {
          const [label, title, body] = t.modes[value];
          return (
            <button
              className={`studio-choice${mode === value ? ' is-selected' : ''}`}
              type="button"
              key={value}
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
            >
              <small>{label}</small>
              <b aria-hidden="true">{mode === value ? '●' : '○'}</b>
              <span className="studio-choice-title">{title}</span>
              <p>{body}</p>
            </button>
          );
        })}
      </div>

      <div className="studio-form-shell">
        <aside className="studio-form-aside">
          <p className="studio-eyebrow">01 / {t.brief}</p>
          <h2>{t.brief}</h2>
          <p>{t.submitNote}</p>
        </aside>

        <form className="studio-form" onSubmit={handleSubmit} noValidate>
          <section className="studio-form-section">
            <h2>{t.brief}</h2>
            <Field name="name" copy={t.fields.name} invalid={errorField === 'name'} required />
            {mode === 'redesign' ? (
              <div className="studio-field">
                <label htmlFor="sourceUrl">{t.fields.sourceUrl[0]}</label>
                <input
                  id="sourceUrl"
                  name="sourceUrl"
                  type="url"
                  inputMode="url"
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder={t.fields.sourceUrl[2]}
                  required
                  aria-describedby="sourceUrl-note"
                  aria-errormessage={errorField === 'sourceUrl' ? 'project-form-error' : undefined}
                  aria-invalid={errorField === 'sourceUrl'}
                />
                <p className="studio-field-note" id="sourceUrl-note">{t.fields.sourceUrl[1]}</p>
              </div>
            ) : null}
            <Field name="audience" copy={t.fields.audience} invalid={errorField === 'audience'} multiline required />
            <Field name="goal" copy={t.fields.goal} invalid={errorField === 'goal'} multiline required />
            <Field name="offer" copy={t.fields.offer} invalid={errorField === 'offer'} multiline required />
            <div className="studio-form-row">
              <Field name="primaryCta" copy={t.fields.cta} invalid={errorField === 'primaryCta'} required />
              <div className="studio-field">
                <label htmlFor="outputLocale">{t.fields.output[0]}</label>
                <select
                  id="outputLocale"
                  name="outputLocale"
                  value={outputLocale}
                  onChange={(event) => {
                    const nextLocale = event.target.value as OutputLocale;
                    setOutputLocale(nextLocale);
                    if (nextLocale !== 'ru-RU') setSelectedOptions([]);
                  }}
                  aria-describedby="outputLocale-note"
                >
                  <option value="en-US">{t.languages['en-US']}</option>
                  <option value="ru-RU">{t.languages['ru-RU']}</option>
                </select>
                <p className="studio-field-note" id="outputLocale-note">{t.fields.output[1]}</p>
              </div>
            </div>
          </section>

          {outputLocale === 'ru-RU' ? (
            <fieldset className="studio-form-section studio-options-fieldset">
              <legend>{t.quote.legend}</legend>
              <p className="studio-option-hint">{t.quote.hint}</p>
              <div className="studio-quote-base">
                <span>{t.quote.base}</span>
                <strong>{formatRubleAmount(STUDIO_PRICING_CATALOG.base.amountMinor, locale)}</strong>
              </div>
              <div className="studio-option-list">
                {STUDIO_OPTION_ORDER.map((code) => {
                  const optionCode = code as StudioOptionCode;
                  const [label, detail] = t.quote.options[optionCode];
                  return (
                    <label className="studio-option" key={optionCode}>
                      <input
                        type="checkbox"
                        checked={selectedOptions.includes(optionCode)}
                        onChange={(event) => setOptionSelected(optionCode, event.target.checked)}
                      />
                      <span><strong>{label}</strong><small>{detail}</small></span>
                      <b>+{formatRubleAmount(STUDIO_PRICING_CATALOG.options[optionCode].amountMinor, locale)}</b>
                    </label>
                  );
                })}
              </div>
              <div className="studio-quote-total">
                <span>{t.quote.total}</span>
                <output aria-live="polite">{formatRubleAmount(pricingSummary.totalAmountMinor, locale)}</output>
              </div>
              <p className="studio-stage-note">{t.quote.note}</p>
            </fieldset>
          ) : null}

          {error ? <p className="studio-error" id="project-form-error" role="alert">{error}</p> : null}
          <div className="studio-stage-actions">
            <button className="studio-button studio-button-primary" type="submit">{t.submit}<span aria-hidden="true">→</span></button>
            <p className="studio-stage-note">{t.submitNote}</p>
          </div>
        </form>
      </div>
    </section>
  );
}

function Field({
  name,
  copy,
  invalid = false,
  multiline = false,
  required = false,
}: {
  name: string;
  copy: readonly [string, string, string];
  invalid?: boolean;
  multiline?: boolean;
  required?: boolean;
}) {
  const noteId = `${name}-note`;
  return (
    <div className="studio-field">
      <label htmlFor={name}>{copy[0]}</label>
      {multiline ? (
        <textarea id={name} name={name} placeholder={copy[2]} required={required} aria-describedby={noteId} aria-errormessage={invalid ? 'project-form-error' : undefined} aria-invalid={invalid} />
      ) : (
        <input id={name} name={name} placeholder={copy[2]} required={required} aria-describedby={noteId} aria-errormessage={invalid ? 'project-form-error' : undefined} aria-invalid={invalid} />
      )}
      <p className="studio-field-note" id={noteId}>{copy[1]}</p>
    </div>
  );
}
