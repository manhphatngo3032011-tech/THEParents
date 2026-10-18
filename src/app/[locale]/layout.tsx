import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Freckle_Face } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import '../globals.css';

// Freckle Face is the existing brand display font (Latin only).
// Vietnamese/Chinese headings fall back to the body font automatically.
const display = Freckle_Face({ weight: '400', subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Be_Vietnam_Pro({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  variable: '--font-body',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'meta' });
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return {
    metadataBase: new URL(base),
    title: { default: t('title'), template: '%s | THEParents' },
    description: t('description'),
    alternates: {
      canonical: `/${params.locale}`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])),
    },
    openGraph: { title: t('title'), description: t('description'), type: 'website', siteName: 'THEParents' },
  };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!(routing.locales as readonly string[]).includes(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations('nav');

  return (
    <html lang={locale} className={`${display.variable} ${body.variable}`}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-teal focus:px-4 focus:py-2 focus:text-cream"
          >
            {t('skip')}
          </a>
          <Navbar />
          <main id="main">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
