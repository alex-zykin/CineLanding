'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type StudioLocale = 'en' | 'ru';

const chromeCopy = {
  en: {
    brandNote: 'Project studio',
    projects: 'Projects',
    newProject: 'New project',
    source: 'Open source',
    back: 'Public site',
    demo: 'Local demo',
    demoNote: 'Projects stay in this browser. Accounts, payments, KIE, and publishing are not connected.',
    switchLabel: 'Переключить интерфейс на русский',
  },
  ru: {
    brandNote: 'Студия проектов',
    projects: 'Проекты',
    newProject: 'Новый проект',
    source: 'Открытый код',
    back: 'Главная',
    demo: 'Локальное демо',
    demoNote: 'Проекты остаются в этом браузере. Аккаунты, оплата, KIE и публикация пока не подключены.',
    switchLabel: 'Switch the interface to English',
  },
} as const;

const StudioLocaleContext = createContext<{
  locale: StudioLocale;
  setLocale: (locale: StudioLocale) => void;
}>({
  locale: 'en',
  setLocale: () => undefined,
});

export function useStudioLocale() {
  return useContext(StudioLocaleContext);
}

export default function StudioShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const [locale, setLocale] = useState<StudioLocale>('en');
  const isWorkspace = pathname.startsWith('/app');
  const t = chromeCopy[locale];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const requested = new URLSearchParams(window.location.search).get('lang');
      const saved = window.localStorage.getItem('cinelanding-locale');
      const next = requested === 'ru' || requested === 'en'
        ? requested
        : saved === 'ru' || saved === 'en'
          ? saved
          : 'en';
      setLocale(next);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem('cinelanding-locale', locale);
  }, [locale]);

  const context = useMemo(() => ({ locale, setLocale }), [locale]);

  return (
    <StudioLocaleContext.Provider value={context}>
      <div className="studio-root">
        <header className="studio-header">
          <Link className="studio-brand" href="/" aria-label="CineLanding">
            <span className="studio-brand-mark" aria-hidden="true">C</span>
            <span>
              <strong>CINELANDING</strong>
              <small>{t.brandNote}</small>
            </span>
          </Link>

          {isWorkspace ? (
            <nav className="studio-nav" aria-label={t.projects}>
              <Link className={pathname === '/app' ? 'is-active' : ''} href="/app">{t.projects}</Link>
              <Link className={pathname === '/app/new' ? 'is-active' : ''} href="/app/new">{t.newProject}</Link>
            </nav>
          ) : <span className="studio-header-rule" aria-hidden="true" />}

          <div className="studio-header-actions">
            <Link className="studio-text-link studio-source-link" href="https://github.com/alex-zykin/CineLanding" target="_blank" rel="noreferrer">
              {t.source} <span aria-hidden="true">↗</span>
            </Link>
            <button
              className="studio-locale"
              type="button"
              onClick={() => setLocale(locale === 'en' ? 'ru' : 'en')}
              aria-label={t.switchLabel}
            >
              <strong>{locale.toUpperCase()}</strong><span> / {locale === 'en' ? 'RU' : 'EN'}</span>
            </button>
          </div>
        </header>

        <aside className="studio-demo-bar" role="note">
          <strong>{t.demo}</strong>
          <span>{t.demoNote}</span>
          <Link href="/">{t.back} <span aria-hidden="true">↗</span></Link>
        </aside>

        <main className="studio-main">{children}</main>
        {isWorkspace ? (
          <nav className="studio-mobile-nav" aria-label={t.projects}>
            <Link className={pathname === '/app' ? 'is-active' : ''} href="/app">{t.projects}</Link>
            <Link className={pathname === '/app/new' ? 'is-active' : ''} href="/app/new">{t.newProject}</Link>
            <Link href="https://github.com/alex-zykin/CineLanding" target="_blank" rel="noreferrer">GitHub ↗</Link>
          </nav>
        ) : null}
      </div>
    </StudioLocaleContext.Provider>
  );
}
