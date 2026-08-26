'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type Locale = 'en' | 'ru';

const content = {
  en: {
    pageTitle: 'CineLanding | Turn scrolling into cinema',
    pageDescription: 'An open source workflow for cinematic, scroll-linked landing pages.',
    nav: ['Modes', 'Sequence', 'Process'],
    homeLabel: 'CineLanding home',
    navLabel: 'Primary navigation',
    stageLabel: 'CineLanding generated transition',
    settingsLabel: 'Project settings',
    firstFrameAlt: 'Dark corridor with a vermilion portal',
    lastFrameAlt: 'Bright corridor with an ivory portal',
    switchLabel: 'Переключить на русский',
    eyebrow: 'Agent-directed landing pages',
    heroTitle: <>Turn scrolling<br />into <em>cinema.</em></>,
    heroIntro: 'Plan the story. Hold every frame. Build a landing page that moves with intent, not with a template.',
    heroPrimary: 'Watch the sequence',
    source: 'View source',
    scroll: 'Scroll to direct',
    sceneLabel: 'Scene 01',
    frameCaption: 'Hold the geometry.',
    manifest: ['mode: from-scratch', 'motion: journey', 'locale: en-US / ru-RU', 'provider: KIE'],
    sequenceKicker: 'The live cut',
    sequenceTitle: <>One visual idea.<br /><em>Three exact states.</em></>,
    sequenceBody: 'CineLanding keeps the first frame, generated transition, and final frame in one reviewed sequence. Your copy stays in the DOM. The motion stays in the media.',
    sequenceFacts: [
      ['01', 'Anchor', 'A precise opening composition'],
      ['02', 'Generate', 'A controlled KIE transition'],
      ['03', 'Assemble', 'A real page in your frontend'],
    ],
    frames: ['First frame', 'Generated cut', 'Last frame'],
    modesKicker: 'Choose the starting point',
    modesTitle: 'Two modes. One production path.',
    modes: [
      {
        number: '01',
        name: 'Redesign',
        command: '--mode redesign',
        body: 'Start with a public website. The agent studies its structure, facts, and visual rhythm, then rebuilds the experience without blindly copying the source.',
        input: 'Input: website URL',
      },
      {
        number: '02',
        name: 'From scratch',
        command: '--mode from-scratch',
        body: 'Start with a brief, approved copy, and supplied assets. The agent shapes the page outline, anchor frames, motion, and final implementation.',
        input: 'Input: brief + assets',
      },
    ],
    processKicker: 'A small, honest workflow',
    processTitle: 'From brief to browser.',
    process: [
      ['Frame the story', 'Define the audience, page goal, visible copy, and the fewest scenes needed to tell it.'],
      ['Direct the motion', 'Lock first and last frames, run the free mock path, then approve each paid generation.'],
      ['Build the page', 'Move the reviewed media into the target frontend, keep text semantic, and test the actual route.'],
    ],
    proofKicker: 'Made to be checked',
    proofTitle: <>Beautiful output.<br />Boring safeguards.</>,
    proofBody: 'The workflow separates paid calls from planning, records every job, protects against duplicate submissions, and keeps provider keys out of the browser.',
    proof: [
      ['25/25', 'core tests passing'],
      ['0', 'credits used in mock mode'],
      ['1', 'reviewed call per scene'],
      ['AGPL', 'source stays open'],
    ],
    ctaKicker: 'Open source. Agent ready.',
    ctaTitle: <>Your next landing<br />starts with a scene.</>,
    ctaBody: 'Clone CineLanding, choose a mode, and let your coding agent carry the work from the first frame to the finished page.',
    ctaPrimary: 'Open on GitHub',
    ctaSecondary: 'Read the workflow',
    footerNote: 'Built with CineLanding, using CineLanding.',
  },
  ru: {
    pageTitle: 'CineLanding | Превращаем скролл в кино',
    pageDescription: 'Открытый процесс создания кинематографичных лендингов со скролл-анимацией.',
    nav: ['Режимы', 'Сцена', 'Процесс'],
    homeLabel: 'Главная CineLanding',
    navLabel: 'Основная навигация',
    stageLabel: 'Переход, созданный CineLanding',
    settingsLabel: 'Настройки проекта',
    firstFrameAlt: 'Темный коридор с киноварным порталом',
    lastFrameAlt: 'Светлый коридор с порталом цвета слоновой кости',
    switchLabel: 'Switch to English',
    eyebrow: 'Лендинги под режиссурой агента',
    heroTitle: <>Превращаем<br />скролл в <em>кино.</em></>,
    heroIntro: 'Продумайте историю. Удерживайте каждый кадр. Соберите лендинг, который движется осмысленно, а не по шаблону.',
    heroPrimary: 'Смотреть сцену',
    source: 'Открыть код',
    scroll: 'Листайте, чтобы начать',
    sceneLabel: 'Сцена 01',
    frameCaption: 'Сохраняем геометрию.',
    manifest: ['режим: с нуля', 'движение: journey', 'язык: en-US / ru-RU', 'провайдер: KIE'],
    sequenceKicker: 'Готовый переход',
    sequenceTitle: <>Одна идея.<br /><em>Три точных состояния.</em></>,
    sequenceBody: 'CineLanding связывает первый кадр, сгенерированный переход и финальный кадр в одну проверенную сцену. Текст остается в DOM, движение живет в медиа.',
    sequenceFacts: [
      ['01', 'Опора', 'Точная начальная композиция'],
      ['02', 'Генерация', 'Управляемый переход KIE'],
      ['03', 'Сборка', 'Настоящая страница во frontend'],
    ],
    frames: ['Первый кадр', 'Готовый переход', 'Последний кадр'],
    modesKicker: 'Выберите отправную точку',
    modesTitle: 'Два режима. Один рабочий путь.',
    modes: [
      {
        number: '01',
        name: 'Переработка',
        command: '--mode redesign',
        body: 'Начните с публичного сайта. Агент изучит структуру, факты и визуальный ритм, а затем соберет новую версию без слепого копирования исходника.',
        input: 'На входе: адрес сайта',
      },
      {
        number: '02',
        name: 'С нуля',
        command: '--mode from-scratch',
        body: 'Начните с брифа, согласованного текста и материалов. Агент подготовит структуру, опорные кадры, движение и конечную реализацию.',
        input: 'На входе: бриф + материалы',
      },
    ],
    processKicker: 'Небольшой честный процесс',
    processTitle: 'От брифа до браузера.',
    process: [
      ['Собрать историю', 'Определить аудиторию, цель, видимый текст и минимальное число сцен для рассказа.'],
      ['Поставить движение', 'Зафиксировать первый и последний кадры, пройти бесплатный mock и подтвердить каждую платную генерацию.'],
      ['Собрать страницу', 'Перенести проверенные медиа во frontend, оставить текст семантическим и проверить рабочий маршрут.'],
    ],
    proofKicker: 'Можно проверить',
    proofTitle: <>Красивый результат.<br />Скучные предохранители.</>,
    proofBody: 'Процесс отделяет планирование от платных вызовов, сохраняет историю задач, защищает от повторной отправки и не отдает ключ провайдера в браузер.',
    proof: [
      ['25/25', 'тестов ядра проходят'],
      ['0', 'кредитов тратит mock'],
      ['1', 'проверенный вызов на сцену'],
      ['AGPL', 'исходный код открыт'],
    ],
    ctaKicker: 'Открытый код. Готов к агенту.',
    ctaTitle: <>Следующий лендинг<br />начинается со сцены.</>,
    ctaBody: 'Клонируйте CineLanding, выберите режим и проведите работу вместе с coding-агентом от первого кадра до готовой страницы.',
    ctaPrimary: 'Открыть GitHub',
    ctaSecondary: 'Читать процесс',
    footerNote: 'Сделано в CineLanding с помощью CineLanding.',
  },
} as const;

const githubUrl = 'https://github.com/alex-zykin/CineLanding';

export default function Home() {
  const [locale, setLocale] = useState<Locale>('en');
  const [localeReady, setLocaleReady] = useState(false);
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

    document.documentElement.lang = locale === 'en' ? 'en' : 'ru';
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

  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label={t.homeLabel}>
          <span className="brand-mark" aria-hidden="true">CL</span>
          <span>CineLanding</span>
        </a>

        <nav className="site-nav" aria-label={t.navLabel}>
          <a href="#modes">{t.nav[0]}</a>
          <a href="#sequence">{t.nav[1]}</a>
          <a href="#process">{t.nav[2]}</a>
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

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> {t.eyebrow}</p>
          <h1>{t.heroTitle}</h1>
          <p className="hero-intro">{t.heroIntro}</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#sequence">{t.heroPrimary}</a>
            <a className="button button-text" href={githubUrl} target="_blank" rel="noreferrer">
              {t.source} <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

        <div className="hero-stage" aria-label={t.stageLabel}>
          <div className="film-label film-label-top">
            <span>{t.sceneLabel}</span><span>16:9</span><span>KIE / 720P</span>
          </div>
          <div className="film-frame">
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/frames/portal-first.png"
              aria-hidden="true"
            >
              <source src="/media/portal-sequence.mp4" type="video/mp4" />
            </video>
            <div className="frame-vignette" />
            <div className="frame-caption">
              <span>First → last</span>
              <strong>{t.frameCaption}</strong>
            </div>
          </div>
          <div className="film-label film-label-bottom">
            <span>00:00:01</span><span className="timeline"><i /></span><span>00:00:05</span>
          </div>
        </div>

        <div className="scroll-cue" aria-hidden="true"><span>{t.scroll}</span><i /></div>
      </section>

      <aside className="manifest-strip" aria-label={t.settingsLabel}>
        {t.manifest.map((item) => <span key={item}>{item}</span>)}
      </aside>

      <section className="sequence-section" id="sequence">
        <div className="sequence-copy reveal">
          <p className="section-kicker">{t.sequenceKicker}</p>
          <h2>{t.sequenceTitle}</h2>
          <p className="section-body">{t.sequenceBody}</p>
          <div className="sequence-facts">
            {t.sequenceFacts.map(([number, title, detail]) => (
              <div className="sequence-fact" key={number}>
                <span>{number}</span>
                <strong>{title}</strong>
                <p>{detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="sequence-media reveal">
          <div className="sequence-track" aria-hidden="true"><i /></div>
          <figure className="sequence-frame sequence-frame-first">
            <Image
              src="/frames/portal-first.png"
              alt={t.firstFrameAlt}
              width={1730}
              height={973}
              sizes="(max-width: 980px) 100vw, 48vw"
            />
            <figcaption><span>01</span>{t.frames[0]}</figcaption>
          </figure>
          <figure className="sequence-frame sequence-frame-video">
            <video muted autoPlay loop playsInline poster="/frames/portal-first.png" aria-hidden="true">
              <source src="/media/portal-sequence.mp4" type="video/mp4" />
            </video>
            <figcaption><span>02</span>{t.frames[1]}</figcaption>
          </figure>
          <figure className="sequence-frame sequence-frame-last">
            <Image
              src="/frames/portal-last.png"
              alt={t.lastFrameAlt}
              width={1730}
              height={973}
              sizes="(max-width: 980px) 100vw, 48vw"
            />
            <figcaption><span>03</span>{t.frames[2]}</figcaption>
          </figure>
        </div>
      </section>

      <section className="modes-section" id="modes">
        <div className="section-heading reveal">
          <p className="section-kicker">{t.modesKicker}</p>
          <h2>{t.modesTitle}</h2>
        </div>
        <div className="modes-grid">
          {t.modes.map((mode, index) => (
            <article className={`mode-panel mode-panel-${index + 1} reveal`} key={mode.command}>
              <div className="mode-topline"><span>{mode.number}</span><code>{mode.command}</code></div>
              <h3>{mode.name}</h3>
              <p>{mode.body}</p>
              <footer><span>{mode.input}</span><i aria-hidden="true">↗</i></footer>
            </article>
          ))}
        </div>
      </section>

      <section className="process-section" id="process">
        <div className="process-heading reveal">
          <p className="section-kicker">{t.processKicker}</p>
          <h2>{t.processTitle}</h2>
        </div>
        <ol className="process-list">
          {t.process.map(([title, body], index) => (
            <li className="process-step reveal" key={title}>
              <span className="process-number">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{body}</p>
              <span className="process-dot" aria-hidden="true" />
            </li>
          ))}
        </ol>
        <div className="command-line reveal">
          <span aria-hidden="true">$</span>
          <code>{'cinelanding new ./project --name "My landing" --mode from-scratch --motion-style journey'}</code>
          <a href={githubUrl} target="_blank" rel="noreferrer" aria-label={t.source}>↗</a>
        </div>
      </section>

      <section className="proof-section">
        <div className="proof-copy reveal">
          <p className="section-kicker">{t.proofKicker}</p>
          <h2>{t.proofTitle}</h2>
          <p className="section-body">{t.proofBody}</p>
        </div>
        <div className="proof-grid">
          {t.proof.map(([value, label]) => (
            <div className="proof-item reveal" key={value + label}>
              <strong>{value}</strong><span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-orbit cta-orbit-one" aria-hidden="true" />
        <div className="cta-orbit cta-orbit-two" aria-hidden="true" />
        <div className="cta-content reveal">
          <p className="section-kicker">{t.ctaKicker}</p>
          <h2>{t.ctaTitle}</h2>
          <p>{t.ctaBody}</p>
          <div className="hero-actions cta-actions">
            <a className="button button-light" href={githubUrl} target="_blank" rel="noreferrer">{t.ctaPrimary}</a>
            <a className="button button-text button-text-light" href={`${githubUrl}#create-a-project`} target="_blank" rel="noreferrer">{t.ctaSecondary} ↗</a>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="brand"><span className="brand-mark brand-mark-light" aria-hidden="true">CL</span><span>CineLanding</span></div>
        <p>{t.footerNote}</p>
        <div><a href={githubUrl}>GitHub</a><span>© 2026</span></div>
      </footer>
    </main>
  );
}
