import type { MetadataRoute } from 'next';
import { listPublishedForSitemap } from '@/lib/articles';
import { LOCALES, SITE_URL, isLocale } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = LOCALES.flatMap((l) => [`${SITE_URL}/${l}`, `${SITE_URL}/${l}/explore`]).map((url) => ({ url }));
  const articles = (await listPublishedForSitemap()).map((a) => ({
    // One canonical URL per article: the one in the article's own language.
    url: `${SITE_URL}/${isLocale(a.language) ? a.language : 'en'}/article/${a.slug}`,
    lastModified: new Date(a.updated_at),
  }));
  return [...pages, ...articles];
}
