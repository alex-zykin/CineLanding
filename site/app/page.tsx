'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import ScrollSequence from './scroll-sequence';

type Locale = 'en' | 'ru';

const content = {
  en: {
    pageTitle: 'ORBIT — Independent cinema | A CineLanding showcase',
    pageDescription: 'Step inside ORBIT, a fictional independent cinema reimagined with CineLanding.',
    brand: 'ORBIT',
    brandNote: 'Picture house',
    homeLabel: 'ORBIT home',
    navLabel: 'Primary navigation',
    nav: [
      ['Programme', '#programme'],
      ['The house', '#house'],
      ['Visit', '#visit'],
    ],
    switchLabel: 'Переключить на русский',
    showcaseLabel: 'A cinematic walk through ORBIT cinema',
    showcaseScroll: 'Scroll to enter',
    showcaseFrame: 'Scroll-directed sequence',
    showcaseBeats: [
      {
        kicker: 'Independent cinema · open nightly',
        title: <>Disappear<br />for a while.</>,
        body: 'Independent films, restored classics, and stories that stay with you—shown the way they were meant to be seen.',
        align: 'left',
        action: { label: 'See what’s on', href: '#programme' },
      },
      {
        kicker: 'The house',
        title: <>Built for the<br />big screen.</>,
        body: 'One auditorium. No bad rows. A room designed to let the street outside disappear.',
        align: 'right',
      },
      {
        kicker: 'The programme',
        title: <>Chosen,<br />not filled.</>,
        body: 'New voices, late-night cult films, director conversations, and classics returned to the screen.',
        align: 'left',
      },
      {
        kicker: 'The evening',
        title: <>Stay after<br />the credits.</>,
        body: 'Doors open early. The bar stays warm. Here, the film is only the beginning of the night.',
        align: 'right',
      },
    ],
    programme: {
      kicker: 'Now showing · Friday 27',
      title: <>Chosen for the room,<br /><em>not the algorithm.</em></>,
      body: 'Three films. One screen. Each programme is assembled by people who still believe a cinema can have a point of view.',
      booking: 'Choose seats',
      films: [
        ['18:30', 'After the Rain', 'Aya Mori · 2026 · 104 min', 'A quiet premiere'],
        ['21:10', 'A Map of Silence', 'Tomás Vale · 2025 · 118 min', 'Director conversation'],
        ['23:45', 'Night Shift', 'Lina Bell · 1997 · 96 min', 'Restored 4K'],
      ],
    },
    house: {
      kicker: 'The house · since 1978',
      title: <>Everything between<br />you and the screen<br /><em>has been removed.</em></>,
      body: 'No ads after the lights go down. No glowing menu boards. Just a carefully tuned room, a generous screen, and the few seconds of silence before a film begins.',
      imageAlt: 'The luminous entrance of the fictional ORBIT cinema',
      caption: 'Auditorium 01 / doors open 30 minutes before the film',
      facts: [
        ['4K', 'laser projection'],
        ['ATMOS', 'spatial sound'],
        ['196', 'deep-red seats'],
        ['7', 'nights a week'],
      ],
    },
    visit: {
      kicker: 'Before and after the film',
      title: <>Come for the film.<br /><em>Stay for the night.</em></>,
      body: 'The bar opens at six with small plates, natural wine, and enough time to argue about the ending. Tickets can be held at the door until fifteen minutes before the screening.',
      note: 'A fictional address for this showcase',
      address: <>18 Mercury Lane<br />East Quarter</>,
      hours: ['Bar from 18:00', 'First film 18:30', 'Last orders 01:00'],
      action: 'Plan your evening',
    },
    before: {
      kicker: 'A quiet transformation',
      title: <>The story was always good.<br /><em>The old website just buried it.</em></>,
      oldLabel: 'Before',
      oldTitle: 'WELCOME TO ORBIT CINEMA!!!',
      oldCopy: 'Your local movie theatre on the World Wide Web. Click here for listings, prices and directions.',
      oldAside: 'Best viewed at 800 × 600',
      newLabel: 'Now',
      newCopy: 'Same cinema. Same point of view. A website that finally feels like walking through its doors.',
    },
    reveal: {
      kicker: 'Now for the reveal',
      title: <>ORBIT is not<br />a real cinema.</>,
      body: 'It is a fictional client site created with CineLanding to show the finished result: a scroll-directed sequence generated through KIE, semantic page content, and a design that can grow from an outdated website or a blank page.',
      primary: 'Explore the open source',
      secondary: 'How it works',
      demo: 'Fictional showcase · no tickets are sold here',
    },
    footer: 'ORBIT was made with CineLanding.',
    source: 'GitHub',
  },
  ru: {
    pageTitle: 'ORBIT — независимый кинотеатр | Демо CineLanding',
    pageDescription: 'Зайдите в ORBIT — вымышленный независимый кинотеатр, переосмысленный с помощью CineLanding.',
    brand: 'ORBIT',
    brandNote: 'Кинозал',
    homeLabel: 'Главная ORBIT',
    navLabel: 'Основная навигация',
    nav: [
      ['Программа', '#programme'],
      ['Пространство', '#house'],
      ['Визит', '#visit'],
    ],
    switchLabel: 'Switch to English',
    showcaseLabel: 'Кинематографичный проход по кинотеатру ORBIT',
    showcaseScroll: 'Листайте, чтобы войти',
    showcaseFrame: 'Покадровая сцена под скроллом',
    showcaseBeats: [
      {
        kicker: 'Независимый кинотеатр · каждый вечер',
        title: <>Исчезните<br />на пару часов.</>,
        body: 'Независимое кино, восстановленная классика и истории, которые не отпускают — на большом экране, как и должно быть.',
        align: 'left',
        action: { label: 'Что сегодня', href: '#programme' },
      },
      {
        kicker: 'Пространство',
        title: <>Создан для<br />большого экрана.</>,
        body: 'Один зал. Плохих рядов нет. Здесь достаточно темноты, чтобы забыть об улице снаружи.',
        align: 'right',
      },
      {
        kicker: 'Программа',
        title: <>Выбираем,<br />а не заполняем.</>,
        body: 'Новые имена, ночные культовые показы, разговоры с режиссёрами и классика, которая возвращается на экран.',
        align: 'left',
      },
      {
        kicker: 'Вечер',
        title: <>Останьтесь<br />после титров.</>,
        body: 'Мы открываемся заранее. В баре тепло. Здесь фильм — только начало вечера.',
        align: 'right',
      },
    ],
    programme: {
      kicker: 'Сегодня · пятница, 27-е',
      title: <>Для этого зала,<br /><em>а не для алгоритма.</em></>,
      body: 'Три фильма. Один экран. Программу собирают люди, которые всё ещё верят: у кинотеатра может быть собственный взгляд.',
      booking: 'Выбрать места',
      films: [
        ['18:30', 'После дождя', 'Ая Мори · 2026 · 104 мин', 'Тихая премьера'],
        ['21:10', 'Карта тишины', 'Томас Вале · 2025 · 118 мин', 'Разговор с режиссёром'],
        ['23:45', 'Ночная смена', 'Лина Белл · 1997 · 96 мин', 'Реставрация 4K'],
      ],
    },
    house: {
      kicker: 'Пространство · с 1978 года',
      title: <>Между вами<br />и экраном<br /><em>ничего лишнего.</em></>,
      body: 'После начала — никакой рекламы. Никаких светящихся меню. Только настроенный зал, большой экран и несколько секунд тишины перед первым кадром.',
      imageAlt: 'Светящийся вход в вымышленный кинотеатр ORBIT',
      caption: 'Зал 01 / двери открываются за 30 минут до фильма',
      facts: [
        ['4K', 'лазерная проекция'],
        ['ATMOS', 'объёмный звук'],
        ['196', 'кресел'],
        ['7', 'вечеров в неделю'],
      ],
    },
    visit: {
      kicker: 'До и после фильма',
      title: <>Приходите на фильм.<br /><em>Оставайтесь ради вечера.</em></>,
      body: 'Бар открывается в шесть: небольшое меню, натуральное вино и время поспорить о финале. Билет можно забрать у входа не позднее чем за пятнадцать минут до сеанса.',
      note: 'Вымышленный адрес для этой демонстрации',
      address: <>Меркурий-лейн, 18<br />Восточный квартал</>,
      hours: ['Бар с 18:00', 'Первый сеанс 18:30', 'Последний заказ 01:00'],
      action: 'Спланировать вечер',
    },
    before: {
      kicker: 'Тихое преображение',
      title: <>История всегда была хорошей.<br /><em>Старый сайт просто мешал её увидеть.</em></>,
      oldLabel: 'Раньше',
      oldTitle: 'ДОБРО ПОЖАЛОВАТЬ В КИНОТЕАТР ORBIT!!!',
      oldCopy: 'Ваш кинотеатр во Всемирной паутине. Нажмите сюда: расписание, цены и схема проезда.',
      oldAside: 'Лучше смотреть в разрешении 800 × 600',
      newLabel: 'Теперь',
      newCopy: 'Тот же кинотеатр. Тот же характер. Сайт, который наконец похож на шаг через его двери.',
    },
    reveal: {
      kicker: 'А теперь — развязка',
      title: <>ORBIT — не<br />настоящий кинотеатр.</>,
      body: 'Это вымышленный клиентский сайт, собранный с помощью CineLanding. Так выглядит конечный результат: покадровая сцена от KIE под управлением скролла, живой текст в HTML и дизайн, который можно вырастить из устаревшего сайта или с чистого листа.',
      primary: 'Открыть исходный код',
      secondary: 'Как это работает',
      demo: 'Вымышленная демонстрация · билеты здесь не продаются',
    },
    footer: 'ORBIT сделан с помощью CineLanding.',
    source: 'GitHub',
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

  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label={t.homeLabel}>
          <span className="brand-mark" aria-hidden="true">O</span>
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
      />

      <section className="programme-section" id="programme">
        <div className="section-intro reveal">
          <p className="eyebrow">{t.programme.kicker}</p>
          <h2>{t.programme.title}</h2>
          <p className="lede">{t.programme.body}</p>
        </div>

        <ol className="film-list">
          {t.programme.films.map(([time, title, detail, note], index) => (
            <li className="film-row reveal" key={`${time}-${title}`}>
              <span className="film-index">0{index + 1}</span>
              <time>{time}</time>
              <div><h3>{title}</h3><p>{detail}</p></div>
              <span className="film-note">{note}</span>
              <a href="#visit" aria-label={`${t.programme.booking}: ${title}`}><span>{t.programme.booking}</span><b aria-hidden="true">↗</b></a>
            </li>
          ))}
        </ol>
      </section>

      <div className="type-ribbon" aria-hidden="true">
        <span>PICTURES NEED DARKNESS</span><i>●</i><span>STORIES NEED A ROOM</span><i>●</i><span>ORBIT / EAST QUARTER</span>
      </div>

      <section className="house-section" id="house">
        <div className="house-copy reveal">
          <p className="eyebrow">{t.house.kicker}</p>
          <h2>{t.house.title}</h2>
          <p className="lede">{t.house.body}</p>
        </div>

        <figure className="house-visual reveal">
          <Image
            src="/sequence/frame_0086.jpg"
            alt={t.house.imageAlt}
            fill
            sizes="(max-width: 800px) 100vw, 58vw"
          />
          <span className="house-aperture" aria-hidden="true" />
          <figcaption>{t.house.caption}</figcaption>
        </figure>

        <div className="house-facts">
          {t.house.facts.map(([value, label]) => (
            <div className="house-fact reveal" key={value}>
              <strong>{value}</strong><span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="visit-section" id="visit">
        <div className="visit-heading reveal">
          <p className="eyebrow">{t.visit.kicker}</p>
          <h2>{t.visit.title}</h2>
        </div>
        <div className="visit-copy reveal">
          <p>{t.visit.body}</p>
          <a className="round-action" href="#visit-card" aria-label={t.visit.action}><span>{t.visit.action}</span><b aria-hidden="true">↓</b></a>
        </div>
        <article className="ticket-card reveal" id="visit-card">
          <div className="ticket-topline"><span>ORBIT</span><span>ADMIT ONE</span></div>
          <div className="ticket-address">{t.visit.address}</div>
          <ul>{t.visit.hours.map((line) => <li key={line}>{line}</li>)}</ul>
          <p>{t.visit.note}</p>
          <div className="ticket-code" aria-hidden="true">010 110 111 100 011</div>
        </article>
      </section>

      <section className="before-section">
        <div className="before-heading reveal">
          <p className="eyebrow">{t.before.kicker}</p>
          <h2>{t.before.title}</h2>
        </div>
        <div className="before-grid">
          <article className="old-browser reveal">
            <div className="browser-bar"><i /><i /><i /><span>orbitcinema.net/index.html</span></div>
            <div className="old-site">
              <span>{t.before.oldLabel}</span>
              <p className="old-stars" aria-hidden="true">✦ ✧ ✦ ✧ ✦</p>
              <h3>{t.before.oldTitle}</h3>
              <p>{t.before.oldCopy}</p>
              <button type="button">ENTER SITE</button>
              <small>{t.before.oldAside}</small>
            </div>
          </article>
          <article className="now-card reveal">
            <span>{t.before.newLabel}</span>
            <div className="now-frame">
              <Image src="/sequence/frame_0119.jpg" alt="" fill sizes="(max-width: 800px) 100vw, 45vw" />
              <b>ORBIT</b>
            </div>
            <p>{t.before.newCopy}</p>
          </article>
        </div>
      </section>

      <section className="reveal-section" id="about">
        <div className="reveal-rings" aria-hidden="true"><i /><i /><i /></div>
        <div className="reveal-content reveal">
          <p className="eyebrow">{t.reveal.kicker}</p>
          <h2>{t.reveal.title}</h2>
          <p>{t.reveal.body}</p>
          <div className="reveal-actions">
            <a className="button button-primary" href={githubUrl} target="_blank" rel="noreferrer">{t.reveal.primary}<span aria-hidden="true">↗</span></a>
            <a className="button button-ghost" href={`${githubUrl}#readme`} target="_blank" rel="noreferrer">{t.reveal.secondary}<span aria-hidden="true">↗</span></a>
          </div>
          <small>{t.reveal.demo}</small>
        </div>
      </section>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#top" aria-label={t.homeLabel}>
          <span className="brand-mark" aria-hidden="true">O</span>
          <span className="brand-copy"><strong>{t.brand}</strong><small>{t.brandNote}</small></span>
        </a>
        <p>{t.footer}</p>
        <a href={githubUrl} target="_blank" rel="noreferrer">{t.source} ↗</a>
      </footer>
    </main>
  );
}
