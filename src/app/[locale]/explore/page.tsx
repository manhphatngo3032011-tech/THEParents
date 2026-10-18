import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import ArticleCard from '@/components/ArticleCard';
import Pagination from '@/components/Pagination';
import { PAGE_SIZE, cleanQuery, getCategories, listArticles } from '@/lib/articles';
import { LOCALES } from '@/lib/site';

type Props = {
  params: { locale: string };
  searchParams: Record<string, string | string[] | undefined>;
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'explore' });
  // Filtered and paginated views are not indexed, to avoid thousands of near-duplicate pages.
  const variant = ['q', 'category', 'language', 'tag', 'sort', 'page'].some((k) => first(searchParams[k]));
  return {
    title: t('title'),
    description: t('intro'),
    alternates: { canonical: `/${params.locale}/explore` },
    robots: variant ? { index: false, follow: true } : undefined,
  };
}

export default async function ExplorePage({ params: { locale }, searchParams }: Props) {
  setRequestLocale(locale);
  const t = await getTranslations('explore');
  const tl = await getTranslations('languages');

  const categories = await getCategories();
  const q = cleanQuery(first(searchParams.q));
  const categoryRaw = first(searchParams.category);
  const category = categories.some((c) => c.slug === categoryRaw) ? categoryRaw : undefined;
  const languageRaw = first(searchParams.language);
  const language = (LOCALES as readonly string[]).includes(languageRaw ?? '') ? languageRaw : undefined;
  const tagRaw = first(searchParams.tag);
  const tag = tagRaw && /^[a-z0-9-]{1,60}$/.test(tagRaw) ? tagRaw : undefined;
  const sort = first(searchParams.sort) === 'oldest' ? 'oldest' : 'newest';
  const page = Math.max(1, Math.min(10000, parseInt(first(searchParams.page) ?? '1', 10) || 1));

  const { configured, items, total } = await listArticles({ q, category, language, tag, sort, page });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(q || category || language || tag);

  const field = 'w-full rounded-lg border-2 border-teal/40 bg-white px-3 py-2';

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl text-teal md:text-5xl">{t('title')}</h1>
      <p className="mt-3 max-w-2xl">{t('intro')}</p>

      <form method="get" action={`/${locale}/explore`} role="search" className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="md:col-span-4">
          <label htmlFor="q" className="mb-1 block font-semibold">{t('searchLabel')}</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder={t('searchPlaceholder')} className={field} />
        </div>
        <div>
          <label htmlFor="category" className="mb-1 block font-semibold">{t('category')}</label>
          <select id="category" name="category" defaultValue={category ?? ''} className={field}>
            <option value="">{t('allCategories')}</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.names[locale] ?? c.names.en}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="language" className="mb-1 block font-semibold">{t('language')}</label>
          <select id="language" name="language" defaultValue={language ?? ''} className={field}>
            <option value="">{t('allLanguages')}</option>
            {LOCALES.map((l) => <option key={l} value={l}>{tl(l)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="sort" className="mb-1 block font-semibold">{t('sort')}</label>
          <select id="sort" name="sort" defaultValue={sort} className={field}>
            <option value="newest">{t('newest')}</option>
            <option value="oldest">{t('oldest')}</option>
          </select>
        </div>
        {tag && <input type="hidden" name="tag" value={tag} />}
        <div className="flex items-end gap-3">
          <button type="submit" className="btn btn-primary">{t('apply')}</button>
          {filtered && <Link href="/explore" className="font-semibold text-teal underline underline-offset-4">{t('clear')}</Link>}
        </div>
      </form>

      {tag && <p className="mt-4 font-medium">{t('tagFilter', { tag })}</p>}

      <section className="mt-10" aria-labelledby="results">
        <h2 id="results" className="text-xl font-semibold" aria-live="polite">
          {configured ? t('results', { count: total }) : ''}
        </h2>

        {!configured && (
          <p className="mt-4 rounded-2xl border-2 border-dashed border-teal/40 p-8">{t('notConnected')}</p>
        )}
        {configured && items.length === 0 && (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-teal/40 p-8">
            <p className="font-semibold text-teal">{filtered ? t('noResultsTitle') : t('emptyLibraryTitle')}</p>
            <p className="mt-2">{filtered ? t('noResultsHint') : t('emptyLibraryHint')}</p>
          </div>
        )}
        {items.length > 0 && (
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => <li key={a.id}><ArticleCard article={a} /></li>)}
          </ul>
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          params={{ q, category, language, tag, sort: sort === 'oldest' ? 'oldest' : undefined }}
        />
      </section>
    </div>
  );
}
