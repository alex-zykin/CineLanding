'use client';

import Image from 'next/image';
import { useEffect, useId, useState, type FormEvent } from 'react';
import ScrollSequence from './scroll-sequence';
import { normalizeSourceUrl, SourceUrlError } from './source-url.mjs';

type Locale = 'en' | 'ru';

const content = {
  en: {
    pageTitle: 'CineLanding — Turn an old website into a cinematic landing page',
    pageDescription: 'Turn an existing website into a cinematic landing page with optional technical privacy and Prodamus launch modules.',
    brand: 'CINELANDING',
    brandNote: 'Managed web studio',
    homeLabel: 'CineLanding home',
    navLabel: 'Primary navigation',
    nav: [
      ['How it works', '#workflow'],
      ['Launch-ready', '#business-ready'],
      ['Example', '#example'],
      ['Pricing', '#pricing'],
    ],
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
        body: 'After payment, CineLanding prepares the cinematic sequence, responsive page, source code, and the selected launch modules.',
        align: 'right',
      },
    ],
    workflow: {
      kicker: 'A clear route from old to new',
      title: <>No mystery.<br /><em>Just three decisions.</em></>,
      body: 'You see what happens at every stage, what is free, and what the 5,000 ₽ build includes before you spend anything.',
      action: 'See the scope',
      stepLabel: 'Step',
      steps: [
        ['01', 'Site review', 'We map the offer, content, audience, and what is worth keeping.', 'Included'],
        ['02', 'Free direction', 'Page structure, visual tone, and a scene plan you can judge.', 'Before payment'],
        ['03', 'Managed build', 'A responsive landing, one scroll scene, source code, and selected launch modules.', '5,000 ₽'],
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
      title: <>Start free.<br /><em>Build it for 5,000 ₽.</em></>,
      body: 'The first paid offer is intentionally simple: one old website becomes one polished landing page. No subscription and no surprise usage bill.',
      action: 'Open the form',
      cardLabel: 'Managed draft',
      price: '5,000 ₽',
      priceNote: 'per project',
      urlLabel: 'Your current website',
      urlPlaceholder: 'example.com',
      submit: 'Check this address',
      formNote: 'This preview checks the address in your browser only. It does not inspect, send, or save the website yet.',
      readyTitle: 'The address looks ready',
      readyBody: 'The next MVP step for {host} is sign-in, a short brief, and a saved concept request.',
      scope: ['One landing page', 'One language', 'One scroll sequence', 'One small revision', 'Technical privacy report', 'Prodamus-ready scaffold'],
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
    pageDescription: 'Превратите действующий сайт в кинематографичный лендинг с технической проверкой данных и модулем подключения Prodamus.',
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
        body: 'После оплаты CineLanding готовит покадровую сцену, адаптивную страницу, исходный код и выбранные модули запуска.',
        align: 'right',
      },
    ],
    workflow: {
      kicker: 'Понятный путь от старого к новому',
      title: <>Никакой магии.<br /><em>Три понятных решения.</em></>,
      body: 'Вы заранее видите каждый этап, бесплатную часть и состав сборки за 5 000 ₽ — до любых расходов.',
      action: 'Посмотреть состав',
      stepLabel: 'Этап',
      steps: [
        ['01', 'Разбор сайта', 'Собираем предложение, контент, аудиторию и то, что стоит сохранить.', 'Включено'],
        ['02', 'Бесплатное направление', 'Структура страницы, визуальный характер и план сцен.', 'До оплаты'],
        ['03', 'Готовая сборка', 'Адаптивный лендинг, одна scroll-сцена, исходный код и выбранные модули запуска.', '5 000 ₽'],
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
      kicker: 'Не только дизайн',
      title: <>Техническая основа<br /><em>для запуска в России.</em></>,
      body: 'Добавьте к проекту проверку готовности к требованиям 152-ФЗ и модуль оплаты Prodamus. CineLanding подготовит рабочие файлы, контракт реализации и чек-лист запуска. Вам останется подключить свои реквизиты и пройти финальные проверки.',
      action: 'Создать проект с двумя модулями',
      modules: [
        {
          index: '01',
          status: 'Технический аудит',
          title: 'Проверка готовности к 152-ФЗ',
          body: 'Проверяем, где собираются и хранятся персональные данные, какие сервисы их получают, как устроены доступ, логи, сроки хранения и удаление.',
          points: ['Карта потоков данных', 'Подтверждения и риски', 'Задачи на исправление', 'Проверки окружения'],
          note: 'Это техническая проверка, а не юридическое заключение или сертификат соответствия.',
        },
        {
          index: '02',
          status: 'Готово к подключению',
          title: 'Модуль оплаты Prodamus',
          body: 'Готовим серверный контракт оплаты: идентификатор заказа, проверку подписи webhook, защиту от повторной обработки и журнал платежей.',
          points: ['Сумма с сервера', 'Проверенный webhook', 'Защита от дублей', 'Контрольный платёж'],
          note: 'Для запуска нужны кабинет Prodamus, серверные реквизиты, backend и успешный тестовый платёж.',
        },
      ],
    },
    pricing: {
      kicker: 'Один проект — одна понятная цена',
      title: <>Начните бесплатно.<br /><em>Сборка — 5 000 ₽.</em></>,
      body: 'Первое предложение намеренно простое: один старый сайт превращается в один аккуратный лендинг. Без подписки и неожиданного счёта за генерации.',
      action: 'Открыть форму',
      cardLabel: 'Готовая сборка',
      price: '5 000 ₽',
      priceNote: 'за проект',
      urlLabel: 'Адрес действующего сайта',
      urlPlaceholder: 'example.ru',
      submit: 'Проверить адрес',
      formNote: 'Сейчас форма проверяет адрес только в вашем браузере. Она ещё не анализирует, не отправляет и не сохраняет сайт.',
      readyTitle: 'Адрес подходит для проекта',
      readyBody: 'Следующий шаг MVP для {host} — вход, короткий бриф и сохранённая заявка на концепт.',
      scope: ['Один лендинг', 'Один язык', 'Одна scroll-сцена', 'Одна небольшая правка', 'Технический отчёт по данным', 'Заготовка Prodamus'],
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
  const [sourceError, setSourceError] = useState('');
  const sourceInputId = useId();
  const t = content[locale];

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
    document.title = t.pageTitle;
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.pageDescription);
    window.localStorage.setItem('cinelanding-locale', locale);

    const url = new URL(window.location.href);
    if (locale === 'ru') url.searchParams.set('lang', 'ru');
    else url.searchParams.delete('lang');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
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

    try {
      const normalized = normalizeSourceUrl(sourceUrl);
      setSourceUrl(normalized.url);
      setSourceHost(normalized.hostname);
    } catch (error) {
      const code = error instanceof SourceUrlError ? error.code : 'invalid';
      setSourceError(t.pricing.errors[code] ?? t.pricing.errors.invalid);
    }
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

        <button
          className="language-switch"
          type="button"
          onClick={() => setLocale(locale === 'en' ? 'ru' : 'en')}
          aria-label={t.switchLabel}
        >
          <strong>{locale === 'en' ? 'EN' : 'RU'}</strong>
          <span> / {locale === 'en' ? 'RU' : 'EN'}</span>
        </button>
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

      <section className="business-section" id="business-ready">
        <div className="business-heading reveal">
          <p className="eyebrow">{t.businessReady.kicker}</p>
          <h2>{t.businessReady.title}</h2>
          <p>{t.businessReady.body}</p>
        </div>

        <div className="business-grid">
          {t.businessReady.modules.map((module) => (
            <article className="business-card reveal" key={module.index}>
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

        <a className="business-action reveal" href="#start">
          <span>{t.businessReady.action}</span><b aria-hidden="true">↓</b>
        </a>
      </section>

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
          <div className="project-price">{t.pricing.price}<small>{t.pricing.priceNote}</small></div>

          <form className="project-form" onSubmit={handleSourceSubmit} noValidate>
            <label htmlFor={sourceInputId}>{t.pricing.urlLabel}</label>
            <div className="project-input-row">
              <input
                id={sourceInputId}
                inputMode="url"
                name="source-url"
                onChange={(event) => setSourceUrl(event.target.value)}
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
              <div className="project-message is-ready" role="status">
                <strong>{t.pricing.readyTitle}</strong>
                <span>{t.pricing.readyBody.replace('{host}', sourceHost)}</span>
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
