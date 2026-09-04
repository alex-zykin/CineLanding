'use client';

import Image from 'next/image';
import { useEffect, useId, useState, type FormEvent } from 'react';
import ScrollSequence from './scroll-sequence';
import {
  STUDIO_OPTION_ORDER,
  STUDIO_PRICING_CATALOG,
  createStudioPriceSummary,
  formatRubleAmount,
} from './pricing.mjs';
import { normalizeSourceUrl, SourceUrlError } from './source-url.mjs';

type Locale = 'en' | 'ru';
type StudioOptionCode = 'privacy-readiness' | 'prodamus-setup';

const content = {
  en: {
    pageTitle: 'CineLanding — Turn an old website into a cinematic landing page',
    pageDescription: 'Turn an existing website into a cinematic landing page, from a free concept to a responsive build and source code.',
    brand: 'CINELANDING',
    brandNote: 'Managed web studio',
    homeLabel: 'CineLanding home',
    navLabel: 'Primary navigation',
    nav: [
      ['How it works', '#workflow'],
      ['Example', '#example'],
      ['Pricing', '#pricing'],
    ],
    studioLabel: 'Studio',
    studioNote: 'Demo',
    studioAriaLabel: 'Open the CineLanding demo workspace',
    switchLabel: 'Переключить на русский',
    sequenceLabel: 'CineLanding / Project 01',
    showcaseLabel: 'How CineLanding turns an old website into a cinematic landing page',
    showcaseScroll: 'Scroll through the build',
    showcaseFrame: 'Scroll-directed sequence',
    showcaseBeats: [
      {
        kicker: 'Start with the site you already have',
        title: <>The story is there.<br />Bring it forward.</>,
        body: 'Paste your current website. We keep the useful parts, find the missing story, and turn the first visit into an experience.',
        align: 'left',
        action: { label: 'Start with your URL', href: '#start' },
      },
      {
        kicker: '01 / Keep what matters',
        title: <>We read before<br />we redesign.</>,
        body: 'Your offer, proof, voice, and working content become the brief. The old layout does not.',
        align: 'right',
      },
      {
        kicker: '02 / See the direction',
        title: <>Approve the idea<br />before the build.</>,
        body: 'A free concept shows the structure, visual tone, and motion plan clearly enough to make a decision.',
        align: 'left',
      },
      {
        kicker: '03 / Build the real thing',
        title: <>One scroll.<br />A new first impression.</>,
        body: 'After payment, CineLanding prepares the cinematic sequence, responsive page, source code, and a handoff you can keep.',
        align: 'right',
      },
    ],
    workflow: {
      kicker: 'A clear route from old to new',
      title: <>No mystery.<br /><em>Just three decisions.</em></>,
      body: 'You see what happens at every stage, what is free, and what the 9,900 ₽ build includes before you spend anything.',
      action: 'See the scope',
      stepLabel: 'Step',
      steps: [
        ['01', 'Site review', 'We map the offer, content, audience, and what is worth keeping.', 'Included'],
        ['02', 'Free direction', 'Page structure, visual tone, and a scene plan you can judge.', 'Before payment'],
        ['03', 'Managed build', 'A responsive landing, one scroll scene, source code, and a practical handoff.', '9,900 ₽'],
      ],
    },
    concept: {
      kicker: 'The free direction',
      title: <>Enough to decide.<br /><em>Not dressed up as finished work.</em></>,
      body: 'The concept is deliberately useful and honest: it shows the new hierarchy, opening composition, palette, and sequence logic. Production media and the finished frontend start only after approval and payment.',
      imageAlt: 'A cinematic frame used to illustrate a CineLanding visual direction',
      caption: 'Example direction / reviewed before production',
      facts: [
        ['01', 'content map'],
        ['02', 'page structure'],
        ['03', 'visual direction'],
        ['04', 'motion plan'],
      ],
    },
    businessReady: {
      kicker: 'More than design',
      title: <>A practical foundation<br /><em>for launching in Russia.</em></>,
      body: 'Add a technical readiness review for Russia’s Federal Law No. 152-FZ and a Prodamus payment module. CineLanding prepares the working files, implementation contract, and launch checklist. You connect your merchant credentials and complete the final checks.',
      action: 'Create a project with both modules',
      modules: [
        {
          index: '01',
          status: 'Technical review',
          title: 'Technical 152-FZ readiness review',
          body: 'We map where personal data is collected and stored, which services receive it, and how access, logs, retention, and deletion work.',
          points: ['Data-flow map', 'Evidence and risks', 'Concrete fixes', 'Live-check list'],
          note: 'This is a technical review, not legal advice or a compliance certificate.',
        },
        {
          index: '02',
          status: 'Ready to connect',
          title: 'Prodamus payment module',
          body: 'We prepare a server-side payment contract with order references, signed webhook verification, duplicate protection, and a payment log.',
          points: ['Server-owned amount', 'Verified webhook', 'Idempotent fulfilment', 'Control-payment checklist'],
          note: 'Going live requires an active Prodamus account, merchant credentials, a backend, and a successful test payment.',
        },
      ],
    },
    pricing: {
      kicker: 'One project, one clear price',
      title: <>Start with a free concept.<br /><em>Build the site for 9,900 ₽.</em></>,
      body: 'The first paid offer is intentionally simple: one old website becomes one polished landing page. No subscription and no surprise usage bill.',
      action: 'Open the form',
      cardLabel: 'Managed site',
      priceNote: 'base site',
      urlLabel: 'Your current website',
      urlPlaceholder: 'example.com',
      submit: 'Check this address',
      formNote: 'This preview checks the address in your browser only. It does not inspect, send, or save the website yet.',
      readyTitle: 'Ready for a demo project',
      readyBody: "CineLanding hasn't analyzed the site or saved the address for {host}. Continue in the demo workspace to prepare the brief.",
      readyAction: 'Open demo workspace',
      scope: ['One responsive landing page', 'One website language', 'One scroll sequence', 'Source code and one small revision'],
      errors: {
        empty: 'Enter the address of the website you want to redesign.',
        invalid: 'That does not look like a complete website address.',
        unsupported_protocol: 'Use a public HTTP or HTTPS website.',
        credentials_not_allowed: 'Remove the username and password from the address.',
        private_host: 'Use a public website. Local and private network addresses are not accepted.',
      },
    },
    example: {
      kicker: 'A finished example',
      title: <>Same business.<br /><em>A completely different entrance.</em></>,
      oldLabel: 'Before',
      oldTitle: 'WELCOME TO OUR WEBSITE!!!',
      oldCopy: 'Company information, prices and contacts. Click the links below to continue.',
      oldAside: 'Best viewed at 800 × 600',
      oldButton: 'ENTER SITE',
      newLabel: 'CineLanding result',
      newCopy: 'ORBIT is our fictional cinema demo: a complete responsive page with a 120-frame sequence tied to the scroll.',
    },
    openSource: {
      kicker: 'Open source, on purpose',
      title: <>Use the service.<br />Or run it yourself.</>,
      body: 'The hosted service sells convenience: project setup, managed generation, review, launch modules, and delivery. The engine stays public under AGPL-3.0 for developers who prefer to install it themselves.',
      primary: 'Start with your URL',
      secondary: 'View on GitHub',
      note: 'No feature penalty for self-hosting · managed service is optional',
    },
    ribbon: ['READ THE OLD SITE', 'FRAME THE NEW STORY', 'CHECK THE LAUNCH PATH', 'SHIP THE REAL PAGE'],
    footer: 'CineLanding turns useful old websites into memorable new ones.',
    source: 'GitHub',
  },
  ru: {
    pageTitle: 'CineLanding — превращаем старые сайты в кинематографичные лендинги',
    pageDescription: 'Превратите действующий сайт в кинематографичный лендинг: от бесплатного концепта до адаптивной сборки с исходным кодом.',
    brand: 'CINELANDING',
    brandNote: 'Сервис лендингов',
    homeLabel: 'Главная CineLanding',
    navLabel: 'Основная навигация',
    nav: [
      ['Как это работает', '#workflow'],
      ['Для запуска', '#business-ready'],
      ['Пример', '#example'],
      ['Цена', '#pricing'],
    ],
    studioLabel: 'Кабинет',
    studioNote: 'Демо',
    studioAriaLabel: 'Открыть демо-кабинет CineLanding',
    switchLabel: 'Switch to English',
    sequenceLabel: 'CineLanding / Проект 01',
    showcaseLabel: 'Как CineLanding превращает старый сайт в кинематографичный лендинг',
    showcaseScroll: 'Листайте по этапам',
    showcaseFrame: 'Покадровая сцена под скроллом',
    showcaseBeats: [
      {
        kicker: 'Начните с сайта, который уже есть',
        title: <>История уже там.<br />Дайте ей место.</>,
        body: 'Вставьте адрес действующего сайта. Мы сохраним полезное, найдём недостающую историю и превратим первое посещение во впечатление.',
        align: 'left',
        action: { label: 'Начать со своего URL', href: '#start' },
      },
      {
        kicker: '01 / Сохраняем главное',
        title: <>Сначала читаем.<br />Потом меняем.</>,
        body: 'Предложение, факты, голос и рабочий контент становятся основой. Старый макет — нет.',
        align: 'right',
      },
      {
        kicker: '02 / Показываем направление',
        title: <>Сначала идея.<br />Потом сборка.</>,
        body: 'Бесплатный концепт показывает структуру, визуальный характер и логику движения — этого достаточно, чтобы принять решение.',
        align: 'left',
      },
      {
        kicker: '03 / Собираем настоящий сайт',
        title: <>Один скролл.<br />Другое первое впечатление.</>,
        body: 'После оплаты CineLanding готовит покадровую сцену, адаптивную страницу, исходный код и выбранные дополнения.',
        align: 'right',
      },
    ],
    workflow: {
      kicker: 'Понятный путь от старого к новому',
      title: <>Никакой магии.<br /><em>Три понятных решения.</em></>,
      body: 'Вы заранее видите каждый этап, бесплатную часть и состав сборки за 9 900 ₽ — до любых расходов.',
      action: 'Посмотреть состав',
      stepLabel: 'Этап',
      steps: [
        ['01', 'Разбор сайта', 'Собираем предложение, контент, аудиторию и то, что стоит сохранить.', 'Включено'],
        ['02', 'Бесплатное направление', 'Структура страницы, визуальный характер и план сцен.', 'До оплаты'],
        ['03', 'Готовая сборка', 'Адаптивный лендинг, одна scroll-сцена, исходный код и практичная передача проекта.', '9 900 ₽'],
      ],
    },
    concept: {
      kicker: 'Бесплатное направление',
      title: <>Достаточно для решения.<br /><em>Но это ещё не готовый сайт.</em></>,
      body: 'Концепт честно показывает новую иерархию, первый экран, палитру и логику сцены. Рабочий frontend и платная генерация начинаются только после вашего одобрения и оплаты.',
      imageAlt: 'Кинематографичный кадр для примера визуального направления CineLanding',
      caption: 'Пример направления / согласуется до сборки',
      facts: [
        ['01', 'карта контента'],
        ['02', 'структура страницы'],
        ['03', 'визуальный характер'],
        ['04', 'план движения'],
      ],
    },
    businessReady: {
      kicker: 'Дополнения для запуска',
      title: <>Подключите только то,<br /><em>что нужно.</em></>,
      body: 'Для сайтов на русском языке доступны два необязательных дополнения. Они не входят в базовую стоимость 9 900 ₽ и выбираются отдельно.',
      action: 'Рассчитать стоимость',
      modules: [
        {
          code: 'privacy-readiness',
          index: '01',
          status: 'Дополнение · 1 990 ₽',
          title: 'Техническая подготовка по 152‑ФЗ',
          body: 'Проверяем технический путь персональных данных: формы, хранение, доступы, внешние сервисы, журналы и удаление.',
          points: ['Карта потоков данных', 'Находки и приоритеты', 'Рекомендации по настройке', 'Чек-лист повторной проверки'],
          note: 'Это техническая подготовка, а не юридическое заключение, гарантия или сертификат соответствия.',
        },
        {
          code: 'prodamus-setup',
          index: '02',
          status: 'Дополнение · 1 990 ₽',
          title: 'Подключение Prodamus',
          body: 'Готовим серверный заказ, проверку подписанных уведомлений, защиту от повторной обработки и понятный журнал статусов.',
          points: ['Сумма с сервера', 'Проверка подписи', 'Идемпотентная обработка', 'Чек-лист тестового платежа'],
          note: 'Для запуска нужны активный кабинет Prodamus, серверные реквизиты, backend и успешный контрольный платёж.',
        },
      ],
    },
    pricing: {
      kicker: 'Базовый сайт и дополнения',
      title: <>Концепт — бесплатно.<br /><em>Базовый сайт — 9 900 ₽.</em></>,
      body: 'В базовую стоимость входит один адаптивный лендинг. Дополнения для запуска в России необязательны и считаются отдельно.',
      action: 'Открыть форму',
      cardLabel: 'Предварительный расчёт',
      priceNote: 'итого',
      optionLegend: 'Дополнения для запуска в России',
      optionHint: 'По умолчанию выключены. Можно выбрать одно, оба или ни одного.',
      totalLabel: 'Итоговая стоимость',
      checkoutNote: 'Предварительный расчёт. Оплата в демо не подключена.',
      options: [
        ['privacy-readiness', 'Техническая подготовка по 152‑ФЗ', 'Технический разбор потоков персональных данных'],
        ['prodamus-setup', 'Подключение Prodamus', 'Код интеграции и безопасный контракт обработки платежа'],
      ],
      urlLabel: 'Адрес действующего сайта',
      urlPlaceholder: 'example.ru',
      submit: 'Проверить адрес',
      formNote: 'Сейчас форма проверяет адрес только в вашем браузере. Она ещё не анализирует, не отправляет и не сохраняет сайт.',
      readyTitle: 'Можно открыть демо-проект',
      readyBody: 'CineLanding ещё не анализировал сайт и не сохранял адрес {host}. Продолжите в демо-кабинете, чтобы заполнить бриф.',
      readyAction: 'Открыть демо-кабинет',
      scope: ['Один адаптивный лендинг', 'Один язык сайта', 'Одна scroll-сцена', 'Исходный код и одна небольшая правка'],
      errors: {
        empty: 'Укажите адрес сайта, который хотите переделать.',
        invalid: 'Похоже, это не полный адрес сайта.',
        unsupported_protocol: 'Нужен публичный сайт по HTTP или HTTPS.',
        credentials_not_allowed: 'Уберите логин и пароль из адреса.',
        private_host: 'Нужен публичный сайт. Локальные и внутренние адреса не принимаются.',
      },
    },
    example: {
      kicker: 'Готовый пример',
      title: <>Тот же бизнес.<br /><em>Совсем другой вход.</em></>,
      oldLabel: 'Раньше',
      oldTitle: 'ДОБРО ПОЖАЛОВАТЬ НА НАШ САЙТ!!!',
      oldCopy: 'Информация о компании, цены и контакты. Для продолжения нажмите на ссылки ниже.',
      oldAside: 'Лучше смотреть в разрешении 800 × 600',
      oldButton: 'ВОЙТИ НА САЙТ',
      newLabel: 'Результат CineLanding',
      newCopy: 'ORBIT — наш вымышленный кинотеатр: готовая адаптивная страница и 120 кадров, которыми управляет скролл.',
    },
    openSource: {
      kicker: 'Открытый код — это принцип',
      title: <>Используйте сервис.<br />Или запустите сами.</>,
      body: 'В сервисе вы платите за удобство: настройку проекта, управляемую генерацию, проверку, модули запуска и готовую сборку. Сам движок остаётся открытым под AGPL-3.0 для тех, кто хочет установить его самостоятельно.',
      primary: 'Начать со своего URL',
      secondary: 'Открыть GitHub',
      note: 'Самостоятельная установка без ограничений · сервис остаётся выбором',
    },
    ribbon: ['ЧИТАЕМ СТАРЫЙ САЙТ', 'СОБИРАЕМ НОВУЮ ИСТОРИЮ', 'ПРОВЕРЯЕМ ПУТЬ К ЗАПУСКУ', 'ПУБЛИКУЕМ РАБОЧУЮ СТРАНИЦУ'],
    footer: 'CineLanding превращает полезные старые сайты в запоминающиеся новые.',
    source: 'GitHub',
  },
} as const;

const githubUrl = 'https://github.com/alex-zykin/CineLanding';

export default function Home() {
  const [locale, setLocale] = useState<Locale>('en');
  const [localeReady, setLocaleReady] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceHost, setSourceHost] = useState('');
  const [validatedSourceUrl, setValidatedSourceUrl] = useState('');
  const [sourceError, setSourceError] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<StudioOptionCode[]>([]);
  const sourceInputId = useId();
  const t = content[locale];
  const pricedOptions = locale === 'ru' ? selectedOptions : [];
  const pricingSummary = createStudioPriceSummary(
    pricedOptions,
    locale === 'ru' ? 'ru-RU' : 'en-US',
  );
  const workspaceUrl = (() => {
    if (!validatedSourceUrl) return '';
    const query = new URLSearchParams({ mode: 'redesign', url: validatedSourceUrl, lang: locale });
    for (const option of pricedOptions) query.append('option', option);
    return `/app/new?${query.toString()}`;
  })();

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('lang');
    const saved = window.localStorage.getItem('cinelanding-locale');
    const nextLocale = requested === 'ru' || requested === 'en'
      ? requested
      : saved === 'ru' || saved === 'en'
        ? saved
        : 'en';

    const timer = window.setTimeout(() => {
      setLocale(nextLocale);
      setLocaleReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!localeReady) return;

    document.documentElement.lang = locale;
    const applyLocalizedMetadata = () => {
      if (document.title !== t.pageTitle) document.title = t.pageTitle;
      const description = document.querySelector('meta[name="description"]');
      if (description?.getAttribute('content') !== t.pageDescription) {
        description?.setAttribute('content', t.pageDescription);
      }
    };
    applyLocalizedMetadata();
    window.localStorage.setItem('cinelanding-locale', locale);

    const url = new URL(window.location.href);
    if (locale === 'ru') url.searchParams.set('lang', 'ru');
    else url.searchParams.delete('lang');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);

    // Next's streamed metadata may settle after hydration on a remote build.
    // Keep the user-selected locale authoritative if the head changes later.
    const metadataObserver = new MutationObserver(applyLocalizedMetadata);
    metadataObserver.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => metadataObserver.disconnect();
  }, [locale, localeReady, t.pageDescription, t.pageTitle]);

  useEffect(() => {
    const updateProgress = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight;
      const progress = available > 0 ? Math.min(window.scrollY / available, 1) : 0;
      document.documentElement.style.setProperty('--page-progress', `${progress * 100}%`);
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);

    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, []);

  const handleSourceSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSourceError('');
    setSourceHost('');
    setValidatedSourceUrl('');

    try {
      const normalized = normalizeSourceUrl(sourceUrl);
      setSourceUrl(normalized.url);
      setSourceHost(normalized.hostname);
      setValidatedSourceUrl(normalized.url);
    } catch (error) {
      const code = error instanceof SourceUrlError ? error.code : 'invalid';
      setSourceError(t.pricing.errors[code] ?? t.pricing.errors.invalid);
    }
  };

  const setOptionSelected = (code: StudioOptionCode, checked: boolean) => {
    setSelectedOptions((current) => STUDIO_OPTION_ORDER.filter((option) => (
      option === code ? checked : current.includes(option as StudioOptionCode)
    )) as StudioOptionCode[]);
  };

  const switchLocale = () => {
    if (locale === 'ru') setSelectedOptions([]);
    setLocale(locale === 'en' ? 'ru' : 'en');
  };

  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label={t.homeLabel}>
          <span className="brand-mark" aria-hidden="true">C</span>
          <span className="brand-copy"><strong>{t.brand}</strong><small>{t.brandNote}</small></span>
        </a>

        <nav className="site-nav" aria-label={t.navLabel}>
          {t.nav.map(([label, href]) => <a href={href} key={href}>{label}</a>)}
        </nav>

        <div className="header-actions">
          <a className="studio-link" href={`/sign-in?lang=${locale}`} aria-label={t.studioAriaLabel}>
            <span>{t.studioLabel}</span>
            <small>{t.studioNote}</small>
          </a>
          <button
            className="language-switch"
            type="button"
            onClick={switchLocale}
            aria-label={t.switchLabel}
          >
            <strong>{locale === 'en' ? 'EN' : 'RU'}</strong>
            <span> / {locale === 'en' ? 'RU' : 'EN'}</span>
          </button>
        </div>
        <span className="page-progress" aria-hidden="true" />
      </header>

      <ScrollSequence
        id="top"
        ariaLabel={t.showcaseLabel}
        beats={t.showcaseBeats}
        scrollLabel={t.showcaseScroll}
        frameLabel={t.showcaseFrame}
        sequenceLabel={t.sequenceLabel}
      />

      <section className="programme-section" id="workflow">
        <div className="section-intro reveal">
          <p className="eyebrow">{t.workflow.kicker}</p>
          <h2>{t.workflow.title}</h2>
          <p className="lede">{t.workflow.body}</p>
        </div>

        <ol className="film-list">
          {t.workflow.steps.map(([index, title, detail, note]) => (
            <li className="film-row reveal" key={index}>
              <span className="film-index">{index}</span>
              <time>{t.workflow.stepLabel}</time>
              <div><h3>{title}</h3><p>{detail}</p></div>
              <span className="film-note">{note}</span>
              <a href={index === '03' ? '#pricing' : '#concept'} aria-label={`${t.workflow.action}: ${title}`}><span>{t.workflow.action}</span><b aria-hidden="true">↓</b></a>
            </li>
          ))}
        </ol>
      </section>

      <div className="type-ribbon" aria-hidden="true">
        {t.ribbon.map((line) => <span key={line}>{line}</span>)}
      </div>

      <section className="house-section" id="concept">
        <div className="house-copy reveal">
          <p className="eyebrow">{t.concept.kicker}</p>
          <h2>{t.concept.title}</h2>
          <p className="lede">{t.concept.body}</p>
        </div>

        <figure className="house-visual reveal">
          <Image
            src="/sequence/frame_0086.jpg"
            alt={t.concept.imageAlt}
            fill
            sizes="(max-width: 800px) 100vw, 58vw"
          />
          <span className="house-aperture" aria-hidden="true" />
          <figcaption>{t.concept.caption}</figcaption>
        </figure>

        <div className="house-facts">
          {t.concept.facts.map(([value, label]) => (
            <div className="house-fact reveal" key={value}>
              <strong>{value}</strong><span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {locale === 'ru' ? (
        <section className="business-section" id="business-ready">
          <div className="business-heading reveal">
            <p className="eyebrow">{content.ru.businessReady.kicker}</p>
            <h2>{content.ru.businessReady.title}</h2>
            <p>{content.ru.businessReady.body}</p>
          </div>

          <div className="business-grid">
            {content.ru.businessReady.modules.map((module) => (
              <article className="business-card reveal" key={module.code}>
                <div className="business-card-topline">
                  <span>{module.index}</span>
                  <strong>{module.status}</strong>
                </div>
                <h3>{module.title}</h3>
                <p>{module.body}</p>
                <ul>{module.points.map((point) => <li key={point}>{point}</li>)}</ul>
                <small>{module.note}</small>
              </article>
            ))}
          </div>

          <a className="business-action reveal" href="#pricing">
            <span>{content.ru.businessReady.action}</span><b aria-hidden="true">↓</b>
          </a>
        </section>
      ) : null}

      <section className="visit-section" id="pricing">
        <div className="visit-heading reveal">
          <p className="eyebrow">{t.pricing.kicker}</p>
          <h2>{t.pricing.title}</h2>
        </div>
        <div className="visit-copy reveal">
          <p>{t.pricing.body}</p>
          <a className="round-action" href="#start" aria-label={t.pricing.action}><span>{t.pricing.action}</span><b aria-hidden="true">↓</b></a>
        </div>

        <article className="ticket-card project-card reveal" id="start">
          <div className="ticket-topline"><span>CINELANDING</span><span>{t.pricing.cardLabel}</span></div>
          <output className="project-price" aria-live="polite">
            {formatRubleAmount(pricingSummary.totalAmountMinor, locale)}
            <small>{t.pricing.priceNote}</small>
          </output>

          {locale === 'ru' ? (
            <fieldset className="project-options">
              <legend>{content.ru.pricing.optionLegend}</legend>
              <p>{content.ru.pricing.optionHint}</p>
              <div className="project-option-list">
                {content.ru.pricing.options.map(([code, label, detail]) => (
                  <label className="project-option" key={code}>
                    <input
                      type="checkbox"
                      checked={selectedOptions.includes(code)}
                      onChange={(event) => setOptionSelected(code, event.target.checked)}
                    />
                    <span><strong>{label}</strong><small>{detail}</small></span>
                    <b>+{formatRubleAmount(STUDIO_PRICING_CATALOG.options[code].amountMinor, locale)}</b>
                  </label>
                ))}
              </div>
              <div className="project-total-line">
                <span>{content.ru.pricing.totalLabel}</span>
                <output aria-live="polite">{formatRubleAmount(pricingSummary.totalAmountMinor, locale)}</output>
              </div>
              <small className="project-checkout-note">{content.ru.pricing.checkoutNote}</small>
            </fieldset>
          ) : null}

          <form className="project-form" onSubmit={handleSourceSubmit} noValidate>
            <label htmlFor={sourceInputId}>{t.pricing.urlLabel}</label>
            <div className="project-input-row">
              <input
                id={sourceInputId}
                inputMode="url"
                name="source-url"
                onChange={(event) => {
                  setSourceUrl(event.target.value);
                  setSourceHost('');
                  setValidatedSourceUrl('');
                  setSourceError('');
                }}
                placeholder={t.pricing.urlPlaceholder}
                spellCheck={false}
                type="url"
                value={sourceUrl}
                aria-describedby={`${sourceInputId}-note${sourceError ? ` ${sourceInputId}-error` : ''}`}
                aria-invalid={Boolean(sourceError)}
              />
              <button type="submit">{t.pricing.submit}<span aria-hidden="true">→</span></button>
            </div>
            {sourceError ? <p className="project-message is-error" id={`${sourceInputId}-error`} role="alert">{sourceError}</p> : null}
            {sourceHost ? (
              <div className="project-message is-ready">
                <div className="project-ready-status" role="status">
                  <strong>{t.pricing.readyTitle}</strong>
                  <span className="project-ready-copy">{t.pricing.readyBody.replace('{host}', sourceHost)}</span>
                </div>
                <a className="project-continue" href={workspaceUrl}>
                  {t.pricing.readyAction}<span aria-hidden="true">→</span>
                </a>
              </div>
            ) : null}
            <p className="project-form-note" id={`${sourceInputId}-note`}>{t.pricing.formNote}</p>
          </form>

          <ul className="project-scope">{t.pricing.scope.map((line) => <li key={line}>{line}</li>)}</ul>
          <div className="ticket-code" aria-hidden="true">CINE / MVP / 001</div>
        </article>
      </section>

      <section className="before-section" id="example">
        <div className="before-heading reveal">
          <p className="eyebrow">{t.example.kicker}</p>
          <h2>{t.example.title}</h2>
        </div>
        <div className="before-grid">
          <article className="old-browser reveal">
            <div className="browser-bar"><i /><i /><i /><span>example-business.ru/index.html</span></div>
            <div className="old-site">
              <span>{t.example.oldLabel}</span>
              <p className="old-stars" aria-hidden="true">✦ ✧ ✦ ✧ ✦</p>
              <h3>{t.example.oldTitle}</h3>
              <p>{t.example.oldCopy}</p>
              <button type="button">{t.example.oldButton}</button>
              <small>{t.example.oldAside}</small>
            </div>
          </article>
          <article className="now-card reveal">
            <span>{t.example.newLabel}</span>
            <div className="now-frame">
              <Image src="/sequence/frame_0119.jpg" alt="" fill sizes="(max-width: 800px) 100vw, 45vw" />
              <b>ORBIT</b>
            </div>
            <p>{t.example.newCopy}</p>
          </article>
        </div>
      </section>

      <section className="reveal-section" id="about">
        <div className="reveal-rings" aria-hidden="true"><i /><i /><i /></div>
        <div className="reveal-content reveal">
          <p className="eyebrow">{t.openSource.kicker}</p>
          <h2>{t.openSource.title}</h2>
          <p>{t.openSource.body}</p>
          <div className="reveal-actions">
            <a className="button button-primary" href="#start">{t.openSource.primary}<span aria-hidden="true">↓</span></a>
            <a className="button button-ghost" href={githubUrl} target="_blank" rel="noreferrer">{t.openSource.secondary}<span aria-hidden="true">↗</span></a>
          </div>
          <small>{t.openSource.note}</small>
        </div>
      </section>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#top" aria-label={t.homeLabel}>
          <span className="brand-mark" aria-hidden="true">C</span>
          <span className="brand-copy"><strong>{t.brand}</strong><small>{t.brandNote}</small></span>
        </a>
        <p>{t.footer}</p>
        <a href={githubUrl} target="_blank" rel="noreferrer">{t.source} ↗</a>
      </footer>
    </main>
  );
}
