import NewProjectClient from './new-project-client';

type NewProjectPageProps = {
  searchParams: Promise<{
    mode?: string | string[];
    url?: string | string[];
    lang?: string | string[];
    option?: string | string[];
  }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const allowedOptions = new Set(['privacy-readiness', 'prodamus-setup']);

export default async function NewProjectPage({ searchParams }: NewProjectPageProps) {
  const query = await searchParams;
  const requestedMode = first(query.mode);
  const mode = requestedMode === 'from-scratch' ? 'from-scratch' : 'redesign';
  const sourceUrl = first(query.url)?.slice(0, 2048) ?? '';
  const outputLocale = first(query.lang) === 'ru' ? 'ru-RU' : 'en-US';
  const requestedOptions = Array.isArray(query.option)
    ? query.option
    : query.option
      ? [query.option]
      : [];
  const selectedOptions = outputLocale === 'ru-RU'
    ? requestedOptions.filter((option) => allowedOptions.has(option))
    : [];

  return (
    <NewProjectClient
      initialMode={mode}
      initialOutputLocale={outputLocale}
      initialSelectedOptions={selectedOptions}
      initialSourceUrl={sourceUrl}
    />
  );
}
