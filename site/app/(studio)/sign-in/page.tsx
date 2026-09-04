'use client';

import Link from 'next/link';
import { useStudioLocale } from '../_components/studio-shell';

const copy = {
  en: {
    kicker: 'Preview access / No account required',
    hero: <>A clear project.<br />Before the expensive part.</>,
    flow: ['Bring a site or a brief', 'Review a concrete direction', 'Approve one exact version', 'Run a local demo build'],
    label: 'CineLanding Studio',
    title: <>Open the<br />demo workspace.</>,
    body: 'This build lets you test the project-planning prototype without creating an account or sending personal data to a server.',
    action: 'Open workspace',
    back: 'Return to the public site',
    note: 'This is not real sign-in. Projects are stored only in your browser and can disappear when browser data is cleared.',
  },
  ru: {
    kicker: 'Доступ к прототипу / Без аккаунта',
    hero: <>Понятный проект.<br />До дорогой части.</>,
    flow: ['Добавьте сайт или бриф', 'Проверьте конкретное направление', 'Утвердите точную версию', 'Запустите локальную демо-сборку'],
    label: 'Студия CineLanding',
    title: <>Откройте<br />демо-кабинет.</>,
    body: 'Здесь можно проверить прототип планирования проекта без регистрации и передачи персональных данных на сервер.',
    action: 'Открыть кабинет',
    back: 'Вернуться на главную',
    note: 'Это не настоящая авторизация. Проекты хранятся только в вашем браузере и могут исчезнуть после очистки его данных.',
  },
} as const;

export default function SignInPage() {
  const { locale } = useStudioLocale();
  const t = copy[locale];

  return (
    <section className="studio-auth">
      <div className="studio-auth-visual">
        <div>
          <p className="studio-kicker">{t.kicker}</p>
          <h2>{t.hero}</h2>
        </div>
        <ol className="studio-auth-sequence">
          {t.flow.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </div>

      <div className="studio-auth-panel">
        <article className="studio-auth-card">
          <p className="studio-eyebrow">{t.label}</p>
          <h1>{t.title}</h1>
          <p>{t.body}</p>
          <div className="studio-actions">
            <Link className="studio-button studio-button-primary" href="/app">{t.action}<span aria-hidden="true">→</span></Link>
            <Link className="studio-button" href="/">{t.back}<span aria-hidden="true">↗</span></Link>
          </div>
          <p className="studio-fine-print">{t.note}</p>
        </article>
      </div>
    </section>
  );
}
