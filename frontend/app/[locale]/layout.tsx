import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import Nav from '@/components/Nav';

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
    <html lang={locale} dir={dir} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <header
            className="px-6 py-4"
            style={{ borderBottom: '1px solid var(--gold-dim)' }}
          >
            <Nav />
          </header>

          <main className="flex-1 flex flex-col">{children}</main>

          <footer
            className="px-6 py-8"
            style={{ borderTop: '1px solid var(--gold-dim)' }}
          >
            <div
              dir="ltr"
              className={`max-w-4xl mx-auto flex items-start ${
                locale === 'ar' ? 'gap-12 justify-start' : 'justify-between'
              }`}
            >
              <div>
                <p
                  className="font-serif text-xl tracking-logo leading-none"
                  dir="ltr"
                >
                  <span className="font-light text-gold-pale">TARSHEEH</span>
                  <span className="font-normal text-gold">.CV</span>
                </p>
                <p
                  className="font-sans text-[10px] font-light text-muted-light uppercase tracking-wide mt-2"
                  dir={locale === 'ar' ? 'rtl' : 'ltr'}
                >
                  {t('platform')}
                </p>
              </div>
              <p
                className="font-sans text-[10px] font-light text-muted uppercase tracking-wide"
                dir={locale === 'ar' ? 'rtl' : 'ltr'}
              >
                {t('credits')}
              </p>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
