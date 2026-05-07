import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import Nav from '@/components/Nav';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: 'footer' });
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} data-theme="dark" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
          <header
            className="w-full py-3 sm:py-4"
            style={{ borderBottom: '1px solid var(--gold-dim)' }}
          >
            <div className="container-brand">
              <Nav />
            </div>
          </header>

          <main className="flex-1 flex flex-col">{children}</main>

          <footer
            className="w-full py-6 sm:py-8"
            style={{ borderTop: '1px solid var(--gold-dim)' }}
          >
            <div className="container-brand flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4 sm:gap-6">
              <div>
                <p
                  className="font-serif text-xl tracking-logo leading-none"
                  dir="ltr"
                >
                  <span className="font-light" style={{ color: 'var(--text-display)' }}>TARSHEEH</span>
                  <span className="font-normal" style={{ color: 'var(--gold)' }}>.CV</span>
                </p>
                <p
                  className="font-sans text-[10px] font-light uppercase tracking-wide mt-2"
                  style={{ color: 'var(--muted-light)' }}
                  dir={locale === 'ar' ? 'rtl' : 'ltr'}
                >
                  {t('platform')}
                </p>
              </div>
              <p
                className="font-sans text-[10px] font-light uppercase tracking-wide"
                style={{ color: 'var(--muted)' }}
                dir={locale === 'ar' ? 'rtl' : 'ltr'}
              >
                {t('credits')}
              </p>
            </div>
          </footer>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
