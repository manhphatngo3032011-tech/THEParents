import { redirect } from '@/i18n/navigation';
import { cleanQuery } from '@/lib/articles';

// Search results live on the Explore page so filters and search share one interface.
export default function SearchPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { q?: string | string[] };
}) {
  const raw = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const q = cleanQuery(raw);
  redirect({ href: q ? `/explore?q=${encodeURIComponent(q)}` : '/explore', locale });
}
