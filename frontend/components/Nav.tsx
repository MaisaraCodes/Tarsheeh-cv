'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import LanguageToggle from './LanguageToggle';

export default function Nav() {
  const pathname = usePathname();
  const t = useTranslations('common');

  return (
    <div
      className="max-w-4xl mx-auto flex items-center justify-between"
    >
      <Link
        href="/"
        className="font-serif text-xl tracking-logo leading-none"
      >
        <span dir="ltr">
          <span className="font-light text-gold-pale">TARSHEEH</span>
          <span className="font-normal text-gold">.CV</span>
        </span>
      </Link>

      <div className="flex items-center gap-6">
        {pathname?.startsWith('/results/') && (
          <Link
            href="/job"
            className="font-sans text-[11px] font-normal uppercase tracking-logo text-noir bg-gold py-3 px-8 active:scale-[0.98] transition-transform duration-75"
            style={{ border: '1px solid var(--color-gold)' }}
          >
            {t('ctaPrimary')}
          </Link>
        )}
        <LanguageToggle />
      </div>
    </div>
  );
}
