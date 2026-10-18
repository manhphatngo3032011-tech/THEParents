import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import ArticleBody from '@/components/ArticleBody';
import ArticleCard from '@/components/ArticleCard';
import ShareButton from '@/components/ShareButton';
import { getArticle, listArticles } from '@/lib/articles';
import { extractHeadings } from '@/lib/markdown';
import { SITE_URL, isLocale } from '@/lib/site';

export const revalidate = 300;

type Props = { params: { locale: string; slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getArticle(params.slug);
  if (!article) return {};
  // The canonical URL is the one in the article's own language, so the same text is not indexed under four interface languages.
  const canonical = `/${isLocale(article.language) ? article.language : 'en'}/article/${article.slug}`;
  const description = article.summary ?? article.subtitle ?? undefined;
  return {
    title: article.title,
    description,
    alternates: { canonical },
    authors: article.author ? [{ name: article.author.display_name }] : undefined,
    openGraph: {
      type: 'article',
      title: article.title,
      description,
      url: canonical,
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.updated_at,
      images: article.cover_image_url ? [article.cover_image_url] : undefined,
    },
  };
}

export default async function ArticlePage({ params: { locale, slug } }: Props) {
  setRequestLocale(locale);
  const article = await getArticle(slug);
  if (!article) notFound();

  const t = await getTranslations('article');
  const te = await getTranslations('explore');
  const tl = await getTranslations('languages');
  const format = await getFormatter();

  const headings = extractHeadings(article.body);
  const category = article.categories?.names[locale] ?? article.categories?.names.en;
  const tags = article.article_tags.map((x) => x.tags).filter((x): x is { slug: string; name: string } => !!x);
  const refs = [...article.article_references].sort((a, b) => a.position - b.position);
  const author = article.author?.display_name ?? te('anonymousAuthor');
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: 'long' });

  const related = article.categories
    ? (await listArticles({ category: article.categories.slug, pageSize: 4 })).items.filter((a) => a.id !== article.id).slice(0, 3)
    : [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.summary ?? undefined,
    inLanguage: article.language,
    datePublished: article.published_at ?? undefined,
    dateModified: article.updated_at,
    image: article.cover_image_url ?? undefined,
    author: { '@type': 'Person', name: author },
    publisher: { '@type': 'Organization', name: 'THEParents', url: SITE_URL },
  };

  return (
    <article className="mx-auto max-w-6xl px-4 py-12">
      <script
        type="application/ld+json"
        // "<" is escaped so article text can never close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <Link href="/explore" className="text-teal underline underline-offset-4">{t('back')}</Link>

      <header className="mx-auto mt-6 max-w-[70ch]" lang={article.language}>
        {category && <p className="font-semibold text-teal">{category}</p>}
        <h1 className="mt-2 font-display text-4xl leading-tight text-teal md:text-5xl">{article.title}</h1>
        {article.subtitle && <p className="mt-3 text-xl text-ink/80">{article.subtitle}</p>}
        <p className="mt-4 text-sm text-ink/80" lang={locale}>
          {t('by', { name: author })}
          {article.published_at && ` · ${t('published', { date: date(article.published_at) })}`}
          {` · ${te('readingTime', { minutes: article.reading_minutes })}`}
        </p>
        {article.language !== locale && (
          <p className="mt-3 rounded-lg bg-teal/10 px-3 py-2 text-sm" lang={locale}>
            {t('writtenIn', { language: tl(article.language) })}
          </p>
        )}
      </header>

      {article.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={article.cover_image_url} alt="" className="mx-auto mt-8 aspect-video w-full max-w-4xl rounded-2xl object-cover" />
      )}

      {headings.length >= 3 && (
        <nav aria-label={t('toc')} className="mx-auto mt-8 max-w-[70ch] rounded-2xl border-2 border-teal/30 p-5" lang={locale}>
          <p className="font-semibold text-teal">{t('toc')}</p>
          <ol className="mt-2 space-y-1">
            {headings.map((h) => (
              <li key={h.id} className={h.level === 3 ? 'pl-5' : ''}>
                <a href={`#${h.id}`} className="underline underline-offset-4 hover:text-teal">{h.text}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="mt-10">
        <ArticleBody source={article.body} lang={article.language} />
      </div>

      <footer className="mx-auto mt-12 max-w-[70ch]" lang={locale}>
        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label={t('tags')}>
            {tags.map((tag) => (
              <li key={tag.slug}>
                <Link href={`/explore?tag=${tag.slug}`} className="rounded-full border border-teal/50 px-3 py-1 text-sm text-teal hover:bg-teal hover:text-cream">
                  {tag.name}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6"><ShareButton title={article.title} /></div>

        {refs.length > 0 && (
          <section className="mt-10" aria-labelledby="refs">
            <h2 id="refs" className="font-display text-2xl text-teal">{t('references')}</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-6">
              {refs.map((r) => (
                <li key={r.position}>
                  {r.citation}
                  {r.url && /^https?:\/\//i.test(r.url) && (
                    <> <a href={r.url} rel="noopener noreferrer nofollow" className="break-all text-teal underline underline-offset-4">{r.url}</a></>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        <p className="mt-10 text-sm text-ink/80">{t('notVerified')}</p>
        <p className="mt-3 rounded-2xl bg-teal p-4 text-sm text-cream">
          {t('missionNote')}{' '}
          <Link href="/mission" className="font-semibold underline underline-offset-4">{t('missionLink')}</Link>
        </p>
      </footer>

      {related.length > 0 && (
        <section className="mt-16" aria-labelledby="related" lang={locale}>
          <h2 id="related" className="font-display text-3xl text-teal">{t('related')}</h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((a) => <li key={a.id}><ArticleCard article={a} /></li>)}
          </ul>
        </section>
      )}
    </article>
  );
}
