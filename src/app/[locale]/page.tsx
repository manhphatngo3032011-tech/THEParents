import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import ArticleCard from '@/components/ArticleCard';
import { listArticles } from '@/lib/articles';

const CATEGORY_KEYS = [
  'science', 'technology', 'education', 'environment', 'health', 'history',
  'culture', 'economics', 'society', 'space', 'engineering', 'general',
] as const;

export default async function HomePage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const tc = await getTranslations('categories');
  const currentLocale = await getLocale();
  const { items: latest } = await listArticles({ pageSize: 6 });

  return (
    <>
      {/* Hero: the mission statement is the first thing a visitor reads. */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 md:pt-24">
        <p className="max-w-xl font-semibold text-teal">{t('slogan')}</p>
        <h1 className="mt-4 max-w-4xl font-display text-5xl leading-tight text-teal md:text-7xl">{t('heroTitle')}</h1>
        <p className="mt-6 max-w-2xl text-lg">{t('heroSubtitle')}</p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/explore" className="btn btn-primary">{t('ctaExplore')}</Link>
          <Link href="/register" className="btn btn-secondary">{t('ctaContribute')}</Link>
        </div>

        <form action={`/${currentLocale}/search`} role="search" className="mt-10 flex max-w-2xl gap-2">
          <label htmlFor="q" className="sr-only">{t('searchLabel')}</label>
          <input
            id="q"
            name="q"
            type="search"
            required
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-full border-2 border-teal/40 bg-white px-5 py-3"
          />
          <button type="submit" className="btn btn-primary shrink-0">{t('searchButton')}</button>
        </form>
      </section>

      {/* Latest articles: empty state until real published content exists (Phase 2). */}
      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="latest">
        <h2 id="latest" className="font-display text-3xl text-teal">{t('latestTitle')}</h2>
        {latest.length === 0 ? (
          <p className="mt-4 rounded-2xl border-2 border-dashed border-teal/40 p-8 text-teal">{t('latestEmpty')}</p>
        ) : (
          <>
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((a) => <li key={a.id}><ArticleCard article={a} /></li>)}
            </ul>
            <Link href="/explore" className="btn btn-secondary mt-8">{t('ctaExplore')}</Link>
          </>
        )}
      </section>

      <section id="categories" className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="cats">
        <h2 id="cats" className="font-display text-3xl text-teal">{t('categoriesTitle')}</h2>
        <ul className="mt-6 flex flex-wrap gap-3">
          {CATEGORY_KEYS.map((key) => (
            <li key={key}>
              <Link
                href={`/explore?category=${key}`}
                className="inline-block rounded-full border-2 border-teal/50 px-5 py-2 font-medium text-teal hover:bg-teal hover:text-cream"
              >
                {tc(key)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works: a real sequence, so numbering is justified here. */}
      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="how">
        <h2 id="how" className="font-display text-3xl text-teal">{t('howTitle')}</h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {(['step1', 'step2', 'step3'] as const).map((s, i) => (
            <li key={s} className="rounded-2xl bg-teal p-6 text-cream">
              <span className="font-display text-3xl text-gold" aria-hidden="true">{i + 1}</span>
              <h3 className="mt-2 text-xl font-semibold">{t(`${s}Title`)}</h3>
              <p className="mt-2 text-cream/90">{t(`${s}Body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="impact">
        <div className="rounded-3xl border-2 border-teal p-8 md:p-12">
          <h2 id="impact" className="font-display text-3xl text-teal">{t('impactTitle')}</h2>
          <p className="mt-4 max-w-3xl">{t('impactBody')}</p>
          <p className="mt-4 max-w-3xl font-semibold text-teal">{t('impactNote')}</p>
          <Link href="/mission" className="btn btn-secondary mt-6">{t('impactCta')}</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="publish">
        <h2 id="publish" className="font-display text-3xl text-teal">{t('publishTitle')}</h2>
        <p className="mt-4 max-w-3xl">{t('publishBody')}</p>
        <Link href="/membership" className="btn btn-secondary mt-6">{t('publishCta')}</Link>
      </section>
    </>
  );
}
