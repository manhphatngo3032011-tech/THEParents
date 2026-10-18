import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('notFound');
  return (
    <div className="mx-auto max-w-3xl px-4 py-24">
      <h1 className="font-display text-4xl text-teal">{t('title')}</h1>
      <p className="mt-4">{t('body')}</p>
      <Link href="/" className="btn btn-primary mt-8">{t('home')}</Link>
    </div>
  );
}
